const mongoose = require("mongoose");

const RecipeIngredientSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // hash of row (deterministic, avoids dupes)
  Recipe_ID: String,
  Ingredient: String,
  QUANTITY: String,
  UNIT: String,
  NAME: String,
  STATE: String,
  DF: String,
  FORM: String,
  SIZE: String,
  PREPROCESSING: String,
  Ing_ID: String  // padded
}, { versionKey: false });

module.exports = mongoose.model("RecipeIngredient", RecipeIngredientSchema, "recipe_ingredients");
