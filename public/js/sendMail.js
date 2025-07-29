require('dotenv').config();
const nodemailer = require('nodemailer');

// Ensure credentials exist
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('❌ Email credentials are missing in .env file.');
  process.exit(1);
}

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Generates a professional HTML email template.
 * @param {string} eventName - The name of the event.
 * @param {string} decision - 'approved' or 'rejected'.
 * @param {string|null} adminComment - Optional comment from the admin.
 * @returns {string} - The full HTML content of the email.
 */
function createEmailTemplate(eventName, decision, adminComment) {
    const isApproved = decision === 'approved';
    const decisionText = isApproved ? 'Approved' : 'Rejected';
    const title = `Update on Your Event: "${eventName}"`;
    const mainColor = isApproved ? '#28a745' : '#dc3545';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; }
            .header { background-color: ${mainColor}; color: #ffffff; padding: 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; color: #333; line-height: 1.6; }
            .content h2 { color: ${mainColor}; }
            .status-box { border: 2px solid ${mainColor}; padding: 15px; border-radius: 5px; text-align: center; margin-bottom: 20px; }
            .status-box p { margin: 0; font-size: 18px; font-weight: bold; color: ${mainColor}; }
            .comment-section { background-color: #f1f3f5; padding: 15px; border-radius: 5px; margin-top: 20px; }
            .footer { background-color: #e9ecef; text-align: center; padding: 15px; font-size: 12px; color: #6c757d; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Event Status Update</h1>
            </div>
            <div class="content">
                <p>Dear Committee,</p>
                <p>This is an update regarding your application for the event: <strong>"${eventName}"</strong>.</p>
                <div class="status-box">
                    <p>Your event has been ${decisionText}</p>
                </div>
                ${adminComment ? `
                <div class="comment-section">
                    <strong>Administrator's Comment:</strong>
                    <p style="margin-top: 5px;"><em>${adminComment}</em></p>
                </div>
                ` : ''}
                <p>Thank you for your submission.</p>
                <p>Best regards,<br>The Event Management Team</p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Your University Event Hub. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Sends a decision email to the specified recipient.
 * @param {string} toEmail - The recipient's email address.
 * @param {string} eventName - The name of the event.
 * @param {string} decision - 'approved' or 'rejected'.
 * @param {string|null} adminComment - Optional comment from the admin.
 */
function sendDecisionEmail(toEmail, eventName, decision, adminComment = null) {
  const decisionText = decision === 'approved' ? 'Approved' : 'Rejected';
  const subject = `Event Update: Your Event "${eventName}" has been ${decisionText}`;
  const htmlBody = createEmailTemplate(eventName, decision, adminComment);

  const mailOptions = {
    from: `"Event Management Hub" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: subject,
    html: htmlBody // We now send HTML instead of plain text
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('❌ Failed to send email:', error.message);
    } else {
      console.log(`✅ Email sent to ${toEmail}: ${info.response}`);
    }
  });
}

module.exports = sendDecisionEmail;
