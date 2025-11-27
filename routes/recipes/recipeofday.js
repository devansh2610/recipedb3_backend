const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");

// GET /recipeofday  -> deterministic pick based on the GMT (UTC) date
router.get("/", async (_req, res, next) => {
  try {
    // Use UTC date so it's timezone-agnostic
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const seed = parseInt(today.replace(/-/g, ""), 10);  // e.g., 20251008

    // Scale to any dataset size
    //const total = await Recipe.estimatedDocumentCount(); // fast approximate count
    const total = await Recipe.countDocuments({}); // fast approximate count
    if (!total) return res.json({ date: today, recipe: null });

    const skip = seed % total;

    const recipe = await Recipe.findOne({}).skip(skip).lean();
    res.json({ date: today, recipe });
  } catch (e) { next(e); }
});

module.exports = router;
