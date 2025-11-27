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
    const calories_min = nonNeg(req.query.calories_min);
    const calories_max = nonNeg(req.query.calories_max);
    const protein_min  = nonNeg(req.query.protein_min);
    const protein_max  = nonNeg(req.query.protein_max);

    const q = {};
    if (calories_min !== undefined) q["Nutrition.Calories"] = { ...(q["Nutrition.Calories"] || {}), $gte: calories_min };
    if (calories_max !== undefined) q["Nutrition.Calories"] = { ...(q["Nutrition.Calories"] || {}), $lte: calories_max };
    if (protein_min  !== undefined) q["Nutrition.Protein"]  = { ...(q["Nutrition.Protein"]  || {}), $gte: protein_min  };
    if (protein_max  !== undefined) q["Nutrition.Protein"]  = { ...(q["Nutrition.Protein"]  || {}), $lte: protein_max  };

    const items = await findPaged(Recipe, q, { sort: { Ratings_Count: -1, Ratings: -1 } }, req);
    res.json(items);
  } catch (e) { next(e); }
});

module.exports = router;
