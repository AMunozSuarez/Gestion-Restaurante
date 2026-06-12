import { useState, useEffect, useRef, useCallback } from 'react';
import inventoryService from '../services/inventoryService';
import { subscribeInventoryChange } from '../utils/inventoryEventBus';
import { onSocketEvent } from '../services/socketService';

const POLL_INTERVAL_MS = 2 * 60 * 1000;

export const useInventoryAlert = (inventoryEnabled) => {
    const [lowStockCount, setLowStockCount] = useState(0);
    const cancelledRef = useRef(false);

    const fetchCount = useCallback(async () => {
        if (!inventoryEnabled || cancelledRef.current) return;
        try {
            const data = await inventoryService.getItems({ includeInactive: false });
            if (!cancelledRef.current) {
                setLowStockCount((data.items || []).filter(i => i.lowStock).length);
            }
        } catch {
            // silently ignore
        }
    }, [inventoryEnabled]);

    useEffect(() => {
        cancelledRef.current = false;

        if (!inventoryEnabled) {
            setLowStockCount(0);
            return;
        }

        fetchCount();

        // Polling cada 2 minutos como fallback
        const pollTimer = setInterval(fetchCount, POLL_INTERVAL_MS);

        // Actualización inmediata cuando un movimiento manual se registra desde la app
        const unsubBus = subscribeInventoryChange(fetchCount);

        // Re-fetch cuando una orden se completa (el backend descuenta stock con delay)
        let orderUpdateTimer = null;
        const handleOrderEvent = () => {
            if (orderUpdateTimer) clearTimeout(orderUpdateTimer);
            orderUpdateTimer = setTimeout(fetchCount, 3000);
        };
        const unsubOrderUpdated = onSocketEvent('order:updated', handleOrderEvent);
        const unsubOrderCreated = onSocketEvent('order:created', handleOrderEvent);

        // Re-fetch al volver a la pestaña
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') fetchCount();
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            cancelledRef.current = true;
            clearInterval(pollTimer);
            unsubBus();
            if (orderUpdateTimer) clearTimeout(orderUpdateTimer);
            unsubOrderUpdated();
            unsubOrderCreated();
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [inventoryEnabled, fetchCount]);

    return { lowStockCount };
};
