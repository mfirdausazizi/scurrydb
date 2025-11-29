export function getPasswordResetEmailTemplate(
  userName: string,
  resetLink: string
): { subject: string; text: string; html: string } {
  const subject = 'Reset your ScurryDB password';

  const text = `
Hi ${userName || 'there'},

You requested to reset your password for your ScurryDB account.

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

Best regards,
The ScurryDB Team
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; background-color: #18181b;">
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: 600;">ScurryDB</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #18181b;">Reset your password</h2>
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #52525b; line-height: 1.5;">
                Hi ${userName || 'there'},
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #52525b; line-height: 1.5;">
                You requested to reset your password for your ScurryDB account. Click the button below to create a new password:
              </p>
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 15px 0; font-size: 14px; color: #71717a; line-height: 1.5;">
                This link will expire in <strong>1 hour</strong>.
              </p>
              <p style="margin: 0 0 15px 0; font-size: 14px; color: #71717a; line-height: 1.5;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #a1a1aa; word-break: break-all;">
                <a href="${resetLink}" style="color: #3b82f6;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #fafafa; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                &copy; ${new Date().getFullYear()} ScurryDB. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return { subject, text, html };
}
