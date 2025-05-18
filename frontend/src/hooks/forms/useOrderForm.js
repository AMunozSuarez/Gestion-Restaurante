import { useState, useEffect } from 'react';
import { useCreateOrder } from '../api/useCreateOrder';
import useCartStore from '../../store/useCartStore';
import { useOrders } from '../api/useOrders';
import { closeOrder } from '../../services/api/cashApi';
import { updateOrder } from '../../services/api/ordersApi';
import axios from '../../services/axiosConfig';
import { useQueryClient } from '@tanstack/react-query';
import useToast from '../../hooks/useToast'
import { useCustomerManagement } from '../useCustomerManagment';

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
        findCustomerByPhone, 
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

    // Función para registrar el pedido en la caja
    const handleRegisterOrderInCashRegister = async ({
        cart = [],
        cartTotal = 0,
        deliveryCost = 0,
        selectedPaymentMethod = '',
    } = {}) => {
        try {
            if (!selectedPaymentMethod) {
                alert('Por favor, selecciona un método de pago.');
                return;
            }

            if (cart.length === 0) {
                alert('El carrito está vacío. Agrega productos antes de cerrar el pedido.');
                return;
            }

            const orderData = {
                total: cartTotal + Number(deliveryCost),
                paymentMethod: selectedPaymentMethod,
                items: cart.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    comment: item.comment || '', // Agregar comentario si existe
                })),
                deliveryCost: Number(deliveryCost),
            };

            console.log('Registrando pedido en la caja:', orderData);

            const response = await closeOrder(orderData); // Registrar en la caja
            if (response.status === 201) {
                console.log('Pedido registrado correctamente en la caja.');
            } else {
                console.error('Error inesperado al registrar el pedido en la caja:', response);
                throw new Error('Error al registrar el pedido en la caja.');
            }
        } catch (error) {
            console.error('Error al registrar el pedido en la caja:', error);
            throw error; // Propagar el error para que sea capturado en el botón
        }
    };

    // Función para actualizar el estado del pedido
    const handleUpdateOrderStatus = async (order) => {
        try {
            if (!order || !order._id) {
                alert('No se ha seleccionado un pedido para actualizar.');
                return;
            }

            console.log('Actualizando pedido con datos limpios:', order);

            // 1. Verificar si tenemos información de cliente en localStorage
            let customerData = null;
            if (order.buyer && order.buyer.phone) {
                try {
                    const cachedCustomer = localStorage.getItem(`customer_${order.buyer.phone}`);
                    if (cachedCustomer) {
                        customerData = JSON.parse(cachedCustomer);
                    }
                } catch (error) {
                    console.error('Error al recuperar cliente de localStorage:', error);
                }
            }

            // 2. Enriquecer el objeto de pedido con datos completos del cliente si están disponibles
            if (customerData && order.buyer) {
                order.buyer = {
                    ...order.buyer,
                    // Conservar datos específicos del cliente que no estén en el formulario
                    _id: customerData._id,
                    email: customerData.email,
                    // Asegurarnos de mantener las direcciones actuales del pedido
                    addresses: order.buyer.addresses || customerData.addresses
                };
            }
            console.log('Funcion llama a updateOrder en la funciona handleUpdateOrderStatus de useOrderForm');
            const response = await updateOrder(order._id, order);
            queryClient.invalidateQueries(['orders']);
            toast.success('Pedido actualizado correctamente');

            // 3. Asegurarnos de que la respuesta contenga todos los datos del cliente
            if (response && response.order) {
                // Primero verificar que response.order.buyer sea un objeto y no un string
                if (response.order.buyer && typeof response.order.buyer === 'object' && customerData) {
                    if (!response.order.buyer._id && customerData._id) {
                        response.order.buyer._id = customerData._id;
                    }
                    if (!response.order.buyer.email && customerData.email) {
                        response.order.buyer.email = customerData.email;
                    }
                } 
                // Si buyer es un string (probablemente un ID), necesitamos convertirlo a un objeto
                else if (typeof response.order.buyer === 'string' && customerData) {
                    // Guardar el ID original
                    const buyerId = response.order.buyer;
                    
                    // Reemplazar con un objeto que incluya el ID original y los datos del cliente
                    response.order.buyer = {
                        _id: buyerId, // ID original
                        ...customerData // Datos adicionales del cliente
                    };
                }
                
                // 4. Actualizar el pedido en la lista de pedidos con datos enriquecidos
                updateOrderInList(response.order);
            } else {
                console.error('La respuesta no tiene la estructura esperada:', response);
                // Si la respuesta no tiene la estructura esperada, actualizar con el objeto original
                updateOrderInList(order);
            }
            
            return response;
        } catch (error) {
            console.error('Error al actualizar el pedido:', error);
            throw error; // Propagar el error para que sea capturado en el botón
        }
    };

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
        handleRegisterOrderInCashRegister,
        handleUpdateOrderStatus,
    };
};