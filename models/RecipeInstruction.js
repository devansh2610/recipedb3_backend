const mongoose = require("mongoose");

const RecipeInstructionSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // hash of row
  Recipe_ID: String,
  "Recipe Name": String,
  Instruction: String,
  QUANTITY: String,
  UNIT: String,
  INGREDIENT_NAME: String,
  STATE: String,
  FORM: String,
  DRY_FRESH: String,
  SIZE: String,
  COOKING_INSTRUCTION: String,
  PREPROCESSING: String,
  TIME: String,
  TEMPERATURE: String,
  UTENSIL: String
}, { versionKey: false });

module.exports = mongoose.model("RecipeInstruction", RecipeInstructionSchema, "recipe_instructions");
