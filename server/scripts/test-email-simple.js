import nodemailer from 'nodemailer';

async function sendTestEmail() {
  console.log('===== EMAIL TEST =====');
  console.log('FROM_EMAIL:', process.env.FROM_EMAIL);
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'set' : 'not set');
  console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
  
  try {
    console.log('Creating SMTP transport...');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'server.pushbutton-hosting.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER || 'noreply@smart-scheduler.ai',
        pass: process.env.SMTP_PASS || 'Success2025'
      },
      connectionTimeout: 5000, // 5 seconds timeout for connection
      greetingTimeout: 5000,   // 5 seconds timeout for greeting
      socketTimeout: 10000,    // 10 seconds timeout for socket
      debug: true
    });
    
    console.log('SMTP transport created successfully');
    
    // Verify connection first
    console.log('Verifying SMTP connection...');
    const isVerified = await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('SMTP verification error:', error.message);
          reject(error);
        } else {
          console.log('SMTP server is ready to take our messages');
          resolve(success);
        }
      });
    });
    
    console.log('SMTP verification result:', isVerified);
    
    console.log('Sending test email to emailme@clarencewilliams.com...');
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@smart-scheduler.ai',
      to: "emailme@clarencewilliams.com",
      subject: "Test Email from SmartScheduler",
      text: "This is a test email to verify SMTP functionality.",
      html: "<h2>Email Test</h2><p>This is a test email to verify SMTP functionality in the SmartScheduler application.</p>"
    });
    
    console.log('Email sent!');
    console.log('Message ID:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error.message);
    console.error('Error code:', error.code);
    console.error('Error response:', error.response);
    throw error;
  }
}

// Add a timeout to the entire operation
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => {
    reject(new Error('Email sending operation timed out after 20 seconds'));
  }, 20000); // 20 seconds timeout
});

// Race between the normal operation and the timeout
Promise.race([sendTestEmail(), timeoutPromise])
  .then(result => console.log('Email sent successfully'))
  .catch(error => {
    console.error('Email sending failed:', error.message);
    
    // Additional diagnostics for timeout or connection issues
    if (error.message.includes('timed out')) {
      console.error('\nPossible causes of timeout:');
      console.error('1. Firewall blocking outbound SMTP connections');
      console.error('2. SMTP server unreachable or not responding');
      console.error('3. Network connectivity issues');
      console.error('4. Replit may be restricting outbound mail traffic');
    }
    
    process.exit(1); // Exit with error code
  });