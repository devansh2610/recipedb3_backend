const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const { findPaged } = require("../../middleware/pagination");
const { normalize } = require("../../middleware/normalize");

router.get("/", normalize, async (req, res, next) => {
  try {
    const { cuisine, category } = req.query;
    const query = {};
    if (cuisine) query.Cuisine = new RegExp(cuisine, "i");
    if (category) query.Category = new RegExp(category, "i");

    const paginatedData = await findPaged(Recipe, query, {
      sort: { Ratings_Count: -1, Ratings: -1 }
    }, req);

    res.json(paginatedData);
  } catch (e) { next(e); }
});

module.exports = router;