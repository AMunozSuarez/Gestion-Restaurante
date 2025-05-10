import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartManagement } from '../../../hooks/state/useCartManagement';
import { useOrderForm } from '../../../hooks/forms/useOrderForm';
import BaseOrderForm from '../base/BaseOrderForm';

const OrderFormMostrador = (props) => {    
    const navigate = useNavigate();
    const { cart, cartTotal, getCartTotal, clearCart } = useCartManagement();
    const { handleRegisterOrderInCashRegister, handleUpdateOrderStatus } = useOrderForm();

    // Acción para completar el pedido (cerrar)
    const handleCompleteOrder = async () => {
        try {            
            // Calcular el total más actualizado
            const calculatedTotal = getCartTotal();
            
            // Registrar en caja
            await handleRegisterOrderInCashRegister({
                cart,
                cartTotal: calculatedTotal,
                selectedPaymentMethod: props.selectedPaymentMethod
            });
            
            // Actualizar estado a "Completado"
            await handleUpdateOrderStatus({
                _id: props.editingOrderId,
                status: 'Completado',
                buyer: {
                    name: props.customerName,
                    comment: props.comment || '',
                },
                foods: cart.map((item) => ({
                    food: item._id,
                    quantity: item.quantity,
                    comment: item.comment || '',
                })),
                payment: props.selectedPaymentMethod,
                total: calculatedTotal,
                section: 'mostrador',
            });
            
            // Limpiar y redireccionar
            clearCart();
            props.resetForm();
            navigate('/mostrador');
            
            alert('Pedido registrado en caja y marcado como completado.');
        } catch (error) {
            console.error('Error al procesar el pedido:', error);
            alert('Hubo un error al procesar el pedido. Inténtalo nuevamente.');
        }
    };

    // Acción para cancelar el pedido
    const handleCancelOrder = () => {
        props.handleSubmit(null, props.resetForm, 'Cancelado', 'mostrador');
    };

    return (
        <BaseOrderForm
            {...props}
            formType="mostrador"
            completeButtonLabel="Cerrar Pedido"
            completeButtonAction={handleCompleteOrder}
            cancelOrderAction={handleCancelOrder}
        />
    );
};

export default OrderFormMostrador;
