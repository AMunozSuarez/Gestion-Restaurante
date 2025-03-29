import React, { Component } from 'react';
import axios from 'axios';
import '../styles/principal.css';

class Principal extends Component {
    constructor(props) {
        super(props);
        this.state = {
            section: 'delivery', // Valor predeterminado
            customerName: '',
            customerPhone: '',
            orders: [], // Lista de pedidos
            products: [], // Lista de productos obtenidos de la base de datos
            cart: [], // Productos seleccionados con cantidades
            searchQuery: '', // Texto de búsqueda
            selectedPaymentMethod: '', // Método de pago seleccionado
            paymentMethods: ['Efectivo', 'Debito', 'Transferencia'], // Métodos de pago disponibles
            showSuggestions: false, // Mostrar sugerencias
            editingOrder: null // Pedido que se está editando
        };
    }

    componentDidMount() {
        // Obtener productos y pedidos al cargar el componente
        this.fetchProducts();
        this.fetchOrders();
    }

    fetchProducts = async () => {
        try {
            const response = await axios.get('/food/getAll'); // Obtener alimentos desde el backend
            this.setState({ products: response.data.foods }); // Guardar los alimentos en el estado
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    fetchOrders = async () => {
        try {
            const response = await axios.get('/order/getAll');
            this.setState({ orders: response.data.orders });
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    handleInputChange = (e) => {
        this.setState({ [e.target.name]: e.target.value });
    };

    handleSearchChange = (e) => {
        this.setState({ searchQuery: e.target.value });
    };

    addToCart = (product) => {
        const existingItem = this.state.cart.find((item) => item._id === product._id);
        if (existingItem) {
            // Incrementar la cantidad si el producto ya está en el carrito
            this.setState((prevState) => ({
                cart: prevState.cart.map((item) =>
                    item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
                ),
                searchQuery: '' // Limpia el campo de búsqueda
            }));
        } else {
            // Agregar el producto al carrito con cantidad inicial de 1
            this.setState((prevState) => ({
                cart: [...prevState.cart, { ...product, quantity: 1 }],
                searchQuery: '' // Limpia el campo de búsqueda
            }));
        }
    };

    updateCartQuantity = (productId, quantity) => {
        if (quantity < 1) return; // No permitir cantidades menores a 1
        this.setState((prevState) => ({
            cart: prevState.cart.map((item) =>
                item._id === productId ? { ...item, quantity } : item
            )
        }));
    };

    removeFromCart = (productId) => {
        this.setState((prevState) => ({
            cart: prevState.cart.filter((item) => item._id !== productId)
        }));
    };

    handleSubmit = async (e) => {
        e.preventDefault();
        const { customerName, customerPhone, section, cart, selectedPaymentMethod } = this.state;

        if (!selectedPaymentMethod) {
            alert('Por favor, seleccione un método de pago.');
            return;
        }

        try {
            await axios.post('/order/create', {
                foods: cart.map((item) => ({
                    food: item._id, // ID del alimento
                    quantity: item.quantity // Cantidad del alimento
                })),
                payment: selectedPaymentMethod,
                buyer: customerName,
                customerPhone,
                section // Incluye el valor de "section"
            });

            // Vuelve a cargar la lista de pedidos desde el backend
            await this.fetchOrders();

            // Limpia el formulario y el carrito
            this.setState({
                customerName: '',
                customerPhone: '',
                cart: [],
                selectedPaymentMethod: ''
            });
        } catch (error) {
            console.error('Error creating order', error);
        }
    };

    startEditingOrder = (order) => {
        this.setState({ editingOrder: { ...order } });
    };

    saveEditedOrder = async () => {
        const { editingOrder } = this.state;

        // Calcular el total basado en las comidas y sus cantidades
        const total = editingOrder.foods.reduce(
            (sum, item) => sum + item.food.price * item.quantity,
            0
        );

        // Asegúrate de que los datos de foods estén en el formato correcto
        const formattedOrder = {
            ...editingOrder,
            foods: editingOrder.foods.map((foodItem) => ({
                food: foodItem.food._id, // Solo envía el ID del alimento
                quantity: foodItem.quantity
            })),
            total // Actualiza el total
        };

        try {
            console.log('Datos enviados al backend:', formattedOrder); // Log para depuración
            await axios.put(`/order/update/${editingOrder._id}`, formattedOrder); // Endpoint para actualizar el pedido
            await this.fetchOrders(); // Recargar la lista de pedidos
            this.setState({ editingOrder: null }); // Salir del modo de edición
        } catch (error) {
            console.error('Error updating order:', error);
        }
    };

    cancelEditingOrder = () => {
        this.setState({ editingOrder: null });
    };

    deleteOrder = async (orderId) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este pedido?')) {
            try {
                await axios.delete(`/order/delete/${orderId}`); // Endpoint para eliminar el pedido
                await this.fetchOrders(); // Recargar la lista de pedidos
            } catch (error) {
                console.error('Error deleting order:', error);
            }
        }
    };

    render() {
        const { section, customerName, customerPhone, orders, products, cart, searchQuery, paymentMethods, selectedPaymentMethod, showSuggestions, editingOrder } = this.state;

        // Filtrar productos según el texto de búsqueda
        const filteredProducts = products.filter((product) =>
            product.title && product.title.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Calcular el total acumulado del carrito
        const totalCart = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

        return (
            <div className="principal-container">
                <div className="button-container">
                    <button
                        className={`switch-button ${section === 'delivery' ? 'active' : ''}`}
                        onClick={() => this.setState({ section: 'delivery' })}
                    >
                        Delivery
                    </button>
                    <button
                        className={`switch-button ${section === 'mostrador' ? 'active' : ''}`}
                        onClick={() => this.setState({ section: 'mostrador' })}
                    >
                        Mostrador
                    </button>
                </div>
                <div className="main-container">
                    {/* Sección de crear pedidos */}
                    <div className="create-order">
                        <h2>Crear Pedido</h2>
                        <form onSubmit={this.handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="customerName">Nombre del Cliente:</label>
                                <input
                                    type="text"
                                    id="customerName"
                                    name="customerName"
                                    value={customerName}
                                    onChange={this.handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="customerPhone">Teléfono del Cliente:</label>
                                <input
                                    type="text"
                                    id="customerPhone"
                                    name="customerPhone"
                                    value={customerPhone}
                                    onChange={this.handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="searchQuery">Buscar Productos:</label>
                                <input
                                    type="text"
                                    id="searchQuery"
                                    name="searchQuery"
                                    value={searchQuery}
                                    onChange={this.handleSearchChange}
                                    onFocus={() => this.setState({ showSuggestions: true })}
                                    onBlur={() => setTimeout(() => this.setState({ showSuggestions: false }), 200)}
                                />
                                {showSuggestions && filteredProducts.length > 0 && (
                                    <ul className="suggestions-list">
                                        {filteredProducts.map((product) => (
                                            <li
                                                key={product._id}
                                                onClick={() => this.addToCart(product)}
                                                className="suggestion-item"
                                            >
                                                {product.title} - ${product.price}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="cart">
                                <h3>Carrito:</h3>
                                <ul>
                                    {cart.map((item) => (
                                        <li key={item._id}>
                                            {item.title} - ${item.price} x{' '}
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    this.updateCartQuantity(item._id, parseInt(e.target.value, 10))
                                                }
                                                min="1"
                                            />{' '}
                                            = ${item.price * item.quantity}
                                            <button type="button" onClick={() => this.removeFromCart(item._id)}>
                                                Quitar
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <p><strong>Total del Carrito:</strong> ${totalCart}</p>
                            </div>
                            <div className="form-group">
                                <label htmlFor="paymentMethod">Método de Pago:</label>
                                <select
                                    id="paymentMethod"
                                    name="selectedPaymentMethod"
                                    value={selectedPaymentMethod}
                                    onChange={this.handleInputChange}
                                    required
                                >
                                    <option value="">Seleccione un método de pago</option>
                                    {paymentMethods.map((method) => (
                                        <option key={method} value={method}>
                                            {method}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit">Crear Pedido</button>
                        </form>
                    </div>

                    {/* Sección de listar pedidos */}
                    <div className="orders-list">
                        <h2>Pedidos</h2>
                        <ul>
                            {orders.map((order) => (
                                <li key={order._id}>
                                    <p>Cliente: {order.buyer}</p>
                                    <p>Teléfono: {order.customerPhone || 'No disponible'}</p>
                                    <p>Sección: {order.section}</p>
                                    <p>Método de Pago: {order.payment}</p>
                                    <p>Total: ${order.total}</p>
                                    <p>Comidas:</p>
                                    <ul>
                                        {order.foods.map((foodItem) => (
                                            foodItem.food ? (
                                                <li key={foodItem.food._id}>
                                                    {foodItem.food.title} - ${foodItem.food.price} x {foodItem.quantity}
                                                </li>
                                            ) : (
                                                <li key={foodItem._id}>Datos del alimento no disponibles</li>
                                            )
                                        ))}
                                    </ul>
                                    <button onClick={() => this.startEditingOrder(order)}>Editar Pedido</button>
                                    <button onClick={() => this.deleteOrder(order._id)}>Eliminar Pedido</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                {editingOrder && (
                    <div className="edit-order-modal">
                        <h3>Editar Pedido</h3>
                        <label>Nombre del Cliente:</label>
                        <input
                            type="text"
                            value={editingOrder.buyer}
                            onChange={(e) =>
                                this.setState({ editingOrder: { ...editingOrder, buyer: e.target.value } })
                            }
                        />
                        <label>Teléfono del Cliente:</label>
                        <input
                            type="text"
                            value={editingOrder.customerPhone}
                            onChange={(e) =>
                                this.setState({ editingOrder: { ...editingOrder, customerPhone: e.target.value } })
                            }
                        />
                        <h4>Comidas:</h4>
                        <ul>
                            {editingOrder.foods.map((foodItem, index) => (
                                <li key={index}>
                                    <span>{foodItem.food.title}</span>
                                    <input
                                        type="number"
                                        value={foodItem.quantity}
                                        onChange={(e) => {
                                            const updatedFoods = [...editingOrder.foods];
                                            updatedFoods[index].quantity = parseInt(e.target.value, 10);
                                            this.setState({ editingOrder: { ...editingOrder, foods: updatedFoods } });
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            const updatedFoods = editingOrder.foods.filter((_, i) => i !== index);
                                            this.setState({ editingOrder: { ...editingOrder, foods: updatedFoods } });
                                        }}
                                    >
                                        Eliminar
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <h4>Agregar Comidas:</h4>
                        <input
                            type="text"
                            placeholder="Buscar comida"
                            value={this.state.searchQuery}
                            onChange={(e) => this.setState({ searchQuery: e.target.value })}
                        />
                        <ul className="suggestions-list">
                            {products
                                .filter((product) =>
                                    product.title.toLowerCase().includes(this.state.searchQuery.toLowerCase())
                                )
                                .map((product) => (
                                    <li
                                        key={product._id}
                                        onClick={() => {
                                            const updatedFoods = [
                                                ...editingOrder.foods,
                                                { food: product, quantity: 1 }
                                            ];
                                            this.setState({
                                                editingOrder: { ...editingOrder, foods: updatedFoods },
                                                searchQuery: ''
                                            });
                                        }}
                                    >
                                        {product.title} - ${product.price}
                                    </li>
                                ))}
                        </ul>
                        <button onClick={this.saveEditedOrder}>Guardar Cambios</button>
                        <button onClick={this.cancelEditingOrder}>Cancelar</button>
                    </div>
                )}
            </div>
        );
    }
}

export default Principal;