const mongoose = require('mongoose');

module.exports = mongoose.model('Order', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  checkoutToken: { type: String, unique: true, required: true },
  items: [{ book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' }, title: String, price: Number, quantity: Number }],
  recipient: { name: String, phone: String, address: String, note: String },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['COD'], default: 'COD' },
  status: { type: String, enum: ['pending'], default: 'pending' }
}, { timestamps: true }));
