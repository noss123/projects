const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    // common event fields
    name: {type: String, required: true},
    description: {type: String, required: true},
    type: {type: String, enum: ['normal', 'merchandise'], required: true},
    // eligibility: if event is open to exclusively IIIT/non-IIIT participants or all participants
    eligibility: {type: String, enum: ['all', 'internal', 'external'], required: true},
    // event status (for event creation)
    status: {type: String, enum: ['draft', 'published', 'ongoing', 'closed', 'completed'], default: 'draft'},

    // validation for dates at schema level
    registrationDeadline: {type: Date, required: true, validate: {
        validator: function(value) {
            return value < this.startDate;
        },
        message: 'Registration deadline must be before the event start date.'
    }},
    startDate: {type: Date, required: true, validate: {
        validator: function(value) {
            return value > new Date();
        },
        message: 'Event start date must be in the future.'
    }},
    endDate: {type: Date, required: true, validate: {
        validator: function(value) {
            return value > this.startDate;
        },
        message: 'Event end date must be after the event start date.'
    }},

    registrationLimit: {type: Number, required: true},
    registrationFee: {type: Number, required: true, default: 0},
    registrationCount: {type: Number, default: 0},
    // ensuring that this is actually an organiser isn't required here; only organisers can create the events they are in charge of
    organiserID: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    eventTags: {type: [String], default: ['misc']},

    // normal event-specific fields
    registrationForm: [{
        fieldLabel: {type: String},
        fieldType: {type: String, enum: ['text', 'number', 'dropdown', 'checkbox', 'radio', 'date']},
        isRequired: {type: Boolean, default: false},
        // array to store option list for dropdown/checkbox/radio fields
        options: [{type: String}]
    }],

    // merchandise event-specific fields
    itemDetails: [{
        size: {type: String},
        colour: {type: String},
        variantName: {type: String}
    }],
    stockQuantity: {type: Number},
    purchaseLimit: {type: Number}

}, {timestamps: true});

// for text search
eventSchema.index({name: 'text', description: 'text'});

module.exports = mongoose.model('Event', eventSchema);