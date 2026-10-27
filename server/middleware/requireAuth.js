// Put this in front of a route that needs a logged-in user. It fills in req.user, or answers 401.
const jwt = require('jsonwebtoken');

// Secret used to check login tokens: JWT_SECRET from config.env, otherwise a development-only default.
// (Must be the same setting controllers/auth-controller.js uses to make the tokens.)
let jwtSecret = 'dev-secret-change-me';
if (process.env.JWT_SECRET) {
  jwtSecret = process.env.JWT_SECRET;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")){
    return res.status(401).json({message: "Please log in"})
  }

  const token = header.slice(7);
  try{
    const payload = jwt.verify(token, jwtSecret);
    req.user = { id: payload.id};
    next();
  }catch(error) {
    return res.status(401).json({ message: 'Please log in'})
  }

}

module.exports = requireAuth;
