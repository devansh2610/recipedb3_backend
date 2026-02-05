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

    // Iteration 2: Build OR over Predicted_Category (new diet field) and NAME_lc
    // We check Predicted_Category (e.g. "Meat") and Ingredient Name (e.g. "Bacon")
    const orConds = [];
    forbidCat.forEach(r => orConds.push({ Predicted_Category: { $regex: r } }));
    forbidName.forEach(r => orConds.push({ NAME_lc: { $regex: r } }));

    // Get IDs of recipes with bad ingredients
    const badIngredientRecipes = await RecipeIngredient.aggregate([
      { $match: { $or: orConds } },
      { $group: { _id: "$Recipe_ID" } }
    ]);
    
    // Also checking title here (for safety) -> If the title says "Beef Stir Fry", we block it immediately even if ingredients are vague.
    const titleConds = [];
    forbidName.forEach(r => titleConds.push({ Recipe_Title: { $regex: r } }));
    
    // Use .lean() and select only ID for performance
    const badTitleRecipes = await Recipe.find({ $or: titleConds }).select("Recipe_ID").lean();

    // combine and exclude
    const forbiddenSet = new Set([
        ...badIngredientRecipes.map(x => x._id),
        ...badTitleRecipes.map(x => x.Recipe_ID)
    ]);

    const { skip, limit } = pageParams(req);

    // Return only recipes NOT in the forbidden set
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