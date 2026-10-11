import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRestaurant } from '../hooks/useRestaurant';
import { emitSocketEvent, getSocket, onSocketEvent } from '../services/socketService';
import { readCustomerDisplayConfig } from '../services/customerDisplayConfig';
import { formatChileanCurrency } from '../utils/dateUtils';

// Pantalla de cliente del mostrador: muestra en vivo el carrito que arma el cajero.
// Pensada para una pantalla chica (10") a ~1 m del cliente: sin controles, letra
// grande y el total siempre visible.
//
// - Usuario con rol carrito: el servidor lo une solo a su room al conectar.
// - Owner/empleado: se une a la pantalla vinculada en este equipo (ver
//   Configuración → Pantalla de cliente), útil para abrirla en otra pestaña.

const CONFIRMED_DISPLAY_MS = 5000;
const HIGHLIGHT_MS = 1500;
const IDLE_STATE = { status: 'idle', items: [] };

// Tamaños relativos al lado corto de la pantalla, acotados: se leen igual en una
// tablet de 10" vertical u horizontal que en un monitor chico por HDMI.
const FONT = {
  hero: 'clamp(2rem, 9vmin, 5rem)',
  title: 'clamp(1.3rem, 4.5vmin, 2.4rem)',
  item: 'clamp(1.05rem, 3.6vmin, 1.9rem)',
  small: 'clamp(0.85rem, 2.6vmin, 1.3rem)',
  total: 'clamp(1.8rem, 7.5vmin, 3.8rem)',
};

const itemSignature = (item) => `${item.quantity}|${item.lineTotal}|${item.comment}`;

const CustomerDisplay = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { restaurant, isLoading: isRestaurantLoading } = useRestaurant();
  const isCarrito = user?.role === 'carrito';
  const [targetUserId] = useState(() => (isCarrito ? '' : readCustomerDisplayConfig().targetUserId));
  const canListen = isCarrito || Boolean(targetUserId);

  const [displayState, setDisplayState] = useState(IDLE_STATE);
  const [isConnected, setIsConnected] = useState(() => Boolean(getSocket()?.connected));
  const [highlightKey, setHighlightKey] = useState(null);
  const confirmedUntilRef = useRef(0);
  const previousItemsRef = useRef([]);
  const itemRefs = useRef(new Map());

  const customerDisplayEnabled = Boolean(restaurant?.settings?.customerDisplay?.enabled);

  useEffect(() => {
    if (!canListen) return undefined;

    const handleState = (next) => {
      if (!next || typeof next !== 'object') return;
      const now = Date.now();

      if (next.status === 'confirmed') {
        confirmedUntilRef.current = now + CONFIRMED_DISPLAY_MS;
        setDisplayState(next);
        return;
      }
      // Tras confirmar, el mostrador limpia el carrito y manda "idle" al instante:
      // se ignora para que el "¡Gracias!" alcance a leerse. Un carrito nuevo sí lo corta.
      if (next.status === 'idle' && now < confirmedUntilRef.current) return;

      confirmedUntilRef.current = 0;
      setDisplayState(next.status === 'cart' ? next : IDLE_STATE);
    };

    const join = () => {
      // Las rooms se pierden al reconectar: hay que volver a unirse cada vez.
      if (!isCarrito) emitSocketEvent('customer-display:join', { targetUserId });
    };

    const unsubState = onSocketEvent('customer-display:state', handleState);
    const unsubConnect = onSocketEvent('connect', () => {
      setIsConnected(true);
      join();
    });
    const unsubDisconnect = onSocketEvent('disconnect', () => setIsConnected(false));

    if (getSocket()?.connected) {
      setIsConnected(true);
      join();
    }

    return () => {
      unsubState();
      unsubConnect();
      unsubDisconnect();
    };
  }, [canListen, isCarrito, targetUserId]);

  // Vuelta automática a la pantalla de espera después del "¡Gracias!"
  useEffect(() => {
    if (displayState.status !== 'confirmed') return undefined;
    const timer = setTimeout(() => {
      confirmedUntilRef.current = 0;
      setDisplayState(IDLE_STATE);
    }, CONFIRMED_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [displayState]);

  // Resalta y lleva a la vista el último producto agregado o modificado, para que
  // el cliente vea qué cambió aunque la lista no quepa entera en la pantalla.
  useEffect(() => {
    if (displayState.status !== 'cart') {
      previousItemsRef.current = [];
      return undefined;
    }

    const previous = new Map(previousItemsRef.current.map((item) => [item.key, itemSignature(item)]));
    const changed = [...displayState.items].reverse().find((item) => previous.get(item.key) !== itemSignature(item));
    previousItemsRef.current = displayState.items;
    if (!changed) return undefined;

    setHighlightKey(changed.key);
    itemRefs.current.get(changed.key)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const timer = setTimeout(() => setHighlightKey(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [displayState]);

  // Evita que la tablet / el monitor se apaguen por inactividad.
  useEffect(() => {
    let wakeLock = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {
        // No soportado o denegado: la pantalla sigue funcionando igual.
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      wakeLock?.release().catch(() => {});
    };
  }, []);

  if (isRestaurantLoading) {
    return (
      <div className="h-screen w-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!customerDisplayEnabled || !canListen) {
    return (
      <div className="h-screen w-screen bg-neutral-50 text-secondary-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-2">
            {customerDisplayEnabled ? 'Sin pantalla vinculada' : 'Pantalla de cliente desactivada'}
          </h2>
          <p className="text-sm text-neutral-700 mb-6">
            {customerDisplayEnabled
              ? 'Este equipo no tiene una pantalla de cliente vinculada. Elígela en Configuración → Pantalla de cliente.'
              : 'La pantalla de cliente no está habilitada para este restaurante. Esta función la activa el administrador del sistema — contáctalo si la necesitas.'}
          </p>
          {/* El usuario carrito no tiene a dónde volver: su sesión la cierra el owner. */}
          {!isCarrito && (
            <button
              onClick={() => navigate('/mostrador')}
              className="px-4 py-2.5 border border-neutral-300 text-secondary-800 rounded-lg text-sm font-medium hover:bg-neutral-100 transition-colors"
            >
              Volver
            </button>
          )}
        </div>
      </div>
    );
  }

  const restaurantName = restaurant?.name || '';
  const { status, items = [], customerName, subtotal = 0, tip = 0, total = 0, orderNumber } = displayState;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-neutral-50 text-secondary-900 select-none cursor-none">
      {status === 'cart' ? (
        <div className="h-full flex flex-col">
          <header className="flex-shrink-0 flex items-baseline justify-between gap-4 px-[4vmin] pt-[3vmin] pb-[2vmin] border-b border-neutral-200">
            <h1 className="font-display font-bold" style={{ fontSize: FONT.title }}>Tu pedido</h1>
            {customerName && (
              <span className="truncate text-neutral-700" style={{ fontSize: FONT.small }}>{customerName}</span>
            )}
          </header>

          <ul className="flex-1 min-h-0 overflow-y-auto px-[4vmin] py-[1.5vmin]">
            {items.map((item) => (
              <li
                key={item.key}
                ref={(el) => (el ? itemRefs.current.set(item.key, el) : itemRefs.current.delete(item.key))}
                className={`flex items-start gap-[2.5vmin] py-[1.8vmin] px-[1.5vmin] -mx-[1.5vmin] rounded-xl border-b border-neutral-200 last:border-b-0 transition-colors duration-500 ${
                  highlightKey === item.key ? 'bg-primary-100' : 'bg-transparent'
                }`}
              >
                <span
                  className="flex-shrink-0 min-w-[2.2em] text-center font-bold text-primary-700 bg-primary-50 rounded-lg px-1"
                  style={{ fontSize: FONT.item }}
                >
                  {item.quantity}×
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-tight break-words" style={{ fontSize: FONT.item }}>{item.name}</p>
                  {item.extras?.length > 0 && (
                    <p className="text-neutral-700 leading-snug mt-0.5" style={{ fontSize: FONT.small }}>
                      {item.extras
                        .map((extra) => (extra.quantity > 1 ? `${extra.quantity}× ${extra.name}` : extra.name))
                        .join(' · ')}
                    </p>
                  )}
                  {item.comment && (
                    <p className="italic text-neutral-600 leading-snug mt-0.5 break-words" style={{ fontSize: FONT.small }}>
                      “{item.comment}”
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 font-semibold tabular-nums" style={{ fontSize: FONT.item }}>
                  {formatChileanCurrency(item.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <footer className="flex-shrink-0 bg-secondary-800 text-white px-[4vmin] pt-[2vmin] pb-[3vmin]">
            {tip > 0 && (
              <div className="space-y-0.5 mb-[1vmin] text-neutral-200" style={{ fontSize: FONT.small }}>
                <div className="flex justify-between tabular-nums">
                  <span>Subtotal</span>
                  <span>{formatChileanCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between tabular-nums">
                  <span>Propina</span>
                  <span>{formatChileanCurrency(tip)}</span>
                </div>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4 font-bold tabular-nums" style={{ fontSize: FONT.total }}>
              <span>Total</span>
              <span>{formatChileanCurrency(total)}</span>
            </div>
          </footer>
        </div>
      ) : status === 'confirmed' ? (
        <div className="h-full flex flex-col items-center justify-center text-center px-[6vmin] bg-primary-600 text-white">
          <p className="font-display font-bold" style={{ fontSize: FONT.hero }}>¡Gracias!</p>
          {orderNumber != null && (
            <p className="mt-[2vmin] font-semibold" style={{ fontSize: FONT.title }}>Pedido #{orderNumber}</p>
          )}
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center px-[6vmin]">
          {restaurantName && (
            <p className="font-display font-bold text-secondary-800 break-words" style={{ fontSize: FONT.hero }}>
              {restaurantName}
            </p>
          )}
          <p className="mt-[3vmin] text-neutral-700" style={{ fontSize: FONT.title }}>¡Bienvenido!</p>
        </div>
      )}

      {/* Indicador discreto de conexión, como en el KDS: ayuda a diagnosticar sin molestar al cliente */}
      <span
        className={`absolute bottom-2 left-2 h-2 w-2 rounded-full ${isConnected ? 'bg-green-500/60' : 'bg-red-500 animate-pulse'}`}
        title={isConnected ? 'Conectado' : 'Sin conexión'}
      />
    </div>
  );
};

export default CustomerDisplay;
