const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const { normalize } = require("../../middleware/normalize");

// Exposes the micro-like fields available in Nutrition.csv
router.get("/:id", normalize, async (req, res, next) => {
  try {
    const doc = await Recipe.findOne(
      { Recipe_ID: req.params.id },
      { "Nutrition.Sodium": 1, "Nutrition.Cholesterol": 1, "Nutrition.Fiber": 1, "Nutrition.Sugar": 1, _id: 0 }
    ).lean();
    if (!doc) return res.status(404).json({ error: "Recipe not found" });
    res.json(doc.Nutrition || {});
  } catch (e) { next(e); }
});

module.exports = router;
