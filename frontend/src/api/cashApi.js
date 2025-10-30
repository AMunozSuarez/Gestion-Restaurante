import axios from '../services/axiosConfig';

// Add a cash movement
export const addCashMovement = async (data) => {
    return await axios.post('/cash/movement', data);
};

// Get all cash movements
export const getCashMovements = async (params) => {
    return await axios.get('/cash/movement', { params });
};

// Create a new cash register
export const createCashRegister = async (data) => {
    return await axios.post('/cash/create', data);
};

// Get the current cash register
export const getCurrentCashRegister = async () => {
    return await axios.get('/cash/current');
};

// Close the current cash register
export const closeCashRegister = async (data) => {
    return await axios.put('/cash/close', data, {
        validateStatus: function (status) {
            // Considerar 400 como válido si es por pedidos pendientes
            return status < 500;
        }
    }).then(response => {
        // Si es 400, lanzar error para que se maneje en el catch
        if (response.status === 400) {
            const error = new Error(response.data.message);
            error.response = response;
            throw error;
        }
        return response;
    });
};

// Get all cash registers for a restaurant
export const getAllCashRegisters = async (params) => {
    return await axios.get('/cash/cashRegister', { params });
};

// Get a cash register by ID
export const getCashRegisterById = async (id) => {
    return await axios.get(`/cash/cashRegister/${id}`);
};

// Cerrar un pedido
export const closeOrder = async (data) => {
    return await axios.post('/cash/order/close', data);
};