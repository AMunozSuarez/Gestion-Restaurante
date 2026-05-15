import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTable, useTables } from '../hooks/useTables';
import { useOrders } from '../hooks/useOrders';
import { useProducts, useProductSearch } from '../hooks/useProducts';
import { useCashRegister } from '../store/CashRegisterContext';
import { useWaiters } from '../hooks/useUsers';
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
import ProductExtrasModal from '../components/common/ProductExtrasModal';
import { formatChileanCurrency } from '../utils/dateUtils';
import printingService from '../services/printingService';
import { useAuth } from '../hooks/useAuth';

const TableDetail = () => {
    const { tableId } = useParams();
    const navigate = useNavigate();
    const { table, isLoading: tableLoading, refetch: refetchTable } = useTable(tableId);
    const { closeTable, assignOrderToTable, assignWaiterToTable } = useTables();
    const { user } = useAuth();
    const { isOpen: isCashOpen, isLoading: cashLoading } = useCashRegister();
    const { products } = useProducts({ available: true });
    const { searchResults, searchProducts } = useProductSearch();
    const { createOrder, updateOrder } = useOrders({ section: 'mesas' });
    const { waiters } = useWaiters();

    // Estados
    const [showCashAlert, setShowCashAlert] = useState(false);
    const [notification, setNotification] = useState(null);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [comments, setComments] = useState('');
    const [commentingProduct, setCommentingProduct] = useState(null);
    const [productComment, setProductComment] = useState('');
    const [addedProductNotification, setAddedProductNotification] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState([{ method: '', amount: 0 }]);
    const [suggestedTip, setSuggestedTip] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const isProcessingRef = useRef(false);
    const [showWaiterModal, setShowWaiterModal] = useState(false);
    const [selectedWaiter, setSelectedWaiter] = useState(null);
    const [showDiscountFields, setShowDiscountFields] = useState(false);
    const [discountType, setDiscountType] = useState('percentage');
    const [discountValue, setDiscountValue] = useState(0);
    const [manualPaymentEdit, setManualPaymentEdit] = useState(false);
    const [showExtrasModal, setShowExtrasModal] = useState(false);
    const [selectedProductForExtras, setSelectedProductForExtras] = useState(null);
    const [extrasModalMode, setExtrasModalMode] = useState('create');
    const [editingCartItem, setEditingCartItem] = useState(null);
    const [mobilePanel, setMobilePanel] = useState('products');

    const productCommentInputRef = useRef(null);

    // Función para mostrar notificación
    const showNotification = (message, type = 'success', duration = 3000) => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), duration);
    };

    const canCurrentUserCloseTable = () => {
        const onlyOwnerCanClose = printingService.getOnlyOwnerCanCloseTable();
        if (!onlyOwnerCanClose) return true;
        return user?.role === 'owner' || user?.role === 'super_admin';
    };

    // Cargar pedido actual de la mesa si existe
    useEffect(() => {
        if (table?.currentOrder && table.currentOrder.foods) {
            // Cargar productos activos
            const orderProducts = table.currentOrder.foods.map((food, index) => ({
                id: food.food?._id || food.food,
                cartId: `orig_${index}_${food.food?._id || food.food}`,
                name: food.food?.title || 'Producto',
                price: food.food?.price || 0,
                quantity: food.quantity || 1,
                comments: food.comment || '',
                selectedExtras: food.selectedExtras || [],
                extraSections: food.food?.extraSections || [],
                category: food.food?.category,
                isOriginal: true,
                isNew: false,
                deleted: false,
                isPendingDelete: false
            }));

            // Cargar productos eliminados si existen
            const deletedProducts = (table.currentOrder.deletedFoods || []).map((food, index) => {
                const productId = food.food?._id || food.food;
                return {
                    id: productId,
                    cartId: `del_${index}_${productId}`,
                    name: food.food?.title || 'Producto eliminado',
                    price: food.food?.price || 0,
                    quantity: food.quantity || 1,
                    comments: food.comment || '',
                    selectedExtras: food.selectedExtras || [],
                    extraSections: food.food?.extraSections || [],
                    category: food.food?.category,
                    isOriginal: true,
                    isNew: false,
                    deleted: true,
                    isPendingDelete: false
                };
            });

            setCart([...orderProducts, ...deletedProducts]);
            setComments(table.currentOrder.comment || '');
        }
    }, [table]);

    // Verificar caja - solo cuando termine de cargar
    useEffect(() => {
        if (!cashLoading && !isCashOpen) {
            setShowCashAlert(true);
        }
    }, [isCashOpen, cashLoading]);

    // Inicializar mesero seleccionado
    useEffect(() => {
        if (table?.waiter) {
            setSelectedWaiter(table.waiter._id);
        }
    }, [table]);

    // Focus en textarea de comentarios
    useEffect(() => {
        if (commentingProduct && productCommentInputRef.current) {
            productCommentInputRef.current.focus();
        }
    }, [commentingProduct]);

    // Recalcular propina cuando cambia el descuento
    useEffect(() => {
        if (showPaymentModal) {
            setSuggestedTip(calculateTip(0.1));
        }
    }, [discountValue, showPaymentModal]);

    // Funciones del carrito
    const addToCart = (product) => {
        // Si el producto tiene extras, abrir modal
        if (product.extraSections && product.extraSections.length > 0) {
            setSelectedProductForExtras(product);
            setExtrasModalMode('create');
            setShowExtrasModal(true);
            return;
        }

        // Solo buscar en items NUEVOS (no originales) sin extras para sumar cantidad
        const existingNewItem = cart.find(item => 
            item.id === product.id && !item.deleted && !item.isOriginal && !item.selectedExtras?.length
        );
        if (existingNewItem) {
            setCart(prev =>
                prev.map(item =>
                    item.cartId === existingNewItem.cartId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            );
            setAddedProductNotification(`${product.name} agregado`);
            setTimeout(() => setAddedProductNotification(null), 2000);
        } else {
            const newProduct = {
                ...product,
                cartId: `new_${Date.now()}_${product.id}`,
                quantity: 1,
                comments: '',
                selectedExtras: [],
                isOriginal: false,
                isNew: true,
                deleted: false
            };
            setCart(prev => [...prev, newProduct]);
            setAddedProductNotification(`${product.name} agregado`);
            setTimeout(() => setAddedProductNotification(null), 2000);
        }
    };

    // Manejar confirmación de extras desde el modal
    const handleExtrasConfirm = (selectedExtras) => {
        if (extrasModalMode === 'create') {
            const cartId = `new_${Date.now()}_${selectedProductForExtras.id}`;
            const newItem = {
                ...selectedProductForExtras,
                cartId,
                quantity: 1,
                comments: '',
                selectedExtras,
                isOriginal: false,
                isNew: true,
                deleted: false
            };
            setCart(prev => [...prev, newItem]);
            setAddedProductNotification(`${selectedProductForExtras.name} con extras agregado`);
            setTimeout(() => setAddedProductNotification(null), 2000);
        } else if (extrasModalMode === 'edit' && editingCartItem) {
            setCart(prev => prev.map(item =>
                item.cartId === editingCartItem.cartId
                    ? { ...item, selectedExtras }
                    : item
            ));
        }
        setShowExtrasModal(false);
        setSelectedProductForExtras(null);
        setEditingCartItem(null);
    };

    const removeFromCart = (cartId) => {
        const targetItem = cart.find(item => item.cartId === cartId);
        if (!targetItem) return;

        if (targetItem.isOriginal && table.currentOrder && !printingService.canCurrentUserDeleteOrderItems()) {
            showNotification('Solo el dueño puede eliminar productos de una orden con la configuración actual', 'warning');
            return;
        }

        setCart(prev => prev.map(item => {
            if (item.cartId === cartId) {
                // Si es un producto original de la orden, marcarlo como deleted
                if (item.isOriginal && table.currentOrder) {
                    return { ...item, deleted: true, isPendingDelete: true };
                }
                // Si es un producto nuevo, eliminarlo completamente
                return null;
            }
            return item;
        }).filter(Boolean));
    };

    const restoreDeletedItem = (cartId) => {
        setCart(prev => prev.map(item => {
            if (item.cartId === cartId && item.deleted && item.isPendingDelete) {
                return { ...item, deleted: false, isPendingDelete: false };
            }
            return item;
        }));
    };

    const updateQuantity = (cartId, newQuantity) => {
        if (newQuantity <= 0) {
            removeFromCart(cartId);
            return;
        }
        setCart(prev =>
            prev.map(item =>
                item.cartId === cartId ? { ...item, quantity: newQuantity } : item
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
        return cart.filter(item => !item.deleted).reduce((total, item) => {
            const extrasTotal = (item.selectedExtras || []).reduce((sum, extra) => sum + (extra.price || 0), 0);
            return total + ((item.price + extrasTotal) * item.quantity);
        }, 0);
    };

    const calculateTip = (percentage) => {
        const base = calculateSubtotalWithDiscount();
        return Math.round(base * percentage);
    };

    const calculateDiscountAmount = () => {
        const subtotal = calculateTotal();
        if (discountType === 'percentage') {
            return Math.round(subtotal * (discountValue / 100));
        }
        return discountValue;
    };

    const calculateSubtotalWithDiscount = () => {
        return calculateTotal() - calculateDiscountAmount();
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

        const activeItems = cart.filter(item => !item.deleted);
        if (activeItems.length === 0) {
            showNotification('Agrega productos al carrito', 'warning');
            return;
        }

        if (isProcessingRef.current) {
            return;
        }
        isProcessingRef.current = true;

        try {
            setIsProcessing(true);

            // Filtrar productos activos, eliminados y nuevos
            const activeFoods = cart.filter(item => !item.deleted);
            const deletedFoods = cart.filter(item => item.isOriginal && item.deleted);
            // newFoods solo aplica para actualizaciones (no para creación de orden)
            const newFoods = table.currentOrder
                ? cart.filter(item => item.isNew && !item.deleted)
                : [];

            const orderData = {
                foods: activeFoods.map(item => ({
                    food: item.id,
                    quantity: item.quantity,
                    comment: item.comments || '',
                    selectedExtras: item.selectedExtras || []
                })),
                deletedFoods: deletedFoods.map(item => ({
                    food: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    comment: item.comments || '',
                    selectedExtras: item.selectedExtras || []
                })),
                newFoods: newFoods.map(item => ({
                    food: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    comment: item.comments || '',
                    selectedExtras: item.selectedExtras || []
                })),
                payment: 'Pendiente',
                paymentMethods: [],
                section: 'mesas',
                status: 'Preparacion',
                comment: comments,
                tableNumber: table.tableNumber,
                waiter: table.waiter?._id || null,
                tip: 0  // Sin propina al enviar a cocina
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
                setAddedProductNotification('Comanda enviada a cocina');
                setTimeout(() => setAddedProductNotification(null), 3000);
                
                // Recargar datos de la mesa para obtener la orden actualizada
                await refetchTable();
            }
        } catch (error) {
            showNotification('Error al guardar orden: ' + error.message, 'error');
        } finally {
            setIsProcessing(false);
            isProcessingRef.current = false;
        }
    };

    // Abrir modal de pago o cerrar mesa vacía
    const handleOpenPayment = async () => {
        if (!canCurrentUserCloseTable()) {
            showNotification('Solo el dueño o super admin puede cerrar mesa con la configuración actual', 'warning');
            return;
        }

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
        const existingDiscount = table.currentOrder?.discount || 0;
        const subtotalWithDiscount = total - existingDiscount;
        const tip = Math.round(subtotalWithDiscount * 0.1);

        setPaymentMethods([{ method: '', amount: subtotalWithDiscount + tip }]);
        setSuggestedTip(tip);
        setShowDiscountFields(false);
        setDiscountType('percentage');
        setDiscountValue(0);
        setManualPaymentEdit(false);
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
        
        // Si se está editando el monto del primer método de pago, marcar como edición manual
        if (field === 'amount' && index === 0 && paymentMethods.length === 1) {
            setManualPaymentEdit(true);
        }
        
        // Si se cambia el método de pago (no el monto), resetear la edición manual
        if (field === 'method') {
            setManualPaymentEdit(false);
        }
        
        setPaymentMethods(prev =>
            prev.map((payment, i) =>
                i === index ? { ...payment, [field]: processedValue } : payment
            )
        );
    };

    const getTotalPaymentAmount = () => {
        return paymentMethods.reduce((total, payment, index) => {
            // Para el primer método de pago, si no es edición manual, usar el total calculado
            if (index === 0 && paymentMethods.length === 1 && !manualPaymentEdit) {
                return total + (calculateSubtotalWithDiscount() + suggestedTip);
            }
            return total + (parseFloat(payment.amount) || 0);
        }, 0);
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
        if (!canCurrentUserCloseTable()) {
            showNotification('Solo el dueño o super admin puede cerrar mesa con la configuración actual', 'warning');
            return;
        }

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
        const orderTotal = calculateSubtotalWithDiscount();

        if (totalPaymentAmount < orderTotal) {
            showNotification(`Falta pagar: ${formatChileanCurrency(orderTotal - totalPaymentAmount)}`, 'warning');
            return;
        }

        try {
            setIsProcessing(true);

            // Filtrar productos activos, eliminados y nuevos
            const activeFoods = cart.filter(item => !item.deleted);
            const deletedFoods = cart.filter(item => item.isOriginal && item.deleted);
            // newFoods solo aplica para actualizaciones
            const newFoods = table.currentOrder
                ? cart.filter(item => item.isNew && !item.deleted)
                : [];

            // Actualizar orden como completada
            const orderData = {
                foods: activeFoods.map(item => ({
                    food: item.id,
                    quantity: item.quantity,
                    comment: item.comments || '',
                    selectedExtras: item.selectedExtras || []
                })),
                deletedFoods: deletedFoods.map(item => ({
                    food: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    comment: item.comments || '',
                    selectedExtras: item.selectedExtras || []
                })),
                newFoods: newFoods.map(item => ({
                    food: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    comment: item.comments || '',
                    selectedExtras: item.selectedExtras || []
                })),
                payment: validPayments.length === 1 ? validPayments[0].method : 'Múltiple',
                paymentMethods: validPayments.map((payment, index) => ({
                    method: payment.method,
                    amount: index === 0 && validPayments.length === 1 && !manualPaymentEdit
                        ? calculateSubtotalWithDiscount() + suggestedTip
                        : payment.amount
                })),
                section: 'mesas',
                status: 'Completado',
                comment: comments,
                tableNumber: table.tableNumber,
                waiter: table.waiter?._id || null,
                tip: suggestedTip || 0,
                discount: calculateDiscountAmount()
            };

            let response;
            if (table.currentOrder) {
                response = await updateOrder(table.currentOrder._id, orderData);
            } else {
                response = await createOrder(orderData, { skipKitchenPrint: true });
            }

            if (response.success) {
                let reprintFailed = false;

                if (printingService.getReprintTicketOnCloseTable()) {
                    try {
                        await printingService.printCustomerTicket({
                            ...(response.order || table.currentOrder),
                            tableNumber: table.tableNumber,
                            tip: suggestedTip || 0,
                            discount: calculateDiscountAmount(),
                            paymentMethods: orderData.paymentMethods,
                        });
                    } catch (printError) {
                        reprintFailed = true;
                        console.error('Error al reimprimir ticket al cerrar mesa:', printError);
                    }
                }

                // Cerrar mesa usando el hook
                await closeTable(tableId);

                showNotification(
                    reprintFailed
                        ? 'Mesa cerrada. No se pudo reimprimir el ticket.'
                        : 'Mesa cerrada exitosamente',
                    reprintFailed ? 'warning' : 'success',
                    2500
                );

                setTimeout(() => {
                    navigate('/mesas');
                }, 500);
            } else {
                showNotification(response.error || response.message || 'Error al cerrar mesa', 'error');
            }
        } catch (error) {
            showNotification('Error al cerrar mesa: ' + error.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Imprimir ticket del cliente manualmente
    const handlePrintTicket = async () => {
        if (!table.currentOrder) {
            showNotification('No hay orden para imprimir', 'warning');
            return;
        }

        try {
            // Filtrar métodos de pago válidos
            const validPayments = paymentMethods.filter(p =>
                p.method && p.method.trim() !== '' && p.method !== 'Pendiente'
            );

            await printingService.printCustomerTicket({
                ...table.currentOrder,
                suggestedTip,
                discount: calculateDiscountAmount(),
                tableNumber: table.tableNumber,
                paymentMethods: validPayments.length > 0 ? validPayments.map((payment, index) => ({
                    method: payment.method,
                    amount: index === 0 && validPayments.length === 1 && !manualPaymentEdit
                        ? calculateSubtotalWithDiscount() + suggestedTip
                        : payment.amount
                })) : undefined
            });
            showNotification('Ticket impreso exitosamente', 'success', 2000);
        } catch (error) {
            console.error('Error al imprimir ticket:', error);
            showNotification('Error al imprimir ticket: ' + error.message, 'error');
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

    // Asignar mesero a la mesa
    const handleAssignWaiter = async () => {
        if (!selectedWaiter) {
            showNotification('Selecciona un mesero', 'warning');
            return;
        }

        try {
            await assignWaiterToTable(tableId, selectedWaiter);
            await refetchTable();
            setShowWaiterModal(false);
            showNotification('Mesero asignado exitosamente', 'success');
        } catch (error) {
            showNotification('Error al asignar mesero: ' + error.message, 'error');
        }
    };

    // Lógica de productos (debe estar antes de los early returns)
    const displayProducts = searchTerm.trim() ? searchResults : products;

    // Obtener categorías únicas
    const uniqueCategories = React.useMemo(() => {
        const categoriesMap = new Map();
        displayProducts.forEach(product => {
            if (product.category && product.category._id) {
                categoriesMap.set(product.category._id, product.category.title);
            }
        });
        return Array.from(categoriesMap, ([id, title]) => ({ id, title }));
    }, [displayProducts]);

    // Filtrar productos por categoría seleccionada
    const filteredProducts = selectedCategory
        ? displayProducts.filter(product => product.category?._id === selectedCategory)
        : displayProducts;

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

    return (
        <div className="h-full min-h-0 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex flex-col overflow-hidden">
            {showCashAlert && <CashRegisterAlert isOpen={!isCashOpen} onClose={() => setShowCashAlert(false)} />}

            {/* Modal de extras para productos */}
            <ProductExtrasModal
                isOpen={showExtrasModal}
                onClose={() => {
                    setShowExtrasModal(false);
                    setSelectedProductForExtras(null);
                    setEditingCartItem(null);
                }}
                product={selectedProductForExtras}
                onConfirm={handleExtrasConfirm}
                initialSelectedExtras={editingCartItem?.selectedExtras}
            />

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
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3 lg:items-center lg:gap-4 min-w-0">
                            <button
                                onClick={() => navigate('/mesas')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-xl lg:text-2xl font-bold text-teal-900 truncate">
                                    Mesa {table.tableNumber}
                                </h1>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <UserGroupIcon className="w-4 h-4" />
                                        <span>{table.currentGuests || 0} / {table.capacity}</span>
                                    </div>
                                    {table.openedAt && (
                                        <div className="flex items-center gap-1">
                                            <ClockIcon className="w-4 h-4" />
                                            <span>{getTableDuration()}</span>
                                        </div>
                                    )}                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setShowWaiterModal(true)}
                                            className="text-teal-600 hover:text-teal-700 font-medium"
                                        >
                                            {table.waiter ? `Mesero: ${table.waiter.userName}` : 'Asignar mesero'}
                                        </button>
                                    </div>                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-full lg:w-auto lg:flex lg:gap-2">
                            <Button
                                onClick={handleSaveOrder}
                                disabled={cart.length === 0 || isProcessing}
                                className="bg-blue-600 hover:bg-blue-700 justify-center"
                            >
                                <PrinterIcon className="w-5 h-5 mr-2" />
                                <span className="hidden sm:inline">Enviar a Cocina</span>
                                <span className="sm:hidden">Cocina</span>
                            </Button>
                            <Button
                                onClick={handleOpenPayment}
                                disabled={isProcessing}
                                className="bg-teal-600 hover:bg-teal-700 justify-center"
                            >
                                <CurrencyDollarIcon className="w-5 h-5 mr-2" />
                                <span className="hidden sm:inline">{cart.length === 0 ? 'Cerrar Mesa' : 'Cobrar y Cerrar'}</span>
                                <span className="sm:hidden">{cart.length === 0 ? 'Cerrar' : 'Cobrar'}</span>
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

            <div className="flex-1 min-h-0 overflow-auto lg:overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 lg:py-4 h-full min-h-0">
                <div className="lg:hidden mb-3">
                    <div className="grid grid-cols-2 gap-2 bg-white/70 p-1 rounded-xl border border-teal-100">
                        <button
                            onClick={() => setMobilePanel('products')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${mobilePanel === 'products' ? 'bg-teal-600 text-white' : 'text-gray-700'}`}
                        >
                            Productos
                        </button>
                        <button
                            onClick={() => setMobilePanel('order')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${mobilePanel === 'order' ? 'bg-teal-600 text-white' : 'text-gray-700'}`}
                        >
                            Pedido ({cart.filter(i => !i.deleted).length})
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 lg:h-full lg:min-h-0">
                    {/* Productos */}
                    <div className={`${mobilePanel === 'products' ? 'block' : 'hidden'} lg:block lg:col-span-2 lg:min-h-0`}>
                        <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 lg:h-full flex flex-col lg:min-h-0">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Productos</h2>
                                <button
                                    onClick={() => setMobilePanel('order')}
                                    className="lg:hidden text-sm text-teal-700 font-medium"
                                >
                                    Ver pedido
                                </button>
                            </div>

                            {/* Filtro por categorías */}
                            {uniqueCategories.length > 0 && (
                                <div className="mb-4">
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setSelectedCategory(null)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                selectedCategory === null
                                                    ? 'bg-teal-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            Todas
                                        </button>
                                        {uniqueCategories.map(category => (
                                            <button
                                                key={category.id}
                                                onClick={() => setSelectedCategory(category.id)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    selectedCategory === category.id
                                                        ? 'bg-teal-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                {category.title}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Búsqueda */}
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                placeholder="Buscar productos..."
                                className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            />

                            {/* Lista de productos */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[58vh] lg:max-h-none lg:flex-1 lg:min-h-0 content-start pr-1">
                                {filteredProducts.map(product => (
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
                    <div className={`${mobilePanel === 'order' ? 'block' : 'hidden'} lg:block lg:col-span-1 lg:min-h-0`}>
                        <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 lg:h-full flex flex-col lg:min-h-0">
                            <div className="flex justify-end mb-2 lg:hidden">
                                <button
                                    onClick={() => setMobilePanel('products')}
                                    className="text-sm text-teal-700 font-medium"
                                >
                                    Ver productos
                                </button>
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Pedido ({cart.filter(i => !i.deleted).length} items)
                                {cart.some(i => i.deleted) && (
                                    <span className="ml-2 text-xs text-red-500 font-normal">
                                        ({cart.filter(i => i.deleted).length} eliminado{cart.filter(i => i.deleted).length > 1 ? 's' : ''})
                                    </span>
                                )}
                            </h2>

                            {cart.length === 0 ? (
                                <p className="text-gray-500 text-center py-8 lg:flex-1 lg:flex lg:items-center lg:justify-center">
                                    Agrega productos al pedido
                                </p>
                            ) : (
                                <div className="space-y-3 mb-4 overflow-y-auto max-h-[52vh] lg:max-h-none lg:flex-1 lg:min-h-0 pr-1">
                                    {/* Sección: Productos nuevos (Por enviar) */}
                                    {cart.filter(item => item.isNew && !item.deleted).length > 0 && (
                                        <div className="mb-3">
                                            <p className="text-xs text-green-600 font-medium mb-2">Por enviar</p>
                                            {cart.filter(item => item.isNew && !item.deleted).map(item => {
                                                const itemExtrasTotal = (item.selectedExtras || []).reduce((sum, extra) => sum + (extra.price || 0), 0);
                                                return (
                                                <div key={item.cartId} className="border border-green-300 bg-green-50 rounded-lg p-3 mb-2">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex-1">
                                                            <div className="font-medium text-sm flex items-center gap-2">
                                                                {item.name}
                                                                <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">Nuevo</span>
                                                            </div>
                                                            <div className="text-teal-600 text-sm">
                                                                {formatChileanCurrency(item.price)}
                                                                {itemExtrasTotal > 0 && (
                                                                    <span className="text-orange-600 ml-1">
                                                                        + {formatChileanCurrency(itemExtrasTotal)} extras
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => removeFromCart(item.cartId)}
                                                            className="p-1 hover:bg-red-100 rounded"
                                                            title="Quitar del carrito"
                                                        >
                                                            <TrashIcon className="w-4 h-4 text-red-600" />
                                                        </button>
                                                    </div>

                                                    {/* Extras seleccionados */}
                                                    {item.selectedExtras && item.selectedExtras.length > 0 && (
                                                        <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1">
                                                                    <div className="text-xs font-medium text-orange-800 mb-1">Extras:</div>
                                                                    <div className="space-y-0.5">
                                                                        {item.selectedExtras.map((extra, idx) => (
                                                                            <div key={idx} className="text-xs text-orange-700 flex justify-between">
                                                                                <span>• {extra.extraName}</span>
                                                                                {extra.price > 0 && <span className="font-medium">+{formatChileanCurrency(extra.price)}</span>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedProductForExtras(item);
                                                                        setEditingCartItem(item);
                                                                        setExtrasModalMode('edit');
                                                                        setShowExtrasModal(true);
                                                                    }}
                                                                    className="text-xs bg-orange-200 hover:bg-orange-300 text-orange-800 px-2 py-1 rounded"
                                                                >
                                                                    Editar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Botón para agregar extras */}
                                                    {item.extraSections && item.extraSections.length > 0 && (!item.selectedExtras || item.selectedExtras.length === 0) && (
                                                        <div className="mb-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedProductForExtras(item);
                                                                    setEditingCartItem(item);
                                                                    setExtrasModalMode('edit');
                                                                    setShowExtrasModal(true);
                                                                }}
                                                                className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-2 py-1 rounded"
                                                            >
                                                                + Agregar extras
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                                                            className="p-1 bg-gray-100 hover:bg-gray-200 rounded"
                                                        >
                                                            <MinusIcon className="w-4 h-4" />
                                                        </button>
                                                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
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
                                                        <div className="mt-2 text-xs text-gray-600 bg-white/50 p-2 rounded">
                                                            {item.comments}
                                                        </div>
                                                    )}
                                                </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Sección: Productos en cocina (originales) */}
                                    {cart.filter(item => item.isOriginal && !item.deleted).length > 0 && (
                                        <div className="mb-3">
                                            <p className="text-xs text-gray-500 font-medium mb-2">En cocina</p>
                                            {cart.filter(item => item.isOriginal && !item.deleted).map(item => {
                                                const itemExtrasTotal = (item.selectedExtras || []).reduce((sum, extra) => sum + (extra.price || 0), 0);
                                                const canDeleteOriginalOrderItems = printingService.canCurrentUserDeleteOrderItems();
                                                return (
                                                <div key={item.cartId} className="border border-gray-200 rounded-lg p-3 mb-2">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex-1">
                                                            <div className="font-medium text-sm">{item.name}</div>
                                                            <div className="text-teal-600 text-sm">
                                                                {formatChileanCurrency(item.price)}
                                                                {itemExtrasTotal > 0 && (
                                                                    <span className="text-orange-600 ml-1">
                                                                        + {formatChileanCurrency(itemExtrasTotal)} extras
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {canDeleteOriginalOrderItems && (
                                                            <button
                                                                onClick={() => removeFromCart(item.cartId)}
                                                                className="p-1 hover:bg-red-100 rounded"
                                                                title="Marcar como eliminado"
                                                            >
                                                                <TrashIcon className="w-4 h-4 text-red-600" />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Extras de productos originales (solo lectura) */}
                                                    {item.selectedExtras && item.selectedExtras.length > 0 && (
                                                        <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded">
                                                            <div className="text-xs font-medium text-orange-800 mb-1">Extras:</div>
                                                            <div className="space-y-0.5">
                                                                {item.selectedExtras.map((extra, idx) => (
                                                                    <div key={idx} className="text-xs text-orange-700 flex justify-between">
                                                                        <span>• {extra.extraName}</span>
                                                                        {extra.price > 0 && <span className="font-medium">+{formatChileanCurrency(extra.price)}</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-500">x{item.quantity}</span>
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
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Mostrar productos eliminados */}
                                    {cart.filter(item => item.deleted).length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-red-200">
                                            <p className="text-xs text-red-600 font-medium mb-2">
                                                Productos eliminados ({cart.filter(item => item.deleted).length})
                                            </p>
                                            {cart.filter(item => item.deleted).map(item => (
                                                <div key={item.cartId} className="border border-red-200 bg-red-50 rounded-lg p-2 mb-2 opacity-60">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm line-through text-gray-500">{item.name} x{item.quantity}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-red-600">{formatChileanCurrency(item.price * item.quantity)}</span>
                                                            {item.isPendingDelete && (
                                                                <button
                                                                    onClick={() => restoreDeletedItem(item.cartId)}
                                                                    className="text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700"
                                                                    title="Deshacer eliminación"
                                                                >
                                                                    Deshacer
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Total */}
                            <div className="border-t border-gray-200 pt-4 flex-shrink-0">
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

            {/* Modal: Asignar Mesero */}
            {showWaiterModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Asignar Mesero a Mesa {table.tableNumber}
                        </h3>
                        
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Seleccionar Mesero
                            </label>
                            <select
                                value={selectedWaiter || ''}
                                onChange={(e) => setSelectedWaiter(e.target.value || null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="">Sin mesero asignado</option>
                                {waiters.map(waiter => (
                                    <option key={waiter._id} value={waiter._id}>
                                        {waiter.userName} 
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => {
                                    setShowWaiterModal(false);
                                    setSelectedWaiter(table?.waiter?._id || null);
                                }}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleAssignWaiter}
                                className="flex-1 bg-teal-600 hover:bg-teal-700"
                            >
                                Asignar
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


                            {/* Sección de descuento */}
                            {!showDiscountFields ? (
                                <button
                                    onClick={() => {
                                        setShowDiscountFields(true);
                                    }}
                                    className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1 mb-2"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    {table.currentOrder?.discount > 0 ? 'Modificar descuento' : 'Aplicar descuento'}
                                </button>
                            ) : (
                                <div className="bg-white rounded-lg p-3 mb-2 border border-gray-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700">Descuento</span>
                                        <button
                                            onClick={() => {
                                                setShowDiscountFields(false);
                                                setDiscountValue(0);
                                                // Recalcular propina sobre subtotal original
                                                const newTip = Math.round(calculateTotal() * 0.1);
                                                setSuggestedTip(newTip);
                                            }}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex gap-2 mb-2">
                                        <select
                                            value={discountType}
                                            onChange={(e) => {
                                                setDiscountType(e.target.value);
                                                setDiscountValue(0);
                                            }}
                                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                        >
                                            <option value="percentage">Porcentaje (%)</option>
                                            <option value="amount">Monto fijo ($)</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={discountValue || ''}
                                            onChange={(e) => {
                                                const value = parseFloat(e.target.value) || 0;
                                                if (discountType === 'percentage') {
                                                    setDiscountValue(Math.min(100, Math.max(0, value)));
                                                } else {
                                                    setDiscountValue(Math.max(0, value));
                                                }
                                                setManualPaymentEdit(false);
                                            }}
                                            placeholder={discountType === 'percentage' ? '0-100' : 'Monto'}
                                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                                        />
                                    </div>
                                    {discountValue > 0 && (
                                        <div className="text-sm text-green-700 font-medium">
                                            Descuento: -{formatChileanCurrency(calculateDiscountAmount())}
                                        </div>
                                    )}
                                </div>
                            )}

                            {discountValue > 0 && (
                                <div className="flex justify-between mb-2 text-green-700">
                                    <span className="font-medium">Subtotal con descuento:</span>
                                    <span className="font-semibold">{formatChileanCurrency(calculateSubtotalWithDiscount())}</span>
                                </div>
                            )}

                            <div className="flex justify-between mb-2">
                                <span className="text-gray-700">Propina sugerida (10%):</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={formatPaymentInput(suggestedTip)}
                                        onChange={(e) => {
                                            setSuggestedTip(parsePaymentInput(e.target.value));
                                            setManualPaymentEdit(false);
                                        }}
                                        className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                                    />
                                    <span className="text-sm text-gray-600">$</span>
                                </div>
                            </div>
                            <div className="border-t border-gray-300 pt-2 mt-2">
                                <div className="flex justify-between">
                                    <span className="font-bold text-gray-900">Total con propina:</span>
                                    <span className="text-xl font-bold text-teal-600">
                                        {formatChileanCurrency(calculateSubtotalWithDiscount() + suggestedTip)}
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
                                            value={formatPaymentInput(
                                                index === 0 && paymentMethods.length === 1 && !manualPaymentEdit
                                                    ? calculateSubtotalWithDiscount() + suggestedTip
                                                    : payment.amount
                                            )}
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
                                const totalWithTip = calculateSubtotalWithDiscount() + suggestedTip;
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
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Button
                                    onClick={handlePrintTicket}
                                    variant="outline"
                                    className="w-full border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white"
                                >
                                    <PrinterIcon className="w-5 h-5 mr-2" />
                                    Imprimir Ticket
                                </Button>
                                {(printingService.isCurrentUserOwner() || printingService.getDrawerAlwaysOpen()) && (
                                    <Button
                                        onClick={async () => {
                                            const printer = printingService.getDrawerPrinter() || localStorage.getItem('drawerPrinter') || null;
                                            const res = await printingService.openDrawer(printer);
                                            if (!res.success) {
                                                console.error('Error abriendo caja:', res.error || res.message);
                                                alert('No se pudo abrir la caja: ' + (res.error || res.message || 'Error desconocido'));
                                            }
                                        }}
                                        variant="outline"
                                        className="w-full border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white"
                                        title="Abrir caja"
                                    >
                                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 6h10v12H7z"/></svg>
                                        Abrir Caja
                                    </Button>
                                )}
                            </div>

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
                </div>
            )}
        </div>
    );
};

export default TableDetail;
