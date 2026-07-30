const express = require('express');
const router = express.Router();
const {createOrganiser, deleteOrganiser} = require('../controllers/adminController');
const {verifyLogin, authorise} = require('../middleware/authMiddleware');

// enforce being logged in as admin for all routes
router.use(verifyLogin);
router.use(authorise('admin'));

router.post('/organisers', createOrganiser);
router.delete('/organisers/:id', deleteOrganiser);

module.exports = router;