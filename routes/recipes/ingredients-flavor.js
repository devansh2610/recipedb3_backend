const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const RecipeIngredient = require("../../models/RecipeIngredient");
const { sliceIdsForPage } = require("../../middleware/pagination");
const { cacheRoute } = require("../../middleware/cache");

// GET /ingredients/flavor/:flavor?page=1
router.get("/:flavor", cacheRoute(60_000), async (req, res, next) => {
  try {
    const target = (req.params.flavor || "").toLowerCase();

    // Directly match on denormalized taxonomy (indexed)
    const idsAgg = await RecipeIngredient.aggregate([
      { $match: { FlavorDB_Category: { $regex: target, $options: "i" } } },
      { $group: { _id: "$Recipe_ID" } },
      { $sort: { _id: 1 } }
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
