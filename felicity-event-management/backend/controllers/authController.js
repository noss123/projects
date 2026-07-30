const User = require('../models/User');
const jwt = require('jsonwebtoken');

// since backend is stateless, the JWT token is used to maintain user sessions
// expires in 7 days, allowing session to persist unless explicitly logged out
const generateJWTToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: '7d'});
}

// function to register new participant
const registerParticipant = async (req, res, next) => {
    try {
        const {username, email, password, firstName, lastName, organisationName, contactNumber} = req.body;

        // manually enforce participant-specific fields
        if (!firstName || !lastName || !organisationName || !contactNumber) {
            return res.status(400).json({ 
                message: 'All participant fields are required.' 
            });
        }

        // check whether user already exists
        const isExistingUser = await User.findOne({$or: [{username}, {email}]});
        if (isExistingUser) {
            return res.status(400).json({message: 'User with given username or email already exists.'});
        }

        // derive participant type from email
        let participantType = 'non-IIIT';
        if (email.endsWith('@iiit.ac.in') || email.endsWith('.iiit.ac.in')) {
            participantType = 'IIIT';
        }

        const user = await User.create({
            username,
            email,
            password,
            role: 'participant',
            firstName,
            lastName,
            participantType: participantType,
            organisationName,
            contactNumber
        });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            participantType: user.participantType,
            token: generateJWTToken(user._id)
        });
    } catch (err) {
        next(err);
    }
};

// function to authenticate user login
const loginUser = async (req, res, next) => {
    try {
        const {email, password} = req.body;
        const user = await User.findOne({email});

        if (user && await user.comparePassword(password)) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                token: generateJWTToken(user._id)
            });
        } else {
            res.status(401).json({message: 'Invalid login credentials'});
        }
    } catch (err) {
        next(err);
    }
};

module.exports = {registerParticipant, loginUser};