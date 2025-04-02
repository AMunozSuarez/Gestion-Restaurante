import { create } from 'zustand';

const useCartStore = create((set, get) => ({
    cart: [], // Inicializa el carrito como un array vacío
    setCart: (newCart) => {
        if (typeof newCart === 'function') {
            // Si newCart es una función, úsala para calcular el nuevo estado
            const prevCart = get().cart;
            newCart = newCart(prevCart);
        }

        if (!Array.isArray(newCart)) {
            console.error('Error: El nuevo carrito debe ser un array:', newCart);
            console.log('Estado actual del carrito:', get().cart); // Depuración
            throw new TypeError('El nuevo carrito debe ser un array');
        }

        console.log('Actualizando carrito:', newCart); // Depuración
        set({ cart: [...newCart] }); // Asegúrate de crear un nuevo array
    },
    
    setEditingCart: (newEditingCart) => set({ editingCart: newEditingCart }),

    clearCart: () => {
        console.log('Vaciando carrito'); // Depuración
        set({ cart: [] });
    },
    
}));

export default useCartStore;