import { create } from 'zustand';

const useUIStore = create((set) => ({
    isSearchFocused: false,
    editingOrderId: null,
    setIsSearchFocused: (value) => set({ isSearchFocused: value }),
    setEditingOrderId: (id) => set({ editingOrderId: id }),
}));

export default useUIStore;