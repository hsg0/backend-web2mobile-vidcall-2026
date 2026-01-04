// mobileconfig/mobileNodeMailer.js

import nodemailer from 'nodemailer';

/**
 * Mobile Email Transporter
 * Handles sending emails for mobile users via Nodemailer SMTP
 */

const mobileTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify transporter on startup (optional)
mobileTransporter.verify()
  .then(() => console.log('✅ Mobile email transporter ready'))
  .catch((err) => console.warn('⚠️ Mobile email transporter not configured:', err.message));

export default mobileTransporter;

