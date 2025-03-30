import React from 'react';

const Cart = ({ cart, setCart, calculateTotal }) => {
    return (
        <div className="mostrador-cart">
            <h3>Carrito:</h3>
            <ul className="mostrador-cart-list">
                {cart.map((item) => (
                    <li key={item._id} className="mostrador-cart-item">
                        <div className="cart-item-actions">
                            <button
                                type="button"
                                className="mostrador-quantity-button"
                                onClick={() => {
                                    const updatedCart = cart.map((cartItem) =>
                                        cartItem._id === item._id
                                            ? { ...cartItem, quantity: cartItem.quantity + 1 }
                                            : cartItem
                                    );
                                    setCart(updatedCart);
                                }}
                            >
                                +
                            </button>
                            <span className="cart-item-quantity">x {item.quantity}</span>
                            <button
                                type="button"
                                className="mostrador-quantity-button"
                                onClick={() => {
                                    const updatedCart = cart
                                        .map((cartItem) =>
                                            cartItem._id === item._id && cartItem.quantity > 1
                                                ? { ...cartItem, quantity: cartItem.quantity - 1 }
                                                : cartItem
                                        )
                                        .filter((cartItem) => cartItem.quantity > 0);
                                    setCart(updatedCart);
                                }}
                            >
                                -
                            </button>
                        </div>
                        <div className="cart-item-info">
                            <span className="cart-item-title">{item.title}</span>
                        </div>
                        <button
                            type="button"
                            className="mostrador-remove-button"
                            onClick={() => {
                                const updatedCart = cart.filter((cartItem) => cartItem._id !== item._id);
                                setCart(updatedCart);
                            }}
                        >
                            X
                        </button>
                    </li>
                ))}
            </ul>
            <div className="mostrador-cart-total">
                <h4>Total: ${calculateTotal().toFixed(2)}</h4>
            </div>
        </div>
    );
};

export default Cart;