// The /api/auth routes: register and login. Both answer with a token the frontend sends back later.
import { Router } from 'express';
// TODO 1: first run   pnpm add bcrypt jsonwebtoken   then uncomment these imports
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User} from '../models/User.js';
import { jwtSecret } from '../config.js';
import { sendError } from '../lib/sendError.js';

const router = Router();

// Makes a token that says "this request is from user <id>". It stops working after 7 days.
function makeToken(user) {
  // TODO 2: return jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '7d' });
  return jwt.sign({ id: user._id}, jwtSecret, { expiresIn: '7d'});

}

// REGISTER POST /api/auth/register   body: { "email": "a@b.com", "password": "password123" }
async function register(req, res) {
  // TODO 3: check the input. If req.body is missing, or email / password are not text,
  //   answer 400 with { message: 'email and password are required' }.
  //   Hint: look at how addToShortlist() in shortlist.js does its 400.
  if (req.body === undefined || typeof(req.body.email) !== 'string' || typeof(req.body.password) !== 'string'){
    return res.status(400).json({ message: 'Email and Password are required'})
  }

  // TODO 4: if the password is shorter than 8 letters, answer 400 { message: 'Password must be at least 8 characters' }.
  if (req.body.password.length < 8){
    return res.status(400).json({ message: "Password must be at least 8 characters"})
  }

  // TODO 5: make the email lowercase and remove spaces.   Hint: req.body.email.trim().toLowerCase()
  const email = req.body.email.trim().toLowerCase();
  try {
    // TODO 6: look for an existing user with that email: await User.findOne({ email: email }).
    //   If one is found, answer 409 { message: 'Email already registered' }.
    const existing = await User.findOne({ email: email})
    if(existing){
        return res.status(409).json({ message: "Email already registered"})
    }

    // TODO 7: hash the password (10 = how much work the hashing does).
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    // TODO 8: save the user.   const user = await User.create({ email: email, passwordHash: passwordHash });
    const user = await User.create({ email: email, passwordHash: passwordHash});

    // TODO 9: answer 201 with { token: makeToken(user), user: { id: user._id, email: user.email } }.
    //   Do NOT send passwordHash back.
    res.status(201).json({
        token: makeToken(user),
        user: { id: user._id, email: user.email}
    })
    
  } catch (error) {
    sendError(res, error);
  }
}

// LOGIN POST /api/auth/login   body: { "email": "a@b.com", "password": "password123" }
async function login(req, res) {
  // TODO 10: same input check as register (400 if email or password is missing).
    if (req.body === undefined || typeof(req.body.email) !== 'string' || typeof(req.body.password) !== 'string'){
    return res.status(400).json({ message: 'Email and Password are required'})
  }

  try {
    // TODO 11: find the user by lowercase email: await User.findOne({ email: ... }).
    const email = req.body.email.trim().toLowerCase();
    const user = await User.findOne({ email: email})

    // TODO 12: if the user is null OR bcrypt.compare(password, user.passwordHash) is false,
    //   answer 401 { message: 'Wrong email or password' }.
    //   Use the SAME message for both cases, so nobody can tell which emails exist.
    if (user === null){
        return res.status(401).json({ message: 'Wrong email or password'})
    }
    const passwordOk = await bcrypt.compare(req.body.password, user.passwordHash)
    if(!passwordOk) {
        return res.status(401).json({ message: 'Wrong email or password'})
    }

    // TODO 13: answer with { token: makeToken(user), user: { id: user._id, email: user.email } }.
    res.status(200).json({
        token: makeToken(user),
        user: { id: user._id, email: user.email}
    })
  } catch (error) {
    sendError(res, error);
  }
}

router.post('/register', register);
router.post('/login', login);

export default router;
