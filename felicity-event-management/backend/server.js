require('dotenv').config();                                               
const express = require('express');                                       
const cors = require('cors');                                             
const connectDB = require('./config/db');
const User = require('./models/User');
                                                                            
// Connect to database                                                    
connectDB();                                                              
                                                                            
const app = express();                                                    
                                                                            
// Middleware                                                             
app.use(cors());                                                          
app.use(express.json());                                                  
app.use(express.urlencoded({ extended: false }));                         
                                                                            
// Routes                                                                 
app.use('/api/auth', require('./routes/authRoutes'));  
app.use('/api/admin', require('./routes/adminRoutes'));  
app.use('/api/events', require('./routes/eventRoutes'));  

// function to create admin account
const initAdmin = async () => {
    try {
        const adminExists = await User.findOne({role: 'admin'});
        if (!adminExists) {
            await User.create({
                username: 'sysadmin',
                email: 'admin@iiit.ac.in',
                password: 'youllneverguess',
                role: 'admin',
            });
            console.log('Admin account initialised successfully.');
        } else {
            console.log('Admin account already exists. Skipping initialisation.');
        }
    } catch (err) {
        console.error('Error during admin account initialisation:', err);
    }
};

initAdmin();

// Basic route for testing                                                
app.get('/', (req, res) => {                                              
    res.json({ message: 'This must be new!' });                           
});                                                                       
                                                                            
// Error handler (optional but recommended)                               
app.use((err, req, res, next) => {                                        
    console.error(err.stack);                                               
    res.status(500).json({                                                  
    success: false,                                                       
    error: err.message || 'Server Error',                                 
    });                                                                     
});                                                                       
                                                                            
const PORT = process.env.PORT || 5000;                                    
                                                                            
app.listen(PORT, () => {                                                  
    console.log(`Server is running on port ${PORT}`);                       
});