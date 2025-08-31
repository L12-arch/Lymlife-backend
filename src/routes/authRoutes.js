const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController.js");

router.post("/login", authController.login);
router.post("/register", authController.register);
router.post("/logout", authController.logout);
router.post("/forgetpassword", authController.forgetPwd);
router.post("/verify-otp", authController.verifyOtp);
router.post("/set-new-password", authController.setNewPassword);
router.post("/resend-otp", authController.resendOtp);
router.get("/:email", authController.getUser);
router.post("/updateuser", authController.updateUser);

module.exports = router;
