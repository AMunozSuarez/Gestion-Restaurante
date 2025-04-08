import axios from '../services/axiosConfig';

export const addCashMovement = async (data) => {
    return await axios.post('/cash/create', data);
};

export const getCashMovements = async (params) => {
    return await axios.get('/cash/getAll', { params });
};