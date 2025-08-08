const amqp = require('amqplib');
const config = require('../../utils/config');

class ProducerService {
  constructor() {
    this._connection = null;
    this._channel = null;
  }

  async init() {
    this._connection = await amqp.connect(config.rabbitMq.server);
    this._channel = await this._connection.createChannel();
    
    await this._channel.assertQueue('export:playlist', {
      durable: true,
    });
  }

  sendMessage(queue, message) {
    this._channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
  }
}

module.exports = ProducerService;