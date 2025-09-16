import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../services/axiosConfig';

export const useCreateOrder = () => {
    const queryClient = useQueryClient();

    // Función para imprimir comanda automáticamente
    const printComandaAutomatically = async (order) => {
        try {
            // Obtener configuración guardada del usuario
            const savedConfig = localStorage.getItem('printConfig');
            let printMethod = 'system';
            let selectedPrinter = '';
            
            if (savedConfig) {
                try {
                    const config = JSON.parse(savedConfig);
                    printMethod = config.printMethod || 'system';
                    selectedPrinter = config.selectedPrinter || '';
                } catch (error) {
                    console.error('Error cargando configuración de impresión:', error);
                }
            }

            let response;

            switch (printMethod) {
                case 'thermal':
                    response = await axios.post('/print/thermal', { order });
                    break;
                case 'download':
                    response = await axios.post('/print/pdf', { order }, { responseType: 'blob' });
                    // Descargar archivo automáticamente
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `comanda_${order.orderNumber}.txt`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                    break;
                case 'system':
                default:
                    // Si no hay impresora seleccionada, usar la primera disponible
                    if (!selectedPrinter) {
                        const printersResponse = await axios.get('/print/printers');
                        if (printersResponse.data.success && printersResponse.data.printers.length > 0) {
                            selectedPrinter = printersResponse.data.printers[0];
                        }
                    }
                    
                    console.log('Enviando pedido para impresión:', {
                        orderNumber: order?.orderNumber,
                        foodsLength: order?.foods?.length,
                        foodsStructure: order?.foods?.map(item => ({
                            hasFood: !!item.food,
                            foodTitle: item.food?.title,
                            foodPrice: item.food?.price,
                            quantity: item.quantity
                        }))
                    });
                    
                    response = await axios.post('/print/system', { 
                        order, 
                        printerName: selectedPrinter || 'default'
                    });
                    break;
            }
            
            if (response && response.data.success) {
                console.log('Comanda impresa automáticamente:', response.data.message);
            }
        } catch (error) {
            console.warn('No se pudo imprimir la comanda automáticamente:', error.message);
            // No mostrar error al usuario, solo log en consola
        }
    };

    // Mutación para crear un pedido
    const mutation = useMutation({
        mutationFn: async (newOrder) => {
            try {
                const response = await axios.post('/order/create', newOrder);
                console.log('Pedido creado:', response.data.order);
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
