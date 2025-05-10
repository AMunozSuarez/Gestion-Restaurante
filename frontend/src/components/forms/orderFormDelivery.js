import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartManagement } from '../../hooks/useCartManagement';
import { useOrderForm } from '../../hooks/useOrderForm';
import BaseOrderForm from './BaseOrderForm';

const OrderFormDelivery = (props) => {    const navigate = useNavigate();
    const { cart, cartTotal, getCartTotal, clearCart } = useCartManagement();
    const { handleRegisterOrderInCashRegister, handleUpdateOrderStatus } = useOrderForm();

    // Función para renderizar campos adicionales específicos de delivery
    const renderAdditionalFields = () => {
        return (
            <>
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
                <div className="form-group">
                    <label htmlFor="deliveryCost">Costo de Envío:</label>
                    <input
                        type="number"
                        id="deliveryCost"
                        value={props.deliveryCost}
                        onChange={(e) => props.setDeliveryCost(Number(e.target.value))}
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
        try {            // Calcular el total más actualizado
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
                total: cartTotal + Number(props.deliveryCost),
                section: 'delivery',
                selectedAddress: props.deliveryAddress,
            });
            
            // Limpiar y redireccionar después de ambas operaciones exitosas
            clearCart();
            props.resetForm();
            navigate('/delivery');
            
            alert('Pedido registrado en caja y actualizado a estado Enviado.');
        } catch (error) {
            console.error('Error al procesar el pedido:', error);
            alert('Hubo un error al procesar el pedido. Inténtalo nuevamente.');
        }
    };

    // Acción para cancelar pedido
    const handleCancelOrder = () => {
        props.handleSubmit(null, props.resetForm, 'Cancelado', 'delivery');
    };

    return (
        <BaseOrderForm
            {...props}
            formType="delivery"
            renderAdditionalFields={renderAdditionalFields}
            cartTotalWithExtras={cartTotal + (Number(props.deliveryCost) || 0)}
            completeButtonLabel="Enviar Pedido"
            completeButtonAction={handleSendOrder}
            cancelOrderAction={handleCancelOrder}
        />
    );
};

export default OrderFormDelivery;