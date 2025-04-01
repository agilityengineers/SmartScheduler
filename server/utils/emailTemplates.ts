/**
 * Generates the text content for a password reset email
 * @param resetLink The link for resetting the password
 * @returns Text content
 */
export function getPasswordResetText(resetLink: string): string {
  return `
Hello,

You've requested to reset your password for your My Smart Scheduler account.

To reset your password, please click on the link below or copy it into your browser:
${resetLink}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

Thanks,
The My Smart Scheduler Team
`;
}

/**
 * Generates the text content for an email verification email
 * @param verifyLink The link for verifying the email
 * @returns Text content
 */
export function getEmailVerificationText(verifyLink: string): string {
  return `
Hello,

Thank you for registering with My Smart Scheduler!

To verify your email address and activate your account, please click on the link below or copy it into your browser:
${verifyLink}

This link will expire in 24 hours.

If you didn't create an account with us, you can safely ignore this email.

Thanks,
The My Smart Scheduler Team
`;
}

/**
 * Generates the HTML content for a password reset email
 * @param resetLink The link for resetting the password
 * @returns HTML content
 */
export function getPasswordResetHtml(resetLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 25px;
      border: 1px solid #ddd;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #4f46e5;
      margin: 0;
    }
    .content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #4f46e5;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 15px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>My Smart Scheduler</h1>
    </div>
    <div class="content">
      <h2>Reset Your Password</h2>
      <p>Hello,</p>
      <p>You've requested to reset your password for your My Smart Scheduler account.</p>
      <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
      <div style="text-align: center;">
        <a href="${resetLink}" class="button" style="color: white !important; font-size: 16px; font-weight: bold;">Reset My Password</a>
      </div>
      <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px;"><a href="${resetLink}">${resetLink}</a></p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} My Smart Scheduler. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Generates the HTML content for an email verification email
 * @param verifyLink The link for verifying the email
 * @returns HTML content
 */
export function getEmailVerificationHtml(verifyLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 25px;
      border: 1px solid #ddd;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #4f46e5;
      margin: 0;
    }
    .content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #4f46e5;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 15px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>My Smart Scheduler</h1>
    </div>
    <div class="content">
      <h2>Verify Your Email</h2>
      <p>Hello,</p>
      <p>Thank you for registering with My Smart Scheduler!</p>
      <p>Please click the button below to verify your email address and activate your account. This link will expire in 24 hours.</p>
      <div style="text-align: center;">
        <a href="${verifyLink}" class="button" style="color: white !important; font-size: 16px; font-weight: bold;">Verify My Email</a>
      </div>
      <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px;"><a href="${verifyLink}">${verifyLink}</a></p>
      <p>If you didn't create an account with us, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} My Smart Scheduler. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
}