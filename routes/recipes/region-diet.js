const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const RecipeIngredient = require("../../models/RecipeIngredient");
const { patternsForDiet } = require("../../utils/diet");
const { pageParams } = require("../../middleware/pagination");
const { cacheRoute } = require("../../middleware/cache");

// GET /region-diet?region=indian&diet=vegetarian&page=1
router.get("/", cacheRoute(60_000), async (req, res, next) => {
  try {
    const { region, diet } = req.query;
    if (!region || !diet) return res.status(400).json({ error: "region and diet are required" });

    const { forbidCat, forbidName } = patternsForDiet(diet);
    if (!forbidCat.length && !forbidName.length) return res.status(400).json({ error: "unsupported diet" });

    // exclude forbidden ingredients
    const orConds = [];
    // Iteration 2: Use Predicted_Category
    forbidCat.forEach(r => orConds.push({ Predicted_Category: { $regex: r } }));
    forbidName.forEach(r => orConds.push({ NAME_lc: { $regex: r } }));

    const badIngredientRecipes = await RecipeIngredient.aggregate([
      { $match: { $or: orConds } },
      { $group: { _id: "$Recipe_ID" } }
    ]);

    // exlcude forbidden titles
    const titleConds = [];
    forbidName.forEach(r => titleConds.push({ Recipe_Title: { $regex: r } }));
    
    const badTitleRecipes = await Recipe.find({ $or: titleConds }).select("Recipe_ID").lean();

    // combine and exclude
    const forbiddenSet = new Set([
        ...badIngredientRecipes.map(x => x._id),
        ...badTitleRecipes.map(x => x.Recipe_ID)
    ]);

    const { skip, limit } = pageParams(req);

    // Query: (Matches Region) AND (Not Forbidden)
    const items = await Recipe.find({
      Recipe_ID: { $nin: Array.from(forbiddenSet) },
      Cuisine: new RegExp(region, "i")
    })
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