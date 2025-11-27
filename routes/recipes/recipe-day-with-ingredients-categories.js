const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const RecipeIngredient = require("../../models/RecipeIngredient");
const { cacheRoute } = require("../../middleware/cache");

// GET /recipe-day/with-ingredients-categories?includeFlavor=Spices&includeDiet=vegetarian
router.get("/", cacheRoute(86_400_000 /* 24h */), async (req, res, next) => {
  try {
    const includeFlavor = (req.query.includeFlavor || "").split(",").map(s => s.trim()).filter(Boolean);
    const excludeFlavor = (req.query.excludeFlavor || "").split(",").map(s => s.trim()).filter(Boolean);
    const includeDiet   = (req.query.includeDiet   || "").split(",").map(s => s.trim()).filter(Boolean);
    const excludeDiet   = (req.query.excludeDiet   || "").split(",").map(s => s.trim()).filter(Boolean);

    const toRegs = arr => arr.map(v => new RegExp(v, "i"));

    const incOr = [];
    if (includeFlavor.length) incOr.push({ FlavorDB_Category: { $in: toRegs(includeFlavor) } });
    if (includeDiet.length)   incOr.push({ Dietrx_Category:   { $in: toRegs(includeDiet)   } });

    const excNor = [];
    if (excludeFlavor.length) excNor.push({ FlavorDB_Category: { $in: toRegs(excludeFlavor) } });
    if (excludeDiet.length)   excNor.push({ Dietrx_Category:   { $in: toRegs(excludeDiet)   } });

    // Stage 1: candidates by includes
    const pipe = [];
    if (incOr.length) pipe.push({ $match: { $or: incOr } });
    pipe.push({ $group: { _id: "$Recipe_ID" } });

    // Stage 2: apply excludes
    if (excNor.length) {
      pipe.push(
        { $lookup: { from: "recipe_ingredients", localField: "_id", foreignField: "Recipe_ID", as: "ings" } },
        { $unwind: "$ings" },
        { $match: { $nor: excNor.map(cond => ({ 
          ...(cond.FlavorDB_Category ? { "ings.FlavorDB_Category": cond.FlavorDB_Category } : {}),
          ...(cond.Dietrx_Category   ? { "ings.Dietrx_Category":   cond.Dietrx_Category   } : {})
        })) } },
        { $group: { _id: "$_id" } }
      );
    }

    const matches = await RecipeIngredient.aggregate(pipe);
    const ids = matches.map(x => x._id);

    const today = new Date().toISOString().slice(0, 10);
    if (!ids.length) return res.json({ date: today, recipe: null });

    // Deterministic pick for the day
    const idx = parseInt(today.replace(/-/g, ""), 10) % ids.length;
    const recipe = await Recipe.findOne({ Recipe_ID: ids[idx] })
      .select({
        Recipe_ID: 1, Recipe_Title: 1, Image_URL: 1, Cuisine: 1, Category: 1,
        Ratings: 1, Ratings_Count: 1, Nutrition: 1
      })
      .lean();

    res.json({ date: today, recipe });
  } catch (e) { next(e); }
});

module.exports = router;
