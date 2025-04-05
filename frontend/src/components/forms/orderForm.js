import React, { useEffect, useState, useRef } from 'react';
import useCartStore from '../../store/useCartStore'; // Store para manejar el carrito
import useUIStore from '../../store/useUiStore'; // Store para manejar estados de UI
import { useProducts } from '../../hooks/useProducts'; // Hook para manejar productos
import { useCategories } from '../../hooks/useCategories'; // Hook para manejar categorías
import '../../styles/orderForm.css'; // Estilos específicos del formulario de pedido
import { useNavigate } from 'react-router-dom';

const OrderForm = ({
    customerName,
    setCustomerName,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    handleSubmit,
    editingOrderId,
    setEditingOrderId,
    isViewingCompletedOrder,
    markAsCompleted, // Función para cerrar el pedido
    cancelOrder, // Función para cancelar el pedido
}) => {
    const { cart, setCart, clearCart, increaseQuantity, decreaseQuantity, removeProduct } = useCartStore(); // Incluye setCart
    const { isSearchFocused, setIsSearchFocused } = useUIStore(); // Estados de UI desde Zustand
    const { products, isLoading: productsLoading } = useProducts(); // Productos desde TanStack Query
    const { categories, isLoading: categoriesLoading } = useCategories(); // Categorías desde TanStack Query

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [modalSearchQuery, setModalSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [cartTotal, setCartTotal] = useState(0); // Estado para el total del carrito
    const [isEditing, setIsEditing] = React.useState(!!editingOrderId); // Determinar si estamos editando
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false); // Estado para la modal de cancelación
    const navigate = useNavigate(); // Hook para navegar entre rutas

    const searchInputRef = useRef(null); // Referencia al campo de búsqueda

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
        setSelectedPaymentMethod('Efectivo');
        clearCart();
        setEditingOrderId(null);
    };

    // Ocultar sugerencias al hacer clic fuera del campo de búsqueda
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
                setIsSearchFocused(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    const addToCart = (product) => {
        setCart((prevCart) => {
            if (!Array.isArray(prevCart)) {
                console.error('Error: El carrito actual no es un array:', prevCart);
                return []; // Devuelve un array vacío como fallback
            }

            const existingProduct = prevCart.find((item) => item._id === product._id);
            if (existingProduct) {
                console.log('Actualizando cantidad del producto:', product);
                return prevCart.map((item) =>
                    item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            console.log('Agregando nuevo producto al carrito:', product);
            return [...prevCart, { ...product, quantity: 1 }];
        });
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
                        {/* Controles de cantidad */}
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

                        {/* Nombre del producto */}
                        <span className="cart-product">{item.title}</span>

                        {/* Precio total del producto */}
                        <span className="cart-price">${(item.price * item.quantity).toFixed(0)}</span>

                        {/* Botón para eliminar el producto */}
                        {!isViewingCompletedOrder && (
                            <button
                                type="button"
                                className="cart-remove"
                                onClick={() => removeProduct(item._id)}
                            >
                                X
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        );
    };

    if (productsLoading || categoriesLoading) return <p>Cargando datos...</p>;

    return (
        <div className={`order-form ${isEditing ? 'editing-mode' : ''} ${isViewingCompletedOrder ? 'viewing-completed-order' : ''}`}>
            {/* Botón para volver al estado de "Crear Pedido" */}

            {/* Estado del pedido */}
            <div className="order-status">
                {isViewingCompletedOrder ? (
                    <p>Revisando Pedido</p>
                ) : isEditing ? (
                    <p>Editando Pedido</p>
                ) : (
                    <p>Creando Nuevo Pedido</p>
                )}
            </div>

            {/* Formulario principal */}
            <form onSubmit={(e) => handleSubmit(e, resetForm)}>
                {/* Nombre del cliente */}
                <div className="form-group">
                    <label htmlFor="customerName">Nombre del Cliente:</label>
                    <input
                        type="text"
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        disabled={isViewingCompletedOrder} // Deshabilitar si es un pedido completado/cancelado
                        className={isEditing ? 'editing-input' : ''}
                    />
                </div>

                {/* Campo de búsqueda de productos */}
                {!isViewingCompletedOrder && (
                    <div className="form-group">
                        <label htmlFor="searchQuery">Buscar Productos:</label>
                        <input
                            type="text"
                            id="searchQuery"
                            ref={searchInputRef} // Referencia al campo de búsqueda
                            value={modalSearchQuery}
                            onChange={(e) => setModalSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                        />
                        {/* Mostrar sugerencias solo si hay texto y el campo está enfocado */}
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

                {/* Mostrar el carrito */}
                <div className="cart-container">
                    <h3>Carrito</h3>
                    {renderCart()}
                    <div className="cart-total">
                        <strong>Total: ${cartTotal.toFixed(0)}</strong>
                    </div>
                </div>

                {/* Método de pago */}
                <div className="form-group">
                    <label htmlFor="paymentMethod">Método de Pago:</label>
                    <select
                        id="paymentMethod"
                        value={selectedPaymentMethod}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        required
                        className={isEditing ? 'editing-input' : ''}
                    >
                        <option value="">Seleccione un método de pago</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Debito">Débito</option>
                        <option value="Transferencia">Transferencia</option>
                    </select>
                </div>


                {/* Botón de enviar */}
                {!isViewingCompletedOrder && (
                    <button type="submit">
                        {editingOrderId ? 'Guardar Cambios' : 'Crear Pedido'}
                    </button>
                )}
            </form>

            
                {/* Botones adicionales para cerrar o cancelar el pedido */}
                {!isViewingCompletedOrder && editingOrderId && (
                    <div className="form-actions">
                        <button
                            type="button"
                            className="mark-completed-button"
                            onClick={() => handleSubmit(null, 'Completado')} // Pasar 'null' como primer argumento
                        >
                            Cerrar Pedido
                        </button>
                        <button
                            type="button"
                            className="cancel-order-button"
                            onClick={() => setIsCancelModalOpen(true)} // Abrir la modal de cancelación
                        >
                            Cancelar Pedido
                        </button>
                    </div>
                )}

            

            {/* Modal para seleccionar productos */}
            {isModalOpen && (
                <div
                    className="modal"
                    onClick={(e) => {
                        // Cerrar la modal si se hace clic fuera del contenido
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

            {/* Modal para cancelar el pedido */}
            {isCancelModalOpen && (
                <div
                    className="modal"
                    onClick={(e) => {
                        // Cerrar la modal si se hace clic fuera del contenido
                        if (e.target.classList.contains('modal')) {
                            setIsCancelModalOpen(false);
                        }
                    }}
                >
                    <div className="modal-content modal-actions">
                        <h3>¿Estás seguro de que deseas cancelar el pedido?</h3>
                        <button onClick={() => handleSubmit(null, 'Cancelado')}>Sí, cancelar</button>
                        <button onClick={() => setIsCancelModalOpen(false)}>No, volver</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderForm;