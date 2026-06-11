import api from './api';

const usersService = {
  // Obtener todos los usuarios del restaurante
  getUsersByRestaurant: async () => {
    try {
      const response = await api.get('/user/getUsersByRestaurant');
      
      return {
        success: true,
        data: response.data.users || []
      };
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al obtener usuarios'
      };
    }
  },

  // Crear nuevo empleado
  createEmployee: async (employeeData) => {
    try {
      const response = await api.post('/user/createEmployee', employeeData);
      return {
        success: true,
        data: response.data.user || response.data.employee,
        message: response.data.message || 'Usuario creado exitosamente'
      };
    } catch (error) {
      console.error('Error al crear empleado:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al crear usuario'
      };
    }
  },

  // Actualizar usuario
  updateEmployee: async (userId, userData) => {
    try {
      const response = await api.put(`/user/updateEmployee/${userId}`, userData);
      return {
        success: true,
        data: response.data.user,
        message: response.data.message || 'Usuario actualizado exitosamente'
      };
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al actualizar usuario'
      };
    }
  },

  // Activar / desactivar usuario
  toggleUserActive: async (userId) => {
    try {
      const response = await api.patch(`/user/toggleUserActive/${userId}`);
      return {
        success: true,
        isActive: response.data.isActive,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error al cambiar estado del usuario:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al cambiar estado del usuario'
      };
    }
  },

  // Borrado lógico de usuario
  deleteEmployee: async (userId) => {
    try {
      const response = await api.delete(`/user/deleteUser/${userId}`);
      return {
        success: true,
        message: response.data.message || 'Usuario eliminado exitosamente'
      };
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al eliminar usuario'
      };
    }
  }
};

export default usersService;
