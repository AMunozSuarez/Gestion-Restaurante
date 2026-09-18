import { useState, useEffect, useRef, useCallback } from 'react';
import selfServiceService from '../services/selfServiceService';
import { STATUS_POLL_MS } from '../constants/selfService';

/**
 * Catálogo del kiosco + vigilancia del estado.
 *
 * Además de traer el menú, hace polling ligero de /status para detectar que el dueño apagó
 * un producto, cerró la caja o deshabilitó el módulo. Si `menuVersion` cambia se recarga el
 * catálogo, de modo que el carrito pueda revalidarse ANTES de que el cliente confirme
 * (en vez de enterarse con un 409 al final).
 */
const useSelfServiceMenu = () => {
  const [menu, setMenu] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Se guarda en ref para que el intervalo no tenga que recrearse en cada cambio de menú.
  const menuVersionRef = useRef(null);
  const isMountedRef = useRef(true);

  const loadMenu = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);

    const result = await selfServiceService.getMenu();

    if (!isMountedRef.current) return null;

    if (result.ok) {
      setMenu(result.data);
      menuVersionRef.current = result.data.menuVersion;
      setError(null);
    } else {
      setError(result.message);
    }

    if (!silent) setIsLoading(false);
    return result.ok ? result.data : null;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadMenu();

    return () => { isMountedRef.current = false; };
  }, [loadMenu]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await selfServiceService.getStatus();
      if (!isMountedRef.current || !result.ok) return;

      const status = result.data;

      // El estado del módulo y de la caja se reflejan de inmediato, sin recargar el menú.
      setMenu((prev) => (prev
        ? { ...prev, selfServiceEnabled: status.selfServiceEnabled, cashRegisterOpen: status.cashRegisterOpen }
        : prev));

      if (status.menuVersion && status.menuVersion !== menuVersionRef.current) {
        loadMenu({ silent: true });
      }
    }, STATUS_POLL_MS);

    return () => clearInterval(interval);
  }, [loadMenu]);

  return {
    menu,
    products: menu?.products || [],
    categories: menu?.categories || [],
    settings: menu?.settings || { requireCustomerName: true, allowOrderComment: false },
    restaurantName: menu?.restaurantName || '',
    selfServiceEnabled: menu?.selfServiceEnabled ?? null,
    cashRegisterOpen: menu?.cashRegisterOpen ?? null,
    menuVersion: menu?.menuVersion || null,
    isLoading,
    error,
    refreshMenu: loadMenu,
  };
};

export default useSelfServiceMenu;
