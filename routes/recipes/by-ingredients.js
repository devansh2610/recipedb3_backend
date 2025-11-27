const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const RecipeIngredient = require("../../models/RecipeIngredient");
const { sliceIdsForPage } = require("../../middleware/pagination");
const { cacheRoute } = require("../../middleware/cache");

// GET /by-ingredients?include=tomato,onion&exclude=beef&page=1
router.get("/", cacheRoute(60_000), async (req, res, next) => {
  try {
    const includes = (req.query.include || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    const excludes = (req.query.exclude || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

    if (!includes.length && !excludes.length) return res.json([]);

    // Stage 1: include all
    let idsAgg;
    if (includes.length) {
      idsAgg = await RecipeIngredient.aggregate([
        { $match: { NAME_lc: { $in: includes } } },   // exact lc matches are fastest
        { $group: { _id: "$Recipe_ID", matchCount: { $sum: 1 } } },
        { $match: { matchCount: { $gte: includes.length } } },
        { $project: { _id: 1 } }
      ]);
    } else {
      idsAgg = await RecipeIngredient.aggregate([
        { $group: { _id: "$Recipe_ID" } }
      ]);
    }

    // Stage 2: exclude any
    let allIds = idsAgg.map(x => x._id);
    if (excludes.length) {
      // Keep only recipes where no ingredient NAME_lc is in excludes
      const bad = await RecipeIngredient.aggregate([
        { $match: { Recipe_ID: { $in: allIds }, NAME_lc: { $in: excludes } } },
        { $group: { _id: "$Recipe_ID" } }
      ]);
      const badSet = new Set(bad.map(b => b._id));
      allIds = allIds.filter(id => !badSet.has(id));
    }

    allIds.sort(); // deterministic
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
