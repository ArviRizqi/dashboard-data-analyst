import mongoose from 'mongoose';
import { ORDER_STATUSES } from './Order.js';

// Sheet "order_items" (kunci: item_id; order_id -> orders, product_id -> products).
const orderItemSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    item_id: { type: String, required: true },
    order_id: { type: String, required: true },
    product_id: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit_price_idr: Number,
    subtotal_idr: { type: Number, required: true },
    // Disalin dari orders agar mudah dihitung (sama seperti dataset aslinya).
    order_status: { type: String, enum: ORDER_STATUSES },
    order_date: Date,
    order_year: Number,
    shipping_province: String,
  },
  { versionKey: false }
);

orderItemSchema.index({ company: 1, item_id: 1 }, { unique: true });
orderItemSchema.index({ company: 1, order_id: 1 });

export const OrderItem = mongoose.models.OrderItem || mongoose.model('OrderItem', orderItemSchema);
