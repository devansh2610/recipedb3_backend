const mongoose = require("mongoose");

const IngredientCategorySchema = new mongoose.Schema({
  Ing_ID: { type: String, required: true, unique: true }, // 8-digit padded
  Ingredient: String,
  Frequency: Number,
  Predicted_Category: String
}, { versionKey: false });

// Index for joining
IngredientCategorySchema.index({ Ing_ID: 1 });

module.exports = mongoose.model("IngredientCategory", IngredientCategorySchema, "ingredients_category_predicted");