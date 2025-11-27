const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const { findPaged } = require("../../middleware/pagination");

router.get("/:region", async (req, res, next) => {
  try {
    const query = { Cuisine: new RegExp(req.params.region, "i") };

    const items = await findPaged(Recipe, query, {
      sort: { Ratings_Count: -1, Ratings: -1 }
    }, req);

    res.json(items);
  } catch (e) { next(e); }
});

module.exports = router;
