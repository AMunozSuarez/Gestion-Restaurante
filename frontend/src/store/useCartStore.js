import { create } from 'zustand';

const useCartStore = create((set, get) => ({
    cart: [], // Inicializa el carrito como un array vacío
    cartContext: 'default', // Contexto actual del carrito (por ejemplo, 'create', 'edit', etc.)

    // Cambiar el contexto del carrito
    setCartContext: (context) => set((state) => {
        if (state.cartContext !== context) {
            return { cartContext: context }; // Solo actualizar si el contexto cambia
        }
        return state; // No actualizar si el contexto es el mismo
    }),

    // Actualizar el carrito completo
    setCart: (newCart) => {
        if (typeof newCart === 'function') {
            const prevCart = get().cart;
            newCart = newCart(prevCart);
        }

        if (!Array.isArray(newCart)) {
            console.error('Error: El nuevo carrito debe ser un array:', newCart);
            throw new TypeError('El nuevo carrito debe ser un array');
        }

        set({ cart: [...newCart] });
    },

    // Vaciar el carrito
    clearCart: () => {
        set({ cart: [] });
    },

    // Aumentar la cantidad de un producto
    increaseQuantity: (productId) => {
        set((state) => ({
            cart: state.cart.map((item) =>
                item._id === productId
                    ? { ...item, quantity: item.quantity + 1 } // Incrementa la cantidad
                    : item
            ),
        }));
    },

    // Disminuir la cantidad de un producto
    decreaseQuantity: (productId) => {
        set((state) => ({
            cart: state.cart
                .map((item) =>
                    item._id === productId && item.quantity > 1
                        ? { ...item, quantity: item.quantity - 1 } // Decrementa la cantidad
                        : item
                )
                .filter((item) => item.quantity > 0), // Elimina productos con cantidad 0
        }));
    },

    // Eliminar un producto del carrito
    removeProduct: (productId) => {
        set((state) => ({
            cart: state.cart.filter((item) => item._id !== productId), // Filtra el producto
        }));
    },
}));

export default useCartStore;