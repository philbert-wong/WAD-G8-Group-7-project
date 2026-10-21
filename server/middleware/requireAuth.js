// Put this in front of a route that needs a logged-in user. It fills in req.user, or answers 401.
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config.js';

export function requireAuth(req, res, next) {
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
