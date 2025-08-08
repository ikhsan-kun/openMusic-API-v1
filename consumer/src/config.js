require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = [
  'PGUSER',
  'PGPASSWORD', 
  'PGDATABASE',
  'PGHOST',
  'PGPORT',
  'RABBITMQ_SERVER',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_HOST',
  'SMTP_PORT',
];

const missingVars = requiredEnvVars.filter(varName => {
  const value = process.env[varName];
  return !value || value.trim() === '';
});

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Parse and validate numeric values
const pgPort = parseInt(process.env.PGPORT, 10);
const smtpPort = parseInt(process.env.SMTP_PORT, 10);

if (isNaN(pgPort) || pgPort <= 0 || pgPort > 65535) {
  console.error('❌ Invalid PGPORT value. Must be a valid port number (1-65535)');
  process.exit(1);
}

if (isNaN(smtpPort) || smtpPort <= 0 || smtpPort > 65535) {
  console.error('❌ Invalid SMTP_PORT value. Must be a valid port number (1-65535)');
  process.exit(1);
}

// Validate RabbitMQ URL format
const rabbitmqUrl = process.env.RABBITMQ_SERVER;
if (!rabbitmqUrl.startsWith('amqp://') && !rabbitmqUrl.startsWith('amqps://')) {
  console.warn('⚠️ RabbitMQ server URL should start with amqp:// or amqps://');
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(process.env.SMTP_USER)) {
  console.error('❌ Invalid SMTP_USER format. Must be a valid email address.');
  process.exit(1);
}

const config = {
  database: {
    host: process.env.PGHOST,
    port: pgPort,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    // Additional database options for stability
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
    query_timeout: parseInt(process.env.PG_QUERY_TIMEOUT, 10) || 30000,
    statement_timeout: parseInt(process.env.PG_STATEMENT_TIMEOUT, 10) || 60000,
  },
  rabbitMq: {
    server: rabbitmqUrl,
    // Additional RabbitMQ options
    heartbeat: parseInt(process.env.RABBITMQ_HEARTBEAT, 10) || 30,
    connectionTimeout: parseInt(process.env.RABBITMQ_CONNECTION_TIMEOUT, 10) || 10000,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: smtpPort,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    // Additional SMTP options
    secure: smtpPort === 465, // true for 465, false for other ports
    requireTLS: process.env.SMTP_REQUIRE_TLS === 'true',
  },
  // Application settings
  app: {
    logLevel: process.env.LOG_LEVEL || 'info',
    environment: process.env.NODE_ENV || 'development',
    maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY, 10) || 5000,
  }
};

// Log configuration (mask sensitive data)
console.log('✅ Configuration loaded successfully');
console.log('📊 Configuration summary:');
console.log(`  - Environment: ${config.app.environment}`);
console.log(`  - Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
console.log(`  - RabbitMQ: ${config.rabbitMq.server.replace(/\/\/.*@/, '//***:***@')}`);
console.log(`  - SMTP: ${config.smtp.host}:${config.smtp.port} (${config.smtp.user})`);
console.log(`  - Max Retries: ${config.app.maxRetries}`);

module.exports = config;