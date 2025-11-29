import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    email: string;
    name: string;
  };
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL;
  const fromName = process.env.SMTP_FROM_NAME || 'ScurryDB';
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !port || !user || !pass || !fromEmail) {
    return null;
  }

  return {
    host,
    port: parseInt(port, 10),
    secure,
    auth: { user, pass },
    from: { email: fromEmail, name: fromName },
  };
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const config = getEmailConfig();
  if (!config) return null;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  return transporter;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const config = getEmailConfig();
  const transport = getTransporter();

  if (!config || !transport) {
    console.warn('SMTP not configured. Email not sent:', options.subject);
    return false;
  }

  try {
    await transport.sendMail({
      from: `"${config.from.name}" <${config.from.email}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return getEmailConfig() !== null;
}
