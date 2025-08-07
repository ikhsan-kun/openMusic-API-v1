const amqp = require('amqplib');
const PlaylistsService = require('./PlaylistsService');
const MailSender = require('./MailSender');
const config = require('./config');

const init = async () => {
  const playlistsService = new PlaylistsService();
  const mailSender = new MailSender();
  const connection = await amqp.connect(config.rabbitMq.server);
  const channel = await connection.createChannel();

  await channel.assertQueue('export:playlist', {
    durable: true,
  });

  channel.consume('export:playlist', async (message) => {
    try {
      const { playlistId, targetEmail } = JSON.parse(message.content.toString());
      
      const playlist = await playlistsService.getPlaylistById(playlistId);
      const result = await mailSender.sendEmail(targetEmail, JSON.stringify({ playlist }));

      console.log(result);
      channel.ack(message);
    } catch (error) {
      console.error(error);
      channel.nack(message, false, false);
    }
  });
};

init();