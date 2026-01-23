const mongoose = require("mongoose");

const RecipeSchema = new mongoose.Schema({
  Recipe_ID: { type: String, required: true, unique: true },
  URL: String,
  Source: String,
  Image_ID: String,
  Image_URL: String,
  Recipe_Title: { type: String, required: true },
  Prep_Time: String,
  Cook_Time: String,
  Total_Time: String,
  Instructions: String,
  Category: String,
  Cuisine: String,
  Servings: Number,
  Ratings: Number,
  Ratings_Count: Number,  // basically the Votes column

  // From Nutrition.csv
  Nutrition: {
    Calories: Number,
    Fat: Number,
    Saturated_Fat: Number,
    Cholesterol: Number,
    Sodium: Number,
    Carbohydrates: Number,
    Fiber: Number,
    Sugar: Number,
    Protein: Number
  }
}, { versionKey: false });

module.exports = mongoose.model("Recipe", RecipeSchema, "recipes");