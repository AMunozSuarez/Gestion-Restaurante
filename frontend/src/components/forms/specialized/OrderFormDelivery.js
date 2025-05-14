import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartManagement } from '../../../hooks/state/useCartManagement';
import { useOrderForm } from '../../../hooks/forms/useOrderForm';
import BaseOrderForm from '../base/BaseOrderForm';
import CustomerAutocomplete from '../../common/CustomerAutocomplete';
import '../../../styles/components/customerAutocomplete.css';
import axios from '../../../services/axiosConfig';

const OrderFormDelivery = (props) => {    
    const navigate = useNavigate();
    const { cart, cartTotal, getCartTotal, clearCart } = useCartManagement();
    const { handleRegisterOrderInCashRegister, handleUpdateOrderStatus } = useOrderForm();
    const [customerAddresses, setCustomerAddresses] = useState([]);
    const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [originalAddress, setOriginalAddress] = useState('');

    // Effect para reset address mode when customer is cleared
    useEffect(() => {
        // If the phone is cleared or no customer is selected
        if (!props.customerPhone) {
            setSelectedCustomer(null);
            setCustomerAddresses([]);
            setIsAddingNewAddress(false);
            setIsEditingAddress(false); 
        }
    }, [props.customerPhone]);

    // Reemplazar el useEffect que carga datos de cliente en edición
    useEffect(() => {
        // Solo ejecutar cuando estamos editando un pedido y tenemos un número de teléfono
        if (props.editingOrderId && props.customerPhone) {

            // resetear estados de edición
            setIsAddingNewAddress(false);
            setIsEditingAddress(false);
            
            // Siempre buscar el cliente en el servidor
            fetchCustomerData(props.customerPhone);
        }
    }, [props.editingOrderId, props.customerPhone]);

    // Función para buscar cliente en el servidor
    const fetchCustomerData = async (phone) => {
        try {
            // Usar el endpoint de búsqueda que ya existe
            console.log("Llamando a la API de búsqueda de clientes en orderformDelivery");
            const response = await axios.get(`/customer/search?query=${phone}`);
            
            if (response.data && response.data.success && response.data.customers && response.data.customers.length > 0) {
                // Encontrar el cliente exacto con el mismo teléfono
                const exactCustomer = response.data.customers.find(c => c.phone === phone);
                
                if (exactCustomer) {
                    setSelectedCustomer(exactCustomer);
                    
                    // Cargar las direcciones del cliente
                    if (exactCustomer.addresses && exactCustomer.addresses.length > 0) {
                        setCustomerAddresses(exactCustomer.addresses);
                        
                        // Si hay una dirección seleccionada en el pedido, asegurarnos de que esté en las opciones
                        const addressExists = exactCustomer.addresses.some(
                            addr => addr.address === props.deliveryAddress
                        );
                        
                        if (!addressExists && props.deliveryAddress) {
                            // Si la dirección del pedido no está en las direcciones del cliente, agregarla temporalmente
                            // pero NO la guardamos en el cliente hasta que se envíe el formulario
                            const newAddresses = [...exactCustomer.addresses, {
                                address: props.deliveryAddress,
                                deliveryCost: Number(props.deliveryCost) || 0,
                                _isTemporary: true // Marcar como temporal para identificarla
                            }];
                            setCustomerAddresses(newAddresses);
                        }
                    }
                } else {
                    // Si no hay cliente exacto, usar los datos del pedido
                    createTemporaryCustomer();
                }
            } else {
                // Si no hay resultados, usar los datos del pedido
                createTemporaryCustomer();
            }
        } catch (error) {
            console.error("Error al buscar cliente:", error);
            // En caso de error, usar los datos del pedido
            createTemporaryCustomer();
        }
    };

    // Función para crear un cliente temporal con los datos del pedido
    const createTemporaryCustomer = () => {
        const tempCustomer = {
            name: props.customerName,
            phone: props.customerPhone,
            addresses: props.deliveryAddress ? [{
                address: props.deliveryAddress,
                deliveryCost: Number(props.deliveryCost) || 0
            }] : [],
            _isTemporary: true
        };
        
        console.log("Creando cliente temporal:", tempCustomer);
        setSelectedCustomer(tempCustomer);
        setCustomerAddresses(tempCustomer.addresses);
    };

    // Modificar handleCustomerSelect para consultar al servidor
    const handleCustomerSelect = async (customerData) => {
        // Siempre actualizar el teléfono, que viene en todas las llamadas
        props.setCustomerPhone(customerData.phone || '');
        
        // Si se limpió la selección o solo viene phone
        if (!customerData.phone || (Object.keys(customerData).length === 1 && customerData.phone)) {
            if (!customerData.phone) {
                props.setCustomerName('');
                props.setComment('');
                props.setDeliveryAddress('');
                props.setDeliveryCost('');
                setCustomerAddresses([]);
                setSelectedCustomer(null);
                setIsAddingNewAddress(false);
                setIsEditingAddress(false);
            } else {
                // Si solo tenemos el teléfono, consultar al servidor
                fetchCustomerData(customerData.phone);
            }
            return;
        }
        
        // Si ya tenemos los datos completos (desde el autocomplete)
        console.log("Cliente seleccionado:", customerData);
        setSelectedCustomer(customerData);
        
        // Actualizar el resto de campos
        props.setCustomerName(customerData.name || '');
        props.setComment(customerData.comment || '');
        
        // Manejar direcciones
        if (customerData.addresses && customerData.addresses.length > 0) {
            setCustomerAddresses(customerData.addresses);
            props.setDeliveryAddress(customerData.addresses[0].address);
            props.setDeliveryCost(customerData.addresses[0].deliveryCost?.toString() || '0');
            setIsAddingNewAddress(false);
            setIsEditingAddress(false);
        } else {
            setCustomerAddresses([]);
            props.setDeliveryAddress('');
            props.setDeliveryCost('');
            setIsAddingNewAddress(true);
        }
    };

    // Manejar el cambio de dirección seleccionada
    const handleAddressChange = (e) => {
        const selectedValue = e.target.value;
        
        if (selectedValue === 'new') {
            // Activar modo de nueva dirección
            setIsAddingNewAddress(true);
            setIsEditingAddress(false);
            props.setDeliveryAddress('');
            props.setDeliveryCost('');
        } else {
            // Desactivar modo de nueva dirección
            setIsAddingNewAddress(false);
            setIsEditingAddress(false);
            
            // Buscar la dirección seleccionada entre las opciones
            const selectedAddress = customerAddresses.find(addr => addr.address === selectedValue);
            if (selectedAddress) {
                props.setDeliveryAddress(selectedAddress.address);
                props.setDeliveryCost(selectedAddress.deliveryCost?.toString() || '0');
            }
        }
    };
    
    // Modificar handleStartEditAddress para guardar correctamente el objeto de dirección original
    const handleStartEditAddress = () => {
        setIsEditingAddress(true);
        setIsAddingNewAddress(false);
        
        // Guardar el objeto completo de la dirección original
        const currentAddressObj = customerAddresses.find(addr => addr.address === props.deliveryAddress);
        if (currentAddressObj) {
            console.log("[DEBUG] Guardando dirección original para edición:", currentAddressObj);
            setOriginalAddress(currentAddressObj); // Guardar todo el objeto con ID
        } else {
            console.log("[DEBUG] No se encontró objeto de dirección para:", props.deliveryAddress);
            setOriginalAddress({address: props.deliveryAddress}); // Fallback al texto como objeto
        }
    };
    
    const handleCancelEditAddress = () => {
        setIsEditingAddress(false);
        
        // Restaurar dirección original si existe
        if (originalAddress) {
            if (typeof originalAddress === 'object' && originalAddress.address) {
                props.setDeliveryAddress(originalAddress.address);
                props.setDeliveryCost(originalAddress.deliveryCost?.toString() || '0');
            } else {
                const originalAddressObj = customerAddresses.find(addr => addr.address === originalAddress);
                if (originalAddressObj) {
                    props.setDeliveryAddress(originalAddressObj.address);
                    props.setDeliveryCost(originalAddressObj.deliveryCost?.toString() || '0');
                }
            }
        } else {
            if (customerAddresses.length > 0) {
                props.setDeliveryAddress(customerAddresses[0].address);
                props.setDeliveryCost(customerAddresses[0].deliveryCost?.toString() || '0');
            }
        }
    };

    // Añadir esta función para resetear estados de edición
    const resetAddressEditMode = () => {
        console.log("Reseteando modo de edición de dirección");
        setIsEditingAddress(false);
        setIsAddingNewAddress(false);
    };

    // Función para renderizar campos adicionales específicos de delivery
    const renderAdditionalFields = () => {
        return (
            <>
                {/* Teléfono del Cliente con autocompletado */}                <div className="form-group">
                    <label htmlFor="customerPhone">Teléfono del Cliente:</label>
                    {!props.isViewingCompletedOrder ? (
                        <CustomerAutocomplete
                            onSelect={handleCustomerSelect}
                            disabled={props.isViewingCompletedOrder}
                            initialValue={props.customerPhone}
                            editingOrderId={props.editingOrderId}
                            selectedCustomerData={selectedCustomer}
                        />
                    ) : (
                        <input
                            type="text"
                            id="customerPhone"
                            value={props.customerPhone}
                            disabled={true}
                            className={props.editingOrderId ? 'editing-input' : ''}
                        />
                    )}
                </div>
                
                {/* Nombre del Cliente */}
                <div className="form-group">
                    <label htmlFor="customerName">Nombre del Cliente:</label>
                    <input
                        type="text"
                        id="customerNameDelivery"
                        value={props.customerName}
                        onChange={(e) => props.setCustomerName(e.target.value)}
                        disabled={props.isViewingCompletedOrder}
                        className={props.editingOrderId ? 'editing-input' : ''}
                        required
                    />
                </div>
                
                {/* Dirección de Entrega - Cambia entre select y input según si hay cliente seleccionado */}
                <div className="form-group">
                    <label htmlFor="deliveryAddress">Dirección de Entrega:</label>
                    
                    {/* Si hay cliente seleccionado Y no estamos añadiendo/editando dirección */}
                    {selectedCustomer && customerAddresses.length > 0 && !isAddingNewAddress && !isEditingAddress ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                                id="deliveryAddressSelect"
                                value={props.deliveryAddress}
                                onChange={handleAddressChange}
                                disabled={props.isViewingCompletedOrder}
                                className={`form-control ${props.editingOrderId ? 'editing-input' : ''}`}
                                required
                                style={{ flex: 1 }}
                            >
                                {customerAddresses.map((addr, index) => (
                                    <option key={index} value={addr.address}>
                                        {addr.address}
                                    </option>
                                ))}
                                <option value="new">+ Añadir nueva dirección</option>
                            </select>
                            
                            {/* Botón de editar con ID específico */}
                            {!props.isViewingCompletedOrder && (
                                <button 
                                    type="button"
                                    id="edit-address-button"
                                    onClick={handleStartEditAddress}
                                    style={{
                                        border: '1px solid #ced4da',
                                        borderRadius: '0.25rem',
                                        padding: '0.375rem',
                                        background: '#f8f9fa',
                                        cursor: 'pointer',
                                        minWidth: '38px'
                                    }}
                                    title="Editar dirección seleccionada"
                                >
                                    ✏️
                                </button>
                            )}
                        </div>
                    ) : (
                        /* Modo input para nueva dirección o edición */
                        <div className="new-address-container">
                            <input
                                type="text"
                                id="deliveryAddress"
                                value={props.deliveryAddress}
                                onChange={(e) => props.setDeliveryAddress(e.target.value)}
                                disabled={props.isViewingCompletedOrder}
                                className={`form-control ${props.editingOrderId ? 'editing-input' : ''}`}
                                required
                            />
                            
                            {/* Botón para cancelar si aplica */}
                            {(isAddingNewAddress || isEditingAddress) && customerAddresses.length > 0 && !props.isViewingCompletedOrder && (
                                <button 
                                    type="button" 
                                    id="cancel-address-edit-button"
                                    style={{
                                        border: '1px solid #6c757d',
                                        borderRadius: '0.25rem',
                                        padding: '0.375rem 0.75rem',
                                        background: 'white',
                                        color: '#6c757d',
                                        cursor: 'pointer',
                                        marginLeft: '10px'
                                    }}
                                    onClick={isEditingAddress ? handleCancelEditAddress : () => {
                                        setIsAddingNewAddress(false);
                                        handleAddressChange({ target: { value: customerAddresses[0].address } });
                                    }}
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Costo de Envío */}
                <div className="form-group">
                    <label htmlFor="deliveryCost">Costo de Envío:</label>
                    <input
                        type="number"
                        id="deliveryCost"
                        value={props.deliveryCost}
                        onChange={(e) => {
                            props.setDeliveryCost(e.target.value);
                        }}
                        disabled={props.isViewingCompletedOrder}
                        className={`form-control ${props.editingOrderId ? 'editing-input' : ''}`}
                        required
                    />
                </div>
            </>
        );
    };

    // Acción para enviar pedido
    const handleSendOrder = async () => {
        try {    
            // Validar campos requeridos
            if (cart.length === 0) {
                alert('El carrito está vacío. Agrega productos antes de enviar el pedido.');
                return;
            }       
            
            // Preparar los datos de dirección para guardar
            let customerData = {
                name: props.customerName,
                phone: props.customerPhone,
                comment: props.comment || '',
            };
            
            // Si hay dirección, añadirla a las direcciones del cliente
            if (props.deliveryAddress) {
                const addressData = {
                    address: props.deliveryAddress,
                    deliveryCost: Number(props.deliveryCost) || 0,
                };
                
                // Si el cliente tiene direcciones anteriores y esta es una nueva, agregarlas todas
                if (selectedCustomer && selectedCustomer.addresses) {
                    const existingAddresses = [...selectedCustomer.addresses];
                    
                    // Verificar si ya existe esta dirección
                    const existingIndex = existingAddresses.findIndex(
                        a => a.address === props.deliveryAddress
                    );
                    
                    if (existingIndex >= 0) {
                        // Actualizar el costo si cambió
                        existingAddresses[existingIndex].deliveryCost = Number(props.deliveryCost) || 0;
                    } else {
                        // Agregar nueva dirección
                        existingAddresses.push(addressData);
                    }
                    
                    customerData.addresses = existingAddresses;
                } else {
                    customerData.addresses = [addressData];
                }
            }
            
            // Calcular el total más actualizado
            const calculatedTotal = getCartTotal();
            
            // Primero registrar en caja
            await handleRegisterOrderInCashRegister({
                cart,
                cartTotal: calculatedTotal,
                deliveryCost: props.deliveryCost,
                selectedPaymentMethod: props.selectedPaymentMethod
            });
            
            // Luego actualizar el estado del pedido a "Enviado"
            await handleUpdateOrderStatus({
                _id: props.editingOrderId,
                status: 'Enviado',
                buyer: customerData,
                foods: cart.map((item) => ({
                    food: item._id,
                    quantity: item.quantity,
                    comment: item.comment || '',
                })),
                payment: props.selectedPaymentMethod,
                total: calculatedTotal + Number(props.deliveryCost),
                section: 'delivery',
                selectedAddress: props.deliveryAddress,
            });
            
            // Limpiar y redireccionar después de ambas operaciones exitosas
            clearCart();
            props.resetForm();
            navigate('/delivery');
            
        } catch (error) {
            console.error('Error al procesar el pedido:', error);
            alert('Hubo un error al procesar el pedido. Inténtalo nuevamente.');
        }
    };

    // Acción para cancelar pedido
    const handleCancelOrder = () => {
        props.handleSubmit(null, props.resetForm, 'Cancelado', 'delivery');
    };
    
    // Estilos personalizados
    const customStyles = `
        <style>
            /* Ocultamos el primer campo de nombre de cliente que viene del BaseOrderForm */
            .order-form[data-form-type="delivery"] > form > .form-group:first-of-type {
                display: none;
            }
            
            /* Estilo para contenedor de nueva dirección con botón */
            .new-address-container {
                display: flex;
                align-items: center;
            }
            
            .new-address-container input {
                flex: 1;
            }
            
            .new-address-container button {
                margin-left: 10px;
            }
        </style>
    `;

    return (
        <>
            <div dangerouslySetInnerHTML={{ __html: customStyles }} />
            
            <BaseOrderForm
                {...props}
                formType="delivery"
                renderAdditionalFields={renderAdditionalFields}
                cartTotalWithExtras={cartTotal + (Number(props.deliveryCost) || 0)}
                deliveryCost={props.deliveryCost}
                completeButtonLabel="Enviar Pedido"
                completeButtonAction={handleSendOrder}
                cancelOrderAction={handleCancelOrder}
                extraData={{  
                    isAddingNewAddress,
                    isEditingAddress,
                    originalAddress,
                    resetAddressEditMode  // Pasar la función de reset
                }}
            />
        </>
    );
};

export default OrderFormDelivery;
