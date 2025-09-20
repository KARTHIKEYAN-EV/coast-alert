const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create transporter
const createTransporter = () => {
  if (!process.env.EMAIL_SERVICE || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    logger.warn('Email service not configured properly. Email notifications will be disabled.');
    return null;
  }

  return nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    secure: true,
    pool: true,
    maxConnections: 3,
    maxMessages: 100
  });
};

const transporter = createTransporter();

// Test connection
const testConnection = async () => {
  if (!transporter) return false;
  
  try {
    await transporter.verify();
    logger.info('Email service connected successfully');
    return true;
  } catch (error) {
    logger.error('Email service connection failed:', error);
    return false;
  }
};

// Base email sending function
const sendEmail = async (mailOptions) => {
  if (!transporter) {
    logger.warn('Email service not available. Skipping email send.');
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      ...mailOptions
    });
    
    logger.info(`Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error('Email sending failed:', error);
    return false;
  }
};

// Welcome email template
const sendWelcomeEmail = async (email, fullName) => {
  const mailOptions = {
    to: email,
    subject: 'Welcome to Aquasentra - Ocean Hazard Monitoring System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">Welcome to Aquasentra</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">Ocean Hazard Monitoring System</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1e293b;">Hello ${fullName}!</h2>
          
          <p style="color: #475569; line-height: 1.6;">
            Thank you for joining Aquasentra, the crowdsourced ocean hazard monitoring platform. 
            Your participation helps keep coastal communities safe by providing real-time hazard information.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
            <h3 style="margin-top: 0; color: #1e293b;">What you can do:</h3>
            <ul style="color: #475569; line-height: 1.8;">
              <li>Submit hazard reports with photos and location data</li>
              <li>View verified reports on the interactive map</li>
              <li>Track your contribution to community safety</li>
              <li>Access real-time hazard alerts in your area</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}" style="background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Start Exploring
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 30px;">
            Need help? Contact our support team at support@aquasentra.com
          </p>
        </div>
      </div>
    `
  };

  return await sendEmail(mailOptions);
};

// Report verification notification
const sendReportVerificationEmail = async (email, fullName, reportId, status, rejectionReason = null) => {
  const statusColor = status === 'verified' ? '#10b981' : '#ef4444';
  const statusText = status === 'verified' ? 'Verified' : 'Rejected';
  
  const mailOptions = {
    to: email,
    subject: `Report ${statusText} - ${reportId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${statusColor}; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">Report ${statusText}</h2>
        </div>
        
        <div style="background: #f8fafc; padding: 30px;">
          <p>Hello ${fullName},</p>
          
          <p>Your hazard report <strong>${reportId}</strong> has been ${status.toLowerCase()}.</p>
          
          ${rejectionReason ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h4 style="color: #dc2626; margin-top: 0;">Rejection Reason:</h4>
              <p style="color: #991b1b; margin-bottom: 0;">${rejectionReason}</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/reports/${reportId}" 
               style="background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">
              View Report Details
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px;">
            Thank you for contributing to coastal community safety.
          </p>
        </div>
      </div>
    `
  };

  return await sendEmail(mailOptions);
};

// Critical report alert
const sendCriticalReportAlert = async (email, reportDetails) => {
  const mailOptions = {
    to: email,
    subject: `🚨 CRITICAL HAZARD ALERT - ${reportDetails.hazardType}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🚨 CRITICAL HAZARD ALERT</h1>
        </div>
        
        <div style="background: #fef2f2; padding: 30px; border: 2px solid #fecaca;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #dc2626; margin-top: 0;">Hazard Type: ${reportDetails.hazardType.replace('-', ' ').toUpperCase()}</h3>
            <p><strong>Severity:</strong> ${reportDetails.severity.toUpperCase()}</p>
            <p><strong>Location:</strong> ${reportDetails.address || `${reportDetails.location.lat}, ${reportDetails.location.lng}`}</p>
            <p><strong>Description:</strong> ${reportDetails.description}</p>
            <p><strong>Report ID:</strong> ${reportDetails.publicId}</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/map?reportId=${reportDetails.publicId}" 
               style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              VIEW ON MAP
            </a>
          </div>
          
          <div style="background: #fffbeb; border: 1px solid #fed7aa; padding: 15px; border-radius: 6px; margin-top: 20px;">
            <p style="margin: 0; color: #92400e; font-weight: bold;">
              ⚠️ This is an automated alert for critical ocean hazards. Take appropriate safety measures.
            </p>
          </div>
        </div>
      </div>
    `
  };

  return await sendEmail(mailOptions);
};

// Password reset email
const sendPasswordResetEmail = async (email, fullName, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    to: email,
    subject: 'Password Reset Request - Aquasentra',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0ea5e9; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">Password Reset Request</h2>
        </div>
        
        <div style="background: #f8fafc; padding: 30px;">
          <p>Hello ${fullName},</p>
          
          <p>You requested to reset your password for your Aquasentra account. Click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #0ea5e9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <div style="background: #fffbeb; border: 1px solid #fed7aa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
            </p>
          </div>
          
          <p style="color: #64748b; font-size: 14px;">
            If the button doesn't work, copy and paste this link: ${resetUrl}
          </p>
        </div>
      </div>
    `
  };

  return await sendEmail(mailOptions);
};

// Bulk notification for emergency alerts
const sendBulkEmergencyAlert = async (emailList, alertDetails) => {
  const promises = emailList.map(email => sendCriticalReportAlert(email, alertDetails));
  
  try {
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    logger.info(`Bulk emergency alert sent: ${successful} successful, ${failed} failed`);
    return { successful, failed };
  } catch (error) {
    logger.error('Bulk email sending failed:', error);
    return { successful: 0, failed: emailList.length };
  }
};

// Initialize email service
const initializeEmailService = async () => {
  if (await testConnection()) {
    logger.info('Email service initialized successfully');
    return true;
  } else {
    logger.warn('Email service initialization failed');
    return false;
  }
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendReportVerificationEmail,
  sendCriticalReportAlert,
  sendPasswordResetEmail,
  sendBulkEmergencyAlert,
  initializeEmailService,
  testConnection
};