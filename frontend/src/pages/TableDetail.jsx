import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTable, useTables } from '../hooks/useTables';
import { useOrders } from '../hooks/useOrders';
import { useProducts, useProductSearch } from '../hooks/useProducts';
import { useCashRegister } from '../hooks/useCashRegister';
import { 
    ArrowLeftIcon, 
    PlusIcon, 
    MinusIcon, 
    TrashIcon, 
    PrinterIcon,
    ChatBubbleLeftIcon,
    XMarkIcon,
    UserGroupIcon,
    ClockIcon,
    CurrencyDollarIcon,
    CheckIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Button } from '../components/ui';
import CashRegisterAlert from '../components/common/CashRegisterAlert';
import { formatChileanCurrency } from '../utils/dateUtils';
import printingService from '../services/printingService';

const TableDetail = () => {
    const { tableId } = useParams();
    const navigate = useNavigate();
    const { table, isLoading: tableLoading, refetch: refetchTable } = useTable(tableId);
    const { closeTable, assignOrderToTable } = useTables();
    const { isOpen: isCashOpen, isLoading: cashLoading } = useCashRegister();
    const { products } = useProducts({ available: true });
    const { searchResults, searchProducts } = useProductSearch();
    const { createOrder, updateOrder } = useOrders({ section: 'mesas' });

    // Estados
    const [showCashAlert, setShowCashAlert] = useState(false);
    const [notification, setNotification] = useState(null);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [comments, setComments] = useState('');
    const [commentingProduct, setCommentingProduct] = useState(null);
    const [productComment, setProductComment] = useState('');
    const [addedProductNotification, setAddedProductNotification] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState([{ method: '', amount: 0 }]);
    const [suggestedTip, setSuggestedTip] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    const productCommentInputRef = useRef(null);

    // Función para mostrar notificación
    const showNotification = (message, type = 'success', duration = 3000) => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), duration);
    };

    // Cargar pedido actual de la mesa si existe
    useEffect(() => {
        if (table?.currentOrder && table.currentOrder.foods) {
            const orderProducts = table.currentOrder.foods.map(food => ({
                id: food.food?._id || food.food,
                name: food.food?.title || 'Producto',
                price: food.food?.price || 0,
                quantity: food.quantity || 1,
                comments: food.comment || '',
                category: food.food?.category
            }));
            setCart(orderProducts);
            setComments(table.currentOrder.comment || '');
        }
    }, [table]);

    // Verificar caja - solo cuando termine de cargar
    useEffect(() => {
        if (!cashLoading && !isCashOpen) {
            setShowCashAlert(true);
        }
    }, [isCashOpen, cashLoading]);

    // Focus en textarea de comentarios
    useEffect(() => {
        if (commentingProduct && productCommentInputRef.current) {
            productCommentInputRef.current.focus();
        }
    }, [commentingProduct]);

    // Funciones del carrito
    const addToCart = (product) => {
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            updateQuantity(product.id, existingItem.quantity + 1);
        } else {
            setCart(prev => [...prev, { ...product, quantity: 1, comments: '' }]);
            setAddedProductNotification(`${product.name} agregado`);
            setTimeout(() => setAddedProductNotification(null), 2000);
        }
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId, newQuantity) => {
        if (newQuantity <= 0) {
            removeFromCart(productId);
            return;
        }
        setCart(prev =>
            prev.map(item =>
                item.id === productId ? { ...item, quantity: newQuantity } : item
            )
        );
    };

    const addCommentToProduct = (productId, comment) => {
        setCart(prev =>
            prev.map(item =>
                item.id === productId ? { ...item, comments: comment } : item
            )
        );
    };

    const openCommentModal = (product) => {
        setCommentingProduct(product);
        setProductComment(product.comments || '');
    };

    const saveComment = () => {
        if (commentingProduct) {
            addCommentToProduct(commentingProduct.id, productComment);
            setCommentingProduct(null);
            setProductComment('');
        }
    };

    const calculateTotal = () => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    const calculateTip = (percentage) => {
        return Math.round(calculateTotal() * percentage);
    };

    // Búsqueda de productos
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (value.trim()) {
            searchProducts(value);
        }
    };

    // Crear/actualizar orden (comanda de cocina)
    const handleSaveOrder = async () => {
        if (!isCashOpen) {
            setShowCashAlert(true);
            return;
        }

        if (cart.length === 0) {
            showNotification('Agrega productos al carrito', 'warning');
            return;
        }

        try {
            setIsProcessing(true);
            
            const orderData = {
                foods: cart.map(item => ({
                    food: item.id,
                    quantity: item.quantity,
                    comment: item.comments || ''
                })),
                payment: 'Pendiente',
                paymentMethods: [],
                section: 'mesas',
                status: 'Preparacion',
                comment: comments,
                tableNumber: table.tableNumber
            };

            let response;
            if (table.currentOrder) {
                // Actualizar orden existente
                response = await updateOrder(table.currentOrder._id, orderData);
            } else {
                // Crear nueva orden
                response = await createOrder(orderData);
                
                // Asignar la nueva orden a la mesa
                if (response.success && response.order) {
                    await assignOrderToTable(tableId, response.order._id);
                }
            }

            if (response.success) {
                // Imprimir comanda de cocina
                if (response.order) {
                    await printingService.printKitchenOrder(response.order);
                }
                
                setAddedProductNotification('Comanda enviada a cocina');
                setTimeout(() => setAddedProductNotification(null), 3000);
                
                // Recargar datos de la mesa para obtener la orden actualizada
                await refetchTable();
            }
        } catch (error) {
            showNotification('Error al guardar orden: ' + error.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Abrir modal de pago o cerrar mesa vacía
    const handleOpenPayment = async () => {
        // Si la mesa está vacía, cerrar directamente sin pago
        if (cart.length === 0) {
            try {
                setIsProcessing(true);
                await closeTable(tableId);
                showNotification('Mesa cerrada exitosamente', 'success', 2000);
                setTimeout(() => {
                    navigate('/mesas');
                }, 500);
            } catch (error) {
                showNotification('Error al cerrar mesa: ' + error.message, 'error');
            } finally {
                setIsProcessing(false);
            }
            return;
        }

        const total = calculateTotal();
        const tip = calculateTip(0.1); // Calcular propina del 10%
        setPaymentMethods([{ method: '', amount: total + tip }]); // Incluir propina en el monto por defecto
        setSuggestedTip(tip);
        setShowPaymentModal(true);
    };

    // Métodos de pago
    const addPaymentMethod = () => {
        setPaymentMethods(prev => [...prev, { method: '', amount: 0 }]);
    };

    const removePaymentMethod = (index) => {
        setPaymentMethods(prev => prev.filter((_, i) => i !== index));
    };

    const updatePaymentMethod = (index, field, value) => {
        const processedValue = field === 'amount' ? parsePaymentInput(value) : value;
        setPaymentMethods(prev =>
            prev.map((payment, i) =>
                i === index ? { ...payment, [field]: processedValue } : payment
            )
        );
    };

    const getTotalPaymentAmount = () => {
        return paymentMethods.reduce((total, payment) => 
            total + (parseFloat(payment.amount) || 0), 0
        );
    };

    const formatPaymentInput = (value) => {
        if (!value || value === 0) return '';
        return Math.round(value).toLocaleString('es-CL');
    };

    const parsePaymentInput = (value) => {
        if (!value) return 0;
        const cleanValue = value.toString().replace(/[^\d]/g, '');
        return parseInt(cleanValue) || 0;
    };

    // Cerrar mesa y completar pago
    const handleCloseTable = async () => {
        if (!isCashOpen) {
            setShowCashAlert(true);
            return;
        }

        const validPayments = paymentMethods.filter(p => 
            p.method && p.method.trim() !== '' && p.method !== 'Pendiente'
        );

        if (validPayments.length === 0) {
            showNotification('Selecciona al menos un método de pago', 'warning');
            return;
        }

        const totalPaymentAmount = getTotalPaymentAmount();
        const orderTotal = calculateTotal();

        if (totalPaymentAmount < orderTotal) {
            showNotification(`Falta pagar: ${formatChileanCurrency(orderTotal - totalPaymentAmount)}`, 'warning');
            return;
        }

        try {
            setIsProcessing(true);

            // Actualizar orden como completada
            const orderData = {
                foods: cart.map(item => ({
                    food: item.id,
                    quantity: item.quantity,
                    comment: item.comments || ''
                })),
                payment: validPayments.length === 1 ? validPayments[0].method : 'Múltiple',
                paymentMethods: validPayments,
                section: 'mesas',
                status: 'Completado',
                comment: comments,
                tableNumber: table.tableNumber
            };

            const response = await updateOrder(table.currentOrder._id, orderData);

            if (response.success) {
                // Imprimir ticket de cliente
                try {
                    await printingService.printCustomerTicket({
                        ...response.order,
                        suggestedTip,
                        tableNumber: table.tableNumber
                    });
                    showNotification('Mesa cerrada exitosamente', 2000);
                } catch (printError) {
                    console.error('Error al imprimir ticket:', printError);
                    showNotification('Mesa cerrada pero falló la impresión del ticket', 2000);
                }

                // Cerrar mesa usando el hook
                await closeTable(tableId);

                setTimeout(() => {
                    navigate('/mesas');
                }, 500);
            }
        } catch (error) {
            showNotification('Error al cerrar mesa: ' + error.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Calcular tiempo desde apertura
    const getTableDuration = () => {
        if (!table?.openedAt) return '';
        const now = new Date();
        const opened = new Date(table.openedAt);
        const diffMs = now - opened;
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    if (tableLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                    <p className="text-teal-700">Cargando mesa...</p>
                </div>
            </div>
        );
    }

    if (!table) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-700 mb-4">Mesa no encontrada</p>
                    <Button onClick={() => navigate('/mesas')} className="bg-teal-600 hover:bg-teal-700">
                        Volver a Mesas
                    </Button>
                </div>
            </div>
        );
    }

    const displayProducts = searchTerm.trim() ? searchResults : products;

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
            {showCashAlert && <CashRegisterAlert isOpen={!isCashOpen} onClose={() => setShowCashAlert(false)} />}

            {/* Notificación toast */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg animate-fade-in ${
                    notification.type === 'error' ? 'bg-red-600' : 
                    notification.type === 'warning' ? 'bg-orange-500' : 
                    'bg-teal-600'
                } text-white`}>
                    <div className="flex items-center gap-2">
                        {notification.type === 'error' ? (
                            <XMarkIcon className="w-5 h-5" />
                        ) : notification.type === 'warning' ? (
                            <ExclamationTriangleIcon className="w-5 h-5" />
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        {notification.message}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/mesas')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-teal-900">
                                    Mesa {table.tableNumber}
                                </h1>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <UserGroupIcon className="w-4 h-4" />
                                        <span>{table.currentGuests || 0} / {table.capacity}</span>
                                    </div>
                                    {table.openedAt && (
                                        <div className="flex items-center gap-1">
                                            <ClockIcon className="w-4 h-4" />
                                            <span>{getTableDuration()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleSaveOrder}
                                disabled={cart.length === 0 || isProcessing}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <PrinterIcon className="w-5 h-5 mr-2" />
                                Enviar a Cocina
                            </Button>
                            <Button
                                onClick={handleOpenPayment}
                                disabled={isProcessing}
                                className="bg-teal-600 hover:bg-teal-700"
                            >
                                <CurrencyDollarIcon className="w-5 h-5 mr-2" />
                                {cart.length === 0 ? 'Cerrar Mesa' : 'Cobrar y Cerrar'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notificación */}
            {addedProductNotification && (
                <div className="fixed top-4 right-4 bg-teal-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
                    {addedProductNotification}
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Productos */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Productos</h2>
                            
                            {/* Búsqueda */}
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                placeholder="Buscar productos..."
                                className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            />

                            {/* Lista de productos */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
                                {displayProducts.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="p-4 border border-gray-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all text-left"
                                    >
                                        <div className="font-medium text-gray-900 text-sm mb-1">
                                            {product.name}
                                        </div>
                                        <div className="text-teal-600 font-semibold">
                                            {formatChileanCurrency(product.price)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Carrito */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pedido</h2>

                            {cart.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">
                                    Agrega productos al pedido
                                </p>
                            ) : (
                                <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
                                    {cart.map(item => (
                                        <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm">{item.name}</div>
                                                    <div className="text-teal-600 text-sm">
                                                        {formatChileanCurrency(item.price)}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="p-1 hover:bg-red-100 rounded"
                                                >
                                                    <TrashIcon className="w-4 h-4 text-red-600" />
                                                </button>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="p-1 bg-gray-100 hover:bg-gray-200 rounded"
                                                >
                                                    <MinusIcon className="w-4 h-4" />
                                                </button>
                                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="p-1 bg-gray-100 hover:bg-gray-200 rounded"
                                                >
                                                    <PlusIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openCommentModal(item)}
                                                    className="ml-auto p-1 hover:bg-gray-100 rounded"
                                                >
                                                    <ChatBubbleLeftIcon className={`w-4 h-4 ${item.comments ? 'text-teal-600' : 'text-gray-400'}`} />
                                                </button>
                                            </div>

                                            {item.comments && (
                                                <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                                    {item.comments}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Total */}
                            <div className="border-t border-gray-200 pt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-900">Total:</span>
                                    <span className="text-xl font-bold text-teal-600">
                                        {formatChileanCurrency(calculateTotal())}
                                    </span>
                                </div>

                                {/* Comentarios generales */}
                                <textarea
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder="Comentarios del pedido..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-teal-500"
                                    rows="2"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Comentario de producto */}
            {commentingProduct && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Comentario - {commentingProduct.name}
                        </h3>
                        <textarea
                            ref={productCommentInputRef}
                            value={productComment}
                            onChange={(e) => setProductComment(e.target.value)}
                            placeholder="Ej: Sin cebolla, bien cocido..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-teal-500"
                            rows="4"
                        />
                        <div className="flex gap-3 mt-4">
                            <Button
                                onClick={() => {
                                    setCommentingProduct(null);
                                    setProductComment('');
                                }}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={saveComment}
                                className="flex-1 bg-teal-600 hover:bg-teal-700"
                            >
                                Guardar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Pago y Cierre */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Cerrar Mesa {table.tableNumber}</h3>

                        {/* Resumen */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-700">Subtotal:</span>
                                <span className="font-semibold">{formatChileanCurrency(calculateTotal())}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-700">Propina sugerida (10%):</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={formatPaymentInput(suggestedTip)}
                                        onChange={(e) => setSuggestedTip(parsePaymentInput(e.target.value))}
                                        className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                                    />
                                    <span className="text-sm text-gray-600">$</span>
                                </div>
                            </div>
                            <div className="border-t border-gray-300 pt-2 mt-2">
                                <div className="flex justify-between">
                                    <span className="font-bold text-gray-900">Total con propina:</span>
                                    <span className="text-xl font-bold text-teal-600">
                                        {formatChileanCurrency(calculateTotal() + suggestedTip)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Métodos de pago */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-semibold text-gray-900">Métodos de Pago</h4>
                                <button
                                    onClick={addPaymentMethod}
                                    className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Agregar método
                                </button>
                            </div>

                            <div className="space-y-3">
                                {paymentMethods.map((payment, index) => (
                                    <div key={index} className="flex gap-2">
                                        <select
                                            value={payment.method}
                                            onChange={(e) => updatePaymentMethod(index, 'method', e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                        >
                                            <option value="">Método</option>
                                            <option value="Efectivo">Efectivo</option>
                                            <option value="Debito">Débito</option>
                                            <option value="Transferencia">Transferencia</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={formatPaymentInput(payment.amount)}
                                            onChange={(e) => updatePaymentMethod(index, 'amount', e.target.value)}
                                            placeholder="Monto"
                                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-teal-500"
                                        />
                                        {paymentMethods.length > 1 && (
                                            <button
                                                onClick={() => removePaymentMethod(index)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Diferencia de pago */}
                            {(() => {
                                const totalPayment = getTotalPaymentAmount();
                                const totalWithTip = calculateTotal() + suggestedTip;
                                const difference = totalPayment - totalWithTip;
                                
                                if (Math.abs(difference) > 0.01) {
                                    return (
                                        <div className={`mt-3 p-3 rounded-lg ${difference < 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                            {difference < 0 
                                                ? `Falta pagar: ${formatChileanCurrency(Math.abs(difference))}`
                                                : `Vuelto: ${formatChileanCurrency(difference)}`
                                            }
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowPaymentModal(false)}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCloseTable}
                                disabled={isProcessing}
                                className="flex-1 bg-teal-600 hover:bg-teal-700"
                            >
                                <CheckIcon className="w-5 h-5 mr-2" />
                                {isProcessing ? 'Procesando...' : 'Cerrar Mesa'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TableDetail;
