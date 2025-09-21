const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter;

// Initialize transporter with Ethereal
const initializeTransporter = async () => {
  try {
    // Create a test account on Ethereal
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    logger.info('✅ Ethereal email service connected. Test emails will work.');
    logger.info(`Ethereal account user: ${testAccount.user}`);
    logger.info(`Ethereal account pass: ${testAccount.pass}`);
  } catch (error) {
    logger.error('❌ Failed to initialize Ethereal email service:', error);
    transporter = null;
  }
};

// Call once at startup
initializeTransporter();

/**
 * Send a test email
 */
const sendWelcomeEmail = async (email, firstName) => {
  if (!transporter) {
    logger.warn(`⚠️ Email service not available. Skipping email to ${email}`);
    return;
  }

  const mailOptions = {
    from: `"Aquasentra Dev" <no-reply@aquasentra.com>`,
    to: email,
    subject: 'Welcome to Aquasentra!',
    html: `<h1>Hello, ${firstName}!</h1><p>Welcome to the Aquasentra platform.</p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`📧 Test email sent: ${info.messageId}`);
    logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (err) {
    logger.error(`❌ Failed to send email to ${email}:`, err);
  }
};

module.exports = { sendWelcomeEmail };
