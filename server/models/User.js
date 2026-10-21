// One document = one registered user
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true},

  passwordHash: { type: String, required: true},
  preferences: { type: Object, default: {} },
});

export const User = mongoose.model("User", userSchema);
