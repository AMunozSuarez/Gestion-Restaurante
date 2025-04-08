import axios from '../services/axiosConfig';

export const getReport = async (data) => {
    return await axios.get('/report/sales', data);
};
