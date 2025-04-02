/**
 * Email Diagnostics Page Generator
 * 
 * This script creates an HTML page with detailed information about
 * the email configuration and diagnostics results.
 * 
 * Usage: node server/scripts/generateDiagnosticsPage.js
 */

import fs from 'fs';
import path from 'path';
import { runSmtpDiagnostics } from '../utils/testSmtpDiagnostics.js';
import { emailService } from '../utils/emailService.js';

// Path to diagnostic HTML output
const outputFile = path.join(process.cwd(), 'server', 'diagnostics.html');

// Run the diagnostics and generate the page
async function generateDiagnosticsPage() {
  console.log('Running diagnostics...');
  
  // Get current time
  const now = new Date();
  const diagnosticsResult = await runSmtpDiagnostics();
  
  // Get email service info
  const fromEmail = emailService.getFromEmail();
  
  // Load SMTP config if possible
  let smtpConfig = {};
  try {
    // Try to find the config file
    const configPaths = [
      path.join(process.cwd(), 'smtp-config.json'),
      path.join(process.cwd(), 'server', 'smtp-config.json')
    ];
    
    let configPath = null;
    for (const path of configPaths) {
      if (fs.existsSync(path)) {
        configPath = path;
        break;
      }
    }
    
    if (configPath) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      smtpConfig = JSON.parse(configContent);
      // Hide password for security
      if (smtpConfig.pass) {
        smtpConfig.pass = '********';
      }
    }
  } catch (error) {
    console.error('Failed to load SMTP config:', error);
  }
  
  // Environment variables (hide sensitive values)
  const envVars = {
    SMTP_HOST: process.env.SMTP_HOST || '[not set]',
    SMTP_PORT: process.env.SMTP_PORT || '[not set]',
    SMTP_USER: process.env.SMTP_USER ? '[set]' : '[not set]',
    SMTP_PASS: process.env.SMTP_PASS ? '[set]' : '[not set]',
    SMTP_SECURE: process.env.SMTP_SECURE,
    FROM_EMAIL: process.env.FROM_EMAIL || '[not set]',
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
  
  // Create HTML content
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Diagnostics - My Smart Scheduler</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #fff;
      border-radius: 8px;
      padding: 25px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #2563eb;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
    }
    h2 {
      color: #4b5563;
      margin-top: 30px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e5e7eb;
    }
    pre {
      background-color: #f3f4f6;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 10px;
    }
    .info-label {
      font-weight: bold;
    }
    .success {
      color: #10b981;
    }
    .error {
      color: #ef4444;
    }
    .warning {
      color: #f59e0b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
    }
    .test-result {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .timestamp {
      color: #6b7280;
      font-size: 0.9em;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Email Diagnostics</h1>
    <p class="timestamp">Generated on: ${now.toLocaleString()}</p>
    
    <h2>Environment Information</h2>
    <div class="info-grid">
      <div class="info-label">Environment:</div>
      <div>${envVars.NODE_ENV}</div>
      
      <div class="info-label">Server Time:</div>
      <div>${now.toISOString()}</div>
      
      <div class="info-label">From Email:</div>
      <div>${fromEmail}</div>
    </div>
    
    <h2>SMTP Configuration</h2>
    <h3>Environment Variables</h3>
    <div class="info-grid">
      <div class="info-label">SMTP_HOST:</div>
      <div>${envVars.SMTP_HOST}</div>
      
      <div class="info-label">SMTP_PORT:</div>
      <div>${envVars.SMTP_PORT}</div>
      
      <div class="info-label">SMTP_USER:</div>
      <div>${envVars.SMTP_USER}</div>
      
      <div class="info-label">SMTP_PASS:</div>
      <div>${envVars.SMTP_PASS}</div>
      
      <div class="info-label">SMTP_SECURE:</div>
      <div>${envVars.SMTP_SECURE}</div>
      
      <div class="info-label">FROM_EMAIL:</div>
      <div>${envVars.FROM_EMAIL}</div>
    </div>
    
    <h3>Config File</h3>
    <pre>${JSON.stringify(smtpConfig, null, 2)}</pre>
    
    <h2>Diagnostics Results</h2>
    <h3>Overall Status</h3>
    <div class="${diagnosticsResult.success ? 'success' : 'error'}">
      ${diagnosticsResult.success 
        ? '✅ All tests passed successfully!' 
        : '❌ Some tests failed. See details below.'}
    </div>
    
    <h3>Test Results</h3>
    <table>
      <tr>
        <th>Test</th>
        <th>Result</th>
      </tr>
      ${Object.entries(diagnosticsResult.results).map(([test, passed]) => `
        <tr>
          <td>${test}</td>
          <td class="${passed ? 'success' : 'error'}">
            ${passed ? '✅ Passed' : '❌ Failed'}
          </td>
        </tr>
      `).join('')}
    </table>
    
    ${diagnosticsResult.errors && Object.keys(diagnosticsResult.errors).length > 0 ? `
      <h3>Errors</h3>
      <table>
        <tr>
          <th>Component</th>
          <th>Error Message</th>
        </tr>
        ${Object.entries(diagnosticsResult.errors).map(([key, error]) => `
          <tr>
            <td>${key}</td>
            <td class="error">${error.message}</td>
          </tr>
        `).join('')}
      </table>
    ` : ''}
    
    ${diagnosticsResult.productionIssues && diagnosticsResult.productionIssues.length > 0 ? `
      <h3>Production Issues</h3>
      <ul>
        ${diagnosticsResult.productionIssues.map(issue => `
          <li class="warning">${issue}</li>
        `).join('')}
      </ul>
    ` : ''}
    
    <h2>Recommendations</h2>
    ${diagnosticsResult.success ? `
      <ul>
        <li class="success">Your SMTP configuration looks good! You should be able to send emails successfully.</li>
        <li>Test sending an actual email by registering a new user or using the test email feature.</li>
        <li>If users still aren't receiving emails in production, check for email filtering or spam issues.</li>
      </ul>
    ` : `
      <ul>
        <li class="error">Fix the errors noted above before deploying to production.</li>
        <li>Ensure your SMTP server credentials are correct.</li>
        <li>Verify that your FROM_EMAIL domain has proper DNS records (MX, SPF, DMARC).</li>
        <li>Consider using a reliable transactional email service if problems persist.</li>
      </ul>
    `}
  </div>
</body>
</html>
  `;
  
  // Write the HTML file
  fs.writeFileSync(outputFile, html);
  console.log(`Diagnostics page generated at: ${outputFile}`);
}

// Run the generator
generateDiagnosticsPage().catch(error => {
  console.error('Failed to generate diagnostics page:', error);
});