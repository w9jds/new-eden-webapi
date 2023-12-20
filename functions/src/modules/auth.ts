/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from 'firebase-admin';
import { EventContext, Change, database } from 'firebase-functions';
import { error } from 'firebase-functions/logger';
import { CloudTasksClient } from '@google-cloud/tasks';

import { ProjectId, TaskConfigs } from '../config/constants';
import { Permissions } from 'node-esi-stackdriver';
import { isAfter } from 'date-fns';

export const onRolesChanged = async (change: Change<database.DataSnapshot>, context?: EventContext) => {
  const newRoles = change.after.val() as string[];
  const user = await auth().getUser(context.params.userId);

  if (!user) {
    error(`Auth user record not found for ${context.params.userId}`);
  }

  if (newRoles && newRoles.indexOf('Director')) {
    await auth().setCustomUserClaims(context.params.userId, {
      director: true,
      recruiter: true,
      leadership: true,
    });
  }

  if (!newRoles || newRoles.indexOf('Director') < 0) {
    await auth().setCustomUserClaims(context.params.userId, {
      director: false,
      recruiter: false,
      leadership: false,
    });
  }
};

export const createRefreshTask = async (change: Change<database.DataSnapshot>, context: EventContext) => {
  const queueName = 'refresh-token-queue';
  const taskRef = global.firebase.ref(`tasks/${context.params.characterId}/tokens`);
  const sso: Permissions = change.after.val();

  if (context.eventType.endsWith('delete')) {
    const scheduled = await taskRef.once('value');
    if (scheduled && scheduled.exists()) {
      const client = new CloudTasksClient();
      await client.deleteTask({
        name: client.taskPath(ProjectId, TaskConfigs.Location, queueName, scheduled.child('name').val()),
      });
    }

    return Promise.resolve('User deleted, no need to register a task.');
  }

  if (!sso || !sso.refreshToken) {
    return Promise.resolve('User has no SSO validated.');
  }

  const expiresAt = new Date(sso.expiresAt);
  const client = new CloudTasksClient();

  const scheduled = await taskRef.once('value');
  if (scheduled && scheduled.exists()) {
    try {
      const [current] = await client.getTask({
        name: client.taskPath(ProjectId, TaskConfigs.Location, queueName, scheduled.child('name').val()),
      });

      if (current) {
        return Promise.resolve('Task already scheduled for this user.');
      }
    } catch (err) {
      error(`Task ${scheduled.child('name').val()} doesn't exist, clearing out cached name and creating new one`, err);
      await global.firebase.ref(`tasks/${context.params.characterId}`).remove();
    }
  }

  const now = new Date();
  const parent = client.queuePath(ProjectId, TaskConfigs.Location, queueName);
  const serialized = JSON.stringify({ characterId: context.params.characterId });
  const body = Buffer.from(serialized).toString('base64');

  const taskName = `${context.params.characterId}_${context.eventId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const task: any = {
    name: client.taskPath(ProjectId, TaskConfigs.Location, queueName, taskName),
    httpRequest: {
      httpMethod: 'POST',
      url: `${TaskConfigs.FunctionUrl}/refreshUserToken`,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      oidcToken: {
        serviceAccountEmail: TaskConfigs.ServiceAccountEmail,
      },
    },
  };

  if (!isAfter(now, expiresAt)) {
    task.scheduleTime = {
      seconds: expiresAt.getTime() / 1000,
    };
  }

  await client.createTask({ parent, task }, { maxRetries: 2 });
  return taskRef.set({
    name: taskName,
    scheduleTime: !isAfter(now, expiresAt) ? expiresAt : now,
  });
};
