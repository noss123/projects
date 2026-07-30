const express = require('express');
const router = express.Router();
const {createEvent, getEvents, deleteEvent, updateEvent} = require('../controllers/eventController');
const {verifyLogin, authorise} = require('../middleware/authMiddleware');

// enforce being logged in as organiser for all routes
router.use(verifyLogin);
router.use(authorise('organiser'));

router.post('/schedule', createEvent);
router.get('/schedule', getEvents);
router.delete('/schedule/:id', deleteEvent);
router.put('/schedule/:id', updateEvent);

module.exports = router;