import { httpLogger } from './lib/logger';
import express, { Application } from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import contactRoutes from './routes/contactRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import groupRoutes from './routes/groupRoutes';
import notesRoutes from './routes/notesRoutes';
import databaseRoutes from './routes/databaseRoutes';
import * as databaseController from './controllers/databaseController';

const app: Application = express();

// Middleware
const localOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

const configuredOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin
      || process.env.NODE_ENV !== 'production'
      || localOrigins.has(origin)
      || configuredOrigins.has(origin)
    ) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: '2mb' }));
app.use(httpLogger);

// Serve static files from uploads directory
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Test route to check DB connection
app.get('/api/test', databaseController.testConnection);

// Database initialization/verification/status endpoints
app.use('/api/database', databaseRoutes);

// Mount domain routes
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notes', notesRoutes);

export default app;
