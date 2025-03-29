import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/mostrador.css';

const Mostrador = () => {
    const [customerName, setCustomerName] = useState('');
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [editingOrderId, setEditingOrderId] = useState(null);
    const paymentMethods = ['Efectivo', 'Debito', 'Transferencia'];

    const navigate = useNavigate();
    const { orderNumber } = useParams();

    useEffect(() => {
        fetchProducts();
        fetchOrders();

        if (orderNumber) {
            loadOrderByNumber(orderNumber);
        }
    }, [orderNumber]);

    const fetchProducts = async () => {
        try {
            const response = await axios.get('/food/getAll');
            setProducts(response.data.foods);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchOrders = async () => {
        try {
            const response = await axios.get('/order/getAll');
            setOrders(response.data.orders.filter((order) => order.section === 'mostrador'));
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    const loadOrderByNumber = async (orderNumber) => {
        try {
            const response = await axios.get(`/order/getByNumber/${orderNumber}`);
            const order = response.data.order;

            if (order) {
                setCustomerName(order.buyer);
                setCart(order.foods.map((foodItem) => ({
                    _id: foodItem.food._id,
                    title: foodItem.food.title,
                    price: foodItem.food.price,
                    quantity: foodItem.quantity,
                })));
                setSelectedPaymentMethod(order.payment);
                setEditingOrderId(order._id);
            } else {
                alert('Pedido no encontrado.');
            }
        } catch (error) {
            console.error('Error al cargar el pedido:', error);
            navigate('/mostrador');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

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
                    buyer: customerName || '', // Si no hay nombre, enviar una cadena vacía
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
                    buyer: customerName || '', // Si no hay nombre, enviar una cadena vacía
                    section: 'mostrador',
                });

            }

            // Actualizar la lista de pedidos y limpiar el formulario
            await fetchOrders();
            setCustomerName('');
            setCart([]);
            setSelectedPaymentMethod('');
            setEditingOrderId(null);

            // Redirigir a /mostrador
            navigate('/mostrador');
        } catch (error) {
            console.error('Error al guardar el pedido:', error);

            // Redirigir a /mostrador en caso de error
            navigate('/mostrador');
        }
    };

    const preparationOrders = orders.filter((order) => order.status === 'Preparacion');
    const completedOrCanceledOrders = orders.filter((order) => 
        order.status === 'Completado' || order.status === 'Cancelado'
    );

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
                    onClick={() => {
                        setCustomerName('');
                        setCart([]);
                        setSelectedPaymentMethod('');
                        setEditingOrderId(null);
                        navigate('/mostrador');
                    }}
                >
                    Crear Pedido +
                </button>
            </div>

            <div className={`mostrador-content ${editingOrderId ? 'editing' : 'creating'}`}>
                {/* Crear Pedido - Izquierda */}
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
                                                onClick={() => {
                                                    const existingProductIndex = cart.findIndex((item) => item._id === product._id);
                                                    if (existingProductIndex !== -1) {
                                                        const updatedCart = [...cart];
                                                        updatedCart[existingProductIndex].quantity += 1;
                                                        setCart(updatedCart);
                                                    } else {
                                                        setCart([...cart, { ...product, quantity: 1 }]);
                                                    }
                                                    setSearchQuery('');
                                                }}
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
                                            onClick={() => {
                                                const updatedCart = cart.map((cartItem) =>
                                                    cartItem._id === item._id
                                                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                                                        : cartItem
                                                );
                                                setCart(updatedCart);
                                            }}
                                        >
                                            +
                                        </button>
                                        <button
                                            type="button"
                                            className="mostrador-quantity-button"
                                            onClick={() => {
                                                const updatedCart = cart
                                                    .map((cartItem) =>
                                                        cartItem._id === item._id && cartItem.quantity > 1
                                                            ? { ...cartItem, quantity: cartItem.quantity - 1 }
                                                            : cartItem
                                                    )
                                                    .filter((cartItem) => cartItem.quantity > 0);
                                                setCart(updatedCart);
                                            }}
                                        >
                                            -
                                        </button>
                                        <button
                                            type="button"
                                            className="mostrador-remove-button"
                                            onClick={() => {
                                                const updatedCart = cart.filter((cartItem) => cartItem._id !== item._id);
                                                setCart(updatedCart);
                                            }}
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
                                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
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
                    <h3>Pedidos en Preparación</h3>
                    <div className="mostrador-order-header">
                        <p>#</p>
                        <p>Cliente</p>
                        <p>Estado</p>
                        <p>Total</p>
                    </div>
                    <ul>
                        {preparationOrders.map((order) => (
                            <li
                                key={order._id}
                                className={`mostrador-order-item ${editingOrderId === order._id ? 'editing-order' : ''}`}
                                onClick={() => navigate(`/mostrador/${order.orderNumber}`)}
                            >
                                <p><strong>#{order.orderNumber}</strong></p>
                                <p>{order.buyer || ''}</p>
                                <p>{order.status}</p>
                                <p>${order.total}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Pedidos Completados/Cancelados */}
            <div className="mostrador-completed-orders-list">
                <h3>Pedidos Completados/Cancelados</h3>
                <div className="mostrador-order-header">
                    <p>#</p>
                    <p>Cliente</p>
                    <p>Estado</p>
                    <p>Total</p>
                </div>
                <ul>
                    {completedOrCanceledOrders.map((order) => (
                        <li
                            key={order._id}
                            className={`mostrador-completed-order-item ${order.status}`}
                        >
                            <p><strong>#{order.orderNumber}</strong></p>
                            <p>{order.buyer || 'N/A'}</p>
                            <p>{order.status}</p>
                            <p>${order.total}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Mostrador;