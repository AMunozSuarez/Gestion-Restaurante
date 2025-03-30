import React from 'react';

const OrderForm = ({
    customerName,
    setCustomerName,
    searchQuery,
    setSearchQuery,
    isSearchFocused,
    setIsSearchFocused,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    handleSubmit,
    editingOrderId,
    updateOrderStatus, // Nueva prop para actualizar el estado del pedido
    children,
}) => {
    return (
        <div className="mostrador-create-order">
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
                    />
                </div>
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
                </div>
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
                <button type="submit" className={`mostrador-submit-button ${editingOrderId ? 'editing-button' : ''}`}>
                    {editingOrderId ? 'Guardar Cambios' : 'Crear Pedido'}
                </button>

                {/* Botones de Completado y Cancelar */}
                {editingOrderId && (
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
        </div>
    );
};

export default OrderForm;