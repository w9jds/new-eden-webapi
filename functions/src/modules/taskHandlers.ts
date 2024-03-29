import { database } from 'firebase-admin';
import { https, Response } from 'firebase-functions';
import { addSeconds } from 'date-fns';
import { Character } from 'node-esi-stackdriver';
import { refresh, verify } from '../lib/Auth';

const onRefreshError = async (user: database.DataSnapshot, taskRef: database.Reference, resp, result: Response): Promise<any> => {
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
    const scopes = user.child('sso/scope').val();

    await Promise.all([
      taskRef.remove(),
      user.ref.update({ expired_scopes: scopes }),
      user.child('sso').ref.remove(),
      user.child('roles').ref.remove(),
      user.child('titles').ref.remove(),
      global.firebase.ref(`locations/${user.key}`).ref.remove(),
      global.firebase.ref(`users/${user.child('accountId').val()}/errors`).set(true),
    ]);

    console.log(`${user.key}: ${content.error} - User Token Removed`);
    result.status(200).send(`User token removed for ${user.key}`);
    return;
  }

  console.error(JSON.stringify(payload));
  result.status(500).send(JSON.stringify(payload));
};

export const onRefreshToken = async (req: https.Request, resp: Response<any>) => {
  const request = req.body;
  const taskRef = global.firebase.ref(`tasks/${request.characterId}/tokens`);
  const snapshot = await global.firebase.ref(`characters/${request.characterId}`).once('value');
  const character: Character = snapshot.val();

  if (!character.sso) {
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

    await onRefreshError(snapshot, taskRef, response, resp);
  } catch (error) {
    console.error(JSON.stringify(error));
    resp.status(500).send(error);
  }
};
