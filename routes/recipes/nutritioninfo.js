const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");

router.get("/:id", async (req, res, next) => {
  try {
    const recipe = await Recipe.findOne({ Recipe_ID: req.params.id }, { Nutrition: 1 }).lean();
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    res.json(recipe.Nutrition);
  } catch (e) { next(e); }
});

module.exports = router;
