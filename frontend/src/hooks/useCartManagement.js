import { useEffect, useState, useRef } from 'react'; // Importamos useRef para manejar referencias
import useCartStore from '../store/useCartStore'; // Usamos el store existente para manejar el carrito

export const useCartManagement = () => {
    const { cart, setCart, clearCart, increaseQuantity, decreaseQuantity, removeProduct } = useCartStore(); // Acceso al estado global del carrito
    const [cartTotal, setCartTotal] = useState(0); // Estado local para el total del carrito
    const textAreaRefs = useRef({}); // Referencias para las cajas de texto

    // Calcular el total del carrito cada vez que cambie
    useEffect(() => {
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        setCartTotal(total);
    }, [cart]);

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
    };

    return {
        cart,
        setCart,
        cartTotal,
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