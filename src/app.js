const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const connectDatabase = require('./config/database');
const routes = require('./routes');
const errorMiddleware = require('./middleware/error.middleware');
const logger = require('./utils/logger');

// Multi-tenant imports
const { 
  createTenantMiddleware, 
  createTenantDatabaseMiddleware, 
  createTenantRateLimit 
} = require('./tenant/middleware/tenantMiddleware');

// Service container setup
const { container } = require('./shared/container/ServiceContainer');
require('./infrastructure/container/serviceRegistration');

const app = express();

connectDatabase();

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Multi-tenant middleware setup
const tenantStrategy = process.env.TENANT_STRATEGY || 'header'; // 'header', 'subdomain', 'path'
app.use(createTenantMiddleware({
  strategy: tenantStrategy,
  required: process.env.TENANT_REQUIRED !== 'false',
  skipRoutes: ['/health', '/api-docs', '/', '/api', '/favicon.ico']
}));

// Tenant database middleware
app.use(createTenantDatabaseMiddleware());

// Tenant-specific rate limiting
app.use(createTenantRateLimit());

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

const morganFormat = process.env.NODE_ENV === 'production' 
  ? 'combined' 
  : 'dev';

app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to CloudMemberHub Backend API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
    timestamp: new Date().toISOString(),
  });
});

app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

app.use(errorMiddleware);

module.exports = app;