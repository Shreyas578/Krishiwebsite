/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user info to requests
 */

import jwt from 'jsonwebtoken';

function authMiddleware(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'Missing authorization header' });
    }

    // Extract token (format: "Bearer <token>")
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing token' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Attach user info to request
    req.user = {
      id: decoded.id,
      phone: decoded.phone,
      role: decoded.role
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
}

export { authMiddleware };
export default { authMiddleware };
