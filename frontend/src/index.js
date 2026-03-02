import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/professional.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Prevent mouse wheel from changing numeric input values
document.addEventListener('wheel', function () {
  if (document.activeElement?.type === 'number') {
    document.activeElement.blur();
  }
}, { passive: true });
