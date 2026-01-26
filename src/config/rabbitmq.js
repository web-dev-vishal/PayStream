const amqp = require('amqplib');
const logger = require('./logger');

let connection = null;
let channel = null;

const QUEUES = {
  PAYMENT_PROCESSING: 'payment.processing',
  PAYMENT_RETRY: 'payment.retry',
  PAYMENT_DLQ: 'payment.dlq',
  SETTLEMENT_CALCULATION: 'settlement.calculation',
  FRAUD_DETECTION: 'fraud.detection',
  WEBHOOK_DELIVERY: 'webhook.delivery',
  SUBSCRIPTION_BILLING: 'subscription.billing',
  CURRENCY_UPDATE: 'currency.update',
  CHARGEBACK_NOTIFICATION: 'chargeback.notification'
};

const EXCHANGES = {
  PAYMENT: 'payment.exchange',
  NOTIFICATION: 'notification.exchange'
};

const connectRabbitMQ = async () => {
  try {
    const rabbitmqUri = process.env.RABBITMQ_URI || 'amqp://localhost:5672';
    connection = await amqp.connect(rabbitmqUri);
    channel = await connection.createChannel();

    connection.on('error', (error) => {
      logger.error('RabbitMQ connection error:', error);
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed. Reconnecting...');
      setTimeout(connectRabbitMQ, 5000);
    });

    await setupQueuesAndExchanges();

    logger.info('RabbitMQ connected successfully');
    return channel;
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
};

const setupQueuesAndExchanges = async () => {
  try {
    await channel.assertExchange(EXCHANGES.PAYMENT, 'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.NOTIFICATION, 'fanout', { durable: true });

    const dlqOptions = {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000
      }
    };

    await channel.assertQueue(QUEUES.PAYMENT_DLQ, dlqOptions);

    const queueOptions = {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': QUEUES.PAYMENT_DLQ
      }
    };

    for (const queue of Object.values(QUEUES)) {
      if (queue !== QUEUES.PAYMENT_DLQ) {
        await channel.assertQueue(queue, queueOptions);
      }
    }

    await channel.bindQueue(QUEUES.PAYMENT_PROCESSING, EXCHANGES.PAYMENT, 'payment.#');
    await channel.bindQueue(QUEUES.WEBHOOK_DELIVERY, EXCHANGES.NOTIFICATION, '');

    logger.info('RabbitMQ queues and exchanges set up successfully');
  } catch (error) {
    logger.error('Error setting up RabbitMQ queues and exchanges:', error);
    throw error;
  }
};

const publishToQueue = async (queue, message, options = {}) => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    const publishOptions = {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
      ...options
    };

    const sent = channel.sendToQueue(queue, messageBuffer, publishOptions);
    
    if (!sent) {
      logger.warn(`Message not sent to queue ${queue}, channel buffer full`);
      return false;
    }

    logger.debug(`Message published to queue ${queue}`);
    return true;
  } catch (error) {
    logger.error(`Error publishing to queue ${queue}:`, error);
    return false;
  }
};

const publishToExchange = async (exchange, routingKey, message, options = {}) => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    const publishOptions = {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
      ...options
    };

    channel.publish(exchange, routingKey, messageBuffer, publishOptions);
    logger.debug(`Message published to exchange ${exchange} with routing key ${routingKey}`);
    return true;
  } catch (error) {
    logger.error(`Error publishing to exchange ${exchange}:`, error);
    return false;
  }
};

const consumeQueue = async (queue, handler, options = {}) => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }

    const consumeOptions = {
      noAck: false,
      ...options
    };

    await channel.prefetch(options.prefetch || 1);

    await channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.debug(`Processing message from queue ${queue}`);

          await handler(content, msg);

          channel.ack(msg);
          logger.debug(`Message acknowledged from queue ${queue}`);
        } catch (error) {
          logger.error(`Error processing message from queue ${queue}:`, error);

          const retryCount = (msg.properties.headers['x-retry-count'] || 0) + 1;
          const maxRetries = options.maxRetries || 3;

          if (retryCount < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 60000);
            
            setTimeout(() => {
              publishToQueue(queue, JSON.parse(msg.content.toString()), {
                headers: {
                  'x-retry-count': retryCount
                }
              });
            }, delay);

            channel.ack(msg);
            logger.info(`Message requeued to ${queue} (retry ${retryCount}/${maxRetries})`);
          } else {
            channel.nack(msg, false, false);
            logger.error(`Message sent to DLQ after ${maxRetries} retries`);
          }
        }
      }
    }, consumeOptions);

    logger.info(`Started consuming queue ${queue}`);
  } catch (error) {
    logger.error(`Error consuming queue ${queue}:`, error);
    throw error;
  }
};

const getQueueStats = async (queue) => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }
    return await channel.checkQueue(queue);
  } catch (error) {
    logger.error(`Error getting stats for queue ${queue}:`, error);
    return null;
  }
};

const purgeQueue = async (queue) => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }
    await channel.purgeQueue(queue);
    logger.info(`Queue ${queue} purged`);
    return true;
  } catch (error) {
    logger.error(`Error purging queue ${queue}:`, error);
    return false;
  }
};

const closeConnection = async () => {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    logger.info('RabbitMQ connection closed');
  } catch (error) {
    logger.error('Error closing RabbitMQ connection:', error);
  }
};

process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

module.exports = {
  connectRabbitMQ,
  publishToQueue,
  publishToExchange,
  consumeQueue,
  getQueueStats,
  purgeQueue,
  closeConnection,
  QUEUES,
  EXCHANGES,
  getChannel: () => channel,
  getConnection: () => connection
};