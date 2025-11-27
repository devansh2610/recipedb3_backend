const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const RecipeInstruction = require("../../models/RecipeInstruction");
const { sliceIdsForPage } = require("../../middleware/pagination");
const { cacheRoute } = require("../../middleware/cache");

// GET /byutensils/utensils?utensils=pan,skillet&page=1
router.get("/utensils", cacheRoute(60_000), async (req, res, next) => {
  try {
    const list = (req.query.utensils || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!list.length) return res.status(400).json({ error: "utensils query is required (comma-separated)" });

    // Combine as OR of regex for each term
    const matchAny = { $or: list.map(t => ({ UTENSIL_lc: { $regex: t } })) };

    const idsAgg = await RecipeInstruction.aggregate([
      { $match: matchAny },
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
