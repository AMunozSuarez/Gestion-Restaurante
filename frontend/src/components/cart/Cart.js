import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { useCartManagement } from '../../hooks/state/useCartManagement'; // Importamos el hook para manejar el carrito

const Cart = ({
    cart,
    isViewingCompletedOrder,
    increaseQuantity,
    decreaseQuantity,
    removeProduct,
    textAreaRefs,
}) => {
    const { addCommentToProduct, toggleEditComment } = useCartManagement(); // Usamos las funciones directamente

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
                                <span className="cart-product">{item.title}</span>
                                <button
                                    type="button"
                                    className="cart-comment"
                                    onClick={() => toggleEditComment(item._id)}
                                >
                                    <FontAwesomeIcon icon={faCommentDots} />
                                </button>
                            </div>
                            <span className="cart-price">${(item.price * item.quantity).toFixed(0)}</span>
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
                        {item.isEditing && (
                            <div className="cart-comment-box">
                                <div
                                    ref={(el) => (textAreaRefs.current[item._id] = el)}
                                    contentEditable="true"
                                    className="editable-comment"
                                    onBlur={(e) => addCommentToProduct(item._id, e.target.innerHTML)}
                                    suppressContentEditableWarning={true}
                                    dangerouslySetInnerHTML={{
                                        __html: (item.comment || '').replace(/\n/g, '<br>'),
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}
                        {item.comment && !item.isEditing && (
                            <p
                                className="cart-comment-text"
                                onClick={() => toggleEditComment(item._id)}
                            >
                                {item.comment.split('\n').map((line, i) => (
                                    <React.Fragment key={i}>
                                        {line}
                                        <br />
                                    </React.Fragment>
                                ))}
                            </p>
                        )}
                    </li>
                    <hr className="cart-divider" />
                </React.Fragment>
            ))}
        </ul>
    );
};

export default Cart;
