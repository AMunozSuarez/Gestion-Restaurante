import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartManagement } from '../../../hooks/state/useCartManagement';
import { useOrderForm } from '../../../hooks/forms/useOrderForm';
import BaseOrderForm from '../base/BaseOrderForm';
import CustomerAutocomplete from '../../common/CustomerAutocomplete';
import '../../../styles/components/customerAutocomplete.css';

const OrderFormDelivery = (props) => {    
    const navigate = useNavigate();
    const { cart, cartTotal, getCartTotal, clearCart } = useCartManagement();
    const { handleRegisterOrderInCashRegister, handleUpdateOrderStatus } = useOrderForm();
    const [customerAddresses, setCustomerAddresses] = useState([]);
    const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Manejador para cuando se selecciona un cliente de la lista de sugerencias
    const handleCustomerSelect = (customer) => {
        // Siempre actualizar el teléfono, que viene en todas las llamadas
        props.setCustomerPhone(customer.phone || '');
        
        // Si se limpió la selección (phone está vacío) o solo viene phone
        if (!customer.phone || (Object.keys(customer).length === 1 && customer.phone)) {
            // Si el phone está vacío, limpiar todos los campos relacionados con el cliente
            if (!customer.phone) {
                props.setCustomerName('');
                props.setComment('');
                props.setDeliveryAddress('');
                props.setDeliveryCost('');
                setCustomerAddresses([]);
                setSelectedCustomer(null);
                setIsAddingNewAddress(false);
            }
            return;
        }
        
        // Si llegamos aquí, es porque se seleccionó un cliente completo de la lista
        console.log("Cliente seleccionado:", customer);
        setSelectedCustomer(customer);
        
        // Actualizar el resto de campos con los datos del cliente
        props.setCustomerName(customer.name || '');
        props.setComment(customer.comment || '');
        
        // Actualizar la lista de direcciones disponibles
        if (customer.addresses && customer.addresses.length > 0) {
            setCustomerAddresses(customer.addresses);
            
            // Seleccionar la primera dirección por defecto
            props.setDeliveryAddress(customer.addresses[0].address);
            
            // Si la dirección tiene un costo de envío asociado, usarlo también
            if (customer.addresses[0].deliveryCost !== undefined) {
                props.setDeliveryCost(customer.addresses[0].deliveryCost.toString());
            }
            
            // Desactivar modo de nueva dirección
            setIsAddingNewAddress(false);
        } else {
            setCustomerAddresses([]);
            props.setDeliveryAddress('');
            props.setDeliveryCost('');
            // Activar automáticamente el modo de nueva dirección si no hay direcciones
        }
    };

    // Manejar el cambio de dirección seleccionada
    const handleAddressChange = (e) => {
        const selectedValue = e.target.value;
        
        if (selectedValue === 'new') {
            // Activar modo de nueva dirección
            setIsAddingNewAddress(true);
            props.setDeliveryAddress('');
            props.setDeliveryCost('');
        } else {
            // Desactivar modo de nueva dirección
            setIsAddingNewAddress(false);
            
            // Buscar la dirección seleccionada entre las opciones
            const selectedAddress = customerAddresses.find(addr => addr.address === selectedValue);
            if (selectedAddress) {
                props.setDeliveryAddress(selectedAddress.address);
                props.setDeliveryCost(selectedAddress.deliveryCost?.toString() || '0');
            }
        }
    };

    // Función para renderizar campos adicionales específicos de delivery
    const renderAdditionalFields = () => {
        return (
            <>
                {/* Teléfono del Cliente con autocompletado */}
                <div className="form-group">
                    <label htmlFor="customerPhone">Teléfono del Cliente:</label>
                    {!props.isViewingCompletedOrder ? (
                        <CustomerAutocomplete
                            onSelect={handleCustomerSelect}
                            disabled={props.isViewingCompletedOrder}
                            initialValue={props.customerPhone}
                            editingOrderId={props.editingOrderId}
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
                    
                    {/* Si hay cliente seleccionado Y no estamos añadiendo una nueva dirección */}
                    {selectedCustomer && customerAddresses.length > 0 && !isAddingNewAddress ? (
                        <select
                            id="deliveryAddressSelect"
                            value={props.deliveryAddress}
                            onChange={handleAddressChange}
                            disabled={props.isViewingCompletedOrder}
                            className={`form-control ${props.editingOrderId ? 'editing-input' : ''}`}
                            required
                        >
                            {customerAddresses.map((addr, index) => (
                                <option key={index} value={addr.address}>
                                    {addr.address} {addr.deliveryCost ? `(Envío: $${addr.deliveryCost})` : ''}
                                </option>
                            ))}
                            <option value="new">+ Añadir nueva dirección</option>
                        </select>
                    ) : (
                        /* Modo input para nueva dirección o sin cliente seleccionado */
                        <div className="new-address-container">
                            <input
                                type="text"
                                id="deliveryAddress"
                                value={props.deliveryAddress}
                                onChange={(e) => props.setDeliveryAddress(e.target.value)}
                                disabled={props.isViewingCompletedOrder}
                                className={`form-control ${props.editingOrderId ? 'editing-input' : ''}`}
                                required
                                placeholder="Ingrese la dirección"
                            />
                            
                            {/* Botón para cancelar nueva dirección si aplica */}
                            {isAddingNewAddress && customerAddresses.length > 0 && (
                                <button 
                                    type="button" 
                                    className="btn btn-sm btn-outline-secondary ml-2"
                                    onClick={() => {
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
            />
        </>
    );
};

export default OrderFormDelivery;
