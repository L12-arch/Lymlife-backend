const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const {
  generateResetToken,
  sendPasswordResetEmail,
} = require("../services/emailService");
const crypto = require("crypto");

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userExist = await User.findOne({ email });
    if (!userExist) {
      return res
        .status(200)
        .json({ message: "User Not Found", code: "userNotFound" });
    }

    const passwordMatch = await bcrypt.compare(password, userExist.password);
    if (!passwordMatch) {
      return res
        .status(200)
        .json({ message: "Incorrect Password", code: "incorrectPassword" });
    }

    if (!userExist.isLoggedIn) {
      await User.findOneAndUpdate({ email }, { isLoggedIn: true });
    }

    return res
      .status(200)
      .json({ message: "successful login", code: "loggedIn", user: userExist });
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Invalid credentials", code: "error" });
  }
};

const register = async (req, res) => {
  const { firstName, lastName, email, password, phoneNumber } = req.body;

  try {
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res
        .status(200)
        .json({ message: "User already exist", code: "existUser" });
    }

    const hashedPassword = await bcrypt.hash(password, 10); // saltRounds = 10
    await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      isLoggedIn: false,
      phoneNumber,
    });

    return res
      .status(200)
      .json({ message: "User registered successfully", code: "registered" });
  } catch (error) {
    return res.status(400).json({ message: "Internal Error", code: "error" });
  }
};

const logout = async (req, res) => {
  const { email } = req.body;

  res.header("Access-Control-Allow-Origin", "*"); // replace '*' with your frontend's URL in production
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  try {
    const userExist = await User.findOne({ email });
    if (userExist && userExist.isLoggedIn) {
      await User.findOneAndUpdate({ email }, { isLoggedIn: false });
      return res.status(200).json({ message: "Logged out", code: "logout" });
    } else {
      return res
        .status(200)
        .json({ message: "user not found", code: "userNotFound" });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Internal Error", code: "error" });
  }
};

const resetPassword = async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  try {
    const userExist = await User.findOne({ email });
    if (!userExist) {
      return res
        .status(200)
        .json({ message: "User Not Found", code: "userNotFound" });
    }

    const passwordMatch = await bcrypt.compare(oldPassword, userExist.password);
    if (!passwordMatch) {
      return res.status(200).json({
        message: "Old Password Not Match",
        code: "oldPasswordNotMatch",
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedNewPassword });

    return res
      .status(200)
      .json({ message: "Password Updated", code: "PasswordUpdate" });
  } catch (error) {
    return res.status(401).json({ message: "Internal Error", code: "error" });
  }
};

const forgetPwd = async (req, res) => {
  const { email } = req.body;

  try {
    const userExist = await User.findOne({ email });
    if (!userExist) {
      return res
        .status(200)
        .json({ message: "User Not Found", code: "userNotFound" });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const tokenExpiration = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Hash the token before storing (for security)
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save token and expiration to user
    await User.findOneAndUpdate(
      { email },
      {
        resetToken: hashedToken,
        resetTokenExpiration: tokenExpiration,
      }
    );

    // Frontend URL - this should be configured in environment variables
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Send email with reset link
    const emailSent = await sendPasswordResetEmail(
      email,
      resetToken,
      frontendUrl
    );

    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send reset email",
        code: "emailError",
      });
    }

    return res.status(200).json({
      message: "Password reset email sent",
      code: "resetEmailSent",
    });
  } catch (error) {
    console.error("Error in forgetPwd:", error);
    return res.status(500).json({ message: "Internal Error", code: "error" });
  }
};

// Validate reset token
const validateResetToken = async (req, res) => {
  const { token } = req.body;

  try {
    if (!token) {
      return res.status(400).json({
        message: "Token is required",
        code: "tokenRequired",
      });
    }

    // Hash the provided token to match stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiration: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired token",
        code: "invalidToken",
      });
    }

    return res.status(200).json({
      message: "Token is valid",
      code: "validToken",
    });
  } catch (error) {
    console.error("Error in validateResetToken:", error);
    return res.status(500).json({ message: "Internal Error", code: "error" });
  }
};

// Reset password with token
const resetPasswordWithToken = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Token and new password are required",
        code: "missingFields",
      });
    }

    // Hash the provided token to match stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiration: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired token",
        code: "invalidToken",
      });
    }

    // Hash new password and update user
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await User.findOneAndUpdate(
      { email: user.email },
      {
        password: hashedNewPassword,
        resetToken: null,
        resetTokenExpiration: null,
      }
    );

    return res.status(200).json({
      message: "Password reset successfully",
      code: "passwordResetSuccess",
    });
  } catch (error) {
    console.error("Error in resetPasswordWithToken:", error);
    return res.status(500).json({ message: "Internal Error", code: "error" });
  }
};

const getUser = async (req, res) => {
  const email = req.params.email;
  res.header("Access-Control-Allow-Origin", "*"); // replace '*' with your frontend's URL in production
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  try {
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res
        .status(200)
        .json({ message: "User Found", code: "userExist", user: userExist });
    } else {
      return res
        .status(200)
        .json({ message: "User Not Found", code: "userNotFound" });
    }
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Invalid credentials", code: "error" });
  }
};

const updateUser = async (req, res) => {
  const { email, userDetails } = req.body;
  res.header("Access-Control-Allow-Origin", "*"); // replace '*' with your frontend's URL in production
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  try {
    const userExist = await User.findOne({ email });
    if (userExist) {
      await User.findOneAndUpdate({ email }, userDetails);
      return res.status(200).json({
        message: "User Updated",
        code: "userUpdate",
      });
    } else {
      return res
        .status(200)
        .json({ message: "User Not Found", code: "userNotFound" });
    }
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Invalid credentials", code: "error" });
  }
};

module.exports = {
  login,
  register,
  logout,
  forgetPwd,
  resetPassword,
  validateResetToken,
  resetPasswordWithToken,
  getUser,
  updateUser,
};
