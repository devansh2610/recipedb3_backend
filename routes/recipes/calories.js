const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const { findPaged } = require("../../middleware/pagination");

function nonNeg(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : undefined;
}

router.get("/", async (req, res, next) => {
  try {
    const min = nonNeg(req.query.min);
    const max = nonNeg(req.query.max);

    const q = {};
    if (min !== undefined) q["Nutrition.Calories"] = { ...(q["Nutrition.Calories"] || {}), $gte: min };
    if (max !== undefined) q["Nutrition.Calories"] = { ...(q["Nutrition.Calories"] || {}), $lte: max };

    const items = await findPaged(Recipe, q, { sort: { "Nutrition.Calories": 1 } }, req);
    res.json(items);
  } catch (e) { next(e); }
});

module.exports = router;
