import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartManagement } from '../../../hooks/cart/useCartManagement';
import { useOrderForm } from '../../../hooks/order/useOrderForm';
import { useCustomerSearch } from '../../../hooks/customer/useCustomerSearch';
import BaseOrderForm from '../base/BaseOrderForm';
import CustomerAutocomplete from '../../common/CustomerAutocomplete';
import '../../../styles/components/customerAutocomplete.css';

const OrderFormDelivery = (props) => {    
    // Contador de renderizado para depuración
    const renderCount = useRef(0);
    renderCount.current = renderCount.current + 1;
    
    const navigate = useNavigate();
    const { cart, cartTotal, getCartTotal, clearCart } = useCartManagement();
    const { completeOrder } = useOrderForm();
    
    // Usar el hook centralizado con todas las funcionalidades
    const { 
        selectedCustomer,
        customerAddresses,
        isAddingNewAddress,
        isEditingAddress,
        originalAddress,
        fetchCustomerData,
        handleCustomerSelect,
        handleAddressChange,
        startEditingAddress,
        cancelAddressAction,
        prepareCustomerDataForOrder,
        resetAddressStates,
        resetAll  // Incluir la nueva función
    } = useCustomerSearch();

    // Cargar cliente cuando se edita un pedido
    useEffect(() => {
        if (props.editingOrderId && props.customerPhone) {
            fetchCustomerData(
                props.customerPhone,
                props.deliveryAddress,
                props.deliveryCost,
                props.customerName
            );
        }
    }, [props.editingOrderId, props.customerPhone, props.deliveryAddress, props.deliveryCost, props.customerName, fetchCustomerData]);

    // Resetear estados cuando se limpia el teléfono
    useEffect(() => {
        if (!props.customerPhone) {
            console.log('[OrderFormDelivery] Teléfono limpiado, reseteando todos los estados');
            resetAll(); // Limpiar todos los estados, no solo los de dirección
        }
    }, [props.customerPhone, resetAll]);

    // Agregar un efecto adicional para detectar reseteo completo del formulario
    // Este es crucial para atrapar cuando el formulario se resetea desde afuera
    useEffect(() => {
        // Si los campos principales están vacíos todos a la vez, probablemente se llamó resetForm
        if (!props.customerPhone && !props.customerName && !props.deliveryAddress) {
            console.log('[OrderFormDelivery] Detectado resetForm, limpiando estados internos');
            resetAll();
        }
    }, [props.customerPhone, props.customerName, props.deliveryAddress, resetAll]);

    // Adaptador para la selección de cliente
    const onCustomerSelectHandler = (customerData) => {
        handleCustomerSelect(customerData, {
            setCustomerName: props.setCustomerName,
            setCustomerPhone: props.setCustomerPhone,
            setDeliveryAddress: props.setDeliveryAddress,
            setDeliveryCost: props.setDeliveryCost,
            setComment: props.setComment
        });
    };

    // Adaptador para cambio de dirección
    const onAddressChangeHandler = (e) => {
        handleAddressChange(e.target.value, {
            setDeliveryAddress: props.setDeliveryAddress,
            setDeliveryCost: props.setDeliveryCost
        });
    };

    // Adaptador para iniciar edición de dirección
    const onStartEditAddressHandler = () => {
        startEditingAddress(props.deliveryAddress, props.deliveryCost);
    };
    
    // Adaptador para cancelar edición
    const onCancelEditAddressHandler = () => {
        cancelAddressAction({
            setDeliveryAddress: props.setDeliveryAddress,
            setDeliveryCost: props.setDeliveryCost
        });
    };

    // Acción para enviar pedido
    const handleSendOrder = async () => {
        try {    
            // Validar campos requeridos
            if (cart.length === 0) {
                alert('El carrito está vacío. Agrega productos antes de enviar el pedido.');
                return;
            }       
            
            // Preparar los datos del cliente usando la función centralizada
            const customerData = prepareCustomerDataForOrder({
                customerName: props.customerName,
                customerPhone: props.customerPhone,
                deliveryAddress: props.deliveryAddress,
                deliveryCost: props.deliveryCost,
                comment: props.comment
            });
            
            // Calcular el total más actualizado
            const calculatedTotal = getCartTotal();
            
            // Crear el objeto de pedido
            const orderData = {
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
                deliveryCost: Number(props.deliveryCost) || 0
            };
            
            // Datos del carrito para la caja
            const cartData = {
                cart,
                cartTotal: calculatedTotal,
                deliveryCost: props.deliveryCost,
                selectedPaymentMethod: props.selectedPaymentMethod
            };
            
            // Usar la función combinada que maneja ambas operaciones
            const result = await completeOrder(orderData, cartData);
            
            if (result) {
                // Limpiar y redireccionar después de operaciones exitosas
                clearCart();
                props.resetForm();
                navigate('/delivery');
            }
        } catch (error) {
            console.error('Error al procesar el pedido:', error);
            alert('Hubo un error al procesar el pedido. Inténtalo nuevamente.');
        }
    };

    // Acción para cancelar pedido
    const handleCancelOrder = () => {
        props.handleOrderUpdate(null, props.resetForm, 'Cancelado', 'delivery');
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
                            onSelect={onCustomerSelectHandler}
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
                                onChange={onAddressChangeHandler}
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
                            
                            {/* Botón de editar */}
                            {!props.isViewingCompletedOrder && (
                                <button 
                                    type="button"
                                    id="edit-address-button"
                                    onClick={onStartEditAddressHandler}
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
                                    onClick={isEditingAddress ? onCancelEditAddressHandler : () => {
                                        handleAddressChange(customerAddresses[0].address, {
                                            setDeliveryAddress: props.setDeliveryAddress,
                                            setDeliveryCost: props.setDeliveryCost
                                        });
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
                        onChange={(e) => props.setDeliveryCost(e.target.value)}
                        disabled={props.isViewingCompletedOrder}
                        className={`form-control ${props.editingOrderId ? 'editing-input' : ''}`}
                        required
                    />
                </div>
            </>
        );
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
                    resetAddressEditMode: resetAddressStates,
                    _debug_renderCount: renderCount.current
                }}
            />
        </>
    );
};

export default OrderFormDelivery;