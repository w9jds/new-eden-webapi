/* eslint-disable @typescript-eslint/no-explicit-any */
import { database } from 'firebase-admin';
import { https, Response } from 'firebase-functions';
import { addSeconds } from 'date-fns';
import { Character } from 'node-esi-stackdriver';
import { refresh, verify } from '../lib/Auth';

const onRefreshError = async (user: database.DataSnapshot, taskRef: database.Reference, resp, req: https.Request, result: Response): Promise<any> => {
  const { 'x-cloudtasks-taskretrycount': retryCount } = req.headers;

  let content;
  const payload = {
    error: true,
    user: {
      id: user.key,
      name: user.child('name').val(),
    },
  };

  try {
    content = await resp.json();
    payload['response'] = content;
  } catch (error) {
    payload['response'] = error;
  }

  if (content && content.error && (content.error === 'invalid_grant' || content.error === 'invalid_token')) {
    if (+retryCount < 3) {
      console.info(`RETRY TOKEN REFRESH FOR ${user.key} - RETRY: ${retryCount}`);
      result.status(resp.status).send(`${user.key}: ${content.error} - Retrying Refresh Token`);
      return;
    }

    const scopes = user.child('sso/scope').val();

    await Promise.all([
      taskRef.remove(),
      user.ref.update({ expired_scopes: scopes }),
      user.child('sso').ref.remove(),
      user.child('roles').ref.remove(),
      user.child('titles').ref.remove(),
      global.firebase.ref(`users/${user.child('accountId').val()}/errors`).set(true),
      global.firebase.ref(`locations/${user.key}`).ref.remove(),
    ]);

    console.error(`${user.key}: ${JSON.stringify(content)}`);
    result.status(resp.status).send(`${user.key}: ${content.error} - User Token Removed`);
    return;
  }

  console.error(JSON.stringify(payload));
  result.status(500).send(JSON.stringify(payload));
};

export const onRefreshToken = async (req: https.Request, resp: Response<any>) => {
  const request = req.body;
  const taskRef = global.firebase.ref(`tasks/${request.characterId}/tokens`);
  const snapshot: database.DataSnapshot = await global.firebase.ref(`characters/${request.characterId}`).once('value');

  if (!snapshot.exists()) {
    resp.status(200).send(`User ${request.characterId} is no longer in the system`);
    return;
  }

  const character: Character = snapshot.val();
  if (!character?.accountId) {
    resp.status(200).send(`User ${request.characterId} doesn't belong to an account`);
    snapshot.ref.remove();
    return;
  }

  if (!character?.sso) {
    await taskRef.remove();
    resp.status(200).send(`User ${request.characterId} has no tokens to refresh`);
    return;
  }

  try {
    const response = await refresh(character.sso.refreshToken);

    if (response.status === 200) {
      const tokens = await response.json();
      const verification = verify(tokens.access_token);

      character.sso.accessToken = tokens.access_token;
      character.sso.refreshToken = tokens.refresh_token;

      await taskRef.remove();
      await snapshot.ref.update({
        name: verification.name,
        hash: verification.owner,
        sso: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: addSeconds(new Date(), tokens.expires_in - 60),
          scope: verification.scopes,
        },
      });

      resp.status(200).send(`User Token for ${request.characterId} has been refreshed`);
      return;
    }

    await onRefreshError(snapshot, taskRef, response, req, resp);
  } catch (error) {
    console.error(JSON.stringify(error));
    resp.status(500).send(error);
  }
};
