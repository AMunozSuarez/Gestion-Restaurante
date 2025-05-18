import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartManagement } from '../../../hooks/cart/useCartManagement';
import { useOrderForm } from '../../../hooks/order/useOrderForm';
import BaseOrderForm from '../base/BaseOrderForm';

const OrderFormMostrador = (props) => {    
    const navigate = useNavigate();
    const { cart, getCartTotal, clearCart } = useCartManagement();
    const { completeOrder } = useOrderForm();

    // Acción para completar el pedido (cerrar) - Versión refactorizada
    const handleCompleteOrder = async () => {
        try {      
            // Validar campos requeridos
            if (cart.length === 0) {
                alert('El carrito está vacío. Agrega productos antes de enviar el pedido.');
                return;
            }       
            
            // Calcular el total más actualizado
            const calculatedTotal = getCartTotal();
            
            // Crear el objeto de pedido
            const orderData = {
                _id: props.editingOrderId,
                status: 'Completado',
                buyer: {
                    name: props.customerName,
                    comment: props.comment || '',
                },
                comment: props.comment || '',
                foods: cart.map((item) => ({
                    food: item._id,
                    quantity: item.quantity,
                    comment: item.comment || '',
                })),
                payment: props.selectedPaymentMethod,
                total: calculatedTotal,
                section: 'mostrador',
            };
            
            // Datos del carrito para la caja
            const cartData = {
                cart,
                cartTotal: calculatedTotal,
                selectedPaymentMethod: props.selectedPaymentMethod
            };
            
            // Usar la función combinada que maneja ambas operaciones
            const result = await completeOrder(orderData, cartData);
            
            if (result) {
                // Limpiar y redireccionar después de operaciones exitosas
                clearCart();
                props.resetForm();
                navigate('/mostrador');
            }
        } catch (error) {
            console.error('Error al procesar el pedido:', error);
            alert('Hubo un error al procesar el pedido. Inténtalo nuevamente.');
        }
    };

    // Acción para cancelar el pedido
    const handleCancelOrder = () => {
        props.handleOrderUpdate(null, props.resetForm, 'Cancelado', 'mostrador');
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
