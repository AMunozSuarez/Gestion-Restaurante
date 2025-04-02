import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:3001/api', // Cambia esto por tu URL base
    headers: {
        'Content-Type': 'application/json',
    },
});

export default axiosInstance;