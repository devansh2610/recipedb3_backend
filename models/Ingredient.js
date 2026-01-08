const mongoose = require("mongoose");

const IngredientSchema = new mongoose.Schema({
  Ing_ID: { type: String, required: true, unique: true },
  Ingredient: String,
  Frequency: Number,
  Generic_Name: String,
  Wiki_Link: String,
  Wiki_Image: String,
  FlavorDB_Category: String,
  FlavorDB_Link: String,
  FlavorDB_ID: String
}, { versionKey: false });

module.exports = mongoose.model("Ingredient", IngredientSchema, "ingredients_lookup");