const mongoose = require("mongoose");

const IngredientSchema = new mongoose.Schema({
  Ing_ID: { type: String, required: true, unique: true },  // 8-digit padded
  Ingredient: String,
  Frequency: Number,
  generic_name: String,
  wikilink: String,
  wikiimage: String,
  FlavorDB_Category: String,
  Dietrx_Category: String,
  Flavor_DB_Link: String,
  flavordb_id: String,
  Diet_rx_link: String
}, { versionKey: false });

module.exports = mongoose.model("Ingredient", IngredientSchema, "ingredients_lookup");