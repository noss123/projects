const mongoose = require('mongoose');
// bcrypt for password hashing when storing user credentials
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // common user fields
    username: {type: String, required: true, unique: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    role: {type: String, enum: ['admin', 'organiser', 'participant'], required: true},

    // participant-specific fields
    firstName: {type: String},
    lastName: {type: String},
    participantType: {type: String, enum: ['IIIT', 'non-IIIT']},
    organisationName: {type: String},
    contactNumber: {type: String},

    // participant preferences
    // stored as arrays
    interests: [{type: String}],
    // enforcing that only organisers can be followed will be done in the controller logic
    followedOrganisers: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],

    // organiser-specific fields
    organiserName: {type: String},
    category: {type: String, enum: ['club', 'council', 'fest-team']},
    description: {type: String},
    contactEmail: {type: String},
      
}, {timestamps: true});

// hashing passwords before storing in the database
userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    // uses a salt with cost factor 10
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);