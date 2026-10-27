import mongoose from 'mongoose';

// Sheet "products" (kunci: product_id).
const productSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    product_id: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    sub_category: String,
    brand: String,
    material: String,
    price_idr: { type: Number, required: true },
    price_band: String,
    stock: { type: Number, default: 0 },
    is_stock_zero: Number,
    total_terjual: { type: Number, default: 0 },
    avg_rating: Number,
  },
  { versionKey: false }
);

productSchema.index({ company: 1, product_id: 1 }, { unique: true });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
