const mongoose = require("mongoose");

const RecipeInstructionSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // hash of row
  Recipe_ID: String,
  "Recipe Name": String,
  Instruction: String,     // The full sentence
  ACTION: String,          // Renamed from COOKING_INSTRUCTION
  DRYFRESH: String,        // Renamed from DRY_FRESH
  FORM: String,
  INGREDIENT: String,      // Renamed from INGREDIENT_NAME
  PREPROCESS: String,      // Renamed from PREPROCESSING
  QUANTITY: String,
  SIZE: String,
  STATE: String,
  TEMPERATURE: String,
  TIME: String,
  UNIT: String,
  UTENSIL: String
}, { versionKey: false });

// Create indexes for the new field names to ensure fast filtering
RecipeInstructionSchema.index({ Recipe_ID: 1 });
RecipeInstructionSchema.index({ ACTION: 1 }); // Useful for /recipes-method

module.exports = mongoose.model("RecipeInstruction", RecipeInstructionSchema, "recipe_instructions");