// filepath: c:\Users\alex3\OneDrive\Escritorio\Gestion-Restaurante\frontend\src\store\useAuthStore.js
import { create } from 'zustand';

const useAuthStore = create((set) => ({
    authToken: null,
    setAuthToken: (token) => set({ authToken: token }),
    clearAuthToken: () => set({ authToken: null }),
}));

export default useAuthStore;