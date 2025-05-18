import { useState, useEffect } from 'react';
import { useCreateOrder } from '../api/useCreateOrder';
import useCartStore from '../../store/useCartStore';
import { useOrders } from '../api/useOrders';
import { closeOrder } from '../../services/api/cashApi';
import { updateOrder } from '../../services/api/ordersApi';
import axios from '../../services/axiosConfig';
import { useQueryClient } from '@tanstack/react-query';
import useToast from '../../hooks/useToast'

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

    // Modificar createOrUpdateCustomerBeforeOrder para no usar localStorage
    const createOrUpdateCustomerBeforeOrder = async (customerData) => {
        if (!customerData || !customerData.phone) return null;

        try {
            console.log('Creando/actualizando cliente antes del pedido:', customerData);
            
            // Si hay información de edición de dirección, añadirla a la solicitud
            let editAddressInfo = null;
            const originalAddressObj = { address: '', deliveryCost: 0 };
            
            // Si hay direcciones, verificar duplicados antes de enviar
            if (customerData.addresses && Array.isArray(customerData.addresses)) {
                // Filtrar direcciones temporales
                customerData.addresses = customerData.addresses.filter(addr => !addr._isTemporary);
                
                // Crear un mapa para detectar duplicados por texto
                const addressTexts = new Map();
                
                // Filtrar direcciones duplicadas
                customerData.addresses = customerData.addresses.filter(addr => {
                    const key = addr.address;
                    if (addressTexts.has(key)) {
                        // Ya existe esta dirección
                        const existing = addressTexts.get(key);
                        if (!existing._id && addr._id) {
                            // La nueva tiene ID y la existente no
                            addressTexts.set(key, addr);
                            return false; // No incluir esta entrada aún
                        }
                        return false; // Es un duplicado
                    } else {
                        // No existe, agregar al mapa
                        addressTexts.set(key, addr);
                        return true; // Incluir en el resultado
                    }
                });
                
                // Asegurar que se incluyan todas las direcciones del mapa
                customerData.addresses = Array.from(addressTexts.values());
            }
            
            // Enviar solicitud al servidor
            const response = await axios.post('/customer/create-or-update', customerData);
            
            if (response.data && response.data.success && response.data.customer) {
                console.log('Cliente creado/actualizado correctamente:', response.data.customer);
                return response.data.customer;
            } else {
                console.warn('Respuesta inesperada al actualizar cliente:', response.data);
                return null;
            }
        } catch (error) {
            console.error('Error al crear/actualizar cliente:', error);
            console.error('Detalles del error:', error.response?.data || error.message);
            return null;
        }
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

            // Manejar las direcciones utilizando solo los datos del formulario
            if (deliveryAddress) {
                console.log("[DEBUG] Preparando dirección para cliente:", deliveryAddress);
                
                // Preparar dirección actual
                const addressData = {
                    address: deliveryAddress,
                    deliveryCost: Number(deliveryCost) || 0,
                };
                
                // Obtener información sobre si estamos añadiendo o editando una dirección
                const isAddingNewAddress = extraData.isAddingNewAddress;
                const isEditingAddress = extraData.isEditingAddress;
                const originalAddress = extraData.originalAddress;
                
                console.log("[DEBUG] Estado de edición:", { 
                    isAddingNewAddress, 
                    isEditingAddress, 
                    originalAddress 
                });
                
                // Por defecto, asumimos que solo estamos usando la dirección actual
                buyerData.addresses = [addressData];
                
                // Buscar el cliente para ver si ya tiene direcciones
                if (customerPhone) {
                    try {
                        // Buscar cliente por teléfono en el servidor
                        console.log('buscando cliente en useorderform')
                        const response = await axios.get(`/customer/search?query=${customerPhone}`);
                        
                        if (response.data && response.data.success && response.data.customers && response.data.customers.length > 0) {
                            // Encontrar cliente exacto
                            const exactCustomer = response.data.customers.find(c => c.phone === customerPhone);
                            
                            if (exactCustomer && exactCustomer.addresses && exactCustomer.addresses.length > 0) {
                                console.log("[DEBUG] Cliente encontrado con direcciones:", exactCustomer.addresses);
                                
                                // 1. Caso de edición de dirección existente
                                if (isEditingAddress && originalAddress) {
                                    console.log("[DEBUG] Editando dirección existente:", originalAddress);
                                    
                                    // Buscar la dirección original por ID si está disponible, o por texto
                                    const originalId = originalAddress._id;
                                    let existingIndex = -1;
                                    
                                    if (originalId) {
                                        console.log("[DEBUG] Buscando dirección por ID:", originalId);
                                        existingIndex = exactCustomer.addresses.findIndex(
                                            addr => addr._id && addr._id.toString() === originalId.toString()
                                        );
                                    }
                                    
                                    // Si no se encontró por ID, buscar por texto de dirección original
                                    if (existingIndex < 0 && originalAddress.address) {
                                        console.log("[DEBUG] Buscando dirección por texto:", originalAddress.address);
                                        existingIndex = exactCustomer.addresses.findIndex(
                                            addr => addr.address === originalAddress.address
                                        );
                                    }
                                    
                                    if (existingIndex >= 0) {
                                        // Actualizar dirección existente manteniendo su ID
                                        const originalId = exactCustomer.addresses[existingIndex]._id;
                                        console.log("[DEBUG] Actualizando dirección existente en índice:", existingIndex, "con ID:", originalId);
                                        
                                        // Mantener todas las direcciones pero actualizar la que corresponde
                                        buyerData.addresses = exactCustomer.addresses.map((addr, idx) => {
                                            if (idx === existingIndex) {
                                                return {
                                                    _id: originalId,
                                                    address: deliveryAddress,
                                                    deliveryCost: Number(deliveryCost) || 0
                                                };
                                            }
                                            return addr;
                                        });
                                    } else {
                                        console.log("[DEBUG] ERROR: No se encontró la dirección original para editar!");
                                        // Si no se encuentra la dirección original (caso extraño), agregar como nueva
                                        buyerData.addresses = [...exactCustomer.addresses, addressData];
                                    }
                                }
                                // 2. Caso de nueva dirección
                                else if (isAddingNewAddress) {
                                    console.log("[DEBUG] Añadiendo nueva dirección a las existentes:", addressData);
                                    buyerData.addresses = [...exactCustomer.addresses, addressData];
                                } 
                                // 3. Caso de selección normal de dirección existente
                                else {
                                    console.log("[DEBUG] Verificando si la dirección ya existe");
                                    // Búsqueda de dirección por texto exacto
                                    let existingIndex = exactCustomer.addresses.findIndex(
                                        addr => addr.address === deliveryAddress
                                    );
                                    
                                    if (existingIndex >= 0) {
                                        console.log("[DEBUG] La dirección ya existe, actualizando costo si es necesario");
                                        // La dirección ya existe, actualizar solo el costo si ha cambiado
                                        const originalCost = exactCustomer.addresses[existingIndex].deliveryCost || 0;
                                        const newCost = Number(deliveryCost) || 0;
                                        
                                        if (originalCost !== newCost) {
                                            console.log("[DEBUG] El costo ha cambiado, actualizando");
                                            const originalId = exactCustomer.addresses[existingIndex]._id;
                                            
                                            buyerData.addresses = exactCustomer.addresses.map((addr, idx) => {
                                                if (idx === existingIndex) {
                                                    return {
                                                        _id: originalId,
                                                        address: deliveryAddress,
                                                        deliveryCost: newCost
                                                    };
                                                }
                                                return addr;
                                            });
                                        } else {
                                            console.log("[DEBUG] Usando todas las direcciones existentes sin cambios");
                                            buyerData.addresses = exactCustomer.addresses;
                                        }
                                    } else {
                                        console.log("[DEBUG] La dirección no existe, agregando como nueva");
                                        buyerData.addresses = [...exactCustomer.addresses, addressData];
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error("[DEBUG] Error al buscar cliente para manejar dirección:", error);
                        // Continuar con la dirección simple si hay un error
                    }
                }
            }

            // Si hay teléfono, crear/actualizar cliente usando la API
            if (customerPhone) {
                try {
                    console.log('funcion llama a createOrUpdateCustomerBeforeOrder en la funciona handleSubmit de useOrderForm');
                    const updatedCustomer = await createOrUpdateCustomerBeforeOrder(buyerData);
                    
                    if (updatedCustomer && updatedCustomer._id) {
                        console.log('Cliente actualizado exitosamente, usando ID para el pedido');
                        buyerData = updatedCustomer._id; // Usar solo el ID del cliente actualizado
                    } else {
                        console.log('No se pudo actualizar cliente, usando datos completos');
                        // Si falla la actualización, seguimos con los datos que tenemos
                    }
                } catch (error) {
                    console.error('Error en actualización de cliente, continuando con datos originales:', error);
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
        createOrUpdateCustomerBeforeOrder, // Exponer la nueva función
    };
};