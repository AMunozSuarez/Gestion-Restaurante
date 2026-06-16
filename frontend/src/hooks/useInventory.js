import { useState, useCallback } from 'react';
import inventoryService from '../services/inventoryService';
import { notifyInventoryChange } from '../utils/inventoryEventBus';

export const useInventory = () => {
    const [items, setItems] = useState([]);
    const [movements, setMovements] = useState([]);
    const [movementsPagination, setMovementsPagination] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchItems = useCallback(async (includeInactive = false) => {
        setLoading(true);
        setError(null);
        try {
            const data = await inventoryService.getItems({ includeInactive });
            setItems(data.items || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cargar insumos');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMovements = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await inventoryService.getMovements(params);
            setMovements(data.movements || []);
            setMovementsPagination(data.pagination || null);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cargar movimientos');
        } finally {
            setLoading(false);
        }
    }, []);

    const createItem = useCallback(async (itemData) => {
        const data = await inventoryService.createItem(itemData);
        setItems(prev => [...prev, data.item]);
        return data.item;
    }, []);

    const updateItem = useCallback(async (id, itemData) => {
        const data = await inventoryService.updateItem(id, itemData);
        setItems(prev => prev.map(i => (i._id === id ? data.item : i)));
        return data.item;
    }, []);

    const deleteItem = useCallback(async (id) => {
        await inventoryService.deleteItem(id);
        setItems(prev => prev.filter(i => i._id !== id));
    }, []);

    const adjustStock = useCallback(async (id, adjustData) => {
        const data = await inventoryService.adjustStock(id, adjustData);
        setItems(prev => prev.map(i => (i._id === id ? { ...data.item, lowStock: data.lowStock } : i)));
        notifyInventoryChange();
        return data;
    }, []);

    const lowStockItems = items.filter(i => i.lowStock);

    return {
        items,
        movements,
        movementsPagination,
        loading,
        error,
        lowStockCount: lowStockItems.length,
        fetchItems,
        fetchMovements,
        createItem,
        updateItem,
        deleteItem,
        adjustStock,
    };
};
