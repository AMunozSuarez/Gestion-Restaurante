import { create } from 'zustand';

const useRestaurantStore = create((set) => ({
    currentRestaurant: null, // Restaurante actual del usuario
    setCurrentRestaurant: (restaurant) => set({ currentRestaurant: restaurant }),
}));

export default useRestaurantStore;