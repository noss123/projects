const User = require('../models/User');

// function to provision an organiser account with temp credentials
const createOrganiser = async (req, res, next) => {
    try {
        const {username, email, password, organiserName, category, description, contactEmail} = req.body;

        // manually enforce organiser-specific fields
        if (!organiserName || !category || !description || !contactEmail) {
            return res.status(400).json({ 
                message: 'All organiser fields are required.' 
            });
        }

        const isExistingUser = await User.findOne({$or: [{username}, {email}]});
        if (isExistingUser) {
            return res.status(400).json({message: 'User with given username or email already exists.'});
        }

        const organiser = await User.create({
            username,
            email,
            password,
            role: 'organiser',
            organiserName,
            category,
            description,
            contactEmail
        });

        res.status(201).json({
            message: 'Organiser account created successfully.',
            organiser: {
                _id: organiser._id,
                username: organiser.username,
                organiserName: organiser.organiserName,
                category: organiser.category,
                description: organiser.description,
            }
        });
    } catch (err) {
        next(err);
    }
};

// function to delete a specific organiser account
// organiser ID will be provided in request parameters
const deleteOrganiser = async (req, res, next) => {
    try {
        const organiser = await User.findById(req.params.id);

        if (!organiser || organiser.role !== 'organiser') {
            return res.status(404).json({message: 'Organiser not found.'});
        }

        // delete account from database
        await User.findByIdAndDelete(req.params.id);
        res.json({message: 'Organiser removed successfully.'});
    } catch (err) {
        next(err);
    }
};

module.exports = {createOrganiser, deleteOrganiser};