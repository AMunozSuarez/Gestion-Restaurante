import React from 'react';

const Suggestions = ({ products, searchQuery, cart, setCart, setSearchQuery, setIsSearchFocused }) => {
    return (
        <div className="mostrador-suggestions-container">
            <ul className="mostrador-suggestions-list">
                {products
                    .filter((product) =>
                        product.title.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((product) => (
                        <li
                            key={product._id}
                            className="mostrador-suggestion-item"
                            onClick={() => {
                                const existingProductIndex = cart.findIndex((item) => item._id === product._id);
                                if (existingProductIndex !== -1) {
                                    const updatedCart = [...cart];
                                    updatedCart[existingProductIndex].quantity += 1;
                                    setCart(updatedCart);
                                } else {
                                    setCart([...cart, { ...product, quantity: 1 }]);
                                }
                                setSearchQuery('');
                                setIsSearchFocused(false);
                            }}
                        >
                            <span className="product-title">{product.title}</span>
                            <span className="product-price">${product.price}</span>
                        </li>
                    ))}
            </ul>
        </div>
    );
};

export default Suggestions;