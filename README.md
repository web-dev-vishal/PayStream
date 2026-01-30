# PayStream - Enterprise Payment Orchestration Platform

## Phase 1 Complete: Infrastructure Setup

### Project Structure
```
paystream/
├── src/
│   ├── config/
│   │   ├── database.js       # Prisma MongoDB connection
│   │   ├── redis.js          # Redis client wrapper
│   │   ├── rabbitmq.js       # RabbitMQ queue management
│   │   ├── logger.js         # Winston logger
│   │   ├── stripe.js         # Stripe SDK
│   │   └── socket.js         # Socket.io configuration
│   ├── server.js             # Main application entry
│   ├── middleware/           # (ready for Phase 2)
│   ├── routes/               # (ready for Phase 2)
│   ├── controllers/          # (ready for Phase 2)
│   ├── services/             # (ready for Phase 2)
│   ├── utils/                # (ready for Phase 2)
│   └── workers/              # (ready for Phase 5)
├── prisma/
│   └── schema.prisma         # Complete database schema
├── logs/                     # Application logs
├── docker-compose.yml        # All services orchestration
├── Dockerfile                # API service container
├── Dockerfile.worker         # Worker service container
├── package.json              # Dependencies
├── .env.example              # Environment template
└── setup.js                  # Directory structure setup
```

## Installation & Setup

### Prerequisites
- Node.js >= 18.0.0
- Docker & Docker Compose
- Stripe Account (for payment processing)

### Step 1: Clone and Install Dependencies
```bash
cd paystream
npm install
```

### Step 2: Setup Environment Variables
```bash
cp .env.example .env
```

**Edit `.env` and add your Stripe credentials:**
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret

### Step 3: Create Project Structure
```bash
node setup.js
```

### Step 4: Generate Prisma Client
```bash
npx prisma generate
```

### Step 5: Start Services with Docker Compose
```bash
docker-compose up -d
```

This will start:
- MongoDB (port 27017)
- Redis (port 6379)
- RabbitMQ (port 5672, management UI on 15672)
- PayStream API (port 3000)
- PayStream Worker

### Step 6: Verify Services

**Check API Health:**
```bash
curl http://localhost:3000/health
```

**Check RabbitMQ Management UI:**
```
http://localhost:15672
Username: admin
Password: paystream_rabbitmq_pass
```

## Development Mode (Without Docker)

### Step 1: Start Infrastructure Services
```bash
docker-compose up -d mongodb redis rabbitmq
```

### Step 2: Run API Locally
```bash
npm run dev
```

### Step 3: Run Worker Locally
```bash
npm run worker
```

## Database Schema

The Prisma schema includes:
- ✅ Merchant accounts with KYC
- ✅ Customer profiles
- ✅ Transactions with event sourcing
- ✅ Payment methods
- ✅ Double-entry ledger
- ✅ Refunds
- ✅ Disputes
- ✅ Settlement batches
- ✅ Webhook logs
- ✅ Exchange rates
- ✅ Idempotency keys
- ✅ Audit logs
- ✅ KYC documents
- ✅ Escrow accounts
- ✅ Approval workflows
- ✅ Split payments
- ✅ Subscriptions

## RabbitMQ Queues

Configured queues:
- ✅ payment.processing
- ✅ payment.retry
- ✅ payment.dlq (Dead Letter Queue)
- ✅ settlement.calculation
- ✅ fraud.detection
- ✅ webhook.delivery
- ✅ subscription.billing
- ✅ currency.update
- ✅ chargeback.notification

## Redis Namespaces

Configured namespaces:
- ✅ rate:limit:* - Rate limiting
- ✅ balance:* - Real-time balances
- ✅ idempotency:* - Duplicate prevention
- ✅ exchange:* - Exchange rates cache
- ✅ token:revoked:* - JWT revocation
- ✅ velocity:* - Transaction velocity

## Configuration Modules

✅ **database.js** - Prisma client with logging
✅ **redis.js** - Full Redis operations wrapper
✅ **rabbitmq.js** - Queue publishing/consuming with retry logic
✅ **logger.js** - Winston structured logging
✅ **stripe.js** - Stripe SDK initialization
✅ **socket.js** - Socket.io with JWT authentication

## Logging

Logs are stored in:
- `logs/error.log` - Error logs only
- `logs/combined.log` - All logs

## Next Phase

Ready to proceed to **Phase 2: Core Services** which includes:
- Authentication middleware (JWT)
- Redis service wrappers
- RabbitMQ service wrappers
- Error handling middleware
- Request validation

## Environment Variables Reference

See `.env.example` for all available configuration options.

## Troubleshooting

### MongoDB Connection Issues
```bash
docker-compose logs mongodb
```

### Redis Connection Issues
```bash
docker-compose logs redis
```

### RabbitMQ Connection Issues
```bash
docker-compose logs rabbitmq
```

### API Logs
```bash
docker-compose logs paystream-api
```

## Support

For issues or questions, check the logs first:
```bash
tail -f logs/combined.log
```

I'll see you in the next one! 🚀
