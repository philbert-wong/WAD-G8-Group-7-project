// The /api/auth controller: register and login (both answer with a token the frontend sends back later),
// and the logged-in user's saved preferences.
// routes/auth-routes.js decides which address runs which function below.
// bcrypt hashes passwords; jsonwebtoken makes and checks login tokens
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user-model');

const User = userModel.User;

// Secret used to sign login tokens: JWT_SECRET from config.env, otherwise a development-only default.
// (middleware/requireAuth.js reads the same setting to check tokens.)
let jwtSecret = 'dev-secret-change-me';
if (process.env.JWT_SECRET) {
  jwtSecret = process.env.JWT_SECRET;
}

// =====================================================================
// Helpers (only used in this file)
// =====================================================================

// Used in the catch block of every route: sends the right error answer to the frontend.
function sendError(res, error) {
  // MongoDB could not understand an id
  if (error.name === 'CastError') {
    res.status(404).json({ message: 'Not found' });
    return;
  }

  // Mongoose rejected the data
  if (error.name === 'ValidationError') {
    res.status(400).json({ message: error.message });
    return;
  }

  // Anything else is a bug or a database problem: log it for us, keep the message simple for the user
  console.error(error);
  res.status(500).json({ message: 'Something went wrong' });
}

// Makes a token that says "this request is from user <id>". It stops working after 7 days.
function makeToken(user) {
  return jwt.sign({ id: user._id}, jwtSecret, { expiresIn: '7d'});

}

// =====================================================================
// Controller functions (one per address, see routes/auth-routes.js)
// =====================================================================

// REGISTER POST /api/auth/register   body: { "email": "a@b.com", "password": "password123" }
exports.register = async (req, res) => {
  // The body must have an email and a password, both text
  if (req.body === undefined || typeof(req.body.email) !== 'string' || typeof(req.body.password) !== 'string'){
    return res.status(400).json({ message: 'Email and Password are required'})
  }

  // Passwords must be at least 8 characters
  if (req.body.password.length < 8){
    return res.status(400).json({ message: "Password must be at least 8 characters"})
  }

  // Lowercase and without spaces, so "A@B.com " and "a@b.com" are the same account
  const email = req.body.email.trim().toLowerCase();
  try {
    // An account with this email already exists: 409
    const existing = await User.findOne({ email: email})
    if(existing){
        return res.status(409).json({ message: "Email already registered"})
    }

    // Never store the password itself, only its hash (10 = how much work the hashing does)
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    // Save the new user
    const user = await User.create({ email: email, passwordHash: passwordHash});

    // 201 = created. Send the token and the user, but never the passwordHash
    res.status(201).json({
        token: makeToken(user),
        user: { id: user._id, email: user.email}
    })

  } catch (error) {
    sendError(res, error);
  }
};

// LOGIN POST /api/auth/login   body: { "email": "a@b.com", "password": "password123" }
exports.login = async (req, res) => {
  // Same input check as register
    if (req.body === undefined || typeof(req.body.email) !== 'string' || typeof(req.body.password) !== 'string'){
    return res.status(400).json({ message: 'Email and Password are required'})
  }

  try {
    // Find the user by their lowercase email
    const email = req.body.email.trim().toLowerCase();
    const user = await User.findOne({ email: email})

    // No such user, or the wrong password: 401. The SAME message for both, so nobody can tell which emails exist.
    if (user === null){
        return res.status(401).json({ message: 'Wrong email or password'})
    }
    const passwordOk = await bcrypt.compare(req.body.password, user.passwordHash)
    if(!passwordOk) {
        return res.status(401).json({ message: 'Wrong email or password'})
    }

    // Logged in: send the token and the user
    res.status(200).json({
        token: makeToken(user),
        user: { id: user._id, email: user.email}
    })
  } catch (error) {
    sendError(res, error);
  }
};

// READ   GET /api/auth/preferences   (needs a token)
// The logged-in user's saved "What matters to you?" choices. {} if nothing is saved yet.
exports.getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user === null) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ preferences: user.preferences });
  } catch (error) {
    sendError(res, error);
  }
};

// UPDATE PUT /api/auth/preferences   (needs a token)
// body: { "preferences": { "panel": { "school": { "ticked": true, "level": 3 }, ... }, "sortBy": "match" } }
// Replaces the saved choices with the ones sent.
exports.savePreferences = async (req, res) => {
  // preferences must be an object like { ... } (not missing, not text, not a list)
  if (
    req.body === undefined ||
    typeof req.body.preferences !== 'object' ||
    req.body.preferences === null ||
    Array.isArray(req.body.preferences)
  ) {
    return res.status(400).json({ message: 'preferences must be an object' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (user === null) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.preferences = req.body.preferences;
    // "preferences" can hold anything, so tell Mongoose it changed before saving
    user.markModified('preferences');
    await user.save();

    res.json({ preferences: user.preferences });
  } catch (error) {
    sendError(res, error);
  }
};
