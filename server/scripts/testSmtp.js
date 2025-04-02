import nodemailer from 'nodemailer';

// Access environment variables
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
// Ensure fromEmail has a local part if it starts with @
let fromEmail = process.env.FROM_EMAIL || smtpUser;
if (fromEmail.startsWith('@')) {
  fromEmail = 'noreply' + fromEmail;
  console.log(`⚠️ FROM_EMAIL starts with @, normalized to: ${fromEmail}`);
}

console.log('📋 SMTP CONFIGURATION:');
console.log(`- SMTP_HOST: ${smtpHost || 'not set'}`);
console.log(`- SMTP_PORT: ${smtpPort}`);
console.log(`- SMTP_USER: ${smtpUser ? 'set' : 'not set'}`);
console.log(`- SMTP_PASS: ${smtpPass ? 'set' : 'not set'}`);
console.log(`- SMTP_SECURE: ${smtpSecure}`);
console.log(`- FROM_EMAIL: ${fromEmail}`);

// Check if all required settings are available
if (!smtpHost || !smtpUser || !smtpPass) {
  console.error('❌ Missing required SMTP settings. Cannot test SMTP connectivity.');
  process.exit(1);
}

console.log(`🔄 Creating SMTP transport with: ${smtpHost}:${smtpPort} (secure: ${smtpSecure})`);

// Create transport
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  tls: {
    // Don't fail on invalid certs
    rejectUnauthorized: false
  }
});

// First verify connection
console.log('🔄 Verifying SMTP connection...');
transporter.verify((error) => {
  if (error) {
    console.error('❌ SMTP Verification Failed:', error.message);
    process.exit(1);
  } else {
    console.log('✅ SMTP connection verified successfully');
    
    // Proceed to send test email
    const testEmail = process.argv[2] || 'emailme@clarencewilliams.com';
    
    console.log(`🔄 Sending test email to ${testEmail}...`);
    
    transporter.sendMail({
      from: fromEmail,
      to: testEmail,
      subject: 'SMTP Test from MySmartScheduler',
      text: 'This is a test email sent from the SMTP testing script.',
      html: '<p>This is a test email sent from the SMTP testing script.</p>'
    }, (err, info) => {
      if (err) {
        console.error('❌ SMTP Test Email Failed:', err.message);
        process.exit(1);
      } else {
        console.log('✅ SMTP test email sent successfully');
        console.log(`- Message ID: ${info.messageId}`);
        console.log(`- Response: ${info.response}`);
        process.exit(0);
      }
    });
  }
});