import { create } from 'zustand';

const useUIStore = create((set) => ({
    isSearchFocused: false,
    editingOrderId: null,
    setIsSearchFocused: (value) => set({ isSearchFocused: value }),
    setEditingOrderId: (id) => set({ editingOrderId: id }),

    // Nueva funcionalidad para manejar clics fuera de un elemento
    handleClickOutside: (ref, callback) => {
        const handleClick = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                callback();
            }
        };

        document.addEventListener('click', handleClick);
        return () => {
            document.removeEventListener('click', handleClick);
        };
    },
}));

export default useUIStore;