import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../services/axiosConfig';
import { PrintKitchenTicket, GetAvailablePrinters } from '../../services/printService';

export const useCreateOrder = () => {
    const queryClient = useQueryClient();

    // Función para imprimir comanda automáticamente
    const printComandaAutomatically = async (order) => {
        try {
            // Verificar si la impresión automática está habilitada
            const printSettings = localStorage.getItem('printSettings');
            if (printSettings) {
                const settings = JSON.parse(printSettings);
                if (!settings.autoPrintKitchen) {
                    console.log('Impresión automática de cocina deshabilitada');
                    return;
                }
            } else {
                // Si no hay configuración, asumir que está deshabilitada
                console.log('No hay configuración de impresión, saltando impresión automática');
                return;
            }

            // Obtener impresora guardada del usuario
            const savedPrinter = localStorage.getItem('selectedPrinter');
            let printerName = savedPrinter;
            
            // Si no hay impresora seleccionada, usar la primera disponible
            if (!printerName) {
                try {
                    const response = await GetAvailablePrinters();
                    if (response.success && response.printers && response.printers.length > 0) {
                        printerName = response.printers[0].PrinterName;
                    }
                } catch (error) {
                    console.warn('No se pudieron obtener las impresoras:', error.message);
                    return;
                }
            }

            // Imprimir ticket de COCINA automáticamente
            const result = await PrintKitchenTicket(order._id, printerName);
            if (result && result.success) {
            }
        } catch (error) {
            // No mostrar error al usuario, solo log en consola
        }
    };

    // Mutación para crear un pedido
    const mutation = useMutation({
        mutationFn: async (newOrder) => {
            try {
                const response = await axios.post('/order/create', newOrder);
                return response.data;
                
            } catch (error) {
                console.error('Error en la solicitud al backend:', error.response?.data || error.message);
                throw error;
            }
        },
        onSuccess: async (data) => {
            // Refrescar la lista de pedidos después de crear uno nuevo
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            
            // Imprimir comanda automáticamente si el pedido se creó exitosamente
            if (data && data.order) {
                await printComandaAutomatically(data.order);
            }
        },
    });

    // Función wrapper que maneja callbacks
    const createOrderWithCallbacks = (newOrder, callbacks = {}) => {
        mutation.mutate(newOrder, {
            onSuccess: (data) => {
                // Llamar callback personalizado si existe
                if (callbacks.onSuccess) {
                    callbacks.onSuccess(data);
                }
            },
            onError: (error) => {
                // Llamar callback de error si existe
                if (callbacks.onError) {
                    callbacks.onError(error);
                }
            }
        });
    };

    return {
        createOrder: createOrderWithCallbacks, // Función para crear un pedido con callbacks
        isLoading: mutation.isLoading, // Estado de carga
        error: mutation.error, // Error en la creación
    };
};
