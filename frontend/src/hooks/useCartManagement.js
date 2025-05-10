import { useEffect, useState, useRef, useCallback } from 'react'; // Importamos useRef y useCallback para optimizar
import useCartStore from '../store/useCartStore'; // Usamos el store existente para manejar el carrito

export const useCartManagement = () => {
    const { cart, setCart, clearCart, increaseQuantity, decreaseQuantity, removeProduct, cartContext } = useCartStore(); // Acceso al estado global del carrito
    const [cartTotal, setCartTotal] = useState(0); // Estado local para el total del carrito
    const textAreaRefs = useRef({}); // Referencias para las cajas de texto
    const prevCartRef = useRef(cart); // Referencia para el valor anterior del carrito

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
        setCart((prevCart) =>
            prevCart.map((item) =>
                item._id === productId
                    ? { ...item, isEditing: !item.isEditing }
                    : { ...item, isEditing: false }
            )
        );

        setTimeout(() => {
            if (textAreaRefs.current[productId]) {
                const editableDiv = textAreaRefs.current[productId];
                editableDiv.focus();

                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(editableDiv);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }, 0);
    };    // Método getter para obtener el total del carrito
    const getCartTotal = useCallback(() => {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [cart]);

    return {
        cart,
        setCart,
        cartTotal, // Mantenemos esta propiedad para compatibilidad con componentes existentes
        getCartTotal, // Nuevo método para obtener el total calculado directamente
        addToCart,
        clearCart,
        increaseQuantity,
        decreaseQuantity,
        removeProduct,
        addCommentToProduct,
        toggleEditComment,
        textAreaRefs,
    };
};