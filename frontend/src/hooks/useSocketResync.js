import { useEffect, useRef } from 'react';
import { onSocketEvent } from '../services/socketService';

// Vuelve a cargar los datos cuando el socket se reconecta o la pestaña vuelve a
// estar visible: los eventos emitidos sin red se pierden y la pantalla quedaba
// desactualizada hasta recargar el navegador.
export const useSocketResync = (resync, { events = [] } = {}) => {
  const resyncRef = useRef(resync);
  resyncRef.current = resync;
  const eventsKey = events.join('|');

  useEffect(() => {
    const run = () => resyncRef.current?.();
    const unsubs = ['connect', ...eventsKey.split('|').filter(Boolean)].map((evt) => onSocketEvent(evt, run));

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubs.forEach((u) => u());
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [eventsKey]);
};

export default useSocketResync;
