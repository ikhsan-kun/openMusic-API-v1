const amqp = require('amqplib');
const PlaylistsService = require('./PlaylistsService');
const MailSender = require('./MailSender');
const config = require('./config');

const init = async () => {
  const playlistsService = new PlaylistsService();
  const mailSender = new MailSender();
  
  console.log('Starting consumer...');
  
  const connection = await amqp.connect(config.rabbitMq.server);
  const channel = await connection.createChannel();

  await channel.assertQueue('export:playlist', {
    durable: true,
  });

  console.log('Waiting for messages...');

  channel.consume('export:playlist', async (message) => {
    try {
      const { playlistId, targetEmail } = JSON.parse(message.content.toString());
      
      console.log(`Processing export for playlist: ${playlistId}`);
      
      const playlist = await playlistsService.getPlaylistById(playlistId);
      const result = await mailSender.sendEmail(targetEmail, JSON.stringify({ playlist }));

      console.log('Email sent successfully:', result.messageId);
      channel.ack(message);
    } catch (error) {
      console.error('Error processing message:', error);
      channel.nack(message, false, false);
    }
  });
};

init().catch(console.error);