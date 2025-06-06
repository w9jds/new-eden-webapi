/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from 'firebase-admin';
import { Change } from 'firebase-functions';
import { DatabaseEvent, DataSnapshot } from 'firebase-functions/database';
import { error } from 'firebase-functions/logger';
import { CloudTasksClient } from '@google-cloud/tasks';

import { ProjectId, TaskConfigs } from '../config/constants';
import { Permissions } from 'node-esi-stackdriver';
import { isAfter } from 'date-fns';
import { info, warn } from 'console';

export const onRolesChanged = async (event: DatabaseEvent<Change<DataSnapshot>, { userId: string }>) => {
  const newRoles = event.data.after.val() as string[];
  const user = await auth().getUser(event.params.userId);

  if (!user) {
    error(`Auth user record not found for ${event.params.userId}`);
  }

  if (newRoles && newRoles.indexOf('Director')) {
    await auth().setCustomUserClaims(event.params.userId, {
      director: true,
      recruiter: true,
      leadership: true,
    });
  }

  if (!newRoles || newRoles.indexOf('Director') < 0) {
    await auth().setCustomUserClaims(event.params.userId, {
      director: false,
      recruiter: false,
      leadership: false,
    });
  }
};

export const createRefreshTask = async (event: DatabaseEvent<Change<DataSnapshot>, { characterId: string }>) => {
  const eventAgeMs = Date.now() - Date.parse(event.time);
  const eventMaxAgeMs = 300000;
  if (eventAgeMs > eventMaxAgeMs) {
    error(`Dropping event ${event.id} with age[ms]: ${eventAgeMs}`);
    return;
  }

  const queueName = 'refresh-token-queue';
  const taskRef = global.firebase.ref(`tasks/${event.params.characterId}/tokens`);
  const sso: Permissions = event.data.after.val();

  if (event.type.endsWith('delete')) {
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
    warn(`User ${event.params.characterId} has no SSO validated.`);
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
        info(`Task already schedules for ${scheduled.child('name').val()} `);
        return Promise.resolve('Task already scheduled for this user.');
      }
    } catch (err) {
      warn(`Task ${scheduled.child('name').val()} doesn't exist, clearing out cached name and creating new one`, err);
      await global.firebase.ref(`tasks/${event.params.characterId}`).remove();
    }
  }

  try {
    const now = new Date();
    const parent = client.queuePath(ProjectId, TaskConfigs.Location, queueName);
    const serialized = JSON.stringify({ characterId: event.params.characterId });
    const body = Buffer.from(serialized).toString('base64');

    const taskName = `${event.params.characterId}_${event.id.replace(/[^a-zA-Z0-9]/g, '_')}`;

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
        seconds: (expiresAt.getTime() / 1000) - 300,
      };
    }

    await client.createTask({ parent, task }, { maxRetries: 2 });
    return taskRef.set({
      name: taskName,
      scheduleTime: !isAfter(now, expiresAt) ? (expiresAt.getTime() / 1000) - 300 : now,
    });
  } catch (err) {
    error(`Failed to create task for ${event.params.characterId}`, err);
    return Promise.reject(err);
  }
};
