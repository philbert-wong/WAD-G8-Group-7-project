// One document = one registered user
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true},

  passwordHash: { type: String, required: true},
  preferences: { type: Object, default: {} },
});

const User = mongoose.model("User", userSchema);
exports.User = User;
