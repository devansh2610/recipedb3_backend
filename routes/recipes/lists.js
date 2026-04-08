// routes/recipes/lists.js
const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const RecipeIngredient = require("../../models/RecipeIngredient");
const { cacheRoute } = require("../../middleware/cache");

// GET /lists
// We cache this for 24 hours (86_400_000 ms) because these categories rarely change, 
// and `distinct` queries can be heavy on the database.
router.get("/", cacheRoute(86_400_000), async (req, res, next) => {
  try {
    const diets = ["Vegan", "Vegetarian", "Eggetarian", "Pescatarian"];

    // 2. Fetch distinct values directly from MongoDB
    // .filter(Boolean) removes any null or empty string values
    const rawCuisines = await Recipe.distinct("Cuisine");
    const cuisines = rawCuisines.filter(Boolean).sort();

    const rawCategories = await Recipe.distinct("Category");
    const categories = rawCategories.filter(Boolean).sort();

    const rawFlavors = await RecipeIngredient.distinct("FlavorDB_Category");
    const flavors = rawFlavors.filter(Boolean).sort();

    const rawIngredients = await RecipeIngredient.distinct("NAME_lc");
    const ingredients = rawIngredients.filter(Boolean).sort();

    res.json({
      diets,
      cuisines,
      categories,
      flavors,
      ingredients
    });

  } catch (e) { 
    next(e); 
  }
});

module.exports = router;