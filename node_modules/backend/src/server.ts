import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { errorMiddleware } from './middleware/error.middleware';
import { logger } from './utils/logger';
import authRoutes from './modules/auth/auth.routes';
import fmpaRoutes from './modules/fmpa/fmpa.routes';
import personnelRoutes from './modules/personnels/personnels.routes';
import exportRoutes from './modules/exports/exports.routes';

// Load environment variables
dotenv.config();

// Initialize Prisma
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Initialize Express
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/fmpa', fmpaRoutes);
app.use('/api/personnels', personnelRoutes);
app.use('/api/exports', exportRoutes);

// Error handling middleware (must be last)
app.use(errorMiddleware);

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();

export { app, io };
