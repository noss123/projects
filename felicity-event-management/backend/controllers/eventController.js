const Event = require('../models/Event');

// creating a new event (called by organiser)
const createEvent = async (req, res, next) => {
    try {
        const {
            name, description, type, eligibility, registrationDeadline, 
            startDate, endDate, registrationLimit, registrationFee, eventTags, 
            registrationForm, itemDetails, stockQuantity, purchaseLimit
        } = req.body;
        
        // manually enforce event type-specific fields
        if (type === 'normal') {
            if (!registrationForm || registrationForm.length === 0) {
                return res.status(400).json({message: 'Event must have a registration form.'});
            }
        } else if (type === 'merchandise') {
            if (!itemDetails || itemDetails.length === 0 || !stockQuantity || !purchaseLimit) {
                return res.status(400).json({message: 'Merchandise events must specify item details, stock quantity, and purchase limit.'});
            }
        } else {
            return res.status(400).json({message: 'Invalid event type.'});
        }

        // date validation already handled at schema level
        // but handled again here for proper error messages
        const start = new Date(startDate);
        const end = new Date(endDate);
        const deadline = new Date(registrationDeadline);
        const now = new Date();

        if (start < now) {
            return res.status(400).json({message: 'Event start date must be in the future.'});
        }
        if (end < start) {
            return res.status(400).json({message: 'Event end date must be after the event start date.'});
        }
        if (deadline > start) {
            return res.status(400).json({message: 'Registration deadline must be before the event start date.'});
        }

        const event = await Event.create({
            name, description, type, eligibility, registrationDeadline,
            startDate, endDate, registrationLimit, registrationFee, eventTags,

            registrationForm: type === 'normal' ? registrationForm : undefined,
            itemDetails: type === 'merchandise' ? itemDetails : undefined,
            stockQuantity: type === 'merchandise' ? stockQuantity : undefined,
            purchaseLimit: type === 'merchandise' ? purchaseLimit : undefined,

            // event organiser is the logged-in organiser who creates the event
            organiserID: req.user._id
        });

        res.status(201).json({
            message: 'Event created successfully.',
            event: {
                _id: event._id,
                name: event.name,
                description: event.description,
                type: event.type
            }
        });
    } catch (err) {
        next(err);
    }
};

// for the organiser to view all created events
const getEvents = async(req, res, next) => {
    try {
        // get list of events sorted by increasing start date
        const events = await Event.find({organiserID: req.user._id}).sort({startDate: 1});
        res.json(events);
    } catch (err) {
        next(err);
    }
};

// an organiser can delete an event they've created (if still in draft mode)
const deleteEvent = async(req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);

        // constraints to ensure deletion is done only for events in draft mode, and only by the creating organiser
        if (!event) {
            return res.status(404).json({message: 'Event not found.'});
        }
        if (event.organiserID.toString() !== req.user._id.toString()) {
            return res.status(403).json({message: 'Event deletion allowed only by event organiser.'});
        }
        if (event.status !== 'draft') {
            return res.status(400).json({message: 'Event deletion permitted only when in draft mode.'});
        }

        await event.deleteOne();
        res.json({message: 'Event deleted successfully.'});
    } catch (err) {
        next(err);
    }
};

const updateEvent = async(req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({message: 'Event not found.'});
        }
        if (event.organiserID.toString() !== req.user._id.toString()) {
            return res.status(403).json({message: 'Event modification allowed only by event organiser.'});
        }
    
        const {status, ...others} = req.body;
        const currentStatus = event.status;

        if (currentStatus === 'completed') {
            if (Object.keys(others).length > 0) {
                return res.status(400).json({message: 'No further updates allowed for completed events.'});
            }
        }
        else if (currentStatus === 'ongoing' || currentStatus === 'closed') {
            if (Object.keys(others).length > 0) {
                return res.status(400).json({message: 'Only status updates allowed for ongoing/closed events.'});
            }
            if (status) event.status = status;
        }
        else if (currentStatus === 'published') {
            const allowedUpdates = ['description', 'registrationDeadline', 'registrationLimit', 'status'];
            for (let key in others) {
                if (!allowedUpdates.includes(key)) {
                    return res.status(400).json({message: 'For published events, only description updates, registration deadline extensions, registration limit increases and closing registrations are permitted.'});
                }
            }
            if (others.description) {
                event.description = others.description;
            }
            if (others.registrationDeadline) {
                if (new Date(others.registrationDeadline) < new Date(event.registrationDeadline)) {
                    return res.status(400).json({message: 'Registration deadline can only be extended.'});
                }
                if (new Date(others.registrationDeadline) > event.startDate) {
                    return res.status(400).json({message: 'Registration deadline must be before event start date.'});
                }
                event.registrationDeadline = others.registrationDeadline;
            }
            if (others.registrationLimit) {
                if (others.registrationLimit < event.registrationLimit) {
                    return res.status(400).json({message: 'Registration limit can only be increased.'});
                }
                if (others.registrationLimit < event.registrationCount) {
                    return res.status(400).json({message: 'Registration limit cannot be less than current registration count.'});
                }
                event.registrationLimit = others.registrationLimit;
            }
            if (status) {
                if (status !== 'closed') {
                    return res.status(400).json({message: 'For published events, the only allowed status update is closing registrations.'});
                }
                event.status = status;
            }
        }
        else if (currentStatus === 'draft') {
            const allowedUpdates = [
                'name', 'description', 'type', 'eligibility', 'registrationDeadline', 
                'startDate', 'endDate', 'registrationLimit', 'registrationFee', 'eventTags', 
                'registrationForm', 'itemDetails', 'stockQuantity', 'purchaseLimit', 'status'
            ];

            allowedUpdates.forEach(field => {
                if (req.body[field] !== undefined) {
                    event[field] = req.body[field];
                }
            });

            if (event.type === 'normal') {
                if (!event.registrationForm || event.registrationForm.length === 0) {
                    return res.status(400).json({message: 'Event must have a registration form.'});
                }
            } else if (event.type === 'merchandise') {
                if (!event.itemDetails || event.itemDetails.length === 0 || !event.stockQuantity || !event.purchaseLimit) {
                    return res.status(400).json({message: 'Merchandise events must specify item details, stock quantity, and purchase limit.'});
                }
            }

            const start = new Date(event.startDate);
            const end = new Date(event.endDate);
            const deadline = new Date(event.registrationDeadline);
            const now = new Date();

            if (start < now) {
                return res.status(400).json({message: 'Event start date must be in the future.'});
            }
            if (end < start) {
                return res.status(400).json({message: 'Event end date must be after the event start date.'});
            }
            if (deadline > start) {
                return res.status(400).json({message: 'Registration deadline must be before the event start date.'});
            }
        }

        await event.save();
        res.json({
            message: 'Event updated successfully.', 
            event: {
                _id: event._id,
                name: event.name,
                description: event.description,
                type: event.type,
                status: event.status
            }
        });

    } catch (err) {
        next(err);
    }
};

module.exports = {createEvent, getEvents, deleteEvent, updateEvent};
