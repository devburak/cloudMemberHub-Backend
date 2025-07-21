const config = {
  development: {
    port: process.env.PORT || 5000,
    host: process.env.HOST || 'localhost',
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cloudmemberhub',
      options: {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      },
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-jwt-secret',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },
    cors: {
      origins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    },
    upload: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
      allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/gif'],
      path: process.env.UPLOAD_PATH || 'uploads/',
    },
    email: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME || 'CloudMemberHub',
      },
    },
    security: {
      bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
      passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
      lockoutTime: parseInt(process.env.LOCKOUT_TIME) || 30 * 60 * 1000,
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      file: process.env.LOG_FILE || 'logs/app.log',
      maxSize: process.env.LOG_MAX_SIZE || '10m',
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    },
  },

  test: {
    port: process.env.PORT || 5001,
    host: process.env.HOST || 'localhost',
    mongodb: {
      uri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cloudmemberhub_test',
      options: {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      },
    },
    jwt: {
      secret: 'test-jwt-secret',
      expiresIn: '1h',
      refreshSecret: 'test-refresh-secret',
      refreshExpiresIn: '1d',
    },
    cors: {
      origins: ['http://localhost:3000'],
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 1000,
    },
    upload: {
      maxFileSize: 5 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png'],
      path: 'test-uploads/',
    },
    security: {
      bcryptSaltRounds: 1,
      passwordMinLength: 6,
      maxLoginAttempts: 10,
      lockoutTime: 5 * 60 * 1000,
    },
    logging: {
      level: 'error',
      file: 'logs/test.log',
    },
  },

  production: {
    port: process.env.PORT || 5000,
    host: process.env.HOST || '0.0.0.0',
    mongodb: {
      uri: process.env.MONGODB_PROD_URI || process.env.MONGODB_URI,
      options: {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxIdleTimeMS: 30000,
        bufferMaxEntries: 0,
      },
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },
    cors: {
      origins: process.env.ALLOWED_ORIGINS?.split(',') || [],
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 50,
    },
    upload: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
      allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/gif'],
      path: process.env.UPLOAD_PATH || 'uploads/',
    },
    email: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME || 'CloudMemberHub',
      },
    },
    security: {
      bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
      passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
      lockoutTime: parseInt(process.env.LOCKOUT_TIME) || 30 * 60 * 1000,
    },
    logging: {
      level: process.env.LOG_LEVEL || 'warn',
      file: process.env.LOG_FILE || 'logs/app.log',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 10,
    },
  },
};

const env = process.env.NODE_ENV || 'development';

if (!config[env]) {
  throw new Error(`Configuration for environment "${env}" not found`);
}

module.exports = config[env];