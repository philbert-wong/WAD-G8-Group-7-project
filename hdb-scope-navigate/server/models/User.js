import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/** OWNER: Backend & Database */
const userSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  displayName:  String,
  // Saved filters, score weights and layer toggles — whatever the client sends back.
  preferences:  { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt:    { type: Date, default: Date.now },
  lastLoginAt:  Date,
});

// Never store a raw password. This hashes it on the way in.
userSchema.statics.register = async function (email, password, displayName) {
  const passwordHash = await bcrypt.hash(password, 10);
  return this.create({ email, passwordHash, displayName });
};

userSchema.methods.checkPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

export default mongoose.model("User", userSchema);
