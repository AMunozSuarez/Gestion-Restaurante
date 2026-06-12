const listeners = new Set();

export const subscribeInventoryChange = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};

export const notifyInventoryChange = () => {
    listeners.forEach((fn) => fn());
};
