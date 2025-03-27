import React, { Component } from 'react';
import axios from 'axios';
import '../styles/principal.css';

class Principal extends Component {
    constructor(props) {
        super(props);
        this.state = {
            section: 'delivery',
            customerName: '',
            customerPhone: '',
            orders: [], // Lista de pedidos
            products: [], // Lista de productos obtenidos de la base de datos
            cart: [], // Productos seleccionados con cantidades
            searchQuery: '', // Texto de búsqueda
            selectedPaymentMethod: '', // Método de pago seleccionado
            paymentMethods: ['cash', 'debit', 'transfer'], // Métodos de pago disponibles
            showSuggestions: false // Mostrar sugerencias
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
            const response = await axios.post('/order/create', {
                foods: cart.map((item) => ({
                    food: item._id, // ID del alimento
                    quantity: item.quantity // Cantidad del alimento
                })),
                payment: selectedPaymentMethod,
                buyer: customerName,
                customerPhone,
                section
            });

            // Actualizar la lista de pedidos y limpiar el formulario
            this.setState((prevState) => ({
                orders: [...prevState.orders, response.data.order],
                customerName: '',
                customerPhone: '',
                cart: [],
                selectedPaymentMethod: ''
            }));
        } catch (error) {
            console.error('Error creating order', error);
        }
    };

    render() {
        const { section, customerName, customerPhone, orders, products, cart, searchQuery, paymentMethods, selectedPaymentMethod, showSuggestions } = this.state;

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
                <div className="section-container">
                    <h2>Sección de {section === 'delivery' ? 'Delivery' : 'Mostrador'}</h2>
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
                                onFocus={() => this.setState({ showSuggestions: true })} // Mostrar sugerencias al enfocar
                                onBlur={() => setTimeout(() => this.setState({ showSuggestions: false }), 200)} // Ocultar sugerencias al desenfocar
                            />
                            {showSuggestions && filteredProducts.length > 0 && (
                                <ul className="suggestions-list">
                                    {filteredProducts.map((product) => (
                                        <li
                                            key={product._id}
                                            onClick={() => this.addToCart(product)} // Agregar al carrito al hacer clic
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
                <div className="orders-list">
                    <h2>Pedidos</h2>
                    <ul>
                        {orders.map((order) => (
                            <li key={order._id}>
                                <p>Cliente: {order.buyer}</p>
                                <p>Teléfono: {order.customerPhone}</p>
                                <p>Sección: {order.section}</p>
                                <p>Método de Pago: {order.payment}</p>
                                <p>Total: ${order.total}</p>
                                <p>Comidas:</p>
                                <ul>
                                    {order.foods.map((food) => (
                                        <li key={food._id}>
                                            {food.title} - ${food.price} x {food.quantity}
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }
}

export default Principal;