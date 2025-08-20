import { useState, useEffect } from 'react';
import { useCreateOrder } from '../api/useCreateOrder';
import useCartStore from '../../store/useCartStore';
import { useOrders } from '../api/useOrders';
import { closeOrder } from '../../services/api/cashApi';
import { updateOrder } from '../../services/api/ordersApi';
import axios from '../../services/axiosConfig';
import { useQueryClient } from '@tanstack/react-query';
import useToast from '../useToast'
import { useCustomerManagement } from '../customer/useCustomerManagment';
import { useOrderOperations } from './useOrderOperations'; // Importar el hook refactorizado

export const useOrderForm = () => {
    const { createOrder } = useCreateOrder(); // Hook para manejar la creación de pedidos
    const { cart, setCart, cartTotal, clearCart } = useCartStore(); // Estado del carrito desde Zustand
    const { orders, setOrders, updateOrderInList } = useOrders(); // Obtener y actualizar el estado global de pedidos
    const [customerName, setCustomerName] = useState(''); // Estado para el nombre del cliente
    const [customerPhone, setCustomerPhone] = useState(''); // Estado para el teléfono del cliente
    const [deliveryAddress, setDeliveryAddress] = useState(''); // Estado para la dirección de entrega
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Efectivo'); // Estado para el método de pago
    const [editingOrderId, setEditingOrderId] = useState(null); // ID del pedido que se está editando
    const [deliveryCost, setDeliveryCost] = useState(''); // Estado para el costo de envío
    const [comment, setComment] = useState(''); // Estado para comentarios opcionales
    const queryClient = useQueryClient();
    const toast = useToast();
    const {
        createOrUpdateCustomer, 
        manageCustomerAddresses 
    } = useCustomerManagement();

    const resetForm = () => {
        setCustomerName('');
        setCustomerPhone('');
        setDeliveryAddress('');
        setSelectedPaymentMethod('Efectivo');
        setEditingOrderId(null);
        setDeliveryCost('');
        setComment(''); // Reiniciar el comentario
        setCart([]); // Limpiar el carrito
    };

    // Función para manejar el envío del formulario
    const handleSubmit = async (e, resetForm, status = 'Preparacion', section = 'mostrador', extraData = {}) => {
        console.log('Editing Order ID:', editingOrderId);
        if (e && e.preventDefault) e.preventDefault();

        try {
            // Limpiar localStorage para evitar dependencias
            if (localStorage.getItem('editing_address_original')) {
                localStorage.removeItem('editing_address_original');
            }

            // Construir objeto de cliente con la información actual
            let buyerData = {
                name: customerName,
                phone: customerPhone,
                comment: comment || '',
            };

            // Manejar direcciones si es necesario
            if (deliveryAddress) {
                const addressData = {
                    address: deliveryAddress,
                    deliveryCost: Number(deliveryCost) || 0,
                };
                
                // Usar el hook especializado para gestionar direcciones
                if (customerPhone) {
                    const addressOptions = {
                        isEditingAddress: extraData.isEditingAddress,
                        originalAddress: extraData.originalAddress,
                        isAddingNewAddress: extraData.isAddingNewAddress
                    };
                    
                    buyerData.addresses = await manageCustomerAddresses(
                        customerPhone, 
                        addressData, 
                        addressOptions
                    );
                } else {
                    buyerData.addresses = [addressData];
                }
            }

            // Crear/actualizar cliente si tenemos un teléfono
            if (customerPhone) {
                const updatedCustomer = await createOrUpdateCustomer(buyerData);
                
                if (updatedCustomer && updatedCustomer._id) {
                    buyerData = updatedCustomer._id; // Usar solo el ID
                }
            }
            
            // El resto del código sigue igual
            const newOrder = {
                orderNumber: extraData.orderNumber || null,
                buyer: buyerData,
                selectedAddress: deliveryAddress,
                foods: cart.map((item) => ({
                    food: item._id,
                    quantity: item.quantity,
                    comment: item.comment || '',
                })),
                payment: selectedPaymentMethod,
                section,
                status,
                comment: extraData.comment || comment || '',
                restaurant: extraData.restaurant || null,
                total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + Number(deliveryCost),
            };


                await new Promise((resolve, reject) => {
                    console.log('funcion create order en la funciona handleSubmit de useOrderForm');
                    createOrder(newOrder, {
                        onSuccess: () => {
                            if (typeof resetForm === 'function') resetForm();
                            resolve();
                        },
                        onError: (error) => {
                            console.error('Error al crear el pedido:', error);
                            alert('Hubo un error al crear el pedido. Intente nuevamente.');
                            reject(error);
                        },
                    });
                });
            // }
            
            return true; // Indicar éxito
        } catch (error) {
            console.error('Error en handleSubmit:', error);
            alert('Hubo un error al procesar el pedido. Intente nuevamente.');
            return false; // Indicar error
        }
    };

    // Usar el hook refactorizado
    const { 
      handleUpdateOrderStatus, 
      handleRegisterOrderInCash,
      completeOrder 
    } = useOrderOperations();

    return {
        editingOrderId,
        setEditingOrderId,
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        deliveryAddress,
        setDeliveryAddress,
        selectedPaymentMethod,
        setSelectedPaymentMethod,
        handleSubmit,
        deliveryCost,
        setDeliveryCost,
        comment,
        setComment,
        resetForm,
        // Exportar tanto las funciones individuales como la combinada
        handleRegisterOrderInCash,
        handleUpdateOrderStatus,
        completeOrder, // Nueva función combinada
    };
};