require('dotenv').config();
const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Enhanced email function
function sendDecisionEmail(toEmail, eventName, decision, adminComment = null) {
  const decisionText = decision === 'approved' ? 'approved' : 'rejected';
  const subject = `Event Update: ${eventName} has been ${decisionText}`;
  
  let text = `Dear Committee,\n\n`;
  text += `Your event "${eventName}" has been ${decisionText} by the administration.\n\n`;
  
  if (adminComment) {
    text += `Administrator Comment:\n${adminComment}\n\n`;
  }
  
  text += `Thank you for your submission.\n\n`;
  text += `Best regards,\nEvent Management System`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: subject,
    text: text
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

module.exports = sendDecisionEmail;