const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");

// GET /recipe-Day-category?category=Dessert
router.get("/", async (req, res, next) => {
  try {
    const { category } = req.query;
    if (!category) return res.status(400).json({ error: "category is required" });

    const today = new Date().toISOString().slice(0, 10);
    const total = await Recipe.countDocuments({ Category: new RegExp(category, "i") });
    if (!total) return res.json({ date: today, recipe: null });

    const idx = parseInt(today.replace(/-/g, ""), 10) % total;
    const recipe = await Recipe.findOne({ Category: new RegExp(category, "i") }).skip(idx).lean();

    res.json({ date: today, recipe, category });
  } catch (e) { next(e); }
});

module.exports = router;
