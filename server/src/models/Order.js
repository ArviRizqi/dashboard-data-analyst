import mongoose from 'mongoose';

export const ORDER_STATUSES = ['delivered', 'shipped', 'processing', 'cancelled', 'returned'];

// Sheet "orders" pada gayanara_data_bersih.json (kunci: order_id).
const orderSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    order_id: { type: String, required: true },
    customer_id: { type: String, required: true },
    order_date: { type: Date, required: true },
    order_month: Date,
    order_year: Number,
    order_status: { type: String, required: true, enum: ORDER_STATUSES },
    is_delivered: Number,
    total_amount_idr: { type: Number, required: true },
    gross_amount_idr: Number,
    discount_amount_idr: { type: Number, default: 0 },
    shipping_cost_idr: { type: Number, default: 0 },
    shipping_city: String,
    shipping_province: String,
    payment_method: String,
    courier: String,
    promo_code: String,
    promo_flag: String,
    order_age_days: Number,
    is_stuck: Number,
    before_registration: Number,
  },
  { versionKey: false }
);

orderSchema.index({ company: 1, order_id: 1 }, { unique: true });

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
