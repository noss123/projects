import { useState, useEffect } from 'react';                              
import { taskAPI } from './services/api';                                 
import TaskForm from './components/TaskForm';                             
import TaskItem from './components/TaskItem';                             
import './App.css';                                                       
                                                                          
function App() {                                                          
  const [tasks, setTasks] = useState([]);                                 
  const [loading, setLoading] = useState(true);                           
  const [error, setError] = useState(null);                               
                                                                          
  // Fetch tasks on component mount                                       
  useEffect(() => {                                                       
    fetchTasks();                                                         
  }, []);                                                                 
                                                                          
  const fetchTasks = async () => {                                        
    try {                                                                 
      setLoading(true);                                                   
      const response = await taskAPI.getAllTasks();                       
      setTasks(response.data.data);                                       
      setError(null);                                                     
    } catch (err) {                                                       
      setError('Failed to fetch tasks. Make sure backend is running.');   
      console.error('Error fetching tasks:', err);                        
    } finally {                                                           
      setLoading(false);                                                  
    }                                                                     
  };                                                                      
                                                                          
  const handleCreateTask = async (taskData) => {                          
    try {                                                                 
      const response = await taskAPI.createTask(taskData);                
      setTasks([response.data.data, ...tasks]);                           
    } catch (err) {                                                       
      alert('Failed to create task');                                     
      console.error('Error creating task:', err);                         
    }                                                                     
  };                                                                      
                                                                          
  const handleToggleTask = async (task) => {                              
    try {                                                                 
      const updatedData = { completed: !task.completed };                 
      const response = await taskAPI.updateTask(task._id, updatedData);   
      setTasks(tasks.map(t =>                                             
        t._id === task._id ? response.data.data : t                       
      ));                                                                 
    } catch (err) {                                                       
      alert('Failed to update task');                                     
      console.error('Error updating task:', err);                         
    }                                                                     
  };                                                                      
                                                                          
  const handleDeleteTask = async (id) => {                                
    if (window.confirm('Are you sure you want to delete this task?')) {   
      try {                                                               
        await taskAPI.deleteTask(id);                                     
        setTasks(tasks.filter(task => task._id !== id));                  
      } catch (err) {                                                     
        alert('Failed to delete task');                                   
        console.error('Error deleting task:', err);                       
      }                                                                   
    }                                                                     
  };                                                                      
                                                                          
  return (                                                                
    <div className="app">                                                 
      <div className="container">                                         
        <header className="app-header">                                   
          <h1>MERN Task Manager</h1>                                      
          <p>Full-Stack App with MongoDB, Express, React & Node.js</p>    
        </header>                                                         
                                                                          
        <div className="app-content">                                     
          <section className="form-section">                              
            <h2>Create New Task</h2>                                      
            <TaskForm onSubmit={handleCreateTask} />                      
          </section>                                                      
                                                                          
          <section className="tasks-section">                             
            <h2>Tasks ({tasks.length})</h2>                               
                                                                          
            {loading && <p className="loading">Loading tasks...</p>}      
                                                                          
            {error && <p className="error">{error}</p>}                   
                                                                          
            {!loading && !error && tasks.length === 0 && (                
              <p className="empty-state">No tasks yet. Create one         
above!</p>                                                                  
            )}                                                            
                                                                          
            {!loading && !error && tasks.length > 0 && (                  
              <div className="tasks-list">                                
                {tasks.map(task => (                                      
                  <TaskItem                                               
                    key={task._id}                                        
                    task={task}                                           
                    onToggle={handleToggleTask}                           
                    onDelete={handleDeleteTask}                           
                  />                                                      
                ))}                                                       
              </div>                                                      
            )}                                                            
          </section>                                                      
        </div>                                                            
      </div>                                                              
    </div>                                                                
  );                                                                      
}                                                                         
                                                                          
export default App;