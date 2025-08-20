import { useEffect, useState, useRef, useCallback } from 'react';
import useCartStore from '../../store/useCartStore';

// Crear una referencia compartida a nivel de módulo (fuera del hook)
// Esto asegura que todos los componentes que usan useCartManagement
// compartan la misma instancia de textAreaRefs
const sharedTextAreaRefs = {};

export const useCartManagement = () => {
    const { cart, setCart, clearCart, increaseQuantity, decreaseQuantity, removeProduct, cartContext } = useCartStore();
    const [cartTotal, setCartTotal] = useState(0);
    // Usar la referencia compartida en lugar de crear una nueva
    const textAreaRefs = useRef(sharedTextAreaRefs);
    const prevCartRef = useRef(cart);
    const focusAppliedRef = useRef({});

    // Función memoizada para calcular el total del carrito
    const calculateTotal = useCallback(() => {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [cart]);

    // Calcular el total del carrito cada vez que cambie, pero evitando actualizaciones redundantes
    useEffect(() => {
        // Si estamos en el contexto 'edit' y no ha cambiado la estructura del carrito (solo referencias)
        // solo actualizamos si la cantidad de productos o sus precios han cambiado
        if (cartContext === 'edit' && 
            prevCartRef.current.length === cart.length && 
            prevCartRef.current.every((item, i) => item._id === cart[i]._id)) {
            
            const newTotal = calculateTotal();
            if (Math.abs(newTotal - cartTotal) > 0.01) { // Solo actualizar si el cambio es significativo
                setCartTotal(newTotal);
            }
        } else {
            // Si hay cambio en la estructura o no estamos en 'edit', calculamos normalmente
            setCartTotal(calculateTotal());
        }
        
        // Actualizar la referencia al carrito actual
        prevCartRef.current = cart;
    }, [cart, calculateTotal, cartTotal, cartContext]);

    // Agregar un producto al carrito
    const addToCart = (product) => {
        // Si no hay producto válido, no hacemos nada
        if (!product || !product._id) {
            console.warn("Se intentó agregar un producto inválido al carrito:", product);
            return;
        }
        
        setCart((prevCart) => {
            const existingProduct = prevCart.find((item) => item._id === product._id);
            if (existingProduct) {
                return prevCart.map((item) =>
                    item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
    };

    // Función para manejar la adición de comentarios
    const addCommentToProduct = (productId, commentHtml) => {
        const comment = commentHtml
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/div>\s*<div>/gi, '\n')
            .replace(/<\/?div>/gi, '')
            .replace(/&nbsp;/gi, ' ')
            .trim();

        setCart((prevCart) =>
            prevCart.map((item) =>
                item._id === productId ? { ...item, comment } : item
            )
        );
    };

    // Función para alternar el modo de edición de comentarios
    const toggleEditComment = (productId) => {
        console.log('Activando edición para:', productId);
        
        // Verificar si estamos activando o desactivando el modo edición
        const item = cart.find(i => i._id === productId);
        const isEnteringEditMode = item ? !item.isEditing : true;
        
        // Actualizar el estado del carrito
        setCart((prevCart) =>
            prevCart.map((item) =>
                item._id === productId
                    ? { ...item, isEditing: !item.isEditing }
                    : { ...item, isEditing: false }
            )
        );

        // Si estamos entrando en modo edición, intentar enfocar
        if (isEnteringEditMode) {
            // Reiniciar el estado del foco para este item
            focusAppliedRef.current[productId] = false;
            
            // Un solo intento de enfoque, sin intervalos
            setTimeout(() => {
                const editableDiv = sharedTextAreaRefs[productId];
                if (editableDiv && !focusAppliedRef.current[productId]) {
                    try {
                        editableDiv.focus();
                        console.log('Foco aplicado con éxito desde toggleEditComment');
                        focusAppliedRef.current[productId] = true;
                    } catch (e) {
                        console.error('Error al enfocar desde toggleEditComment:', e);
                    }
                }
            }, 50);
        } else {
            // Si estamos saliendo del modo edición, limpiar el estado
            delete focusAppliedRef.current[productId];
        }
    };

    // Método getter para obtener el total del carrito
    const getCartTotal = useCallback(() => {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [cart]);
    
    // Método para obtener explícitamente el subtotal (sin costo de envío)
    const getCartSubtotal = useCallback(() => {
        return getCartTotal();
    }, [getCartTotal]);    

    return {
        cart,
        setCart,
        cartTotal, // Mantenemos esta propiedad para compatibilidad con componentes existentes
        getCartTotal, // Nuevo método para obtener el total calculado directamente
        getCartSubtotal, // Método específico para obtener el subtotal (sin costo de envío)
        addToCart,
        clearCart,
        increaseQuantity,
        decreaseQuantity,
        removeProduct,
        addCommentToProduct,
        toggleEditComment,
        textAreaRefs: sharedTextAreaRefs, // Retornar directamente sharedTextAreaRefs
    };
};
