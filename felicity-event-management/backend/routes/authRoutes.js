const express = require('express');
const router = express.Router();
const {registerParticipant, loginUser} = require('../controllers/authController');
const {verifyLogin, authorise} = require('../middleware/authMiddleware');

router.post('/register', registerParticipant);
router.post('/login', loginUser);

module.exports = router;