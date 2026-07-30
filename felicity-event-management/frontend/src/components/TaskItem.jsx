import React from 'react';                                                
                                                                              
const TaskItem = ({ task, onToggle, onDelete }) => {                      
    return (                                                                
    <div className="task-item">                                           
        <div className="task-content">                                      
        <h3 style={{                                                      
            textDecoration: task.completed ? 'line-through' : 'none',       
            color: task.completed ? '#888' : '#333'                         
        }}>                                                               
            {task.title}                                                    
        </h3>                                                             
        {task.description && <p>{task.description}</p>}                   
        <small>                                                           
            Created: {new Date(task.createdAt).toLocaleDateString()}        
        </small>                                                          
        </div>                                                              
        <div className="task-actions">                                      
        <button                                                           
            onClick={() => onToggle(task)}                                  
            className={task.completed ? 'btn-undo' : 'btn-complete'}        
        >                                                                 
            {task.completed ? 'Undo' : 'Complete'}                          
        </button>                                                         
        <button                                                           
            onClick={() => onDelete(task._id)}                              
            className="btn-delete"                                          
        >                                                                 
            Delete                                                          
        </button>                                                         
        </div>                                                              
    </div>                                                                
    );                                                                      
};                                                                        
                                                                            
export default TaskItem;