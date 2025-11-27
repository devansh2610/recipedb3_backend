const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const { findPaged } = require("../../middleware/pagination");

router.get("/", async (req, res, next) => {
  try {
    const { has = "true" } = req.query;
    const cond = (String(has).toLowerCase() === "true")
      ? { Image_URL: { $exists: true, $ne: "" } }
      : { $or: [{ Image_URL: { $exists: false } }, { Image_URL: "" }] };

    const items = await findPaged(Recipe, cond, {
      sort: { Ratings_Count: -1, Ratings: -1 }
    }, req);

    res.json(items);
  } catch (e) { next(e); }
});

module.exports = router;
