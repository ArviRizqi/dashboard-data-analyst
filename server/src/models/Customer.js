import mongoose from 'mongoose';

// Sheet "customers" (kunci: customer_id). Nama, email, dan telepon sengaja tidak disimpan.
const customerSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    customer_id: { type: String, required: true },
    gender: String,
    age_group: String,
    city: String,
    province: String,
    registration_date: Date,
  },
  { versionKey: false }
);

customerSchema.index({ company: 1, customer_id: 1 }, { unique: true });

export const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
