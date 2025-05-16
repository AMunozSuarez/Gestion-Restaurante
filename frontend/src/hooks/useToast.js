import { toast } from 'react-toastify';

// Define el hook como una función
const useToast = () => {
  // Función para mostrar un toast de éxito
  const success = (message) => {
    toast.success(message);
  };

  // Función para mostrar un toast de error
  const error = (message) => {
    toast.error(message);
  };

  // Función para mostrar un toast de información
  const info = (message) => {
    toast.info(message);
  };

  // Función para mostrar un toast de advertencia
  const warning = (message) => {
    toast.warning(message);
  };

  // Función para mostrar un toast personalizado
  const custom = (message, options) => {
    toast(message, options);
  };

  // Función para mostrar un toast de carga que se actualiza luego
  const loading = (id) => {
    return toast.loading('Procesando...', { toastId: id });
  };

  // Función para actualizar un toast existente
  const update = (id, message, options) => {
    toast.update(id, { 
      render: message, 
      type: options?.type || 'default', 
      isLoading: false,
      autoClose: options?.autoClose || 5000,
      ...options
    });
  };

  // Función para descartar un toast específico
  const dismiss = (id) => {
    toast.dismiss(id);
  };

  // Retorna las funciones para usar en componentes
  return {
    success,
    error,
    info,
    warning,
    custom,
    loading,
    update,
    dismiss,
  };
};

// Exporta la función como default
export default useToast;