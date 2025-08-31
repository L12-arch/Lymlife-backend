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
// Generate 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send password reset email with OTP
const sendPasswordResetEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || "lakshayarora403@gmail.com",
      to: email,
      subject: "Password Reset OTP - Lymlife",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password for your Lymlife account.</p>
          <p>Your One-Time Password (OTP) for password reset is:</p>
          
          <!-- OTP Display -->
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f8f9fa; border: 2px dashed #28a745; 
                        padding: 20px; border-radius: 8px; display: inline-block;">
              <span style="font-size: 32px; font-weight: bold; color: #28a745; letter-spacing: 8px;">
                ${otp}
              </span>
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Important:</strong><br>
            • This OTP is valid for 5 minutes only<br>
            • Do not share this OTP with anyone<br>
            • Enter this OTP in the password reset form to proceed
          </p>
          
          <p>If you didn't request this password reset, please ignore this email.</p>
          
          <p>Best regards,<br>Lymlife Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset OTP sent to: ${email}`);
    console.log(`🔢 OTP: ${otp}`);
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
      from: process.env.EMAIL_USER || "lakshayarora403@gmail.com",
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

// Send password reset confirmation email
const sendPasswordResetConfirmationEmail = async (email) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || "lakshayarora403@gmail.com",
      to: email,
      subject: "Password Reset Successful - Lymlife",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Successful</h2>
          <p>Hello,</p>
          <p>Your Lymlife account password has been successfully reset.</p>
          
          <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">✅ Password reset completed successfully</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Security Notice:</strong><br>
            • If you did not initiate this password reset, please contact our support team immediately<br>
            • Ensure your account uses a strong, unique password<br>
            • Consider enabling two-factor authentication for added security
          </p>
          
          <p>If you have any questions or need assistance, please contact our support team.</p>
          
          <p>Best regards,<br>Lymlife Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset confirmation email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending password reset confirmation email:", error);
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
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendPasswordResetConfirmationEmail,
  testEmailConfig,
  transporter,
  generateOtp,
};
