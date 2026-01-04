// webconfig/webNodeMailer.js

import nodemailer from 'nodemailer';

/**
 * Web Email Transporter
 * Handles sending emails for web users via Nodemailer SMTP
 */

const webTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify transporter on startup (optional)
webTransporter.verify()
  .then(() => console.log('✅ Web email transporter ready'))
  .catch((err) => console.warn('⚠️ Web email transporter not configured:', err.message));

export default webTransporter;

