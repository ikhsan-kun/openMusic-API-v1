const nodemailer = require('nodemailer');
const config = require('./config');

class MailSender {
  constructor() {
    this._transporter = null;
    this.createTransporter();
  }

  createTransporter() {
    try {
      this._transporter = nodemailer.createTransporter({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465, // true for 465, false for other ports
        auth: {
          user: config.smtp.user,
          pass: config.smtp.password,
        },
        // Enhanced timeout and connection settings
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000,    // 30 seconds
        socketTimeout: 60000,      // 60 seconds
        // Pool settings untuk reuse connections
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        // TLS settings
        tls: {
          rejectUnauthorized: false, // For development/testing
          minVersion: 'TLSv1.2'
        },
        // Retry settings
        retryDelay: 5000,
        maxRetries: 3,
      });

      // Setup event listeners
      this._transporter.on('idle', () => {
        console.log('SMTP transporter is idle');
      });

      this._transporter.on('token', (token) => {
        console.log('SMTP token updated:', token.user);
      });

      console.log('SMTP transporter created successfully');
      
      // Verify connection asynchronously
      this.verifyConnection();
      
    } catch (error) {
      console.error('Failed to create SMTP transporter:', error.message);
      throw error;
    }
  }

  async verifyConnection(retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`SMTP connection verification attempt ${attempt}/${retries}`);
        await this._transporter.verify();
        console.log('SMTP connection verified successfully');
        return true;
      } catch (error) {
        console.error(`SMTP verification attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries) {
          console.error('SMTP connection verification failed after all attempts');
          // Don't throw error, just log it - email might still work
          return false;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  async sendEmail(targetEmail, content, retries = 3) {
    if (!this._transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    // Validate inputs
    if (!targetEmail || !targetEmail.includes('@')) {
      throw new Error('Invalid target email address');
    }

    if (!content) {
      throw new Error('Email content is required');
    }

    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Sending email attempt ${attempt}/${retries} to ${targetEmail}`);
        
        const message = {
          from: `"OpenMusic API" <${config.smtp.user}>`,
          to: targetEmail,
          subject: 'Ekspor Playlist OpenMusic',
          text: 'Terlampir hasil ekspor playlist Anda dalam format JSON.',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
                🎵 Ekspor Playlist OpenMusic
              </h2>
              <div style="padding: 20px; background-color: #f8f9fa; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;">Halo,</p>
                <p style="margin: 0 0 10px 0;">Terlampir adalah hasil ekspor playlist Anda dalam format JSON.</p>
                <p style="margin: 0 0 10px 0;">Anda dapat menggunakan file ini untuk backup atau import ke aplikasi lain.</p>
              </div>
              <div style="padding: 15px; background-color: #e9ecef; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                  <strong>Catatan:</strong> File ini berisi daftar lagu dalam playlist Anda. 
                  Simpan file ini dengan aman.
                </p>
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Terima kasih telah menggunakan OpenMusic API!<br>
                <em>Tim OpenMusic</em>
              </p>
            </div>
          `,
          attachments: [
            {
              filename: `playlist-export-${Date.now()}.json`,
              content: Buffer.from(content, 'utf-8'),
              contentType: 'application/json',
              cid: 'playlist-export'
            },
          ],
          // Email options
          priority: 'normal',
          headers: {
            'X-Mailer': 'OpenMusic API Consumer v1.0',
            'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN'
          }
        };

        const info = await this._transporter.sendMail(message);
        
        console.log('Email sent successfully:', {
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
          envelope: info.envelope,
          response: info.response
        });
        
        // Check if email was rejected
        if (info.rejected && info.rejected.length > 0) {
          throw new Error(`Email rejected for: ${info.rejected.join(', ')}`);
        }
        
        return info;
        
      } catch (error) {
        lastError = error;
        console.error(`Email sending attempt ${attempt} failed:`, error.message);
        
        // Check if it's a permanent error (don't retry)
        const permanentErrors = [
          'Invalid login',
          'Authentication failed',
          'Invalid recipients',
          'Message rejected'
        ];
        
        const isPermanentError = permanentErrors.some(errText => 
          error.message.toLowerCase().includes(errText.toLowerCase())
        );
        
        if (isPermanentError) {
          console.error('Permanent error detected, not retrying');
          break;
        }
        
        if (attempt < retries) {
          const delay = 5000 * attempt; // Exponential backoff
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Recreate transporter if connection error
          if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            console.log('Recreating SMTP transporter due to connection error...');
            this.createTransporter();
          }
        }
      }
    }
    
    throw new Error(`Email sending failed after ${retries} attempts: ${lastError.message}`);
  }

  // Close transporter connections
  async close() {
    if (this._transporter) {
      try {
        this._transporter.close();
        console.log('SMTP transporter closed');
      } catch (error) {
        console.error('Error closing SMTP transporter:', error.message);
      }
    }
  }

  // Test email sending
  async testEmail(targetEmail) {
    const testContent = JSON.stringify({
      test: true,
      message: 'This is a test export',
      timestamp: new Date().toISOString()
    }, null, 2);

    try {
      await this.sendEmail(targetEmail, testContent);
      console.log('Test email sent successfully');
      return true;
    } catch (error) {
      console.error('Test email failed:', error.message);
      return false;
    }
  }
}

module.exports = MailSender;