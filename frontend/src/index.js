import React from 'react';
import ReactDOM from 'react-dom/client'; // Importa desde 'react-dom/client' para React 18
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from './services/queryClient';
import App from './App';
import axios from 'axios';

// Configura la URL base de Axios desde las variables de entorno
axios.defaults.baseURL = process.env.REACT_APP_API_URL;

// Crea el root para React 18
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
    <QueryClientProvider client={queryClient}>
        <App />
    </QueryClientProvider>
);