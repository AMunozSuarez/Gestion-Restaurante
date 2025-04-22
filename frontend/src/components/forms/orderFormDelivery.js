import React, { useEffect, useState, useRef } from 'react';
import useCartStore from '../../store/useCartStore'; // Store para manejar el carrito
import useUIStore from '../../store/useUiStore'; // Store para manejar estados de UI
import { useProducts } from '../../hooks/useProducts'; // Hook para manejar productos
import { useCategories } from '../../hooks/useCategories'; // Hook para manejar categorías
import '../../styles/orderForm.css'; // Estilos específicos del formulario de pedido
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

const OrderFormDelivery = ({
    customerName,
    setCustomerName,
    deliveryAddress,
    setDeliveryAddress,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    handleSubmit,
    editingOrderId,
    setEditingOrderId,
    isViewingCompletedOrder,
    markAsCompleted,
    cancelOrder,
}) => {
    const { cart, setCart, clearCart, increaseQuantity, decreaseQuantity, removeProduct } = useCartStore(); // Manejo del carrito
    const { isSearchFocused, setIsSearchFocused } = useUIStore(); // Estados de UI
    const { products, isLoading: productsLoading } = useProducts(); // Productos
    const { categories, isLoading: categoriesLoading } = useCategories(); // Categorías

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [modalSearchQuery, setModalSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [cartTotal, setCartTotal] = useState(0);
    const [isEditing, setIsEditing] = useState(!!editingOrderId);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [activeCommentId, setActiveCommentId] = useState(null); // ID del producto con el cuadro de texto activo
    const navigate = useNavigate();

    const searchInputRef = useRef(null);

    // Calcular el total del carrito cada vez que cambie
    useEffect(() => {
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        setCartTotal(total);
    }, [cart]);

    // Filtrar productos por categoría o búsqueda
    useEffect(() => {
        if (!products) return;
        let filtered = products;

        if (categoryFilter) {
            filtered = filtered.filter((product) => product.category?._id === categoryFilter);
        }

        if (modalSearchQuery) {
            filtered = filtered.filter((product) =>
                product.title.toLowerCase().includes(modalSearchQuery.toLowerCase())
            );
        }

        setFilteredProducts(filtered);
    }, [categoryFilter, modalSearchQuery, products]);

    useEffect(() => {
        if (editingOrderId) {
            setIsEditing(true);
        } else {
            setIsEditing(false);
        }
    }, [editingOrderId]);

    // Función para volver al estado de "Crear Pedido"
    const resetForm = () => {
        setCustomerName('');
        setDeliveryAddress('');
        setSelectedPaymentMethod('Efectivo');
        clearCart(); // Limpiar el carrito
        setEditingOrderId(null); // Restablecer el ID del pedido en edición
    };

    // Función para añadir productos al carrito
    const addToCart = (product) => {
        setCart((prevCart) => {
            const existingProduct = prevCart.find((item) => item._id === product._id);
            if (existingProduct) {
                return prevCart.map((item) =>
                    item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
    };

    // Función para manejar la adición de comentarios
    const handleAddComment = (productId, comment) => {
        setCart((prevCart) =>
            prevCart.map((item) =>
                item._id === productId ? { ...item, comment } : item
            )
        );
        setActiveCommentId(null); // Cerrar el cuadro de texto después de guardar
    };

    // Mostrar el carrito
    const renderCart = () => {
        if (!Array.isArray(cart) || cart.length === 0) {
            return <p>El carrito está vacío.</p>;
        }

        return (
            <ul className="cart-list">
                {cart.map((item, index) => (
                    <li key={`${item._id}-${index}`} className="cart-item">
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
                                    onClick={() => setActiveCommentId(activeCommentId === item._id ? null : item._id)}
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
                        {activeCommentId === item._id && (
                            <div className="cart-comment-box">
                                <textarea
                                    placeholder="Escribe un comentario..."
                                    defaultValue={item.comment || ''}
                                    onBlur={(e) => handleAddComment(item._id, e.target.value)}
                                />
                            </div>
                        )}
                        {item.comment && activeCommentId !== item._id && (
                            <p
                                className="cart-comment-text"
                                onClick={() => setActiveCommentId(item._id)}
                            >
                                {item.comment}
                            </p>
                        )}
                    </li>
                ))}
            </ul>
        );
    };

    if (productsLoading || categoriesLoading) return <p>Cargando datos...</p>;

    return (
        <div className={`order-form ${isEditing ? 'editing-mode' : ''} ${isViewingCompletedOrder ? 'viewing-completed-order' : ''}`}>
            <div className="order-status">
                {isViewingCompletedOrder ? (
                    <p>Revisando Pedido</p>
                ) : isEditing ? (
                    <p>Editando Pedido</p>
                ) : (
                    <p>Creando Nuevo Pedido</p>
                )}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault(); // Prevenir la recarga de la página
                    const orderData = {
                        customerName,
                        deliveryAddress,
                        paymentMethod: selectedPaymentMethod,
                        cart, // Incluye los productos del carrito
                    };
                    handleSubmit(e, orderData, resetForm, editingOrderId ? 'Preparacion' : 'Preparacion');
                }}
            >
                <div className="form-group">
                    <label htmlFor="customerName">Nombre del Cliente:</label>
                    <input
                        type="text"
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        disabled={isViewingCompletedOrder}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="deliveryAddress">Dirección de Entrega:</label>
                    <input
                        type="text"
                        id="deliveryAddress"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        disabled={isViewingCompletedOrder}
                        required
                    />
                </div>

                {!isViewingCompletedOrder && (
                    <div className="form-group">
                        <label htmlFor="searchQuery">Buscar Productos:</label>
                        <input
                            type="text"
                            id="searchQuery"
                            ref={searchInputRef}
                            value={modalSearchQuery}
                            onChange={(e) => setModalSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                        />
                        {modalSearchQuery && isSearchFocused && filteredProducts.length > 0 && (
                            <ul className="suggestions-list">
                                {filteredProducts.map((product, index) => (
                                    <li
                                        key={`${product._id}-${index}`}
                                        onClick={() => addToCart(product)}
                                        className="suggestion-item"
                                    >
                                        <span>{product.title}</span>
                                        <span>${product.price}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <button type="button" onClick={() => setIsModalOpen(true)}>
                            Ver Productos +
                        </button>
                    </div>
                )}

                <div className="cart-container">
                    <h3>Carrito</h3>
                    {renderCart()}
                    <div className="cart-total">
                        <strong>Total: ${cartTotal.toFixed(0)}</strong>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="paymentMethod">Método de Pago:</label>
                    <select
                        id="paymentMethod"
                        value={selectedPaymentMethod}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        required
                    >
                        <option value="">Seleccione un método de pago</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Debito">Débito</option>
                        <option value="Transferencia">Transferencia</option>
                    </select>
                </div>

                {!isViewingCompletedOrder && (
                    <button type="submit">
                        {editingOrderId ? 'Guardar Cambios' : 'Crear Pedido'}
                    </button>
                )}
            </form>

            {isModalOpen && (
                <div
                    className="modal"
                    onClick={(e) => {
                        if (e.target.classList.contains('modal')) {
                            setIsModalOpen(false);
                        }
                    }}
                >
                    <div className="modal-content">
                        <h3>Seleccionar Productos</h3>
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            value={modalSearchQuery}
                            onChange={(e) => setModalSearchQuery(e.target.value)}
                        />
                        <div className="categories">
                            <button
                                className={categoryFilter === '' ? 'active' : ''}
                                onClick={() => setCategoryFilter('')}
                            >
                                Todas
                            </button>
                            {categories.map((category, index) => (
                                <button
                                    key={`${category._id}-${index}`}
                                    className={categoryFilter === category._id ? 'active' : ''}
                                    onClick={() => setCategoryFilter(category._id)}
                                >
                                    {category.title}
                                </button>
                            ))}
                        </div>
                        <ul className="products-list">
                            {filteredProducts.map((product, index) => (
                                <li key={`${product._id}-${index}`} onClick={() => addToCart(product)}>
                                    <span>{product.title}</span>
                                    <span>${product.price}</span>
                                </li>
                            ))}
                        </ul>
                        <button onClick={() => setIsModalOpen(false)}>Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderFormDelivery;