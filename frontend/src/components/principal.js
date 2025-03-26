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
            orderDetails: '',
            orders: [],
            products: [], // Lista de productos obtenidos de la base de datos
            cart: [], // Productos seleccionados
            searchQuery: '', // Texto de búsqueda
            paymentMethods: [], // Métodos de pago obtenidos de la base de datos
            selectedPaymentMethod: '' // Método de pago seleccionado
        };
    }

    componentDidMount() {
        // Obtener productos y métodos de pago al cargar el componente
        this.fetchProducts();
        this.fetchPaymentMethods();
    }

    fetchProducts = async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/food/getAll');
            this.setState({ products: response.data.foods });
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    fetchPaymentMethods = async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/paymentMethods'); // Ruta para obtener métodos de pago
            this.setState({ paymentMethods: response.data.methods });
        } catch (error) {
            console.error('Error fetching payment methods:', error);
        }
    };

    handleInputChange = (e) => {
        this.setState({ [e.target.name]: e.target.value });
    };

    handleSearchChange = (e) => {
        this.setState({ searchQuery: e.target.value });
    };

    addToCart = (product) => {
        this.setState((prevState) => ({
            cart: [...prevState.cart, product],
            searchQuery: '' // Limpia el campo de búsqueda después de agregar
        }));
    };

    removeFromCart = (productId) => {
        this.setState((prevState) => ({
            cart: prevState.cart.filter((item) => item._id !== productId)
        }));
    };

    handleSubmit = async (e) => {
        e.preventDefault();
        const { customerName, customerPhone, orderDetails, section, cart, selectedPaymentMethod } = this.state;

        try {
            const token = localStorage.getItem('token'); // Obtén el token del almacenamiento local
            const response = await axios.post(
                'http://localhost:3001/api/food/placeorder',
                {
                    cart: cart.map((item) => ({ _id: item._id, price: item.price })), // Solo envía los IDs y precios
                    payment: selectedPaymentMethod,
                    buyer: 'userId123', // ID del comprador (puedes obtenerlo del token o del estado)
                    section,
                    customerName,
                    customerPhone,
                    orderDetails
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}` // Agrega el token al encabezado
                    }
                }
            );

            this.setState((prevState) => ({
                orders: [...prevState.orders, response.data.newOrder],
                customerName: '',
                customerPhone: '',
                orderDetails: '',
                cart: [],
                selectedPaymentMethod: ''
            }));
        } catch (error) {
            console.error('Error creating order', error);
        }
    };

    render() {
        const { section, customerName, customerPhone, orderDetails, orders, products, cart, searchQuery, paymentMethods, selectedPaymentMethod } = this.state;

        // Filtrar productos según el texto de búsqueda
        // Filtrar productos según el texto de búsqueda
        const filteredProducts = products.filter((product) =>
            product.name && product.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <div className="principal-container">
                <div className="button-container">
                    <button
                        className={`switch-button ${section === 'delivery' ? 'active' : ''}`}
                        onClick={() => this.switchSection('delivery')}
                    >
                        Delivery
                    </button>
                    <button
                        className={`switch-button ${section === 'mostrador' ? 'active' : ''}`}
                        onClick={() => this.switchSection('mostrador')}
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
                            <label htmlFor="orderDetails">Detalles del Pedido:</label>
                            <textarea
                                id="orderDetails"
                                name="orderDetails"
                                value={orderDetails}
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
                            />
                            <ul className="product-suggestions">
                                {filteredProducts.map((product) => (
                                    <li key={product._id} onClick={() => this.addToCart(product)}>
                                        {product.name} - ${product.price}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="cart">
                            <h3>Carrito:</h3>
                            <ul>
                                {cart.map((item) => (
                                    <li key={item._id}>
                                        {item.name} - ${item.price}{' '}
                                        <button type="button" onClick={() => this.removeFromCart(item._id)}>
                                            Quitar
                                        </button>
                                    </li>
                                ))}
                            </ul>
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
                                    <option key={method._id} value={method.name}>
                                        {method.name}
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
                                <p>Cliente: {order.customerName}</p>
                                <p>Teléfono: {order.customerPhone}</p>
                                <p>Detalles: {order.orderDetails}</p>
                                <p>Sección: {order.section}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }
}

export default Principal;