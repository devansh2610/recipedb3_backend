const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const RecipeIngredient = require("../../models/RecipeIngredient");
const { patternsForDiet } = require("../../utils/diet");
const { pageParams } = require("../../middleware/pagination");
const { cacheRoute } = require("../../middleware/cache");

// GET /recipe-diet?diet=vegan&page=1
router.get("/", cacheRoute(60_000), async (req, res, next) => {
  try {
    const { diet } = req.query;
    if (!diet) return res.status(400).json({ error: "diet is required" });

    const { forbidCat, forbidName } = patternsForDiet(diet);
    if (!forbidCat.length && !forbidName.length) return res.status(400).json({ error: "unsupported diet" });

    // Build OR over Dietrx_Category and NAME_lc, then remove any recipe having matches
    const orConds = [];
    forbidCat.forEach(r => orConds.push({ Dietrx_Category: { $regex: r } }));
    forbidName.forEach(r => orConds.push({ NAME_lc: { $regex: r } }));

    // Get all forbidden recipe IDs (fast due to denormalized/indexed fields)
    const forbidden = await RecipeIngredient.aggregate([
      { $match: { $or: orConds } },
      { $group: { _id: "$Recipe_ID" } }
    ]);
    const forbiddenSet = new Set(forbidden.map(x => x._id));

    // Now get all recipe ids and subtract forbidden ones
    const okAgg = await RecipeIngredient.aggregate([
      { $group: { _id: "$Recipe_ID" } }
    ]);
    const okIds = okAgg.map(x => x._id).filter(id => !forbiddenSet.has(id));

    const { skip, limit } = pageParams(req);
    const items = await Recipe.find({ Recipe_ID: { $in: okIds } })
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
