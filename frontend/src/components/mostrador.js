import React, { Component } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // Importar Link para navegación
import '../styles/mostrador.css'; // Archivo CSS específico para Mostrador

class Mostrador extends Component {
    constructor(props) {
        super(props);
        this.state = {
            customerName: '',
            orders: [],
            products: [],
            cart: [],
            searchQuery: '',
            selectedPaymentMethod: '',
            paymentMethods: ['Efectivo', 'Debito', 'Transferencia'],
            editingOrderId: null,
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
            this.setState({ orders: response.data.orders.filter((order) => order.section === 'mostrador') });
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    handleInputChange = (e) => {
        this.setState({ [e.target.name]: e.target.value });
    };

    handleSubmit = async (e) => {
        e.preventDefault();
        const { customerName, cart, selectedPaymentMethod, editingOrderId } = this.state;

        if (!customerName) {
            alert('Por favor, ingrese el nombre del cliente.');
            return;
        }

        if (!selectedPaymentMethod) {
            alert('Por favor, seleccione un método de pago.');
            return;
        }

        try {
            if (editingOrderId) {
                // Realizar un PUT para actualizar el pedido existente
                await axios.put(`/order/update/${editingOrderId}`, {
                    foods: cart.map((item) => ({
                        food: item._id,
                        quantity: item.quantity,
                    })),
                    payment: selectedPaymentMethod,
                    buyer: customerName,
                    section: 'mostrador',
                });

            } else {
                // Realizar un POST para crear un nuevo pedido
                await axios.post('/order/create', {
                    foods: cart.map((item) => ({
                        food: item._id,
                        quantity: item.quantity,
                    })),
                    payment: selectedPaymentMethod,
                    buyer: customerName,
                    section: 'mostrador',
                });

                alert('Pedido creado correctamente.');
            }

            await this.fetchOrders();
            this.setState({
                customerName: '',
                cart: [],
                selectedPaymentMethod: '',
                editingOrderId: null,
            });
        } catch (error) {
            console.error('Error al guardar el pedido:', error);
            alert('Hubo un error al guardar el pedido.');
        }
    };

    // Método para eliminar un producto del carrito
    removeFromCart = (productId) => {
        const updatedCart = this.state.cart.filter((item) => item._id !== productId);
        this.setState({ cart: updatedCart });
    };

    addToCart = (product) => {
        const existingProductIndex = this.state.cart.findIndex((item) => item._id === product._id);

        if (existingProductIndex !== -1) {
            // Si el producto ya está en el carrito, incrementa su cantidad
            const updatedCart = [...this.state.cart];
            updatedCart[existingProductIndex].quantity += 1;
            this.setState({ cart: updatedCart, searchQuery: '' }); // Limpia la barra de búsqueda
        } else {
            // Si el producto no está en el carrito, agrégalo con cantidad 1
            this.setState((prevState) => ({
                cart: [...prevState.cart, { ...product, quantity: 1 }],
                searchQuery: '', // Limpia la barra de búsqueda
            }));
        }
    };

    // Método para aumentar la cantidad de un producto en el carrito
    increaseQuantity = (productId) => {
        const updatedCart = this.state.cart.map((item) =>
            item._id === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
        this.setState({ cart: updatedCart });
    };

    // Método para disminuir la cantidad de un producto en el carrito
    decreaseQuantity = (productId) => {
        const updatedCart = this.state.cart
            .map((item) =>
                item._id === productId && item.quantity > 1
                    ? { ...item, quantity: item.quantity - 1 }
                    : item
            )
            .filter((item) => item.quantity > 0); // Elimina productos con cantidad 0
        this.setState({ cart: updatedCart });
    };

    render() {
        const { customerName, orders, products, cart, searchQuery, paymentMethods, selectedPaymentMethod, editingOrderId } = this.state;

        return (
            <div className="mostrador-container">
                {/* Botones para cambiar entre Mostrador y Delivery */}
                <div className="mostrador-button-container">
                    <Link to="/mostrador">
                        <button className="mostrador-switch-button active">Mostrador</button>
                    </Link>
                    <Link to="/delivery">
                        <button className="mostrador-switch-button">Delivery</button>
                    </Link>
                </div>

                <h2 className="mostrador-title">Mostrador</h2>

                {/* Botón Nuevo Pedido */}
                <div className="mostrador-new-order">
                    <button
                        className="mostrador-new-order-button"
                        onClick={() =>
                            this.setState({
                                customerName: '',
                                cart: [],
                                selectedPaymentMethod: '',
                                editingOrderId: null,
                            })
                        }
                    >
                        Nuevo Pedido +
                    </button>
                </div>

                <div className={`mostrador-content ${editingOrderId ? 'editing' : 'creating'}`}>
                    {/* Crear Pedido - Izquierda */}
                    <div className="mostrador-create-order">
                        <form onSubmit={this.handleSubmit}>
                            <div className="mostrador-form-group">
                                <label htmlFor="customerName">Nombre del Cliente:</label>
                                <input
                                    type="text"
                                    id="customerName"
                                    name="customerName"
                                    value={customerName}
                                    onChange={this.handleInputChange}
                                    required
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
                                    onChange={(e) => this.setState({ searchQuery: e.target.value })}
                                    className={editingOrderId ? 'editing-input' : ''}
                                />
                                {/* Sugerencias de productos */}
                                {searchQuery && (
                                    <ul className="mostrador-suggestions-list">
                                        {products
                                            .filter((product) =>
                                                product.title.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                            .map((product) => (
                                                <li
                                                    key={product._id}
                                                    onClick={() => this.addToCart(product)}
                                                >
                                                    {product.title} - ${product.price}
                                                </li>
                                            ))}
                                    </ul>
                                )}
                            </div>
                            <div className="mostrador-cart">
                                <h3>Carrito:</h3>
                                <ul>
                                    {cart.map((item) => (
                                        <li key={item._id}>
                                            {item.title} - ${item.price} x {item.quantity}
                                            <button
                                                type="button"
                                                className="mostrador-quantity-button"
                                                onClick={() => this.increaseQuantity(item._id)}
                                            >
                                                +
                                            </button>
                                            <button
                                                type="button"
                                                className="mostrador-quantity-button"
                                                onClick={() => this.decreaseQuantity(item._id)}
                                            >
                                                -
                                            </button>
                                            <button
                                                type="button"
                                                className="mostrador-remove-button"
                                                onClick={() => this.removeFromCart(item._id)}
                                            >
                                                Eliminar
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="mostrador-form-group">
                                <label htmlFor="paymentMethod">Método de Pago:</label>
                                <select
                                    id="paymentMethod"
                                    name="selectedPaymentMethod"
                                    value={selectedPaymentMethod}
                                    onChange={this.handleInputChange}
                                    required
                                    className={editingOrderId ? 'editing-input' : ''}
                                >
                                    <option value="">Seleccione un método de pago</option>
                                    {paymentMethods.map((method) => (
                                        <option key={method} value={method}>
                                            {method}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className={`mostrador-submit-button ${editingOrderId ? 'editing-button' : ''}`}>
                                {editingOrderId ? 'Guardar Cambios' : 'Crear Pedido'}
                            </button>
                        </form>
                    </div>

                    {/* Listado de Pedidos - Derecha */}
                    <div className="mostrador-orders-list">
                        <h3>Pedidos - Mostrador</h3>
                        <ul>
                            {orders.map((order) => (
                                <li
                                    key={order._id}
                                    className={`mostrador-order-item ${editingOrderId === order._id ? 'editing-order' : ''}`}
                                    onClick={() => {
                                        this.setState({
                                            customerName: order.buyer,
                                            cart: order.foods.map((foodItem) => ({
                                                _id: foodItem.food._id,
                                                title: foodItem.food.title,
                                                price: foodItem.food.price,
                                                quantity: foodItem.quantity,
                                            })),
                                            selectedPaymentMethod: order.payment,
                                            editingOrderId: order._id,
                                        });
                                    }}
                                >
                                    <p>Estado: {order.status}</p>
                                    <p>Cliente: {order.buyer}</p>
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

export default Mostrador;