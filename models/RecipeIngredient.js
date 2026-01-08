const mongoose = require("mongoose");

const RecipeIngredientSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // hash of row
  Recipe_ID: String,
  Ingredient_Phrases: String, // Renamed from Ingredient
  NAME: String,
  QUANTITY: String,
  UNIT: String,
  STATE: String,
  TEMP: String,               // NEW field
  DF: String,
  Ing_ID: String,
  
  // Shadow fields for optimization (populated via migration script)
  NAME_lc: String,            // Lowercase name for regex search
  FlavorDB_Category: String,  // Denormalized from Ingredient table
  Predicted_Category: String  // Denormalized from new Ingredient Category table
}, { versionKey: false });

RecipeIngredientSchema.index({ Recipe_ID: 1 });
RecipeIngredientSchema.index({ Ing_ID: 1 });
RecipeIngredientSchema.index({ NAME_lc: 1 });
RecipeIngredientSchema.index({ Predicted_Category: 1 }); // For Diet logic
RecipeIngredientSchema.index({ FlavorDB_Category: 1 });

module.exports = mongoose.model("RecipeIngredient", RecipeIngredientSchema, "recipe_ingredients");