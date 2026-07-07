const mongoose = require('mongoose');

const menuVisitSchema = new mongoose.Schema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    type: { type: String, enum: ['menu_visit', 'category_view', 'product_view'], required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' },
}, { timestamps: { createdAt: true, updatedAt: false } });

menuVisitSchema.index({ restaurant: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('MenuVisit', menuVisitSchema);
