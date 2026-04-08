const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const RecipeIngredient = require("../../models/RecipeIngredient");
const { patternsForDiet } = require("../../utils/diet");
const { pageParams } = require("../../middleware/pagination");
const { cacheRoute } = require("../../middleware/cache");

router.get("/", cacheRoute(60_000), async (req, res, next) => {
  try {
    const { diet } = req.query;
    if (!diet) return res.status(400).json({ error: "diet is required" });

    const { forbidCat, forbidName } = patternsForDiet(diet);
    if (!forbidCat.length && !forbidName.length) return res.status(400).json({ error: "unsupported diet" });

    // 1. Check Ingredients (Predicted_Category and NAME_lc)
    const orConds = [];
    if (forbidCat.length > 0) orConds.push({ Predicted_Category: { $in: forbidCat } });
    if (forbidName.length > 0) orConds.push({ NAME_lc: { $in: forbidName } });

    // Get IDs of recipes with bad ingredients
    const badIngredientRecipes = await RecipeIngredient.aggregate([
      { $match: { $or: orConds } },
      { $group: { _id: "$Recipe_ID" } }
    ]);
    
    // 2. Check Recipe Title AND Category
    // Combine ALL forbidden words and categories to rigorously scan the recipe metadata
    const allForbiddenRegexes = [...forbidName, ...forbidCat];
    
    const badRecipeMeta = await Recipe.find({
      $or: [
        { Recipe_Title: { $in: allForbiddenRegexes } },
        { Category: { $in: allForbiddenRegexes } }
      ]
    }).select("Recipe_ID").lean();

    // 3. Combine and Exclude
    const forbiddenSet = new Set([
        ...badIngredientRecipes.map(x => x._id),
        ...badRecipeMeta.map(x => x.Recipe_ID)
    ]);

    const { skip, limit } = pageParams(req);

    // 4. Return only recipes NOT in the forbidden set
    const items = await Recipe.find({ Recipe_ID: { $nin: Array.from(forbiddenSet) } })
      .sort({ Ratings_Count: -1, Ratings: -1 })
      .skip(skip)
      .limit(limit)
      .select({
        Recipe_ID: 1, Recipe_Title: 1, Image_URL: 1, Cuisine: 1, Category: 1,
        Ratings: 1, Ratings_Count: 1, "Nutrition.Calories": 1
      })
      .lean();

    res.json(items);
  } catch (e) { next(e); }
});

module.exports = router;
