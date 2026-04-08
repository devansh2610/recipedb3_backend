const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const RecipeIngredient = require("../../models/RecipeIngredient");
const { pageParams } = require("../../middleware/pagination");
const { cacheRoute } = require("../../middleware/cache");

// GET /by-ingredients-categories-title
router.get("/", cacheRoute(60_000), async (req, res, next) => {
  try {
    const includeFlavor = (req.query.includeFlavor || "").split(",").map(s => s.trim()).filter(Boolean);
    const excludeFlavor = (req.query.excludeFlavor || "").split(",").map(s => s.trim()).filter(Boolean);
    const includeDiet   = (req.query.includeDiet   || "").split(",").map(s => s.trim()).filter(Boolean);
    const excludeDiet   = (req.query.excludeDiet   || "").split(",").map(s => s.trim()).filter(Boolean);
    const includeIngredient = (req.query.includeIngredient || "").split(",").map(s => s.trim()).filter(Boolean);
    const excludeIngredient = (req.query.excludeIngredient || "").split(",").map(s => s.trim()).filter(Boolean);
    const recipeCategory = req.query.category;
    const titleQuery     = (req.query.title || "").toLowerCase().trim();
    const cuisineQuery   = req.query.cuisine;

    const incOr = [];
    if (includeFlavor.length) incOr.push({ FlavorDB_Category: { $in: includeFlavor.map(v => new RegExp(v, "i")) } });
    if (includeDiet.length)   incOr.push({ Predicted_Category: { $in: includeDiet.map(v => new RegExp(v, "i")) } });
    if (includeIngredient.length) incOr.push({ NAME_lc: { $in: includeIngredient.map(v => new RegExp(v, "i")) } });

    const excNor = [];
    if (excludeFlavor.length) excNor.push({ FlavorDB_Category: { $in: excludeFlavor.map(v => new RegExp(v, "i")) } });
    if (excludeDiet.length)   excNor.push({ Predicted_Category: { $in: excludeDiet.map(v => new RegExp(v, "i")) } });
    if (excludeIngredient.length) excNor.push({ NAME_lc: { $in: excludeIngredient.map(v => new RegExp(v, "i")) } });

    const pipe = [];
    if (incOr.length) pipe.push({ $match: { $or: incOr } });
    pipe.push({ $group: { _id: "$Recipe_ID" } });

    if (excNor.length) {
      pipe.push(
        { $lookup: { from: "recipe_ingredients", localField: "_id", foreignField: "Recipe_ID", as: "ings" } },
        { $unwind: "$ings" },
        { $match: { $nor: excNor.map(cond => ({ 
          ...(cond.FlavorDB_Category ? { "ings.FlavorDB_Category": cond.FlavorDB_Category } : {}),
          ...(cond.Predicted_Category ? { "ings.Predicted_Category": cond.Predicted_Category } : {}),
          ...(cond.NAME_lc ? { "ings.NAME_lc": cond.NAME_lc } : {})
        })) } },
        { $group: { _id: "$_id" } }
      );
    }

    const matches = await RecipeIngredient.aggregate(pipe);
    const ids = matches.map(m => m._id);
    if (!ids.length && (incOr.length || excNor.length)) return res.json([]); 

    const query = {};
    if (incOr.length || excNor.length) {
        query.Recipe_ID = { $in: ids };
    }
    
    if (recipeCategory) query.Category = new RegExp(recipeCategory, "i");
    if (titleQuery)     query.Recipe_Title_lc = { $regex: titleQuery };
    if (cuisineQuery)   query.Cuisine = new RegExp(cuisineQuery, "i");

    const { skip, limit } = pageParams(req);
    const items = await Recipe.find(query)
      .sort({ Ratings_Count: -1, Ratings: -1, _id: 1 })
      .skip(skip).limit(limit)
      .select({
        Recipe_ID: 1, Recipe_Title: 1, Image_URL: 1, Cuisine: 1, Category: 1,
        Ratings: 1, Ratings_Count: 1, "Nutrition.Calories": 1
      })
      .lean();

    res.json(items);
  } catch (e) { next(e); }
});

module.exports = router;