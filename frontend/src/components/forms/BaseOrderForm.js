import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { useCartManagement } from '../../hooks/useCartManagement';
import useUIStore from '../../store/useUiStore';
import Cart from '../cart/Cart';
import '../../styles/orderForm.css';

const BaseOrderForm = ({
    // Props comunes
    customerName,
    setCustomerName,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    handleSubmit,
    editingOrderId,
    isViewingCompletedOrder,
    comment,
    setComment,
    resetForm,
    
    // Configuración específica del tipo de formulario
    formType, // 'mostrador' o 'delivery'
    
    // Props específicos para este formulario
    renderAdditionalFields,
    cartTotalWithExtras,
    
    // Botones y acciones
    completeButtonLabel,
    completeButtonAction,
    cancelOrderAction,
}) => {    const {
        cart,
        cartTotal,
        getCartTotal,
        addToCart,
        clearCart,
        increaseQuantity,
        decreaseQuantity,
        removeProduct,
        textAreaRefs,
    } = useCartManagement();
    
    const { isSearchFocused, setIsSearchFocused, handleClickOutside } = useUIStore();
    const { products, isLoading: productsLoading } = useProducts();
    const { categories, isLoading: categoriesLoading } = useCategories();
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [modalSearchQuery, setModalSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [isEditing, setIsEditing] = useState(!!editingOrderId);
    const searchInputRef = useRef(null);

    // Detectar cambios en el ID de edición
    useEffect(() => {
        setIsEditing(!!editingOrderId);
    }, [editingOrderId]);

    // Filtrar productos
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

    // Manejar clic fuera del campo de búsqueda
    useEffect(() => {
        const cleanup = handleClickOutside(searchInputRef, () => setIsSearchFocused(false));
        return cleanup;
    }, [handleClickOutside, searchInputRef, setIsSearchFocused]);

    // Renderizar el carrito
    const renderCart = () => (
        <Cart
            cart={cart}
            isViewingCompletedOrder={isViewingCompletedOrder}
            increaseQuantity={increaseQuantity}
            decreaseQuantity={decreaseQuantity}
            removeProduct={removeProduct}
            textAreaRefs={textAreaRefs}
        />
    );

    if (productsLoading || categoriesLoading) return <p>Cargando datos...</p>;

    // Función para manejar el envío del formulario
    const handleFormSubmit = (e) => {
        e.preventDefault();

        // Obtener el valor más reciente del campo contentEditable
        const commentElement = document.getElementById('orderComment');
        const latestComment = commentElement ? commentElement.innerHTML : '';

        console.log('Comentario obtenido al enviar:', latestComment);

        // Llamar a handleSubmit con los parámetros adecuados según el tipo
        handleSubmit(e, resetForm, 'Preparacion', formType, { comment: latestComment });
    };

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
            <form onSubmit={handleFormSubmit}>
                {/* Nombre del cliente (común) */}
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

                {/* Campos adicionales específicos del tipo de formulario */}
                {renderAdditionalFields && renderAdditionalFields()}

                {/* Comentario del pedido (común) */}
                <div className="form-group">
                    <label htmlFor="orderComment">Comentario:</label>
                    <div
                        id="orderComment"
                        contentEditable="true"
                        className="editable-comment"
                        onBlur={(e) => {
                            const newComment = e.target.innerHTML;
                            console.log(`Comentario actualizado en ${formType}:`, newComment);
                            setComment(newComment);
                        }}
                        suppressContentEditableWarning={true}
                        dangerouslySetInnerHTML={{
                            __html: (comment || '').replace(/\n/g, '<br>'),
                        }}
                    />
                </div>

                {/* Campo de búsqueda de productos */}
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
                        {/* Sugerencias de búsqueda */}
                        {modalSearchQuery && isSearchFocused && filteredProducts.length > 0 && (
                            <ul className="suggestions-list">
                                {filteredProducts.map((product, index) => (
                                    <li
                                        key={`${product._id}-${index}`}
                                        onClick={() => {
                                            addToCart(product);
                                            setModalSearchQuery('');
                                            if (searchInputRef.current) {
                                                searchInputRef.current.blur();
                                                setTimeout(() => {
                                                    searchInputRef.current.focus();
                                                }, 0);
                                            }
                                        }}
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

                {/* Carrito */}
                <div className="cart-container">
                    <h3>Carrito</h3>
                    {renderCart()}
                    <div className="cart-total">
                        <strong>Total: ${cartTotalWithExtras ? cartTotalWithExtras.toFixed(0) : getCartTotal().toFixed(0)}</strong>
                    </div>
                </div>

                {/* Método de pago */}
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
                        onClick={completeButtonAction}
                    >
                        {completeButtonLabel || (formType === 'delivery' ? 'Enviar Pedido' : 'Cerrar Pedido')}
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

            {/* Modal para cancelar pedido */}
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
                                    cancelOrderAction();
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

export default BaseOrderForm;
