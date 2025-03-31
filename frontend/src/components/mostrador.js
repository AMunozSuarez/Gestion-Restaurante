import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/mostrador.css';
import OrderForm from './subcomponents/OrderForm';
import Cart from './subcomponents/Cart';
import Suggestions from './subcomponents/Suggestions';
import OrderList from './subcomponents/OrderList';
import CompletedOrdersList from './subcomponents/CompletedOrdersList';

const Mostrador = () => {
    const [customerName, setCustomerName] = useState('');
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [categories, setCategories] = useState([]); // Estado para las categorías
    const [editingCart, setEditingCart] = useState([]); // Carrito para el pedido en edición
    const searchRef = useRef(null);

    const navigate = useNavigate();
    const { orderNumber } = useParams();

    useEffect(() => {
        fetchProducts();
        fetchOrders();
    }, []);

    useEffect(() => {
        if (orderNumber) {
            loadOrderByNumber(orderNumber); // Carga los datos del pedido si hay un orderNumber
        } else {
            // Limpia los estados para mostrar el formulario vacío
            setCustomerName('');
            setCart([]);
            setSelectedPaymentMethod('');
            setEditingOrderId(null);
        }
    }, [orderNumber]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await axios.get('/category/getAll'); // Ruta correcta
                setCategories(response.data.categories); // Asegúrate de que sea un array
            } catch (error) {
                console.error('Error al cargar las categorías:', error);
            }
        };

        fetchCategories();
    }, []);

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
                setCustomerName(order.buyer || ''); // Configura el nombre del cliente
                setEditingCart(
                    order.foods.map((foodItem) => ({
                        _id: foodItem.food._id,
                        title: foodItem.food.title,
                        price: foodItem.food.price,
                        quantity: foodItem.quantity, // Configura la cantidad de cada producto
                    }))
                );
                setSelectedPaymentMethod(order.payment || ''); // Configura el método de pago
                setEditingOrderId(order._id); // Activa el modo de edición
            } else {
                alert('Pedido no encontrado.');
            }
        } catch (error) {
            console.error('Error al cargar el pedido:', error);
            navigate('/mostrador'); // Redirige a la página principal en caso de error
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
                await axios.put(`/order/update/${editingOrderId}`, {
                    foods: cart.map((item) => ({
                        food: item._id,
                        quantity: item.quantity,
                    })),
                    payment: selectedPaymentMethod,
                    buyer: customerName || '',
                    section: 'mostrador',
                });
            } else {
                await axios.post('/order/create', {
                    foods: cart.map((item) => ({
                        food: item._id,
                        quantity: item.quantity,
                    })),
                    payment: selectedPaymentMethod,
                    buyer: customerName || '',
                    section: 'mostrador',
                });
            }

            await fetchOrders();
            setCustomerName('');
            setCart([]);
            setSelectedPaymentMethod('');
            setEditingOrderId(null);
            navigate('/mostrador');
        } catch (error) {
            console.error('Error al guardar el pedido:', error);
            navigate('/mostrador');
        }
    };

    const calculateTotal = () => {
        const currentCart = editingOrderId ? editingCart : cart; // Usa el carrito correcto
        return currentCart.reduce((total, item) => total + item.price * item.quantity, 0);
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            await axios.put(`/order/update/${orderId}`, {
                status: newStatus,
                foods: cart.map((item) => ({
                    food: item._id,
                    quantity: item.quantity,
                })), // Enviar el carrito actual o un arreglo vacío con el formato correcto// Enviar el carrito actual o un arreglo vacío con el formato correcto

            });

            // Actualizar la lista de pedidos localmente
            setOrders((prevOrders) =>
                prevOrders.map((order) =>
                    order._id === orderId ? { ...order, status: newStatus } : order
                )
            );

            navigate('/mostrador'); // Redirigir a /mostrador después de actualizar el estado
            fetchOrders(); // Actualiza la lista de pedidos
        } catch (error) {
            console.error('Error al actualizar el estado del pedido:', error);
        }
    };
    
    const preparationOrders = orders.filter((order) => order.status === 'Preparacion');
    const completedOrCanceledOrders = orders.filter((order) =>
        order.status === 'Completado' || order.status === 'Cancelado'
    );

    return (
        <div className="mostrador-container">
            <div className="mostrador-button-container">
                <Link to="/mostrador">
                    <button className="mostrador-switch-button active">Mostrador</button>
                </Link>
                <Link to="/delivery">
                    <button className="mostrador-switch-button">Delivery</button>
                </Link>
            </div>

            <h2 className="mostrador-title">Mostrador</h2>

            <div className="mostrador-new-order">
                <button
                    className="mostrador-new-order-button"
                    onClick={() => {
                        setCustomerName('');
                        setCart([]);
                        setEditingCart([]); // Limpia el carrito de edición
                        setSelectedPaymentMethod('');
                        setEditingOrderId(null);
                        navigate('/mostrador'); // Redirige a la ruta base
                    }}
                >
                    Crear Pedido +
                </button>
            </div>

            <div className={`mostrador-content ${editingOrderId ? 'editing' : 'creating'}`}>
                <OrderForm
                    customerName={customerName}
                    setCustomerName={setCustomerName}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    isSearchFocused={isSearchFocused}
                    setIsSearchFocused={setIsSearchFocused}
                    selectedPaymentMethod={selectedPaymentMethod}
                    setSelectedPaymentMethod={setSelectedPaymentMethod}
                    handleSubmit={handleSubmit}
                    editingOrderId={editingOrderId}
                    updateOrderStatus={updateOrderStatus}
                    products={products || []}
                    categories={categories || []}
                    cart={editingOrderId ? editingCart : cart} // Usa el carrito correcto
                    setCart={editingOrderId ? setEditingCart : setCart} // Usa el setter correcto
                    calculateTotal={calculateTotal}
                >
                    {isSearchFocused && searchQuery && (
                        <Suggestions
                            products={products}
                            searchQuery={searchQuery}
                            cart={editingOrderId ? editingCart : cart} // Usa el carrito correcto
                            setCart={editingOrderId ? setEditingCart : setCart} // Usa el setter correcto
                            setSearchQuery={setSearchQuery}
                            setIsSearchFocused={setIsSearchFocused}
                        />
                    )}
                    <Cart
                        cart={editingOrderId ? editingCart : cart} // Usa el carrito correcto
                        setCart={editingOrderId ? setEditingCart : setCart} // Usa el setter correcto
                        calculateTotal={calculateTotal}
                    />
                </OrderForm>

                <OrderList
                    orders={preparationOrders}
                    setEditingOrderId={setEditingOrderId}
                    navigate={navigate}
                    updateOrderStatus={updateOrderStatus}
                    loadOrderByNumber={loadOrderByNumber} // Pasa la función como prop
                    editingOrderId={editingOrderId} // Pasa el ID del pedido en edición
                />
            </div>

            {/* Lista de pedidos completados/cancelados al final */}
            <CompletedOrdersList orders={completedOrCanceledOrders} />
        </div>
    );
};

export default Mostrador;