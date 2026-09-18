import { useState, useEffect, useRef, useCallback } from 'react';
import { IDLE_MS, IDLE_WARNING_MS } from '../constants/selfService';

/**
 * Reset por inactividad para el kiosco: si un cliente se va a mitad del pedido, la pantalla
 * no puede quedarse con su carrito esperando al siguiente.
 *
 * Tras IDLE_MS sin interacción muestra un aviso, y si tampoco hay respuesta en
 * IDLE_WARNING_MS ejecuta onTimeout. Mientras `enabled` sea false no hace nada, que es lo
 * que se usa en la pantalla de atracción y en la de confirmación (esa tiene su propio
 * temporizador).
 */
const useIdleReset = ({ enabled, onTimeout }) => {
  const [isWarning, setIsWarning] = useState(false);
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const onTimeoutRef = useRef(onTimeout);

  onTimeoutRef.current = onTimeout;

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    idleTimerRef.current = null;
    warningTimerRef.current = null;
  }, []);

  const startIdleTimer = useCallback(() => {
    clearTimers();
    idleTimerRef.current = setTimeout(() => {
      setIsWarning(true);
      warningTimerRef.current = setTimeout(() => {
        setIsWarning(false);
        onTimeoutRef.current?.();
      }, IDLE_WARNING_MS);
    }, IDLE_MS);
  }, [clearTimers]);

  /** El cliente respondió "sigo aquí": se cierra el aviso y se reinicia la cuenta. */
  const stayActive = useCallback(() => {
    setIsWarning(false);
    startIdleTimer();
  }, [startIdleTimer]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      setIsWarning(false);
      return undefined;
    }

    startIdleTimer();

    // Mientras el aviso está en pantalla no se reinicia solo con tocar: el cliente debe
    // confirmar explícitamente, para que un roce accidental no mantenga vivo un carrito ajeno.
    const onActivity = () => {
      if (warningTimerRef.current) return;
      startIdleTimer();
    };

    const events = ['pointerdown', 'keydown'];
    events.forEach((event) => window.addEventListener(event, onActivity));

    return () => {
      events.forEach((event) => window.removeEventListener(event, onActivity));
      clearTimers();
    };
  }, [enabled, startIdleTimer, clearTimers]);

  return { isWarning, stayActive };
};

export default useIdleReset;
