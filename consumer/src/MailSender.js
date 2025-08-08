const nodemailer = require('nodemailer');
const config = require('./config');

class MailSender {
  constructor() {
    this._transporter = nodemailer.createTransporter({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    });
  }

  sendEmail(targetEmail, content) {
    const message = {
      from: config.smtp.user,
      to: targetEmail,
      subject: 'Ekspor Playlist',
      text: 'Terlampir hasil ekspor playlist Anda',
      attachments: [
        {
          filename: 'playlist.json',
          content: Buffer.from(content, 'utf-8'),
        },
      ],
    };

    return this._transporter.sendMail(message);
  }
}

module.exports = MailSender;