import axios from '../axiosConfig';

// =================== USUARIOS ===================

export const getAllUsers = async (params = {}) => {
    try {
        const response = await axios.get('/admin/users', { params });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const createUser = async (userData) => {
    try {
        const response = await axios.post('/admin/users', userData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const updateUser = async (userId, userData) => {
    try {
        const response = await axios.put(`/admin/users/${userId}`, userData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const deleteUser = async (userId) => {
    try {
        const response = await axios.delete(`/admin/users/${userId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// =================== RESTAURANTES ===================

export const getAllRestaurants = async (params = {}) => {
    try {
        const response = await axios.get('/admin/restaurants', { params });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const createRestaurant = async (restaurantData) => {
    try {
        const response = await axios.post('/admin/restaurants', restaurantData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const updateRestaurant = async (restaurantId, restaurantData) => {
    try {
        const response = await axios.put(`/admin/restaurants/${restaurantId}`, restaurantData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const deleteRestaurant = async (restaurantId) => {
    try {
        const response = await axios.delete(`/admin/restaurants/${restaurantId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// =================== ESTADÍSTICAS ===================

export const getSystemStats = async () => {
    try {
        const response = await axios.get('/admin/stats');
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};
