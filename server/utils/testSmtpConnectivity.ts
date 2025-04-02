import nodemailer from 'nodemailer';

/**
 * Tests SMTP connectivity using the configured credentials
 * @returns Promise resolving to a test result object
 */
export async function testSmtpConnectivity() {
  console.log('🔍 TESTING SMTP CONNECTIVITY');
  
  // Check for required environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  
  console.log('📋 SMTP CONFIGURATION:');
  console.log(`- SMTP_HOST: ${smtpHost || 'not set'}`);
  console.log(`- SMTP_PORT: ${smtpPort}`);
  console.log(`- SMTP_USER: ${smtpUser ? 'set' : 'not set'}`);
  console.log(`- SMTP_PASS: ${smtpPass ? 'set' : 'not set'}`);
  console.log(`- SMTP_SECURE: ${smtpSecure}`);
  
  // Check if all required settings are available
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.error('❌ Missing required SMTP settings. Cannot test SMTP connectivity.');
    return {
      success: false,
      error: 'Missing SMTP configuration',
      smtpConfigured: false,
      details: {
        smtpHost: !!smtpHost,
        smtpUser: !!smtpUser,
        smtpPass: !!smtpPass
      }
    };
  }
  
  try {
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
    
    // Verify connection
    console.log('🔄 Verifying SMTP connection...');
    const verifyResult = await new Promise<boolean>((resolve) => {
      transporter.verify((error) => {
        if (error) {
          console.error('❌ SMTP Verification Failed:', error.message);
          resolve(false);
        } else {
          console.log('✅ SMTP connection verified successfully');
          resolve(true);
        }
      });
    });
    
    if (!verifyResult) {
      return {
        success: false,
        error: 'SMTP connection verification failed',
        smtpConfigured: true,
        details: {
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure
        }
      };
    }
    
    // Try sending a test email to null address (just testing connection)
    console.log('🔄 Testing SMTP connection with nodemailer...');
    
    try {
      // Create test email to a non-deliverable address
      const info = await transporter.sendMail({
        from: smtpUser,
        to: 'test-null@example.com',
        subject: 'SMTP Test',
        text: 'This is a test email to verify SMTP functionality.',
        html: '<p>This is a test email to verify SMTP functionality.</p>'
      });
      
      console.log('✅ SMTP test email accepted for delivery');
      console.log(`- Message ID: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        smtpConfigured: true,
        details: {
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          response: info.response
        }
      };
    } catch (sendError: any) {
      console.error('❌ SMTP test email sending failed:', sendError.message);
      return {
        success: false,
        error: sendError.message,
        smtpConfigured: true,
        details: {
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          errorCode: sendError.code,
          errorCommand: sendError.command
        }
      };
    }
  } catch (error: any) {
    console.error('❌ SMTP Transport Creation Error:', error.message);
    return {
      success: false,
      error: error.message,
      smtpConfigured: true,
      details: {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        errorStack: error.stack
      }
    };
  }
}

// If called directly, run the test
if (require.main === module) {
  testSmtpConnectivity()
    .then(result => {
      console.log('📊 SMTP TEST RESULTS:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ UNCAUGHT ERROR:', error);
      process.exit(1);
    });
}