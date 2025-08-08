const amqp = require('amqplib');
const PlaylistsService = require('./PlaylistsService');
const MailSender = require('./MailSender');
const config = require('./config');

const init = async () => {
  try {
    console.log('Starting consumer...');
    console.log('RabbitMQ Server:', config.rabbitMq.server);
    
    // Initialize services
    const playlistsService = new PlaylistsService();
    const mailSender = new MailSender();
    
    // Test database connection
    await playlistsService.testConnection();
    console.log('Database connection successful');
    
    // Connect to RabbitMQ with retry
    let connection;
    let retries = 5;
    
    while (retries > 0) {
      try {
        connection = await amqp.connect(config.rabbitMq.server);
        console.log('RabbitMQ connection successful');
        break;
      } catch (error) {
        retries--;
        console.log(`RabbitMQ connection failed. Retries left: ${retries}`);
        
        if (retries === 0) {
          throw error;
        }
        
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const channel = await connection.createChannel();

    // Ensure queue exists
    await channel.assertQueue('export:playlist', {
      durable: true,
    });

    console.log('Waiting for messages...');

    // Set prefetch to 1 to handle messages one by one
    await channel.prefetch(1);

    channel.consume('export:playlist', async (message) => {
      if (message === null) {
        console.log('Received null message');
        return;
      }

      try {
        const { playlistId, targetEmail } = JSON.parse(message.content.toString());
        
        console.log(`Processing export for playlist: ${playlistId} to ${targetEmail}`);
        
        const playlist = await playlistsService.getPlaylistById(playlistId);
        const exportData = {
          playlist: {
            id: playlist.id,
            name: playlist.name,
            songs: playlist.songs,
          },
        };
        
        await mailSender.sendEmail(targetEmail, JSON.stringify(exportData, null, 2));

        console.log(`Email sent successfully to ${targetEmail}`);
        channel.ack(message);
      } catch (error) {
        console.error('Error processing message:', error.message);
        
        // Reject and don't requeue to avoid infinite loop
        channel.nack(message, false, false);
      }
    });

    // Handle connection close
    connection.on('close', () => {
      console.log('RabbitMQ connection closed. Attempting to reconnect...');
      setTimeout(() => {
        init().catch(console.error);
      }, 2000);
    });

    // Handle connection error
    connection.on('error', (error) => {
      console.error('RabbitMQ connection error:', error.message);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully');
      await channel.close();
      await connection.close();
      await playlistsService.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('Received SIGINT, shutting down gracefully');
      await channel.close();
      await connection.close();
      await playlistsService.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start consumer:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Retry after 5 seconds
    console.log('Retrying in 5 seconds...');
    setTimeout(() => {
      init().catch(console.error);
    }, 5000);
  }
};

init().catch(console.error);