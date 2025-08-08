const nodemailer = require('nodemailer');
const config = require('./config');

class MailSender {
  constructor() {
    this._transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
      // Add timeout and connection limits
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000,    // 30 seconds
      socketTimeout: 60000,      // 60 seconds
    });

    // Verify SMTP connection
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this._transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (error) {
      console.error('SMTP connection verification failed:', error.message);
    }
  }

  async sendEmail(targetEmail, content) {
    try {
      const message = {
        from: `"OpenMusic API" <${config.smtp.user}>`,
        to: targetEmail,
        subject: 'Ekspor Playlist OpenMusic',
        text: 'Terlampir hasil ekspor playlist Anda dalam format JSON.',
        html: `
          <h2>Ekspor Playlist OpenMusic</h2>
          <p>Halo,</p>
          <p>Terlampir adalah hasil ekspor playlist Anda dalam format JSON.</p>
          <p>Terima kasih telah menggunakan OpenMusic API!</p>
        `,
        attachments: [
          {
            filename: 'playlist.json',
            content: Buffer.from(content, 'utf-8'),
            contentType: 'application/json',
          },
        ],
      };

      const info = await this._transporter.sendMail(message);
      console.log('Email sent successfully:', {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      });
      
      return info;
    } catch (error) {
      console.error('Failed to send email:', error.message);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }
}

module.exports = MailSender;