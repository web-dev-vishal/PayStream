const Stripe = require('stripe');
const logger = require('./logger');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  logger.error('STRIPE_SECRET_KEY is not defined in environment variables');
  throw new Error('STRIPE_SECRET_KEY is required');
}

const stripe = Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  maxNetworkRetries: 3,
  timeout: 30000,
});

logger.info('Stripe SDK initialized successfully');

module.exports = stripe;