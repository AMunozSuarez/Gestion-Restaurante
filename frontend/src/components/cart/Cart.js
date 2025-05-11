import React from 'react';
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
    textAreaRefs,
    formType,
    deliveryCost,
}) => {
    const { addCommentToProduct, toggleEditComment, getCartSubtotal } = useCartManagement();

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
                                >                                <FontAwesomeIcon icon={faCommentDots} />
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
                                <div                                    ref={(el) => (textAreaRefs.current[item._id] = el)}
                                    contentEditable={!isViewingCompletedOrder}
                                    className={`editable-comment ${isViewingCompletedOrder ? 'viewing-mode' : ''}`}
                                    onBlur={(e) => {
                                        if (!isViewingCompletedOrder) {
                                            const newComment = e.target.innerHTML;
                                            addCommentToProduct(item._id, newComment);
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
