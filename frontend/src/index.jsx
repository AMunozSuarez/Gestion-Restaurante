import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/professional.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Prevent mouse wheel from changing numeric input values
document.addEventListener('wheel', function () {
  if (document.activeElement?.type === 'number') {
    document.activeElement.blur();
  }
}, { passive: true });
