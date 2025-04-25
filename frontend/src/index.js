// index.js

import React from 'react';
import ReactDOM from 'react-dom/client'; // Import the new 'client' module
import App from './App';  // Import the main App component
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root')); // Create the root
root.render(  // Use the new 'render' method on the root
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
