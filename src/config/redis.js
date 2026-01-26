const Redis = require('ioredis');
const logger = require('./logger');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

const redis = new Redis(redisConfig);

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('ready', () => {
  logger.info('Redis is ready to accept commands');
});

redis.on('reconnecting', () => {
  logger.warn('Redis reconnecting...');
});

const redisClient = {
  get: async (key) => {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  },

  set: async (key, value, ttl = null) => {
    try {
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, stringValue);
      } else {
        await redis.set(key, stringValue);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  },

  del: async (key) => {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  },

  incr: async (key) => {
    try {
      return await redis.incr(key);
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      return null;
    }
  },

  decr: async (key) => {
    try {
      return await redis.decr(key);
    } catch (error) {
      logger.error(`Redis DECR error for key ${key}:`, error);
      return null;
    }
  },

  expire: async (key, seconds) => {
    try {
      await redis.expire(key, seconds);
      return true;
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  },

  ttl: async (key) => {
    try {
      return await redis.ttl(key);
    } catch (error) {
      logger.error(`Redis TTL error for key ${key}:`, error);
      return null;
    }
  },

  hset: async (key, field, value) => {
    try {
      await redis.hset(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Redis HSET error for key ${key}:`, error);
      return false;
    }
  },

  hget: async (key, field) => {
    try {
      const value = await redis.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis HGET error for key ${key}:`, error);
      return null;
    }
  },

  hgetall: async (key) => {
    try {
      const data = await redis.hgetall(key);
      const parsed = {};
      for (const [field, value] of Object.entries(data)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }
      return parsed;
    } catch (error) {
      logger.error(`Redis HGETALL error for key ${key}:`, error);
      return null;
    }
  },

  hdel: async (key, field) => {
    try {
      await redis.hdel(key, field);
      return true;
    } catch (error) {
      logger.error(`Redis HDEL error for key ${key}:`, error);
      return false;
    }
  },

  zadd: async (key, score, member) => {
    try {
      await redis.zadd(key, score, member);
      return true;
    } catch (error) {
      logger.error(`Redis ZADD error for key ${key}:`, error);
      return false;
    }
  },

  zrange: async (key, start, stop) => {
    try {
      return await redis.zrange(key, start, stop);
    } catch (error) {
      logger.error(`Redis ZRANGE error for key ${key}:`, error);
      return [];
    }
  },

  zremrangebyscore: async (key, min, max) => {
    try {
      return await redis.zremrangebyscore(key, min, max);
    } catch (error) {
      logger.error(`Redis ZREMRANGEBYSCORE error for key ${key}:`, error);
      return null;
    }
  },

  keys: async (pattern) => {
    try {
      return await redis.keys(pattern);
    } catch (error) {
      logger.error(`Redis KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  },

  exists: async (key) => {
    try {
      return await redis.exists(key);
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return 0;
    }
  },

  publish: async (channel, message) => {
    try {
      await redis.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`Redis PUBLISH error for channel ${channel}:`, error);
      return false;
    }
  },

  subscribe: (channel, callback) => {
    const subscriber = redis.duplicate();
    subscriber.subscribe(channel);
    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          callback(JSON.parse(message));
        } catch (error) {
          callback(message);
        }
      }
    });
    return subscriber;
  },

  flushdb: async () => {
    try {
      await redis.flushdb();
      return true;
    } catch (error) {
      logger.error('Redis FLUSHDB error:', error);
      return false;
    }
  },

  pipeline: () => {
    return redis.pipeline();
  },

  raw: redis
};

module.exports = redisClient;