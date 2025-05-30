import { createClient } from 'redis';

export const createRedisClient = () => {
  const redis = createClient({
    socket: {
      host: '10.61.16.195',
      port: 6379,
    },
  });

  redis.on('error', err => console.error('ERR:REDIS:', err));
  redis.connect();

  return redis;
};
