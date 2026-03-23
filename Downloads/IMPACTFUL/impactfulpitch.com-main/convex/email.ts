'use node';

import { internalAction } from './_generated/server';
import { v } from 'convex/values';
import nodemailer from 'nodemailer';

// Gmail SMTP transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Internal action to send contact form notification email
export const sendContactNotification = internalAction({
  args: {
    submissionId: v.number(),
    name: v.string(),
    email: v.string(),
    reason: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const { submissionId, name, email, reason, message } = args;

    const transporter = createTransporter();

    // Email recipients
    const toAddresses = [
      'binita@impactfulpitch.com', // CBO
    ];
    const ccAddresses = ['founder@impactfulpitch.com']; // Founder in CC

    const submittedAt = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    // HTML email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
            .value { margin-top: 5px; padding: 10px; background: white; border-radius: 4px; border: 1px solid #e5e7eb; }
            .footer { margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">New Contact Form Submission #${submissionId}</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">ImpactfulPitch Website</p>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Submission ID</div>
                <div class="value" style="font-weight: bold; color: #7c3aed; font-size: 18px;">#${submissionId}</div>
              </div>
              <div class="field">
                <div class="label">Name</div>
                <div class="value">${name}</div>
              </div>
              <div class="field">
                <div class="label">Email</div>
                <div class="value"><a href="mailto:${email}">${email}</a></div>
              </div>
              <div class="field">
                <div class="label">Reason for Contact</div>
                <div class="value">${reason}</div>
              </div>
              <div class="field">
                <div class="label">Message</div>
                <div class="value">${message}</div>
              </div>
              <div class="field">
                <div class="label">Submitted At</div>
                <div class="value">${submittedAt}</div>
              </div>
            </div>
            <div class="footer">
              This email was automatically generated from the ImpactfulPitch contact form.
            </div>
          </div>
        </body>
      </html>
    `;

    // Plain text fallback
    const textContent = `
New Contact Form Submission #${submissionId} - ImpactfulPitch

Submission ID: #${submissionId}
Name: ${name}
Email: ${email}
Reason: ${reason}
Message: ${message}
Submitted At: ${submittedAt}

---
This email was automatically generated from the ImpactfulPitch contact form.
    `.trim();

    try {
      await transporter.sendMail({
        from: `"ImpactfulPitch" <${process.env.SMTP_USER}>`,
        to: toAddresses.join(', '),
        cc: ccAddresses.join(', '),
        replyTo: email, // Reply goes to the person who filled the form
        subject: `New Contact #${submissionId}: ${reason} - ${name}`,
        text: textContent,
        html: htmlContent,
      });

      console.log(`Contact notification email sent for: ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send contact notification email:', error);
      throw new Error('Failed to send email notification');
    }
  },
});
