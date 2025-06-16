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

// Email sending function
function sendDecisionEmail(toEmail, eventName, decision, adminComment = null) {
  const decisionText = decision === 'approved' ? 'approved' : 'rejected';
  const subject = `Event Update: ${eventName} has been ${decisionText}`;

  let text = `Dear Committee,\n\n`;
  text += `Your event "${eventName}" has been ${decisionText} by the administration.\n\n`;

  if (adminComment) {
    text += `Administrator Comment:\n${adminComment}\n\n`;
  }

  text += `Thank you for your submission.\n\nBest regards,\nEvent Management System`;

  const mailOptions = {
    from: `"Event Management" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: subject,
    text: text
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
