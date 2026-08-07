// Normaliza order.foods al mismo shape que usa printingService.generateKitchenOrder,
// para que las tarjetas del KDS muestren los mismos datos que la comanda impresa.
export const normalizeKitchenItems = (order) => {
  if (!order || !Array.isArray(order.foods)) return [];

  return order.foods.map((item) => ({
    id: item._id,
    productName: item.food?.title || item.food?.name || 'Producto',
    quantity: item.quantity || 1,
    notes: item.comment || '',
    selectedExtras: item.selectedExtras || [],
    ready: Boolean(item.ready),
  }));
};
