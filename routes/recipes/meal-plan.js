const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");

// GET /meal-plan?target_calories=1800&meals=3&cuisine=indian&protein_min_total=60
router.get("/", async (req, res, next) => {
  try {
    const target = Number(req.query.target_calories || 1800);
    const meals = Math.max(1, Math.min(6, Number(req.query.meals || 3)));
    const cuisine = req.query.cuisine;
    const proteinMinTotal = req.query.protein_min_total ? Number(req.query.protein_min_total) : undefined;

    const perMeal = target / meals;
    const low = perMeal * 0.6;
    const high = perMeal * 1.4;

    const baseFilter = {
      "Nutrition.Calories": { $gte: low, $lte: high }
    };
    if (cuisine) baseFilter.Cuisine = new RegExp(cuisine, "i");

    // Fetch a pool of candidates then pick greedily
    const pool = await Recipe.find(baseFilter)
      .sort({ Ratings_Count: -1, Ratings: -1 })
      .limit(300) // small pool to keep it fast
      .lean();

    const chosen = [];
    const usedIds = new Set();

    // Helper: pick the recipe closest to perMeal not yet used
    const pick = () => {
      let best = null, bestDiff = Infinity;
      for (const r of pool) {
        if (usedIds.has(r.Recipe_ID)) continue;
        const cal = r?.Nutrition?.Calories ?? Infinity;
        const diff = Math.abs(cal - perMeal);
        if (diff < bestDiff) { best = r; bestDiff = diff; }
      }
      if (best) usedIds.add(best.Recipe_ID);
      return best;
    };

    for (let i = 0; i < meals; i++) {
      const r = pick();
      if (r) chosen.push(r);
    }

    // Fallback: if pool too small, backfill with any recipes under target
    if (chosen.length < meals) {
      const more = await Recipe.find(cuisine ? { Cuisine: new RegExp(cuisine, "i") } : {})
        .sort({ Ratings_Count: -1 })
        .limit(meals - chosen.length)
        .lean();
      for (const r of more) if (!usedIds.has(r.Recipe_ID)) { chosen.push(r); usedIds.add(r.Recipe_ID); }
    }

    // Summaries
    const total = chosen.reduce((acc, r) => {
      const N = r.Nutrition || {};
      acc.calories += N.Calories || 0;
      acc.protein  += N.Protein || 0;
      acc.fat      += N.Fat || 0;
      acc.carbs    += N.Carbohydrates || 0;
      return acc;
    }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

    const okProtein = proteinMinTotal != null ? total.protein >= proteinMinTotal : true;

    res.json({
      target_calories: target,
      meals_requested: meals,
      protein_min_total: proteinMinTotal,
      meets_protein_min_total: okProtein,
      totals: total,
      items: chosen
    });
  } catch (e) { next(e); }
});

module.exports = router;
