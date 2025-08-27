const User = require("../models/userModel");
const bcrypt = require("bcrypt");

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
  const { email, newPassword } = req.body;

  try {
    const userExist = await User.findOne({ email });
    if (!userExist) {
      return res
        .status(200)
        .json({ message: "User Not Found", code: "userNotFound" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedNewPassword });
    console.log("Password updated successfully");
    return res
      .status(200)
      .json({ message: "Password Updated", code: "forgetPwdSuccess" });
  } catch (error) {
    return res.status(401).json({ message: "Internal Error", code: "error" });
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
  getUser,
  updateUser,
};
