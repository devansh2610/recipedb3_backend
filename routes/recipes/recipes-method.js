const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const RecipeInstruction = require("../../models/RecipeInstruction");
const { sliceIdsForPage } = require("../../middleware/pagination");
const { cacheRoute } = require("../../middleware/cache");

// GET /recipes-method/:method?page=1
router.get("/:method", cacheRoute(60_000), async (req, res, next) => {
  try {
    const method = (req.params.method || "").toLowerCase();

    const idsAgg = await RecipeInstruction.aggregate([
      { $match: { COOKING_INSTRUCTION_lc: { $regex: method } } },
      { $group: { _id: "$Recipe_ID", n: { $sum: 1 } } },
      { $sort: { n: -1, _id: 1 } }
    ]);

    const allIds = idsAgg.map(x => x._id);
    const pageIds = sliceIdsForPage(allIds, req);

    const items = await Recipe.find({ Recipe_ID: { $in: pageIds } })
      .sort({ Ratings_Count: -1, Ratings: -1 })
      .select({
        Recipe_ID: 1, Recipe_Title: 1, Image_URL: 1, Cuisine: 1, Category: 1,
        Ratings: 1, Ratings_Count: 1, "Nutrition.Calories": 1
      })
      .lean();

    res.json(items);
  } catch (e) { next(e); }
});

module.exports = router;
