import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import useCartStore from '../../store/useCartStore'; // Store para manejar el carrito
import useUIStore from '../../store/useUiStore'; // Store para manejar estados de UI
import { useProducts } from '../../hooks/useProducts'; // Hook para manejar productos
import { useCategories } from '../../hooks/useCategories'; // Hook para manejar categorías
import useCommentHandler from '../../hooks/useCommentHandler';
import '../../styles/orderForm.css'; // Estilos específicos del formulario de pedido
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { closeOrder } from '../../api/cashApi'; // Importa la función para cerrar el pedido

const OrderFormDelivery = ({
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
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

    const [isModalOpen, setIsModalOpen] = useState(false); // Modal para productos
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false); // Modal para cancelar pedido
    const [categoryFilter, setCategoryFilter] = useState('');
    const [modalSearchQuery, setModalSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [cartTotal, setCartTotal] = useState(0);
    const [isEditing, setIsEditing] = useState(!!editingOrderId);
    const navigate = useNavigate();

    const searchInputRef = useRef(null);
    const { textAreaRefs, handleAddComment, handleToggleEditComment } = useCommentHandler(setCart);

    // Calcular el total del carrito cada vez que cambie
    useEffect(() => {
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        setCartTotal(total);
    }, [cart]);

    useEffect(() => {
        if (editingOrderId) {
            setIsEditing(true);
        } else {
            setIsEditing(false);
        }
    }, [editingOrderId]);

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
        setCustomerPhone('');
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
        // Limpiar el campo de búsqueda después de seleccionar un producto
        setModalSearchQuery('');

        // Forzar re-renderizado de las sugerencias
        setIsSearchFocused(false); // Desactiva el estado temporalmente
        setTimeout(() => {
            setIsSearchFocused(true); // Reactiva el estado después de un breve retraso
        }, 0);

        // Volver a enfocar el campo de búsqueda
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };
    // Función para cerrar el pedido
    const handleCloseOrder = async () => {
        try {

            if (!selectedPaymentMethod) {
                alert('Por favor, selecciona un método de pago.');
                return;
            }

            const orderData = {
                total: cartTotal,
                paymentMethod: selectedPaymentMethod,
                items: cart.map((item) => ({
                    productId: item._id,
                    quantity: item.quantity,
                    price: item.price,
                })),
            };

            console.log('Cerrando pedido:', orderData);

            // Enviar la solicitud al backend
            const response = await closeOrder(orderData);
            if (response.status === 201) {
            // Simula el cierre del pedido
            alert('Pedido cerrado correctamente.');
            clearCart(); // Limpia el carrito
            setCustomerName(''); // Limpia el nombre del cliente
            setDeliveryAddress(''); // Limpia la dirección de entrega
            setSelectedPaymentMethod(''); // Limpia el método de pago
            setEditingOrderId(null); // Restablece el ID del pedido en edición

            handleSubmit(null, resetForm, 'Enviado', 'delivery'); // Llama a la función de envío con los datos del pedido
            }
        } catch (error) {
            console.error('Error al cerrar el pedido:', error);
            alert('Hubo un error al cerrar el pedido. Inténtalo nuevamente.');
        }
    };
    // Mostrar el carrito
    const renderCart = () => {
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
                                        onClick={() => handleToggleEditComment(item._id)}
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
                                        ref={(el) => (textAreaRefs.current[item._id] = el)} // Asigna la referencia
                                        contentEditable="true"
                                        className="editable-comment"
                                        onBlur={(e) => handleAddComment(item._id, e.target.innerHTML)} // Usa innerHTML
                                        suppressContentEditableWarning={true} // Evita advertencias de React
                                        dangerouslySetInnerHTML={{
                                            __html: (item.comment || '').replace(/\n/g, '<br>'), // Convierte \n a <br>
                                        }}
                                    />
                                </div>
                            )}
                            {item.comment && !item.isEditing && (
                                <p
                                    className="cart-comment-text"
                                    onClick={() => handleToggleEditComment(item._id)}
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
                        <hr className="cart-divider" /> {/* Línea separadora */}
                    </React.Fragment>
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
                        section: 'delivery', // Sección del pedido
                        status: editingOrderId ? 'Preparacion' : 'Preparacion', // Estado inicial del pedido
                    };
                    console.log('Datos del pedido:', orderData);
                    handleSubmit(e, resetForm, orderData.status, orderData.section);
                }}
            >
                <div className="form-group">
                    <label htmlFor="customerPhone">Teléfono del Cliente:</label>
                    <input
                        type="text"
                        id="customerPhone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        disabled={isViewingCompletedOrder}
                        className={isEditing ? 'editing-input' : ''}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="customerName">Nombre del Cliente:</label>
                    <input
                        type="text"
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        disabled={isViewingCompletedOrder}
                        className={isEditing ? 'editing-input' : ''}
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
                        className={isEditing ? 'editing-input' : ''}
                        required
                    />
                </div>

                {!isViewingCompletedOrder && (
                    <div className="form-group search-group">
                        <label htmlFor="searchQuery">Buscar Productos:</label>
                        <input
                            type="text"
                            id="searchQuery"
                            ref={searchInputRef}
                            value={modalSearchQuery}
                            onChange={(e) => setModalSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            className={isEditing ? 'editing-input' : ''}
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

                <div className="form-group payment-method">
                    <label htmlFor="paymentMethod">Método de Pago:</label>
                    <select
                        id="paymentMethod"
                        value={selectedPaymentMethod}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className={isEditing ? 'editing-input' : ''}
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

            {/* Botones adicionales para cerrar o cancelar el pedido */}
            {!isViewingCompletedOrder && editingOrderId && (
                <div className="form-actions">
                    <button
                        type="button"
                        className="mark-completed-button"
                        onClick={handleCloseOrder}
                    >
                        Cerrar Pedido
                    </button>
                    <button
                        type="button"
                        className="cancel-order-button"
                        onClick={() => setIsCancelModalOpen(true)}
                    >
                        Cancelar Pedido
                    </button>
                </div>
            )}

            {/* Modal para cancelar el pedido */}
            {isCancelModalOpen &&
                ReactDOM.createPortal(
                    <div
                        className="modal"
                        onClick={(e) => {
                            if (e.target.classList.contains('modal')) {
                                setIsCancelModalOpen(false);
                            }
                        }}
                    >
                        <div className="modal-content modal-actions">
                            <h3>¿Estás seguro de que deseas cancelar el pedido?</h3>
                            <button
                                onClick={() => {
                                    cancelOrder(editingOrderId);
                                    setIsCancelModalOpen(false);
                                }}
                            >
                                Sí, cancelar
                            </button>
                            <button onClick={() => setIsCancelModalOpen(false)}>No, volver</button>
                        </div>
                    </div>,
                    document.getElementById('modal-root')
                )}

            {/* Modal para productos */}
            {isModalOpen &&
                ReactDOM.createPortal(
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
                    </div>,
                    document.getElementById('modal-root')
                )}
        </div>
    );
};

export default OrderFormDelivery;