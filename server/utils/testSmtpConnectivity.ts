import nodemailer from 'nodemailer';

interface SmtpTestResult {
  success: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  error?: string;
  connectionVerified?: boolean;
  authVerified?: boolean;
  fromEmail?: string;
  responseTime?: number;
  capabilities?: string[];
}

/**
 * Tests SMTP connectivity using the configured credentials
 * @returns Promise resolving to a test result object
 */
export async function testSmtpConnectivity(): Promise<SmtpTestResult> {
  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    
    console.log('🔄 SMTP connectivity test - configuration:');
    console.log(`- Host: ${smtpHost || 'not set'}`);
    console.log(`- Port: ${smtpPort}`);
    console.log(`- Secure: ${smtpSecure}`);
    console.log(`- Username: ${smtpUser ? 'set' : 'not set'}`);
    console.log(`- Password: ${smtpPass ? 'set' : 'not set'}`);
    
    // Ensure fromEmail has a local part if it starts with @
    let fromEmail = process.env.FROM_EMAIL || smtpUser || '';
    if (fromEmail && fromEmail.startsWith('@')) {
      fromEmail = 'noreply' + fromEmail;
      console.log(`⚠️ FROM_EMAIL starts with @, normalized to: ${fromEmail}`);
    }
    
    // Check if all required settings are available
    if (!smtpHost || !smtpUser || !smtpPass) {
      return {
        success: false,
        error: 'Missing required SMTP settings. Cannot test SMTP connectivity.',
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        fromEmail
      };
    }
    
    console.log(`🔄 Creating SMTP transport with: ${smtpHost}:${smtpPort} (secure: ${smtpSecure})`);
    
    const startTime = Date.now();
    
    // Create transport with detailed debug options
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        // Don't fail on invalid certs in testing
        rejectUnauthorized: false
      },
      debug: true,
      logger: true
    });
    
    // First verify connection
    console.log('🔄 Verifying SMTP connection...');
    
    try {
      // Use Promise to properly capture errors
      await new Promise<void>((resolve, reject) => {
        transporter.verify((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      
      console.log('✅ SMTP connection verified successfully');
      
      const responseTime = Date.now() - startTime;
      
      // Get SMTP capabilities if available
      const capabilities: string[] = [];
      
      // @ts-ignore (accessing internal properties)
      if (transporter.transporter && transporter.transporter.smtp && transporter.transporter.smtp._capabilities) {
        // @ts-ignore
        for (const cap of Object.keys(transporter.transporter.smtp._capabilities)) {
          capabilities.push(cap);
        }
      }
      
      return {
        success: true,
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        fromEmail,
        connectionVerified: true,
        authVerified: true,
        responseTime,
        capabilities
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ SMTP Connection/Auth Failed:', errorMessage);
      
      return {
        success: false,
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        fromEmail,
        connectionVerified: false,
        authVerified: false,
        error: errorMessage
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ SMTP Testing Error:', errorMessage);
    
    return {
      success: false,
      error: `General error: ${errorMessage}`
    };
  }
}