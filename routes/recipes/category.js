const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const { findPaged } = require("../../middleware/pagination");

router.get("/", async (req, res, next) => {
  try {
    const { category } = req.query;
    const query = category ? { Category: new RegExp(category, "i") } : {};

    const items = await findPaged(Recipe, query, {
      sort: { Ratings_Count: -1, Ratings: -1 }
    }, req);

    res.json(items);
  } catch (e) { next(e); }
});

module.exports = router;
