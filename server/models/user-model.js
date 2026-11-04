// One document = one registered user
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true},

  passwordHash: { type: String, required: true},
  // Hashes of the 3 security answers ([] = not set yet)
  securityAnswerHashes: { type: [String], default: [] },
  preferences: { type: Object, default: {} },

  // The "About you" answers from the sign-up popup / profile page:
  // { town, parentsPostal, flatType, maxPrice, minLease }, or { skipped: true } if they pressed "Skip for now".
  // null = never asked yet, which is what makes the popup show.
  profile: { type: Object, default: null },
});

const User = mongoose.model("User", userSchema);
exports.User = User;
