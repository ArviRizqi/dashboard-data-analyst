import mongoose from 'mongoose';

// Sheet "reviews" (kunci: review_id; order_id -> orders, product_id -> products).
const reviewSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    review_id: { type: String, required: true },
    order_id: { type: String, required: true },
    product_id: { type: String, required: true },
    customer_id: String,
    rating: { type: Number, required: true, min: 1, max: 5 },
    review_date: { type: Date, required: true },
    review_year: Number,
    review_quarter: String,
    helpful_count: { type: Number, default: 0 },
    review_text: String,
  },
  { versionKey: false }
);

reviewSchema.index({ company: 1, review_id: 1 }, { unique: true });

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
