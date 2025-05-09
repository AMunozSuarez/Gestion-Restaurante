import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import useCartStore from '../../store/useCartStore'; // Store para manejar el carrito
import useUIStore from '../../store/useUiStore'; // Store para manejar estados de UI
import { useProducts } from '../../hooks/useProducts'; // Hook para manejar productos
import { useCategories } from '../../hooks/useCategories'; // Hook para manejar categorías
import '../../styles/orderForm.css'; // Estilos específicos del formulario de pedido
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import Cart from '../cart/Cart'; // Importamos el componente reutilizable del carrito
import { useCartManagement } from '../../hooks/useCartManagement'; // Importamos el hook centralizado para manejar el carrito
import { useOrderForm } from '../../hooks/useOrderForm'; // Importamos el hook para manejar formularios de pedidos

const OrderFormDelivery = ({
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    deliveryAddress,
    setDeliveryAddress,
    deliveryCost,
    setDeliveryCost,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    handleSubmit,
    editingOrderId,
    setEditingOrderId,
    isViewingCompletedOrder,
    comment,
    setComment,
    resetForm,
}) => {
    const {
        cart,
        cartTotal,
        addToCart,
        clearCart,
        increaseQuantity,
        decreaseQuantity,
        removeProduct,
        textAreaRefs,
    } = useCartManagement(); // Usamos el hook para manejar el carrito

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [modalSearchQuery, setModalSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [isEditing, setIsEditing] = useState(!!editingOrderId);
    const navigate = useNavigate();

    const searchInputRef = useRef(null);
    const { products, isLoading: productsLoading } = useProducts(); // Productos
    const { categories, isLoading: categoriesLoading } = useCategories(); // Categorías
    const { isSearchFocused, setIsSearchFocused, handleClickOutside } = useUIStore(); // Estados de UI desde Zustand
    const { handleCloseOrder, handleRegisterOrderInCashRegister, handleUpdateOrderStatus } = useOrderForm(); // Funciones del hook useOrderForm

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
        const cleanup = handleClickOutside(searchInputRef, () => {
            console.log('Clic fuera detectado en OrderFormDelivery'); // Depuración
            setIsSearchFocused(false);
        });
        return cleanup;
    }, [handleClickOutside, searchInputRef, setIsSearchFocused]);

    // Mostrar el carrito
    const renderCart = () => (
        <Cart
            cart={cart}
            isViewingCompletedOrder={isViewingCompletedOrder}
            increaseQuantity={increaseQuantity}
            decreaseQuantity={decreaseQuantity}
            removeProduct={removeProduct}
            textAreaRefs={textAreaRefs}
        />
    );    // La función handleCloseOrder ahora viene del hook useOrderForm

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
                    e.preventDefault();

                    // Obtener el valor más reciente del campo contentEditable
                    const commentElement = document.getElementById('orderComment');
                    const latestComment = commentElement ? commentElement.innerHTML : '';

                    console.log('Comentario obtenido al enviar:', latestComment);

                    // Llamar a handleSubmit con el comentario más reciente
                    handleSubmit(e, resetForm, 'Preparacion', 'delivery', { comment: latestComment });
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

                {/* Nuevo campo para el costo de envío */}
                <div className="form-group">
                    <label htmlFor="deliveryCost">Costo de Envío:</label>
                    <input
                        type="number"
                        id="deliveryCost"
                        value={deliveryCost}
                        onChange={(e) => setDeliveryCost(Number(e.target.value))} // Convertir a número
                        disabled={isViewingCompletedOrder}
                        className={isEditing ? 'editing-input' : ''}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="orderComment">Comentario:</label>
                    <div
                        id="orderComment"
                        contentEditable="true"
                        className="editable-comment"
                        onBlur={(e) => {
                            const newComment = e.target.innerHTML;
                            console.log('Comentario actualizado en OrderFormDelivery:', newComment); // Depuración
                            setComment(newComment); // Actualizar el estado del comentario
                        }}
                        suppressContentEditableWarning={true} // Evitar advertencias de React
                        dangerouslySetInnerHTML={{
                            __html: (comment || '').replace(/\n/g, '<br>'), // Convierte \n a <br>
                        }}
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
                        {/* Mostrar sugerencias solo si hay texto y el campo está enfocado */}
                                                {modalSearchQuery && isSearchFocused && filteredProducts.length > 0 && (
                                                    <ul className="suggestions-list">
                                                        {filteredProducts.map((product, index) => (
                                                            <li
                                                                key={`${product._id}-${index}`}
                                                                onClick={() => {
                                                                    addToCart(product); // Agregar el producto al carrito
                                                                    setModalSearchQuery(''); // Limpiar el texto del campo de búsqueda
                        
                                                                    // Quitar y volver a activar el foco
                                                                    if (searchInputRef.current) {
                                                                        searchInputRef.current.blur(); // Quitar el foco
                                                                        setTimeout(() => {
                                                                            searchInputRef.current.focus(); // Volver a activar el foco
                                                                        }, 0); // Breve retraso para asegurar que el navegador registre el cambio
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

                <div className="cart-container">
                    <h3>Carrito</h3>
                    {renderCart()}
                    <div className="cart-total">
                        <strong>Total: ${(cartTotal + (Number(deliveryCost) || 0)).toFixed(0)}</strong>
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
                        onClick={async () => {
                            try {
                                // Primero registrar en caja
                                await handleRegisterOrderInCashRegister({
                                    cart,
                                    cartTotal,
                                    deliveryCost,
                                    selectedPaymentMethod
                                });
                                
                                // Luego actualizar el estado del pedido a "Enviado"
                                await handleUpdateOrderStatus({
                                    _id: editingOrderId,
                                    status: 'Enviado',
                                    // Incluir los datos del pedido necesarios para el backend
                                    buyer: {
                                        name: customerName,
                                        phone: customerPhone,
                                        addresses: [
                                            {
                                                address: deliveryAddress,
                                                deliveryCost: Number(deliveryCost),
                                            },
                                        ],
                                        comment: comment || '',
                                    },
                                    foods: cart.map((item) => ({
                                        food: item._id,
                                        quantity: item.quantity,
                                        comment: item.comment || '',
                                    })),
                                    payment: selectedPaymentMethod,
                                    total: cartTotal + Number(deliveryCost),
                                    section: 'delivery',
                                    selectedAddress: deliveryAddress,
                                });
                                
                                // Limpiar y redireccionar después de ambas operaciones exitosas
                                clearCart();
                                
                            } catch (error) {
                                console.error('Error al procesar el pedido:', error);
                                alert('Hubo un error al procesar el pedido. Inténtalo nuevamente.');
                            }
                        }}
                    >
                        Enviar Pedido
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
                                    handleSubmit(null, resetForm, 'Cancelado', 'delivery');
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