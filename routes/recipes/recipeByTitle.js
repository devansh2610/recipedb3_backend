const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const { findPaged } = require("../../middleware/pagination");
const { cacheRoute } = require("../../middleware/cache");

// GET /recipeByTitle?title=chicken&page=1
router.get("/", cacheRoute(60_000), async (req, res, next) => {
  try {
    const title = (req.query.title || "").toLowerCase().trim();
    const query = title
      ? { Recipe_Title_lc: { $regex: title } }   // case-insensitive via lc shadow
      : {};
    const items = await findPaged(Recipe, query, {
      sort: { Ratings_Count: -1, Ratings: -1 },
      select: { // lean list card
        Recipe_ID: 1, Recipe_Title: 1, Image_URL: 1, Cuisine: 1, Category: 1,
        Ratings: 1, Ratings_Count: 1, "Nutrition.Calories": 1
      }
    }, req);
    res.json(items);
  } catch (e) { next(e); }
});

module.exports = router;
