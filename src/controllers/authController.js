const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const {
  generateOtp,
  sendPasswordResetEmail,
  sendPasswordResetConfirmationEmail,
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

const forgetPwd = async (req, res) => {
  const { email } = req.body;
console.log(email, "check")
  try {
    const userExist = await User.findOne({ email });
    if (!userExist) {
      return res
        .status(200)
        .json({ message: "User Not Found", code: "userNotFound" });
    }

    // Generate 6-digit OTP
    const otp = generateOtp();
    const otpExpiration = Date.now() + 5 * 60 * 1000; // 5 minutes from now

    // Hash the OTP before storing (for security)
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    // Save OTP and expiration to user
    await User.findOneAndUpdate(
      { email },
      {
        otp: hashedOtp,
        otpExpiration: otpExpiration,
        resetToken: null, // Clear any existing reset token
        resetTokenExpiration: null,
      }
    );

    // Send email with OTP
    const emailSent = await sendPasswordResetEmail(email, otp);

    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send OTP email",
        code: "emailError",
      });
    }

    return res.status(200).json({
      message: "OTP sent to email",
      code: "otpSent",
    });
  } catch (error) {
    console.error("Error in forgetPwd:", error);
    return res.status(500).json({ message: "Internal Error", code: "error" });
  }
};

// Verify OTP for password reset
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
        code: "missingFields",
      });
    }

    // Hash the provided OTP to match stored hash
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    const user = await User.findOne({
      email: email,
      otp: hashedOtp,
      otpExpiration: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
        code: "invalidOtp",
      });
    }

    return res.status(200).json({
      message: "OTP verified successfully",
      code: "otpVerified",
    });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return res.status(500).json({ message: "Internal Error", code: "error" });
  }
};

// Set new password after OTP verification
const setNewPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message: "Email, OTP and new password are required",
        code: "missingFields",
      });
    }

    // Hash the provided OTP to match stored hash
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    const user = await User.findOne({
      email: email,
      otp: hashedOtp,
      otpExpiration: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
        code: "invalidOtp",
      });
    }

    // Hash new password and update user
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await User.findOneAndUpdate(
      { email: email },
      {
        password: hashedNewPassword,
        otp: null,
        otpExpiration: null,
        resetToken: null,
        resetTokenExpiration: null,
      }
    );

    // Send confirmation email
    await sendPasswordResetConfirmationEmail(email);

    return res.status(200).json({
      message: "Password reset successfully",
      code: "passwordResetSuccess",
    });
  } catch (error) {
    console.error("Error in setNewPassword:", error);
    return res.status(500).json({ message: "Internal Error", code: "error" });
  }
};

// Resend OTP
const resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const userExist = await User.findOne({ email });
    if (!userExist) {
      return res
        .status(200)
        .json({ message: "User Not Found", code: "userNotFound" });
    }

    // Generate new 6-digit OTP
    const otp = generateOtp();
    const otpExpiration = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Hash the OTP before storing (for security)
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    // Save new OTP and expiration to user
    await User.findOneAndUpdate(
      { email },
      {
        otp: hashedOtp,
        otpExpiration: otpExpiration,
      }
    );

    // Send email with new OTP
    const emailSent = await sendPasswordResetEmail(email, otp);

    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send OTP email",
        code: "emailError",
      });
    }

    return res.status(200).json({
      message: "OTP resent to email",
      code: "otpResent",
    });
  } catch (error) {
    console.error("Error in resendOtp:", error);
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
  verifyOtp,
  setNewPassword,
  resendOtp,
  getUser,
  updateUser,
};
