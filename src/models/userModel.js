const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: String,
    email: String,
    lastName: String,
    password: String,
    isLoggedIn: Boolean,
    phoneNumber: Number,
});

module.exports = mongoose.model('User', userSchema);
