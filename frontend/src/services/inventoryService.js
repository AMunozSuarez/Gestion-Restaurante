import api from './api';

const inventoryService = {
    // Insumos
    getItems: (params = {}) =>
        api.get('/inventory/items', { params }).then(r => r.data),

    createItem: (data) =>
        api.post('/inventory/items', data).then(r => r.data),

    updateItem: (id, data) =>
        api.put(`/inventory/items/${id}`, data).then(r => r.data),

    deleteItem: (id) =>
        api.delete(`/inventory/items/${id}`).then(r => r.data),

    adjustStock: (id, data) =>
        api.post(`/inventory/items/${id}/adjust`, data).then(r => r.data),

    // Movimientos
    getMovements: (params = {}) =>
        api.get('/inventory/movements', { params }).then(r => r.data),

    // Recetas de productos
    getFoodRecipe: (foodId) =>
        api.get(`/inventory/recipe/food/${foodId}`).then(r => r.data),

    updateFoodRecipe: (foodId, recipe) =>
        api.put(`/inventory/recipe/food/${foodId}`, { recipe }).then(r => r.data),

    // Recetas de extras
    getExtraRecipe: (sectionId, extraId) =>
        api.get(`/inventory/recipe/extra/${sectionId}/${extraId}`).then(r => r.data),

    updateExtraRecipe: (sectionId, extraId, recipe) =>
        api.put(`/inventory/recipe/extra/${sectionId}/${extraId}`, { recipe }).then(r => r.data),

    // Toggle recipeEnabled
    toggleFoodRecipeEnabled: (foodId) =>
        api.patch(`/inventory/recipe/food/${foodId}/toggle`).then(r => r.data),

    toggleExtraRecipeEnabled: (sectionId, extraId) =>
        api.patch(`/inventory/recipe/extra/${sectionId}/${extraId}/toggle`).then(r => r.data),
};

export default inventoryService;
