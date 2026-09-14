import fs from "fs";
import path from "path";

import nodemailer from "nodemailer";
import type { Attachment, SentMessageInfo } from "nodemailer/lib/mailer";

import { logger } from "../utilities";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  SMTP_REPLY_TO,
  SMTP_REJECT_UNAUTHORIZED,
  MAIL_TO,
} = process.env;

const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
const SMTP_GREETING_TIMEOUT_MS = 10_000;
const SMTP_SOCKET_TIMEOUT_MS = 15_000;
const SMTP_SEND_TIMEOUT_MS = 20_000;

function getRequiredEnvironmentVariable(name: string, value?: string): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(`${name} is missing`);
  }

  return normalizedValue;
}

function parseBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (!value?.trim()) {
    return defaultValue;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalizedValue)) {
    return false;
  }

  return defaultValue;
}

const smtpHost = getRequiredEnvironmentVariable("SMTP_HOST", SMTP_HOST);

const smtpPort = Number(getRequiredEnvironmentVariable("SMTP_PORT", SMTP_PORT));

const smtpUser = getRequiredEnvironmentVariable("SMTP_USER", SMTP_USER);

const smtpPassword = getRequiredEnvironmentVariable("SMTP_PASS", SMTP_PASS);

if (!Number.isInteger(smtpPort) || smtpPort <= 0 || smtpPort > 65535) {
  throw new Error("SMTP_PORT must be a valid TCP port");
}

const isSecureConnection = smtpPort === 465;

const shouldRequireTls = smtpPort === 587;

const rejectUnauthorized = parseBoolean(SMTP_REJECT_UNAUTHORIZED, true);

export type EmailTemplateProps = {
  greeting?: string;
  intro: string;
  body: string;
  footer?: string;
};

export type EmailData = {
  to: string | string[];
  subject: string;
  htmlBody: EmailTemplateProps | string;
  replyTo?: string;
  attachments?: Attachment[];
  textBody?: string;
};

export type ContactEmailPayload = {
  fullName: string;

  email: string;
  phone?: string;

  subject?: string;

  message: string;
};

const templatePath = path.resolve(process.cwd(), "src/api/email/template.html");

const htmlTemplate = fs.existsSync(templatePath)
  ? fs.readFileSync(templatePath, "utf8")
  : null;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: isSecureConnection,
  requireTLS: shouldRequireTls,

  auth: {
    user: smtpUser,
    pass: smtpPassword,
  },

  tls: {
    minVersion: "TLSv1.2",
    rejectUnauthorized,
    servername: smtpHost,
  },

  connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,

  greetingTimeout: SMTP_GREETING_TIMEOUT_MS,

  socketTimeout: SMTP_SOCKET_TIMEOUT_MS,

  pool: false,
});

function normaliseRecipient(value: string): string {
  return value.trim();
}

function normaliseRecipients(recipients: string | string[]): string | string[] {
  if (Array.isArray(recipients)) {
    return recipients.map(normaliseRecipient).filter(Boolean);
  }

  return normaliseRecipient(recipients);
}

function validateRecipients(recipients: string | string[]): void {
  if (Array.isArray(recipients)) {
    if (recipients.length === 0) {
      throw new Error("At least one email recipient is required");
    }

    return;
  }

  if (!recipients) {
    throw new Error("An email recipient is required");
  }
}

function getErrorDetails(error: unknown): {
  message: string;
  name?: string;
  code?: string;
  command?: string;
  response?: string;
  responseCode?: number;
  stack?: string;
} {
  if (!(error instanceof Error)) {
    return {
      message: String(error),
    };
  }

  const smtpError = error as Error & {
    code?: string;
    command?: string;
    response?: string;
    responseCode?: number;
  };

  return {
    name: smtpError.name,
    message: smtpError.message,
    code: smtpError.code,
    command: smtpError.command,
    response: smtpError.response,
    responseCode: smtpError.responseCode,
    stack: smtpError.stack,
  };
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    timeout.unref?.();

    promise
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderStoredTemplate(data: EmailTemplateProps): string | null {
  if (!htmlTemplate) {
    return null;
  }

  const values: Record<string, string> = {
    greeting: data.greeting?.trim() ?? "",
    intro: data.intro.trim(),
    body: data.body,
    footer: data.footer?.trim() ?? "",
  };

  return htmlTemplate.replace(/\${(\w+)}/g, (_match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return values[key] ?? "";
    }

    logger("EMAIL_TEMPLATE_KEY_NOT_FOUND", {
      key,
    });

    return "";
  });
}

function renderTemplate(data: EmailTemplateProps): string {
  return renderStoredTemplate(data) ?? generateHtmlFromTemplate(data);
}

export function generateHtmlFromTemplate(props: EmailTemplateProps): string {
  const { greeting, intro, body, footer } = props;

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />

        <title>
          ${escapeHtml(intro)}
        </title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background: #f6f7f4;
          font-family: Arial, Helvetica, sans-serif;
          color: #1f2f1c;
        "
      >
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            width: 100%;
            background: #f6f7f4;
          "
        >
          <tr>
            <td
              align="center"
              style="
                padding: 32px 16px;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  width: 100%;
                  max-width: 640px;
                  overflow: hidden;
                  background: #ffffff;
                  border-radius: 12px;
                  box-shadow: 0 8px 28px rgba(23, 63, 31, 0.08);
                "
              >
                <tr>
                  <td
                    style="
                      padding: 22px 28px;
                      background: #173f1f;
                      color: #ffffff;
                    "
                  >
                    <div
                      style="
                        font-size: 22px;
                        font-weight: 700;
                      "
                    >
                      McKenzie Farming
                      Solutions
                    </div>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding: 30px 28px;
                    "
                  >
                    ${
                      greeting
                        ? `
                          <p
                            style="
                              margin: 0 0 16px;
                              font-size: 15px;
                            "
                          >
                            ${escapeHtml(greeting)}
                          </p>
                        `
                        : ""
                    }

                    <h2
                      style="
                        margin: 0 0 20px;
                        color: #173f1f;
                        font-size: 24px;
                        line-height: 1.3;
                      "
                    >
                      ${escapeHtml(intro)}
                    </h2>

                    <div
                      style="
                        color: #344230;
                        font-size: 15px;
                        line-height: 1.7;
                      "
                    >
                      ${body}
                    </div>

                    ${
                      footer
                        ? `
                          <p
                            style="
                              margin: 26px 0 0;
                              padding-top: 18px;
                              border-top: 1px solid #e4e9e0;
                              color: #687263;
                              font-size: 13px;
                              line-height: 1.6;
                            "
                          >
                            ${escapeHtml(footer)}
                          </p>
                        `
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export async function verifyEmailConnection(): Promise<boolean> {
  try {
    logger("SMTP_CONNECTION_VERIFY_INIT", {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      secure: isSecureConnection,
      requireTLS: shouldRequireTls,
      rejectUnauthorized,
    });

    await withTimeout(
      transporter.verify(),
      SMTP_SEND_TIMEOUT_MS,
      `SMTP verification timed out after ${SMTP_SEND_TIMEOUT_MS}ms`,
    );

    logger("SMTP_CONNECTION_SUCCESS", {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      secure: isSecureConnection,
      requireTLS: shouldRequireTls,
    });

    return true;
  } catch (error) {
    logger("SMTP_CONNECTION_ERROR", getErrorDetails(error));

    throw error;
  }
}

export async function sendEmail(data: EmailData): Promise<SentMessageInfo> {
  const { to, subject, htmlBody, replyTo, attachments, textBody } = data;

  const recipients = normaliseRecipients(to);

  validateRecipients(recipients);

  const normalizedSubject = subject.trim();

  if (!normalizedSubject) {
    throw new Error("Email subject is required");
  }

  const html =
    typeof htmlBody === "string" ? htmlBody : renderTemplate(htmlBody);

  const fromAddress =
    SMTP_FROM?.trim() || `"McKenzie Farming Solutions" <${smtpUser}>`;

  const replyToAddress = replyTo?.trim() || SMTP_REPLY_TO?.trim() || undefined;

  logger("SEND_EMAIL_INIT", {
    to: recipients,
    subject: normalizedSubject,
    from: fromAddress,
    replyTo: replyToAddress,
    attachmentCount: attachments?.length ?? 0,
    host: smtpHost,
    port: smtpPort,
    secure: isSecureConnection,
    requireTLS: shouldRequireTls,
  });

  try {
    const sendPromise = transporter.sendMail({
      from: fromAddress,
      to: recipients,
      replyTo: replyToAddress,
      subject: normalizedSubject,
      text: textBody?.trim() || undefined,
      html,
      attachments,
    });

    const info = await withTimeout(
      sendPromise,
      SMTP_SEND_TIMEOUT_MS,
      `SMTP server did not respond within ${SMTP_SEND_TIMEOUT_MS}ms`,
    );

    logger("SEND_EMAIL_SUCCESS", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,

      response: info.response,
    });

    return info;
  } catch (error) {
    logger("SEND_EMAIL_ERROR", {
      to: recipients,
      subject: normalizedSubject,
      ...getErrorDetails(error),
    });

    throw error;
  }
}

export async function sendContactEmail(
  data: ContactEmailPayload,
): Promise<SentMessageInfo> {
  const safeName = escapeHtml(data.fullName.trim());

  const safeEmail = escapeHtml(data.email.trim());

  const safePhone = escapeHtml(data.phone?.trim() || "Not provided");

  const enquirySubject = data.subject?.trim() || "General enquiry";

  const safeSubject = escapeHtml(enquirySubject);

  const safeMessage = escapeHtml(data.message.trim()).replace(
    /\r?\n/g,
    "<br />",
  );

  const body = `
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 22px;
      "
    >
      ${renderContactRow("FullName", safeName)}

     

      ${renderContactRow(
        "Email",
        `
          <a
            href="mailto:${safeEmail}"
            style="
              color: #173f1f;
            "
          >
            ${safeEmail}
          </a>
        `,
      )}

      ${renderContactRow("Phone", safePhone)}

      ${renderContactRow("Subject", safeSubject)}

     
    </table>

    <div
      style="
        padding: 18px;
        border-radius: 8px;
        background: #f8faf6;
        border: 1px solid #e2e8dd;
      "
    >
      <p
        style="
          margin: 0 0 10px;
          color: #173f1f;
          font-weight: 700;
        "
      >
        Message
      </p>

      <p
        style="
          margin: 0;
          white-space: normal;
        "
      >
        ${safeMessage}
      </p>
    </div>
  `;

  return sendEmail({
    to: MAIL_TO?.trim() || "info@mckenziefarming.co.za",

    replyTo: data.email.trim(),

    subject: `McKenzie Contact Request - ${data.fullName.trim()}`,

    htmlBody: {
      greeting: "",

      intro: "",

      body,

      footer:
        "This message was generated from the McKenzie Farming Solutions website contact form.",
    },
  });
}

function renderContactRow(label: string, value: string): string {
  return `
    <tr>
      <td
        style="
          width: 145px;
          padding: 9px 12px;
          background: #edf4e5;
          border-bottom: 1px solid #dce6d6;
          font-weight: 700;
          vertical-align: top;
        "
      >
        ${escapeHtml(label)}
      </td>

      <td
        style="
          padding: 9px 12px;
          border-bottom: 1px solid #e5e9e2;
          vertical-align: top;
        "
      >
        ${value}
      </td>
    </tr>
  `;
}
