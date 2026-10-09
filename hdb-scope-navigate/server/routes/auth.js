import { Router } from "express";
import User from "../models/User.js";
import { signToken } from "../middleware/auth.js";

/** OWNER: Backend & Database */
const router = Router();

router.post("/auth/register", async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ error: "That email is already registered" });
    }

    const user = await User.register(email, password, displayName);
    res.status(201).json({ token: signToken(user), email: user.email });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: (email || "").toLowerCase() });

    // Same message either way — don't reveal which emails are registered.
    if (!user || !(await user.checkPassword(password || ""))) {
      return res.status(401).json({ error: "Email or password is incorrect" });
    }

    user.lastLoginAt = new Date();
    await user.save();
    res.json({ token: signToken(user), email: user.email });
  } catch (err) {
    next(err);
  }
});

export default router;
