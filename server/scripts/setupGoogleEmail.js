/**
 * Google Email Setup Utility
 * 
 * Interactive script to help set up Google Enterprise Email configuration.
 * This will guide you through the process of setting up Google Email
 * for your Smart Scheduler application.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Ask a question and get the answer
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Ask a yes/no question with default
async function askYesNo(question, defaultValue = true) {
  const defaultText = defaultValue ? 'Y/n' : 'y/N';
  const answer = await askQuestion(`${question} [${defaultText}]: `);
  if (answer.trim() === '') {
    return defaultValue;
  }
  return answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
}

// Ask for a password (hidden input)
function askPassword(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    
    // Save the current settings
    stdin.setRawMode(true);
    stdin.resume();
    stdout.write(question);
    
    let password = '';
    
    // Handle keypress events
    stdin.on('data', function handler(ch) {
      ch = ch.toString('utf8');
      
      // On Enter key
      if (ch === '\r' || ch === '\n') {
        stdout.write('\n');
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', handler);
        resolve(password);
        return;
      }
      
      // On Backspace or Delete
      if (ch === '\u0008' || ch === '\u007f') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          stdout.write('\b \b'); // Erase character from screen
        }
        return;
      }
      
      // On Ctrl+C
      if (ch === '\u0003') {
        stdout.write('\n');
        process.exit();
      }
      
      // Otherwise add to password
      password += ch;
      stdout.write('*');
    });
  });
}

// Test Google SMTP connection
async function testGoogleSMTP(email, password) {
  console.log(`\n${colors.blue}Testing Google SMTP connection...${colors.reset}`);
  
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: email,
        pass: password
      }
    });
    
    await transporter.verify();
    console.log(`${colors.green}✅ Connection successful! Your credentials are working.${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Connection failed:${colors.reset} ${error.message}`);
    
    if (error.code === 'EAUTH') {
      console.error(`${colors.yellow}This is likely due to one of the following:${colors.reset}`);
      console.error('1. Incorrect email or password');
      console.error('2. You need to use an App Password (if you have 2FA enabled)');
      console.error('3. Your Google account has security restrictions');
      
      console.log(`\n${colors.cyan}To create an App Password:${colors.reset}`);
      console.log('1. Go to https://myaccount.google.com/apppasswords');
      console.log('2. Sign in with your Google account');
      console.log('3. Select "App: Mail" and "Device: Other (Custom name)"');
      console.log('4. Enter a name like "Smart Scheduler" and click "Generate"');
      console.log('5. Use the generated 16-character password (without spaces)');
    }
    
    return false;
  }
}

// Save configuration to .env file
async function saveConfiguration(email, password, displayName) {
  const envFilePath = path.join(process.cwd(), '.env');
  
  console.log(`\n${colors.blue}Saving configuration to .env file...${colors.reset}`);
  
  try {
    // Read existing .env file if it exists
    let envContent = '';
    if (fs.existsSync(envFilePath)) {
      envContent = fs.readFileSync(envFilePath, 'utf8');
      
      // Remove existing Google Email variables
      envContent = envContent
        .split('\n')
        .filter(line => !line.trim().startsWith('GOOGLE_EMAIL') && !line.trim().startsWith('# Google Email'))
        .join('\n');
    }
    
    // Add new configuration
    const newConfig = `
# Google Email Configuration
GOOGLE_EMAIL=${email}
GOOGLE_EMAIL_PASSWORD=${password}
${displayName ? `GOOGLE_EMAIL_NAME=${displayName}` : '# GOOGLE_EMAIL_NAME is optional and not set'}
`;
    
    // Write the updated configuration
    fs.writeFileSync(envFilePath, `${envContent.trim()}\n${newConfig}`);
    
    console.log(`${colors.green}✅ Configuration saved to ${envFilePath}${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Error saving configuration:${colors.reset} ${error.message}`);
    return false;
  }
}

// Generate production environment variables snippet
function generateProductionEnvSnippet(email, password, displayName) {
  return `
# Google Email Configuration for Production
GOOGLE_EMAIL=${email}
GOOGLE_EMAIL_PASSWORD=${password}
${displayName ? `GOOGLE_EMAIL_NAME=${displayName}` : '# GOOGLE_EMAIL_NAME is optional and not set'}
`;
}

// Main function
async function setupGoogleEmail() {
  console.log(`${colors.cyan}=====================================${colors.reset}`);
  console.log(`${colors.cyan}  GOOGLE EMAIL SETUP UTILITY ${colors.reset}`);
  console.log(`${colors.cyan}=====================================${colors.reset}`);
  console.log(`This utility will help you set up Google Enterprise Email`);
  console.log(`for your Smart Scheduler application.\n`);
  
  // Check if .env file exists
  const envFilePath = path.join(process.cwd(), '.env');
  let existingConfig = {
    email: null,
    password: null,
    displayName: null
  };
  
  // Load existing configuration if available
  if (fs.existsSync(envFilePath)) {
    const envContent = fs.readFileSync(envFilePath, 'utf8');
    const emailMatch = envContent.match(/GOOGLE_EMAIL=(.+)/);
    const nameMatch = envContent.match(/GOOGLE_EMAIL_NAME=(.+)/);
    
    if (emailMatch) {
      existingConfig.email = emailMatch[1].trim();
      console.log(`${colors.yellow}Found existing Google Email configuration:${colors.reset}`);
      console.log(`- Email: ${existingConfig.email}`);
      
      if (nameMatch) {
        existingConfig.displayName = nameMatch[1].trim();
        console.log(`- Display Name: ${existingConfig.displayName}`);
      }
      
      const useExisting = await askYesNo('Use existing email configuration?');
      if (!useExisting) {
        existingConfig.email = null;
        existingConfig.displayName = null;
      }
    }
  }
  
  // Get Google Email address
  let email = existingConfig.email;
  if (!email) {
    email = await askQuestion(`${colors.blue}Enter your Google Workspace email address:${colors.reset} `);
    if (!email) {
      console.error(`${colors.red}Email address is required.${colors.reset}`);
      return;
    }
    
    // Validate email format
    if (!email.includes('@')) {
      console.error(`${colors.red}Invalid email format. Please enter a valid email address.${colors.reset}`);
      return;
    }
  }
  
  // Get password
  let password = existingConfig.password;
  if (!password) {
    console.log(`\n${colors.yellow}Important Note:${colors.reset}`);
    console.log(`If you have 2-Factor Authentication enabled on your Google account,`);
    console.log(`you'll need to use an App Password instead of your regular password.`);
    console.log(`You can create an App Password at: https://myaccount.google.com/apppasswords\n`);
    
    password = await askPassword(`${colors.blue}Enter your password or App Password:${colors.reset} `);
    if (!password) {
      console.error(`${colors.red}Password is required.${colors.reset}`);
      return;
    }
  } else {
    console.log(`Using existing password (hidden)`);
  }
  
  // Get display name (optional)
  let displayName = existingConfig.displayName;
  if (!displayName) {
    displayName = await askQuestion(`${colors.blue}Enter display name (optional, e.g., "My Smart Scheduler"):${colors.reset} `);
  }
  
  // Test connection
  const connectionSuccessful = await testGoogleSMTP(email, password);
  if (!connectionSuccessful) {
    const retry = await askYesNo(`${colors.yellow}Would you like to try again with different credentials?${colors.reset}`);
    if (retry) {
      rl.close();
      return setupGoogleEmail(); // Restart the setup process
    } else {
      console.log(`${colors.red}Setup aborted.${colors.reset}`);
      rl.close();
      return;
    }
  }
  
  // Save configuration
  const saveSuccessful = await saveConfiguration(email, password, displayName);
  if (!saveSuccessful) {
    console.error(`${colors.red}Failed to save configuration.${colors.reset}`);
    rl.close();
    return;
  }
  
  // Generate production configuration snippet
  const productionSnippet = generateProductionEnvSnippet(email, password, displayName);
  
  console.log(`\n${colors.green}=== SETUP COMPLETE! ===${colors.reset}`);
  console.log(`\n${colors.cyan}Your Google Email configuration has been set up successfully.${colors.reset}`);
  console.log(`The configuration has been saved to your local .env file.`);
  
  console.log(`\n${colors.yellow}For production environments, add the required variables to your environment.${colors.reset}`);
  
  // Ask if they want to run a test
  const runTest = await askYesNo(`\n${colors.blue}Would you like to run a test to verify the configuration?${colors.reset}`);
  if (runTest) {
    const testEmail = await askQuestion(`${colors.blue}Enter email address to send test to:${colors.reset} `);
    if (testEmail) {
      console.log(`\n${colors.blue}Running test script...${colors.reset}`);
      
      // Run the test script
      const testProcess = exec(`node server/scripts/testGoogleEmailDelivery.js ${testEmail}`);
      
      testProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
      });
      
      testProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
      
      testProcess.on('exit', (code) => {
        if (code === 0) {
          console.log(`\n${colors.green}Test completed successfully!${colors.reset}`);
        } else {
          console.error(`\n${colors.red}Test failed with exit code ${code}.${colors.reset}`);
        }
        
        finishSetup();
      });
    } else {
      finishSetup();
    }
  } else {
    finishSetup();
  }
}

function finishSetup() {
  console.log(`\n${colors.cyan}Thank you for setting up Google Email for Smart Scheduler!${colors.reset}`);
  console.log(`Your application will now use Google Email for all email communications.`);
  console.log(`${colors.green}For more information, see GOOGLE-EMAIL-SETUP.md${colors.reset}`);
  
  rl.close();
}

// Run the setup
setupGoogleEmail().catch(error => {
  console.error(`${colors.red}An unexpected error occurred:${colors.reset}`, error);
  rl.close();
});