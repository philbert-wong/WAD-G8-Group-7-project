// Auth controller: register, login, saved preferences, profile and forgot password.
// Register and login send back a token, which the frontend sends with its later requests.
// routes/auth-routes.js decides which URL runs which function.
// bcrypt hashes the passwords, jsonwebtoken makes the login tokens.
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user-model');

const User = userModel.User;

// JWT_SECRET from config.env, or a default for development only (middleware/requireAuth.js uses the same one)
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not set. Add it to the hosting settings before starting the server.');
  }
  jwtSecret = 'dev-secret-change-me'; // development and tests only
}

// Helpers (only used in this file)

// The 3 security questions for Forgot password (the same 3 are in client/src/utils/securityQuestions.js)
const SECURITY_QUESTIONS = [
  'What was the name of your best childhood friend?',
  'Who was your favorite childhood teacher?',
  'What was the name of the hospital where you were born?',
];

// Answers ignore capital letters and spaces at the ends: "KK Hospital " matches "kk hospital"
function cleanAnswer(answer) {
  return answer.trim().toLowerCase();
}

// Needs one non-empty text answer per question. Returns an error message, or '' if fine.
function securityAnswersProblem(answers) {
  if (!Array.isArray(answers) || answers.length !== SECURITY_QUESTIONS.length) {
    return 'Please answer all 3 security questions';
  }
  for (const answer of answers) {
    if (typeof answer !== 'string' || answer.trim() === '') {
      return 'Please answer all 3 security questions';
    }
  }
  return '';
}

// Hash each answer like a password, so the answers are never stored
async function hashAnswers(answers) {
  const hashes = [];
  for (const answer of answers) {
    hashes.push(await bcrypt.hash(cleanAnswer(answer), 10));
  }
  return hashes;
}

// Used in every catch block: sends the error answer to the frontend
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

// A token that says which user a request is from. Expires after 7 days.
function makeToken(user) {
  return jwt.sign({ id: user._id}, jwtSecret, { expiresIn: '7d'});

}

// Extra register checks (tested in tests/auth.test.js, "register input checks")

// bcrypt only uses the first 72 bytes of a password (bytes, not characters)
const MAX_PASSWORD_BYTES = 72;

// Common passwords (lowercase) that register refuses.
// 'password123' is not listed because the other tests use it.
const COMMON_PASSWORDS = [
  'password',
  '12345678',
  '123456789',
  'qwerty123',
  'iloveyou',
  'letmein1',
  'admin123',
  'welcome1'
];

// Does the text look like an email? No spaces, one "@", something before it,
// and a "." after it that is not the first or last character.
function isValidEmail(text) {
  if (typeof text !== 'string') return false;

  // no spaces
  if (text.indexOf(' ') !== -1) return false;

  // exactly one "@"
  const parts = text.split('@');
  if (parts.length !== 2) return false;

  const local = parts[0];
  const domain = parts[1];

  // something before the "@"
  if (local.length === 0) return false;

  // a "." after the "@", with something after it
  const dot = domain.lastIndexOf('.');
  if (dot === 0) return false;
  if (dot === -1) return false;
  if (dot === domain.length - 1) return false;

  return true;
}

// Controller functions (one per address, see routes/auth-routes.js)

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

  const password = req.body.password;

  // A password of only spaces is rejected
  if (password.trim() === '') {
    return res.status(400).json({ message: 'Password cannot be only spaces' });
  }

  // bcrypt only uses the first 72 BYTES ("é" is 1 character but 2 bytes), so a longer password is rejected
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return res.status(400).json({ message: 'Password must be at most 72 bytes' });
  }

  // Lowercase and without spaces, so "A@B.com " and "a@b.com" are the same account
  const email = req.body.email.trim().toLowerCase();

  // The email must look like an email
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  // The password must not be the same as the email
  if (password.toLowerCase() === email) {
    return res.status(400).json({ message: 'Password cannot be the same as your email' });
  }

  // Very common passwords are rejected
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    return res.status(400).json({ message: 'That password is too common' });
  }

  // Every new account answers the 3 security questions, so it can always reset a forgotten password
  const answersProblem = securityAnswersProblem(req.body.securityAnswers);
  if (answersProblem !== '') {
    return res.status(400).json({ message: answersProblem });
  }

  try {
    // An account with this email already exists: 409
    const existing = await User.findOne({ email: email})
    if(existing){
        return res.status(409).json({ message: "Email already registered"})
    }

    // Never store the password itself, only its hash (10 = how much work the hashing does)
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    // The 3 security answers (for "Forgot password"): only their hashes are kept
    const securityAnswerHashes = await hashAnswers(req.body.securityAnswers);

    // Save the new user
    const user = await User.create({ email: email, passwordHash: passwordHash, securityAnswerHashes: securityAnswerHashes});

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

// Profile: the answers from the sign-up popup and the profile page

// An answer as trimmed text: "  PUNGGOL " -> "PUNGGOL", a number 600000 -> "600000", anything else -> ''
function asText(value) {
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return '';
}

// A Singapore postal code is exactly 6 digits
function isPostalCode(text) {
  return /^[0-9]{6}$/.test(text);
}

// READ   GET /api/auth/profile   (needs a token)
// { profile: { town, parentsPostal, flatType, maxPrice, minLease } }, or { profile: null } if never answered
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user === null) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ profile: user.profile });
  } catch (error) {
    sendError(res, error);
  }
};

// UPDATE PUT /api/auth/profile   (needs a token)
// body: { "profile": { "town": "PUNGGOL", "parentsPostal": "560314", "flatType": "4 ROOM", "maxPrice": "700000", "minLease": "60" } }
//   or  { "profile": { "skipped": true } }   ("Skip for now": remember they were asked, so the popup does not come back)
// Every answer may be '' (not answered). maxPrice '' means "Any budget", the same as on the Filters panel.
// showPhg is the "Near parents (PHG)" switch: false unless it was switched on (so older profiles count as off).
exports.saveProfile = async (req, res) => {
  // profile must be an object like { ... } (not missing, not text, not a list)
  if (
    req.body === undefined ||
    typeof req.body.profile !== 'object' ||
    req.body.profile === null ||
    Array.isArray(req.body.profile)
  ) {
    return res.status(400).json({ message: 'profile must be an object' });
  }
  const answers = req.body.profile;

  const showPhg = answers.showPhg === true;

  // We only keep the answers we know about, so nothing else can be stored by sending extra fields
  let cleanProfile = { skipped: true, showPhg: showPhg };

  if (answers.skipped !== true) {
    const parentsPostal = asText(answers.parentsPostal);
    if (parentsPostal !== '' && !isPostalCode(parentsPostal)) {
      return res.status(400).json({ message: 'Postal code must be 6 digits' });
    }

    const maxPrice = asText(answers.maxPrice);
    if (maxPrice !== '' && !(Number(maxPrice) > 0)) {
      return res.status(400).json({ message: 'Budget must be a number' });
    }

    const minLease = asText(answers.minLease);
    if (minLease !== '' && !(Number(minLease) >= 20 && Number(minLease) <= 99)) {
      return res.status(400).json({ message: 'Remaining lease must be between 20 and 99 years' });
    }

    cleanProfile = {
      town: asText(answers.town),
      parentsPostal: parentsPostal,
      flatType: asText(answers.flatType),
      maxPrice: maxPrice,
      minLease: minLease,
      showPhg: showPhg,
    };
  }

  try {
    const user = await User.findById(req.user.id);
    if (user === null) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profile = cleanProfile;
    // "profile" can hold anything, so tell Mongoose it changed before saving (same as preferences)
    user.markModified('profile');
    await user.save();

    res.json({ profile: user.profile });
  } catch (error) {
    sendError(res, error);
  }
};

// Forgot password: reset with the email and the 3 security answers

// Same password rules as register. Returns an error message, or '' if fine.
function newPasswordProblem(password, email) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (password.trim() === '') {
    return 'Password cannot be only spaces';
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return 'Password must be at most 72 bytes';
  }
  if (password.toLowerCase() === email) {
    return 'Password cannot be the same as your email';
  }
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    return 'That password is too common';
  }
  return '';
}

// RESET PASSWORD  POST /api/auth/reset-password   body: { email, securityAnswers: [3 answers], password }
exports.resetPassword = async (req, res) => {
  if (req.body === undefined || typeof req.body.email !== 'string' || typeof req.body.password !== 'string') {
    return res.status(400).json({ message: 'Email and new password are required' });
  }
  const answersProblem = securityAnswersProblem(req.body.securityAnswers);
  if (answersProblem !== '') {
    return res.status(400).json({ message: answersProblem });
  }

  const email = req.body.email.trim().toLowerCase();
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  const problem = newPasswordProblem(req.body.password, email);
  if (problem !== '') {
    return res.status(400).json({ message: problem });
  }

  try {
    // Every answer must match. The same message for any problem, so nobody can find out which emails exist.
    const user = await User.findOne({ email: email });
    let answersOk = false;
    if (user !== null && user.securityAnswerHashes.length === SECURITY_QUESTIONS.length) {
      answersOk = true;
      for (let i = 0; i < SECURITY_QUESTIONS.length; i++) {
        const same = await bcrypt.compare(cleanAnswer(req.body.securityAnswers[i]), user.securityAnswerHashes[i]);
        if (!same) {
          answersOk = false;
        }
      }
    }
    if (!answersOk) {
      return res.status(401).json({
        message: 'The email or one of the answers is not right. (Accounts without saved security questions ' +
          'cannot be reset here: log in and add them on the Profile page.)',
      });
    }

    // Never store the password itself, only its hash (same as register)
    user.passwordHash = await bcrypt.hash(req.body.password, 10);
    await user.save();

    res.json({ message: 'Password updated. You can log in now.' });
  } catch (error) {
    sendError(res, error);
  }
};

// READ   GET /api/auth/security-questions   (needs a token): { hasAnswers: true / false }
exports.getSecurityQuestions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user === null) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ hasAnswers: user.securityAnswerHashes.length === SECURITY_QUESTIONS.length });
  } catch (error) {
    sendError(res, error);
  }
};

// UPDATE PUT /api/auth/security-questions   (needs a token)   body: { securityAnswers: [3 answers] }
exports.saveSecurityQuestions = async (req, res) => {
  if (req.body === undefined) {
    return res.status(400).json({ message: 'Please answer all 3 security questions' });
  }
  const answersProblem = securityAnswersProblem(req.body.securityAnswers);
  if (answersProblem !== '') {
    return res.status(400).json({ message: answersProblem });
  }
  try {
    const user = await User.findById(req.user.id);
    if (user === null) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.securityAnswerHashes = await hashAnswers(req.body.securityAnswers);
    await user.save();
    res.json({ message: 'Security questions saved' });
  } catch (error) {
    sendError(res, error);
  }
};
