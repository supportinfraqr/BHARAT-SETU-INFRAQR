const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
  name: {
    type: String,
    required: true
  },
  permissions: [],
}, {
  timestamps: true,
});

const Category = mongoose.model('Category', CategorySchema);

// Export the model
module.exports = { Category, CategorySchema };
