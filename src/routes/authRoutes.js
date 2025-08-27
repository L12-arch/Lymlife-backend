const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController.js');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post("/logout", authController.logout);
router.post('/forgetpassword', authController.forgetPwd);
router.post("/resetpassword", authController.resetPassword);
router.get("/:email", authController.getUser);
router.post("/updateuser", authController.updateUser);

module.exports = router;