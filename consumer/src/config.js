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

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  process.exit(1);
}

const config = {
  database: {
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT, 10),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  },
  rabbitMq: {
    server: process.env.RABBITMQ_SERVER,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
  },
};

console.log('Configuration loaded successfully');
console.log('Database host:', config.database.host);
console.log('RabbitMQ server:', config.rabbitMq.server);
console.log('SMTP host:', config.smtp.host);

module.exports = config;