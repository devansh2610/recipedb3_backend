const express = require("express");
const router = express.Router();
const RecipeIngredient = require("../../models/RecipeIngredient");
const Ingredient = require("../../models/Ingredient");
const { cacheRoute } = require("../../middleware/cache");

// GET /ingredient-info/:name
router.get("/:name", cacheRoute(86_400_000), async (req, res, next) => {
  try {
    const ingName = req.params.name.toLowerCase().trim();

    const recipeIngMeta = await RecipeIngredient.findOne({ NAME_lc: ingName })
      .select("NAME_lc Ing_ID Predicted_Category FlavorDB_Category")
      .lean();

    if (!recipeIngMeta) {
      return res.status(404).json({ error: "Ingredient not found in the database." });
    }

    let officialDetails = {};
    if (recipeIngMeta.Ing_ID) {
      officialDetails = await Ingredient.findOne({ Ing_ID: recipeIngMeta.Ing_ID }).lean() || {};
    }

    const total_usage = await RecipeIngredient.countDocuments({ NAME_lc: ingName });

    res.json({
      name: recipeIngMeta.NAME_lc,
      ing_id: recipeIngMeta.Ing_ID || null,
      
      diet_category: recipeIngMeta.Predicted_Category || "Unknown",
      flavor_category: officialDetails.FlavorDB_Category || recipeIngMeta.FlavorDB_Category || "Unknown",
      
      generic_name: officialDetails.Generic_Name || null,
      wiki_link: officialDetails.Wiki_Link || null,
      wiki_image: officialDetails.Wiki_Image || null,
      
      flavor_db_id: officialDetails.FlavorDB_ID || null,
      flavor_db_link: officialDetails.FlavorDB_Link || null,
      
      dataset_frequency: officialDetails.Frequency || null,
      total_recipes_used_in: total_usage
    });

  } catch (e) {
    next(e);
  }
});

module.exports = router;