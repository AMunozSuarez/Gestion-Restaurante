import React, { Component } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // Importar Link para navegación
import '../styles/delivery.css'; // Archivo CSS específico para Delivery

class Delivery extends Component {
    constructor(props) {
        super(props);
        this.state = {
            customerName: '',
            customerPhone: '',
            customerAddress: '',
            orders: [],
            products: [],
            cart: [],
            searchQuery: '',
            selectedPaymentMethod: '',
            paymentMethods: ['Efectivo', 'Debito', 'Transferencia'],
        };
    }

    componentDidMount() {
        this.fetchProducts();
        this.fetchOrders();
    }

    fetchProducts = async () => {
        try {
            const response = await axios.get('/food/getAll');
            this.setState({ products: response.data.foods });
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    fetchOrders = async () => {
        try {
            const response = await axios.get('/order/getAll');
            this.setState({ orders: response.data.orders.filter((order) => order.section === 'delivery') });
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    handleInputChange = (e) => {
        this.setState({ [e.target.name]: e.target.value });
    };

    handleSubmit = async (e) => {
        e.preventDefault();
        const { customerName, customerPhone, customerAddress, cart, selectedPaymentMethod } = this.state;

        if (!customerName || !customerPhone || !customerAddress) {
            alert('Por favor, complete todos los campos.');
            return;
        }

        if (!selectedPaymentMethod) {
            alert('Por favor, seleccione un método de pago.');
            return;
        }

        try {
            await axios.post('/order/create', {
                foods: cart.map((item) => ({
                    food: item._id,
                    quantity: item.quantity,
                })),
                payment: selectedPaymentMethod,
                buyer: customerName,
                customerPhone,
                customerAddress,
                section: 'delivery',
            });

            await this.fetchOrders();
            this.setState({
                customerName: '',
                customerPhone: '',
                customerAddress: '',
                cart: [],
                selectedPaymentMethod: '',
            });
        } catch (error) {
            console.error('Error creating order', error);
        }
    };

    render() {
        const { customerName, customerPhone, customerAddress, orders, products, cart, searchQuery, paymentMethods, selectedPaymentMethod } = this.state;

        return (
            <div className="delivery-container">
                {/* Botones para cambiar entre Mostrador y Delivery */}
                <div className="delivery-button-container">
                    <Link to="/mostrador">
                        <button className="delivery-switch-button">Mostrador</button>
                    </Link>
                    <Link to="/delivery">
                        <button className="delivery-switch-button active">Delivery</button>
                    </Link>
                </div>

                <h2 className="delivery-title">Delivery</h2>
                <div className="delivery-content">
                    {/* Crear Pedido - Izquierda */}
                    <div className="delivery-create-order">
                        <form onSubmit={this.handleSubmit}>
                            <div className="delivery-form-group">
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
                            <div className="delivery-form-group">
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
                            <div className="delivery-form-group">
                                <label htmlFor="customerAddress">Dirección del Cliente:</label>
                                <input
                                    type="text"
                                    id="customerAddress"
                                    name="customerAddress"
                                    value={customerAddress}
                                    onChange={this.handleInputChange}
                                    required
                                />
                            </div>
                            <div className="delivery-form-group">
                                <label htmlFor="searchQuery">Buscar Productos:</label>
                                <input
                                    type="text"
                                    id="searchQuery"
                                    name="searchQuery"
                                    value={searchQuery}
                                    onChange={(e) => this.setState({ searchQuery: e.target.value })}
                                />
                                {/* Sugerencias de productos */}
                                {searchQuery && (
                                    <ul className="delivery-suggestions-list">
                                        {products
                                            .filter((product) =>
                                                product.title.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                            .map((product) => (
                                                <li
                                                    key={product._id}
                                                    onClick={() => {
                                                        const updatedCart = [...cart, { ...product, quantity: 1 }];
                                                        this.setState({ cart: updatedCart, searchQuery: '' });
                                                    }}
                                                >
                                                    {product.title} - ${product.price}
                                                </li>
                                            ))}
                                    </ul>
                                )}
                            </div>
                            <div className="delivery-cart">
                                <h3>Carrito:</h3>
                                <ul>
                                    {cart.map((item) => (
                                        <li key={item._id}>
                                            {item.title} - ${item.price} x {item.quantity}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="delivery-form-group">
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
                            <button type="submit" className="delivery-submit-button">Crear Pedido</button>
                        </form>
                    </div>

                    {/* Listado de Pedidos - Derecha */}
                    <div className="delivery-orders-list">
                        <h3>Pedidos - Delivery</h3>
                        <ul>
                            {orders.map((order) => (
                                <li key={order._id}>
                                    <p>Cliente: {order.buyer}</p>
                                    <p>Teléfono: {order.customerPhone}</p>
                                    <p>Dirección: {order.customerAddress}</p>
                                    <p>Total: ${order.total}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }
}

export default Delivery;