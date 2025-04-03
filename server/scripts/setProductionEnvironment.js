#!/usr/bin/env node
// Production Environment Setup Script
// This script helps set up the required environment variables for production deployment
// Just follow the prompts to configure your email settings

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Fallback if chalk isn't available
let c = {
  green: text => `\x1b[32m${text}\x1b[0m`,
  yellow: text => `\x1b[33m${text}\x1b[0m`,
  red: text => `\x1b[31m${text}\x1b[0m`,
  blue: text => `\x1b[34m${text}\x1b[0m`,
  cyan: text => `\x1b[36m${text}\x1b[0m`,
  white: text => `\x1b[37m${text}\x1b[0m`,
  bold: text => `\x1b[1m${text}\x1b[0m`
};

try {
  c = chalk;
} catch (e) {
  console.log('Using fallback colors (chalk not available)');
}

// Get current file's directory
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to handle Q&A
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Validate email format
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Main function
async function main() {
  console.log(c.bold(c.blue('\n=== My Smart Scheduler - Production Environment Setup ===\n')));
  console.log('This script will help you configure the necessary environment variables\n' +
              'for email functionality in production.\n');
  
  // Check if we have existing smtp-config.json to use as defaults
  let defaults = {
    FROM_EMAIL: 'noreply@mysmartscheduler.co',
    SMTP_HOST: 'server.pushbutton-hosting.com',
    SMTP_PORT: '465',
    SMTP_USER: 'noreply@mysmartscheduler.co',
    SMTP_PASS: '', // Don't provide default password
    SMTP_SECURE: 'true'
  };
  
  const configPaths = [
    path.join(process.cwd(), 'smtp-config.json'),
    path.join(process.cwd(), 'server', 'smtp-config.json')
  ];
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        console.log(c.green(`Found existing config file at: ${configPath}`));
        const content = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(content);
        
        defaults = {
          FROM_EMAIL: config.FROM_EMAIL || defaults.FROM_EMAIL,
          SMTP_HOST: config.SMTP_HOST || defaults.SMTP_HOST,
          SMTP_PORT: config.SMTP_PORT || defaults.SMTP_PORT,
          SMTP_USER: config.SMTP_USER || defaults.SMTP_USER,
          SMTP_PASS: '', // Don't load password from file
          SMTP_SECURE: config.SMTP_SECURE || defaults.SMTP_SECURE
        };
        
        console.log('Loaded default values from config file\n');
        break;
      }
    } catch (err) {
      console.error(c.red(`Error loading config file: ${err.message}`));
    }
  }
  
  // Collect information
  const config = {};
  
  // FROM_EMAIL
  do {
    config.FROM_EMAIL = await ask(c.cyan(`Sender Email Address [${defaults.FROM_EMAIL}]: `));
    if (!config.FROM_EMAIL) config.FROM_EMAIL = defaults.FROM_EMAIL;
    
    if (!isValidEmail(config.FROM_EMAIL)) {
      console.log(c.red('Invalid email format. Email must include both username and domain parts.'));
      console.log(c.yellow('Example: noreply@example.com'));
    }
  } while (!isValidEmail(config.FROM_EMAIL));
  
  // SMTP_HOST
  config.SMTP_HOST = await ask(c.cyan(`SMTP Server Hostname [${defaults.SMTP_HOST}]: `));
  if (!config.SMTP_HOST) config.SMTP_HOST = defaults.SMTP_HOST;
  
  // SMTP_PORT
  config.SMTP_PORT = await ask(c.cyan(`SMTP Server Port [${defaults.SMTP_PORT}]: `));
  if (!config.SMTP_PORT) config.SMTP_PORT = defaults.SMTP_PORT;
  
  // SMTP_USER
  config.SMTP_USER = await ask(c.cyan(`SMTP Username [${defaults.SMTP_USER}]: `));
  if (!config.SMTP_USER) config.SMTP_USER = defaults.SMTP_USER;
  
  // SMTP_PASS
  config.SMTP_PASS = await ask(c.cyan('SMTP Password (required): '));
  
  // SMTP_SECURE
  let secureInput = await ask(c.cyan(`Use Secure Connection (true/false) [${defaults.SMTP_SECURE}]: `));
  config.SMTP_SECURE = (!secureInput) ? defaults.SMTP_SECURE : secureInput.toLowerCase() === 'true' ? 'true' : 'false';
  
  // Verify password is not empty
  if (!config.SMTP_PASS) {
    console.log(c.red('\nSMTP Password is required for email functionality.'));
    console.log('Please provide a valid password.');
    rl.close();
    return;
  }
  
  // Display the configuration
  console.log(c.bold('\n=== Configuration Summary ==='));
  console.log(c.cyan('FROM_EMAIL: ') + config.FROM_EMAIL);
  console.log(c.cyan('SMTP_HOST: ') + config.SMTP_HOST);
  console.log(c.cyan('SMTP_PORT: ') + config.SMTP_PORT);
  console.log(c.cyan('SMTP_USER: ') + config.SMTP_USER);
  console.log(c.cyan('SMTP_PASS: ') + '*'.repeat(8)); // Don't display actual password
  console.log(c.cyan('SMTP_SECURE: ') + config.SMTP_SECURE);
  
  // Generate environment variables and config file
  const envText = `
# Email Configuration
FROM_EMAIL=${config.FROM_EMAIL}
SMTP_HOST=${config.SMTP_HOST}
SMTP_PORT=${config.SMTP_PORT}
SMTP_USER=${config.SMTP_USER}
SMTP_PASS=${config.SMTP_PASS}
SMTP_SECURE=${config.SMTP_SECURE}
`;
  
  // Save to .env.production
  const envPath = path.join(process.cwd(), '.env.production');
  fs.writeFileSync(envPath, envText);
  
  // Save to smtp-config.json (for development)
  const configPath = path.join(process.cwd(), 'smtp-config.json');
  const configObject = {
    FROM_EMAIL: config.FROM_EMAIL,
    SMTP_HOST: config.SMTP_HOST,
    SMTP_PORT: config.SMTP_PORT,
    SMTP_USER: config.SMTP_USER,
    SMTP_PASS: config.SMTP_PASS,
    SMTP_SECURE: config.SMTP_SECURE,
    comment: "IMPORTANT: In production, use environment variables or secrets instead of this file!"
  };
  
  fs.writeFileSync(configPath, JSON.stringify(configObject, null, 2));
  
  console.log(c.green('\n✅ Configuration saved successfully!'));
  console.log(c.green(`✅ Environment variables saved to: ${envPath}`));
  console.log(c.green(`✅ Config file saved to: ${configPath}`));
  
  console.log(c.bold(c.yellow('\n=== IMPORTANT Production Deployment Instructions ===\n')));
  console.log('1. In your production environment, set these environment variables:');
  console.log(envText);
  console.log('2. Don\'t use the config file in production (it contains sensitive information).');
  console.log('3. Update your deployment settings to include these environment variables.');
  console.log('4. After deployment, test your email configuration with:');
  console.log('   node server/scripts/productionEmailDiagnostic.js your-email@example.com\n');
  
  rl.close();
}

main().catch(console.error);