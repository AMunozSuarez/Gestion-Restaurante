import React, { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { useCartManagement } from '../../hooks/state/useCartManagement';
import { formatChileanMoney } from '../../services/utils/formatters';

const Cart = ({
    cart,
    isViewingCompletedOrder,
    increaseQuantity,
    decreaseQuantity,
    removeProduct,
    textAreaRefs, // Este ahora es el objeto compartido
    formType,
    deliveryCost,
}) => {
    const { addCommentToProduct, toggleEditComment, getCartSubtotal } = useCartManagement();
    
    // Mantener un registro de los elementos que están en modo edición
    const editingItemsRef = useRef({});
    const focusAppliedRef = useRef({});  // Para rastrear si ya aplicamos el foco

    // Modificar el useEffect para controlar mejor el enfoque
    useEffect(() => {
        // Encontrar items que están en modo edición
        cart.forEach(item => {
            // Si el item está en modo edición y aún no hemos aplicado el foco para este ID
            if (item.isEditing && !editingItemsRef.current[item._id]) {
                console.log(`Item ${item._id} entró en modo edición`);
                editingItemsRef.current[item._id] = true;
                
                // Marcar que aún no hemos aplicado el foco
                focusAppliedRef.current[item._id] = false;
                
                // Intentar enfocar sólo una vez
                setTimeout(() => {
                    // Verificar si ya salió de modo edición mientras esperábamos
                    if (!editingItemsRef.current[item._id]) return;
                    
                    const editableDiv = textAreaRefs[item._id];
                    if (editableDiv && !focusAppliedRef.current[item._id]) {
                        editableDiv.focus();
                        console.log(`Enfoque aplicado a ${item._id} desde useEffect`);
                        // Marcar que ya aplicamos el foco
                        focusAppliedRef.current[item._id] = true;
                    }
                }, 100);
            } 
            // Si el item ha salido de modo edición
            else if (!item.isEditing && editingItemsRef.current[item._id]) {
                console.log(`Item ${item._id} salió de modo edición`);
                delete editingItemsRef.current[item._id];
                delete focusAppliedRef.current[item._id];
            }
        });
    }, [cart, textAreaRefs]);

    if (!Array.isArray(cart) || cart.length === 0) {
        return <p>El carrito está vacío.</p>;
    }

    return (
        <ul className="cart-list">
            {cart.map((item, index) => (
                <React.Fragment key={`${item._id}-${index}`}>
                    <li className="cart-item">
                        <div className="cart-row">
                            <div className="cart-quantity">
                                {!isViewingCompletedOrder && (
                                    <>
                                        <button type="button" onClick={() => increaseQuantity(item._id)}>+</button>
                                        <span>{item.quantity}</span>
                                        <button type="button" onClick={() => decreaseQuantity(item._id)}>-</button>
                                    </>
                                )}
                                {isViewingCompletedOrder && <span>{item.quantity}</span>}
                            </div>
                            <div className="cart-product-container">
                                <span className="cart-product">{item.title}</span>                                <button
                                    type="button"
                                    className={`cart-comment ${isViewingCompletedOrder ? 'disabled' : ''}`}
                                    onClick={() => !isViewingCompletedOrder && toggleEditComment(item._id)}
                                    disabled={isViewingCompletedOrder}
                                >
                                    <FontAwesomeIcon icon={faCommentDots} />
                                </button>
                            </div>
                            <span className="cart-price">{formatChileanMoney(item.price * item.quantity)}</span>
                            {!isViewingCompletedOrder && (
                                <button
                                    type="button"
                                    className="cart-remove"
                                    onClick={() => removeProduct(item._id)}
                                >
                                    X
                                </button>
                            )}
                        </div>
                        
                        {/* Mostrar la caja de comentarios si está en modo edición O si ya existe un comentario */}
                        {(item.isEditing || item.comment) && (
                            <div className="cart-comment-box">
                                <div
                                    ref={(el) => {
                                        // Asignar directamente al objeto compartido
                                        if (el) {
                                            textAreaRefs[item._id] = el;
                                            
                                            // Si está en modo edición y aún no hemos aplicado el foco
                                            if (item.isEditing && !focusAppliedRef.current[item._id]) {
                                                console.log(`Asignando ref y enfocando para ${item._id}`);
                                                
                                                // Solo intentar enfocar una vez
                                                setTimeout(() => {
                                                    try {
                                                        // Verificar que seguimos en modo edición
                                                        if (editingItemsRef.current[item._id] && !focusAppliedRef.current[item._id]) {
                                                            el.focus();
                                                            focusAppliedRef.current[item._id] = true;
                                                        }
                                                    } catch (e) {
                                                        console.error("Error al enfocar desde ref:", e);
                                                    }
                                                }, 50);
                                            }
                                        }
                                    }}
                                    contentEditable={!isViewingCompletedOrder}
                                    className={`editable-comment ${isViewingCompletedOrder ? 'viewing-mode' : ''} ${item.isEditing ? 'editing-active' : ''}`}
                                    data-placeholder="Agregar comentario aquí..."
                                    onBlur={(e) => {
                                        if (!isViewingCompletedOrder) {
                                            const newComment = e.target.innerHTML;
                                            addCommentToProduct(item._id, newComment);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            e.target.blur();
                                        }
                                    }}
                                    suppressContentEditableWarning={true}
                                    dangerouslySetInnerHTML={{
                                        __html: (item.comment || '').replace(/\n/g, '<br>'),
                                    }}
                                    onClick={(e) => !isViewingCompletedOrder && e.stopPropagation()}
                                />
                            </div>
                        )}
                    </li>
                    <hr className="cart-divider" />
                </React.Fragment>            ))}
            
            {/* Mostrar subtotal y costo de envío si estamos en modo delivery */}
            {formType === 'delivery' && deliveryCost > 0 && (
                <>
                    {/* Línea de subtotal */}
                    <li className="cart-subtotal">
                        <div className="cart-row">
                            <div className="cart-product-container">                                <span className="cart-product subtotal-label">Subtotal:</span>
                            </div>
                            <span className="cart-price subtotal-amount">
                                {formatChileanMoney(getCartSubtotal())}
                            </span>
                        </div>
                    </li>
                    
                    {/* Línea de costo de envío */}
                    <li className="cart-delivery-cost">
                        <div className="cart-row">
                            <div className="cart-product-container">
                                <span className="cart-product delivery-label">Envío:</span>
                            </div>
                            <span className="cart-price delivery-cost">{formatChileanMoney(Number(deliveryCost) || 0)}</span>
                        </div>
                    </li>
                </>
            )}
        </ul>
    );
};

export default Cart;
