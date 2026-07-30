import React, { useState } from 'react';                                  
                                                                              
const TaskForm = ({ onSubmit }) => {                                      
    const [formData, setFormData] = useState({                              
    title: '',                                                            
    description: '',                                                      
    });                                                                     
                                                                            
    const handleChange = (e) => {                                           
    setFormData({                                                         
        ...formData,                                                        
        [e.target.name]: e.target.value,                                    
    });                                                                   
    };                                                                      
                                                                            
    const handleSubmit = (e) => {                                           
    e.preventDefault();                                                   
                                                                            
    if (formData.title.trim()) {                                          
        onSubmit(formData);                                                 
        setFormData({ title: '', description: '' });                        
    }                                                                     
    };                                                                      
                                                                            
    return (                                                                
    <form onSubmit={handleSubmit} className="task-form">                  
        <div className="form-group">                                        
        <input                                                            
            type="text"                                                     
            name="title"                                                    
            value={formData.title}                                          
            onChange={handleChange}                                         
            placeholder="Task title *"                                      
            required                                                        
        />                                                                
        </div>                                                              
        <div className="form-group">                                        
        <textarea                                                         
            name="description"                                              
            value={formData.description}                                    
            onChange={handleChange}                                         
            placeholder="Task description (optional)"                       
            rows="3"                                                        
        />                                                                
        </div>                                                              
        <button type="submit" className="btn-submit">                       
        Add Task                                                          
        </button>                                                           
    </form>                                                               
    );                                                                      
};                                                                        
                                                                            
export default TaskForm;