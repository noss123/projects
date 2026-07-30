const User = require('../models/User');
const jwt = require('jsonwebtoken');

// function to ensure login is still valid via JWT token verification
const verifyLogin = async (req, res, next) => {
    let token;
    // HTTP Bearer authentication: provide the JWT token in the Authorization request header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // token is in the format "Bearer <token>"
            token = req.headers.authorization.split(' ')[1];
            // verify with JWT secret key; returns decoded payload
            const dec = jwt.verify(token, process.env.JWT_SECRET);
            // find user by ID (to ensure user account is still valid)
            // here, exclude the password field so that the hash is not sent back to the client
            req.user = await User.findById(dec.id).select('-password');
            next();
        } catch (err) {
            console.error(err);
            res.status(401).json({message: 'Access not authorised (invalid/expired token)'});
        }
    }

    if (!token) {
        res.status(401).json({message: 'Access not authorised (no token provided)'});
    }
};

// function to ensure role-based authorisation for users
// rest parameter: allows variable number of args passed as an array
const authorise = (...authorisedRoles) => {
    return (req, res, next) => {
        if (!authorisedRoles.includes(req.user.role)) {
            return res.status(403).json({message: 'Access forbidden (insufficient permissions)'});
        }
        next();
    };
};

module.exports = {verifyLogin, authorise};
