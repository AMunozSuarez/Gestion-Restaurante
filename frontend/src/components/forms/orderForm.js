import React, { useEffect, useState, useRef } from 'react';
import useCartStore from '../../store/useCartStore'; // Store para manejar el carrito
import useUIStore from '../../store/useUiStore'; // Store para manejar estados de UI
import { useProducts } from '../../hooks/useProducts'; // Hook para manejar productos
import { useCategories } from '../../hooks/useCategories'; // Hook para manejar categorías
import useCommentHandler from '../../hooks/useCommentHandler'; // Hook para manejar comentarios
import '../../styles/orderForm.css'; // Estilos específicos del formulario de pedido
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { closeOrder } from '../../api/cashApi'; // Importa la función para cerrar el pedido

const OrderForm = ({
    customerName,
    setCustomerName,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    handleSubmit,
    editingOrderId,
    setEditingOrderId,
    isViewingCompletedOrder,
    resetForm,
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
    const { textAreaRefs, handleAddComment, handleToggleEditComment } = useCommentHandler(setCart);


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
                                        onClick={(e) => e.stopPropagation()} // Evita que el clic sobrescriba el cursor
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

    // Función para cerrar el pedido
    const handleCloseOrder = async () => {
        try {
            // Validar que haya productos en el carrito
            if (cart.length === 0) {
                alert('El carrito está vacío. Agrega productos antes de cerrar el pedido.');
                return;
            }

            // Validar que se haya seleccionado un método de pago
            if (!selectedPaymentMethod) {
                alert('Por favor, selecciona un método de pago.');
                return;
            }

            // Preparar los datos del pedido
            const orderData = {
                total: cartTotal,
                paymentMethod: selectedPaymentMethod,
                items: cart.map((item) => ({
                    productId: item._id,
                    quantity: item.quantity,
                    price: item.price,
                })),
            };

            // Enviar la solicitud al backend
            const response = await closeOrder(orderData);

            if (response.status === 201) {
                alert('Pedido cerrado y registrado en la caja activa.');
                clearCart(); // Limpiar el carrito después de cerrar el pedido
                setCustomerName(''); // Limpiar el nombre del cliente
                setSelectedPaymentMethod(''); // Limpiar el método de pago

                // Actualizar el frontend llamando a handleSubmit con el estado 'Completado'
                handleSubmit(null, 'Completado');
            }
        } catch (error) {
            console.error('Error al cerrar el pedido:', error);
            alert('Hubo un error al cerrar el pedido. Inténtalo nuevamente.');
        }
    };

    if (productsLoading || categoriesLoading) return <p>Cargando datos...</p>;

    return (
        <div className={`order-form ${isEditing ? 'editing-mode' : ''} ${isViewingCompletedOrder ? 'viewing-completed-order' : ''}`}>

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
                    <div className="form-group search-group">
                        <label htmlFor="searchQuery">Buscar Productos:</label>
                        <input
                            type="text"
                            id="searchQuery"
                            ref={searchInputRef} // Referencia al campo de búsqueda
                            value={modalSearchQuery}
                            onChange={(e) => setModalSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            className={isEditing ? 'editing-input' : ''}
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
                <div className="form-group payment-method">
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
                            onClick={handleCloseOrder} // Llama a la función para cerrar el pedido
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
                        <button onClick={() => {
                            handleSubmit(null, 'Cancelado');
                            setIsCancelModalOpen(false)}}>Sí, cancelar</button>
                        <button onClick={() => setIsCancelModalOpen(false)}>No, volver</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderForm;