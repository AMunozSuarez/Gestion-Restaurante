import React, { useState, useEffect } from 'react';

const OrderForm = ({
    customerName,
    setCustomerName,
    searchQuery,
    setSearchQuery,
    isSearchFocused,
    isViewingCompletedOrder,
    setIsSearchFocused,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    handleSubmit,
    editingOrderId,
    updateOrderStatus,
    products,
    setCart,
    cart, // Recibe el carrito correcto
    categories,
    children,
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [modalSearchQuery, setModalSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState(products);

    // Filtrar productos por categoría o búsqueda
    const filterProductos = () => {
        let filtered = products;

        if (categoryFilter) {
            filtered = filtered.filter(
                (product) => product.category?._id === categoryFilter
            );
        }

        if (modalSearchQuery) {
            filtered = filtered.filter((product) =>
                product.title.toLowerCase().includes(modalSearchQuery.toLowerCase())
            );
        }

        setFilteredProducts(filtered);
    };

    useEffect(() => {
        filterProductos();
    }, [categoryFilter, modalSearchQuery, products]);

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

    return (
        <div className={`mostrador-create-order ${isViewingCompletedOrder ? 'viewing-completed-order' : ''}`}>
            {/* Mostrar el texto según el estado */}
            <div className="mostrador-order-status">
                {isViewingCompletedOrder ? (
                    <p className="order-status-text">Revisando Pedido</p>
                ) : editingOrderId ? (
                    <p className="order-status-text">Editando Pedido</p>
                ) : (
                    <p className="order-status-text">Creando Nuevo Pedido</p>
                )}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="mostrador-form-group">
                    <label htmlFor="customerName">Nombre del Cliente:</label>
                    <input
                        type="text"
                        id="customerName"
                        name="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className={editingOrderId ? 'editing-input' : ''}
                        disabled={isViewingCompletedOrder} // Deshabilitar si es una orden completada/cancelada
                    />
                </div>
                {!isViewingCompletedOrder && (
                    <div className="mostrador-form-group">
                        <label htmlFor="searchQuery">Agregar Productos:</label>
                        <input
                            type="text"
                            id="searchQuery"
                            name="searchQuery"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            className={editingOrderId ? 'editing-input' : ''}
                        />
                        <button
                            type="button"
                            className="mostrador-add-products-button"
                            onClick={() => setIsModalOpen(true)}
                        >
                            Ver Productos +
                        </button>
                    </div>
                )}
                {children}
                <div className="mostrador-form-group">
                    <label htmlFor="paymentMethod">Método de Pago:</label>
                    <select
                        id="paymentMethod"
                        name="selectedPaymentMethod"
                        value={selectedPaymentMethod}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        required
                        className={editingOrderId ? 'editing-input' : ''}
                    >
                        <option value="">Seleccione un método de pago</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Debito">Débito</option>
                        <option value="Transferencia">Transferencia</option>
                    </select>
                </div>
                {!isViewingCompletedOrder && (
                    <button type="submit" className={`mostrador-submit-button ${editingOrderId ? 'editing-button' : ''}`}>
                        {editingOrderId ? 'Guardar Cambios' : 'Crear Pedido'}
                    </button>
                )}

                {editingOrderId && !isViewingCompletedOrder && (
                    <div className="mostrador-edit-buttons">
                        <button
                            type="button"
                            className="mostrador-status-button"
                            onClick={() => updateOrderStatus(editingOrderId, 'Completado')}
                        >
                            Marcar como Completado
                        </button>
                        <button
                            type="button"
                            className="mostrador-cancel-button"
                            onClick={() => {
                                if (window.confirm('¿Estás seguro que deseas cancelar este pedido?')) {
                                    updateOrderStatus(editingOrderId, 'Cancelado');
                                }
                            }}
                        >
                            Cancelar Pedido
                        </button>
                    </div>
                )}
            </form>

            {/* Ventana Modal */}
            {isModalOpen && (
                <div className="mostrador-modal">
                    <div className="mostrador-modal-content">
                        <h3>Seleccionar Productos</h3>
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            value={modalSearchQuery}
                            onChange={(e) => setModalSearchQuery(e.target.value)}
                            className="mostrador-modal-search"
                        />
                        <div className="mostrador-modal-categories">
                            <button
                                className={`mostrador-modal-category-button ${
                                    categoryFilter === '' ? 'active' : ''
                                }`}
                                onClick={() => setCategoryFilter('')} // Mostrar todos los productos
                            >
                                Todas
                            </button>
                            {categories.map((category) => (
                                <button
                                    key={category._id}
                                    className={`mostrador-modal-category-button ${
                                        categoryFilter === category._id ? 'active' : ''
                                    }`}
                                    onClick={() => setCategoryFilter(category._id)} // Filtrar por _id de la categoría
                                >
                                    {category.title}
                                </button>
                            ))}
                        </div>
                        <ul className="mostrador-modal-products-list">
                            {filteredProducts.map((product) => (
                                <li
                                    key={product._id}
                                    className="mostrador-modal-product-item"
                                    onClick={() => addToCart(product)}
                                >
                                    <span>{product.title}</span>
                                    <span>${product.price}</span>
                                </li>
                            ))}
                        </ul>
                        
                        <button
                            type="button"
                            className="mostrador-modal-close-button"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderForm;