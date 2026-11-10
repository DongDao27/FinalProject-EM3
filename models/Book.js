const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  sku: { type: String, unique: true, sparse: true },
  title: { type: String, required: true },
  author: { type: String, default: '' },
  category: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  publisher: String,
  pages: Number,
  image: String,
  bestseller: { type: Boolean, default: false },
  cover: { type: String, enum: ['forest', 'sand', 'rose', 'blue', 'orange', 'purple'], default: 'forest' }
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);
