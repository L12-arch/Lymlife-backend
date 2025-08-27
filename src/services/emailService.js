const nodemailer = require("nodemailer");
const crypto = require("crypto");
const urlConfig = require("../config/urls");

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "lakshayarora403@gmail.com",
    pass: process.env.EMAIL_PASS || "xdsuhqtbfcjgqeoa",
  },
});

// Generate secure random token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Send password reset email with proper URLs
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const urls = urlConfig.getPasswordResetUrl(resetToken);

    const mailOptions = {
      from: process.env.EMAIL_USER || "lakshayarora403@gmail.com",
      to: email,
      subject: "Password Reset Request - Lymlife",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password for your Lymlife account.</p>
          <p>Please click the appropriate link below to reset your password. This link will expire in 5 minutes.</p>
          
          <!-- Universal Link -->
          <p style="text-align: center; margin: 30px 0;">
            <a href="${urls.universal}" 
               style="background-color: #28a745; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 8px; display: inline-block; 
                      font-size: 16px; font-weight: bold;">
              Reset Your Password
            </a>
          </p>
          
          <!-- Alternative links -->
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              <strong>Alternative links:</strong><br>
              • <a href="${urls.app}" style="color: #007bff;">Open in Lymlife App</a> (Mobile with app)<br>
              • <a href="${urls.web}" style="color: #007bff;">Reset on Website</a> (Web browser)
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Environment:</strong> ${urlConfig.environment}<br>
            <strong>Link expires:</strong> 5 minutes
          </p>
          
          <p>If you didn't request this password reset, please ignore this email.</p>
          
          <p>Best regards,<br>Lymlife Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to: ${email}`);
    console.log(`📱 App URL: ${urls.app}`);
    console.log(`🌐 Web URL: ${urls.web}`);
    console.log(`🔗 Universal URL: ${urls.universal}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending password reset email:", error);
    return false;
  }
};

// Send verification email
const sendVerificationEmail = async (email, verificationToken) => {
  try {
    const urls = urlConfig.getEmailVerificationUrl(verificationToken);

    const mailOptions = {
      from: process.env.EMAIL_USER || "poojashiroya99@gmail.com",
      to: email,
      subject: "Email Verification - Lymlife",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email Address</h2>
          <p>Hello,</p>
          <p>Thank you for signing up with Lymlife! Please verify your email address.</p>
          
          <!-- Universal Link -->
          <p style="text-align: center; margin: 30px 0;">
            <a href="${urls.universal}" 
               style="background-color: #28a745; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 8px; display: inline-block; 
                      font-size: 16px; font-weight: bold;">
              Verify Email Address
            </a>
          </p>
          
          <!-- Alternative links -->
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              <strong>Alternative verification:</strong><br>
              • <a href="${urls.app}" style="color: #007bff;">Verify in App</a><br>
              • <a href="${urls.web}" style="color: #007bff;">Verify on Web</a>
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Environment:</strong> ${urlConfig.environment}<br>
            <strong>Link expires:</strong> 24 hours
          </p>
          
          <p>If you didn't create this account, please ignore this email.</p>
          
          <p>Best regards,<br>Lymlife Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to: ${email}`);
    console.log(`📱 App verification URL: ${urls.app}`);
    console.log(`🌐 Web verification URL: ${urls.web}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending verification email:", error);
    return false;
  }
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log("✅ Email server connection successful");
    return true;
  } catch (error) {
    console.error("❌ Email server connection failed:", error);
    return false;
  }
};

module.exports = {
  generateResetToken,
  sendPasswordResetEmail,
  sendVerificationEmail,
  testEmailConfig,
  transporter,
};
