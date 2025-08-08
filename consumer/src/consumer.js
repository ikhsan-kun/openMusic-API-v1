const amqp = require('amqplib');
const PlaylistsService = require('./PlaylistsService');
const MailSender = require('./MailSender');
const config = require('./config');

const init = async () => {
  let connection = null;
  let channel = null;
  let playlistsService = null;
  let mailSender = null;

  try {
    console.log('Starting consumer...');
    console.log('RabbitMQ Server:', config.rabbitMq.server);
    
    // Initialize services dengan error handling
    playlistsService = new PlaylistsService();
    mailSender = new MailSender();
    
    // Test database connection dengan timeout
    console.log('Testing database connection...');
    await Promise.race([
      playlistsService.testConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 10000)
      )
    ]);
    console.log('Database connection successful');
    
    // Connect to RabbitMQ dengan robust retry dan connection options
    console.log('Connecting to RabbitMQ...');
    connection = await connectToRabbitMQ();
    
    // Setup channel dengan error handling
    channel = await connection.createChannel();
    
    // Set connection heartbeat dan socket options
    connection.on('blocked', (reason) => {
      console.warn('Connection blocked:', reason);
    });
    
    connection.on('unblocked', () => {
      console.log('Connection unblocked');
    });

    // Ensure queue exists dengan durable option
    const queueName = 'export:playlist';
    await channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-message-ttl': 300000, // 5 minutes TTL
        'x-max-retries': 3
      }
    });

    console.log(`Waiting for messages in queue: ${queueName}`);

    // Set prefetch dengan reasonable limit
    await channel.prefetch(1);

    // Setup consumer dengan comprehensive error handling
    const consumerTag = await channel.consume(queueName, async (message) => {
      if (message === null) {
        console.log('Received null message');
        return;
      }

      const messageId = message.properties.messageId || 'unknown';
      console.log(`Processing message ${messageId}`);

      try {
        const messageContent = message.content.toString();
        console.log('Message content:', messageContent);
        
        const { playlistId, targetEmail } = JSON.parse(messageContent);
        
        if (!playlistId || !targetEmail) {
          throw new Error('Missing required fields: playlistId or targetEmail');
        }
        
        console.log(`Exporting playlist ${playlistId} to ${targetEmail}`);
        
        // Get playlist dengan timeout
        const playlist = await Promise.race([
          playlistsService.getPlaylistById(playlistId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Playlist query timeout')), 30000)
          )
        ]);
        
        const exportData = {
          playlist: {
            id: playlist.id,
            name: playlist.name,
            songs: playlist.songs,
          },
        };
        
        // Send email dengan timeout
        await Promise.race([
          mailSender.sendEmail(targetEmail, JSON.stringify(exportData, null, 2)),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email sending timeout')), 60000)
          )
        ]);

        console.log(`Export completed successfully for playlist ${playlistId}`);
        channel.ack(message);
        
      } catch (error) {
        console.error(`Error processing message ${messageId}:`, error.message);
        console.error('Stack trace:', error.stack);
        
        // Check retry count
        const retryCount = (message.properties.headers?.['x-retry-count'] || 0) + 1;
        const maxRetries = 3;
        
        if (retryCount <= maxRetries) {
          console.log(`Retrying message ${messageId}, attempt ${retryCount}/${maxRetries}`);
          
          // Requeue with retry count
          const retryHeaders = {
            ...message.properties.headers,
            'x-retry-count': retryCount
          };
          
          await channel.publish('', queueName, message.content, {
            ...message.properties,
            headers: retryHeaders
          });
          
          channel.ack(message);
        } else {
          console.error(`Max retries exceeded for message ${messageId}, rejecting`);
          channel.nack(message, false, false);
        }
      }
    }, {
      noAck: false,
      consumerTag: `consumer-${Date.now()}`
    });

    console.log(`Consumer started with tag: ${consumerTag}`);

    // Handle connection events
    setupConnectionHandlers(connection, channel, playlistsService);

    // Graceful shutdown handlers
    setupGracefulShutdown(connection, channel, playlistsService, consumerTag);

  } catch (error) {
    console.error('Failed to start consumer:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Cleanup resources
    await cleanupResources(connection, channel, playlistsService);
    
    // Retry with exponential backoff
    const retryDelay = Math.min(30000, 5000 * Math.pow(2, (global.retryCount || 0)));
    global.retryCount = (global.retryCount || 0) + 1;
    
    console.log(`Retrying in ${retryDelay / 1000} seconds... (attempt ${global.retryCount})`);
    setTimeout(() => {
      init().catch(console.error);
    }, retryDelay);
  }
};

// Fungsi helper untuk koneksi RabbitMQ dengan retry
async function connectToRabbitMQ(maxRetries = 5) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`RabbitMQ connection attempt ${attempt}/${maxRetries}`);
      
      const connection = await amqp.connect(config.rabbitMq.server, {
        heartbeat: 30,
        connectionTimeout: 10000,
        socketOptions: {
          timeout: 10000,
          keepAlive: true,
          keepAliveDelay: 30000
        }
      });
      
      console.log('RabbitMQ connection successful');
      global.retryCount = 0; // Reset retry count on successful connection
      return connection;
      
    } catch (error) {
      lastError = error;
      console.error(`RabbitMQ connection attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = 2000 * attempt;
        console.log(`Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed to connect to RabbitMQ after ${maxRetries} attempts: ${lastError.message}`);
}

// Setup connection event handlers
function setupConnectionHandlers(connection, channel, playlistsService) {
  connection.on('close', (error) => {
    console.warn('RabbitMQ connection closed:', error?.message || 'Unknown reason');
    console.log('Attempting to reconnect...');
    setTimeout(() => {
      init().catch(console.error);
    }, 5000);
  });

  connection.on('error', (error) => {
    console.error('RabbitMQ connection error:', error.message);
    // Connection will be automatically closed after this event
  });

  channel.on('error', (error) => {
    console.error('RabbitMQ channel error:', error.message);
  });

  channel.on('close', (error) => {
    console.warn('RabbitMQ channel closed:', error?.message || 'Unknown reason');
  });
}

// Setup graceful shutdown
function setupGracefulShutdown(connection, channel, playlistsService, consumerTag) {
  const gracefulShutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    
    try {
      // Cancel consumer
      if (channel && consumerTag) {
        await channel.cancel(consumerTag);
        console.log('Consumer cancelled');
      }
      
      await cleanupResources(connection, channel, playlistsService);
      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error.message);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error.message);
    console.error('Stack trace:', error.stack);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
}

// Cleanup resources
async function cleanupResources(connection, channel, playlistsService) {
  const cleanup = async (resource, name, cleanupFn) => {
    if (resource) {
      try {
        await cleanupFn(resource);
        console.log(`${name} closed successfully`);
      } catch (error) {
        console.error(`Error closing ${name}:`, error.message);
      }
    }
  };

  await cleanup(channel, 'Channel', (ch) => ch.close());
  await cleanup(connection, 'Connection', (conn) => conn.close());
  await cleanup(playlistsService, 'Database', (service) => service.close());
}

// Start the consumer
init().catch(console.error);