const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let io = null;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userType = decoded.userType;
      socket.merchantId = decoded.merchantId;
      
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} | User: ${socket.userId} | Type: ${socket.userType}`);

    if (socket.userType === 'MERCHANT' && socket.merchantId) {
      socket.join(`merchant:${socket.merchantId}`);
      logger.info(`Socket ${socket.id} joined merchant room: merchant:${socket.merchantId}`);
    }

    if (socket.userType === 'ADMIN') {
      socket.join('admin:fraud');
      socket.join('admin:settlements');
      logger.info(`Socket ${socket.id} joined admin rooms`);
    }

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} | Reason: ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error: ${socket.id}`, error);
    });
  });

  logger.info('Socket.io initialized successfully');
  return io;
};

const emitToMerchant = (merchantId, event, data) => {
  if (io) {
    io.to(`merchant:${merchantId}`).emit(event, data);
    logger.debug(`Event ${event} emitted to merchant:${merchantId}`);
  }
};

const emitToAdmin = (room, event, data) => {
  if (io) {
    io.to(`admin:${room}`).emit(event, data);
    logger.debug(`Event ${event} emitted to admin:${room}`);
  }
};

const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
    logger.debug(`Event ${event} emitted to all clients`);
  }
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = {
  initializeSocket,
  emitToMerchant,
  emitToAdmin,
  emitToAll,
  getIO
};