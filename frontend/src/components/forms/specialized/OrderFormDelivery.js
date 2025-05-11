import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartManagement } from '../../../hooks/state/useCartManagement';
import { useOrderForm } from '../../../hooks/forms/useOrderForm';
import BaseOrderForm from '../base/BaseOrderForm';

const OrderFormDelivery = (props) => {    
    const navigate = useNavigate();
    const { cart, cartTotal, getCartTotal, clearCart } = useCartManagement();
    const { handleRegisterOrderInCashRegister, handleUpdateOrderStatus } = useOrderForm();
      // Este componente ahora pasa el costo de envío directamente a BaseOrderForm    // Función para renderizar campos adicionales específicos de delivery
    // Incluimos el teléfono antes del nombre, y el nombre del cliente lo incluimos aquí 
    // para cambiar el orden, pero ocultamos el que se renderiza automáticamente en BaseOrderForm
    const renderAdditionalFields = () => {
        return (
            <>
                {/* Teléfono del Cliente (primero) */}
                <div className="form-group">
                    <label htmlFor="customerPhone">Teléfono del Cliente:</label>
                    <input
                        type="text"
                        id="customerPhone"
                        value={props.customerPhone}
                        onChange={(e) => props.setCustomerPhone(e.target.value)}
                        disabled={props.isViewingCompletedOrder}
                        className={props.editingOrderId ? 'editing-input' : ''}
                        required
                    />
                </div>
                
                {/* Nombre del Cliente (ahora en segunda posición) */}
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
                
                {/* Dirección de Entrega */}
                <div className="form-group">
                    <label htmlFor="deliveryAddress">Dirección de Entrega:</label>
                    <input
                        type="text"
                        id="deliveryAddress"
                        value={props.deliveryAddress}
                        onChange={(e) => props.setDeliveryAddress(e.target.value)}
                        disabled={props.isViewingCompletedOrder}
                        className={props.editingOrderId ? 'editing-input' : ''}
                        required
                    />
                </div>
                
                {/* Costo de Envío */}
                <div className="form-group">
                    <label htmlFor="deliveryCost">Costo de Envío:</label>
                    <input
                        type="number"
                        id="deliveryCost"
                        value={props.deliveryCost}
                        onChange={(e) => {
                            const costValue = Number(e.target.value);
                            props.setDeliveryCost(costValue);
                        }}
                        disabled={props.isViewingCompletedOrder}
                        className={props.editingOrderId ? 'editing-input' : ''}
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
                // Incluir los datos del pedido necesarios para el backend
                buyer: {
                    name: props.customerName,
                    phone: props.customerPhone,
                    addresses: [
                        {
                            address: props.deliveryAddress,
                            deliveryCost: Number(props.deliveryCost),
                        },
                    ],
                    comment: props.comment || '',
                },
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
    };    // Creamos un estilo personalizado para ocultar el campo original de nombre del cliente
    const customStyles = `
        <style>
            /* Ocultamos el primer campo de nombre de cliente que viene del BaseOrderForm */
            .order-form[data-form-type="delivery"] > form > .form-group:first-of-type {
                display: none;
            }
        </style>
    `;

    return (
        <>
            {/* Insertamos los estilos directamente en el DOM */}
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
