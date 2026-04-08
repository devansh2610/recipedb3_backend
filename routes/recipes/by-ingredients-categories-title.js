const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const RecipeIngredient = require("../../models/RecipeIngredient");
const { pageParams } = require("../../middleware/pagination");
const { cacheRoute } = require("../../middleware/cache");
const { patternsForDiet } = require("../../utils/diet");

// GET /by-ingredients-categories-title
router.get("/", cacheRoute(60_000), async (req, res, next) => {
  try {
    const includeFlavor = (req.query.includeFlavor || "").split(",").map(s => s.trim()).filter(Boolean);
    const excludeFlavor = (req.query.excludeFlavor || "").split(",").map(s => s.trim()).filter(Boolean);
    const includeDiet   = (req.query.includeDiet   || "").split(",").map(s => s.trim()).filter(Boolean);
    const includeIngredient = (req.query.includeIngredient || "").split(",").map(s => s.trim()).filter(Boolean);
    const excludeIngredient = (req.query.excludeIngredient || "").split(",").map(s => s.trim()).filter(Boolean);
    
    const recipeCategory = req.query.category;
    const titleQuery     = (req.query.title || "").trim();
    const cuisineQuery   = req.query.cuisine;

    // INPUT VALIDATION
    const validDiets = ["vegan", "vegetarian", "eggetarian", "pescatarian"];
    for (const d of includeDiet) {
        if (!validDiets.includes(d.toLowerCase())) {
            return res.status(400).json({ 
                error: `Invalid diet parameter: '${d}'. Valid options are: vegan, vegetarian, eggetarian, pescatarian.` 
            });
        }
    }

    // BUILD EXCLUSIONS (The Strict Blocklist)
    const excludeConditions = [];
    let forbidCat = [];
    let forbidName = [];

    // Apply utils/diet.js rules for False-Positive prevention
    for (const diet of includeDiet) {
        const rules = patternsForDiet(diet);
        if (rules.forbidCat) forbidCat.push(...rules.forbidCat);
        if (rules.forbidName) forbidName.push(...rules.forbidName);
    }
    
    // Apply explicit user exclusions to the forbidName array
    if (excludeIngredient.length > 0) {
        forbidName.push(...excludeIngredient.map(v => new RegExp(v, "i")));
    }

    // Push conditions for querying the RecipeIngredients collection
    if (forbidCat.length > 0) excludeConditions.push({ Predicted_Category: { $in: forbidCat } });
    if (forbidName.length > 0) excludeConditions.push({ NAME_lc: { $in: forbidName } });
    if (excludeFlavor.length > 0) {
        excludeConditions.push({ FlavorDB_Category: { $in: excludeFlavor.map(v => new RegExp(v, "i")) } });
    }

    let forbiddenRecipeIds = [];
    if (excludeConditions.length > 0) {
        // Find ALL recipe IDs that contain AT LEAST ONE forbidden ingredient/category
        forbiddenRecipeIds = await RecipeIngredient.distinct("Recipe_ID", { $or: excludeConditions });
    }

    // BUILD INCLUSIONS (The Require List)
    let requiredRecipeIds = null; 

    async function intersectIds(query) {
        const ids = await RecipeIngredient.distinct("Recipe_ID", query);
        if (requiredRecipeIds === null) {
            requiredRecipeIds = ids;
        } else {
            const idSet = new Set(ids);
            requiredRecipeIds = requiredRecipeIds.filter(id => idSet.has(id));
        }
    }

    for (const ing of includeIngredient) {
        await intersectIds({ NAME_lc: new RegExp(ing, "i") });
    }
    for (const flav of includeFlavor) {
        await intersectIds({ FlavorDB_Category: new RegExp(flav, "i") });
    }

    if (requiredRecipeIds !== null && requiredRecipeIds.length === 0) {
        return res.json([]); 
    }

    // FINAL RECIPE QUERY
    const query = {};

    // Apply the ID filters
    if (forbiddenRecipeIds.length > 0 || requiredRecipeIds !== null) {
        query.Recipe_ID = {};
        if (requiredRecipeIds !== null) query.Recipe_ID.$in = requiredRecipeIds;
        if (forbiddenRecipeIds.length > 0) query.Recipe_ID.$nin = forbiddenRecipeIds;
    }

    // Apply the direct string filters
    if (recipeCategory) query.Category = new RegExp(recipeCategory, "i");
    if (titleQuery)     query.Recipe_Title = new RegExp(titleQuery, "i");
    if (cuisineQuery)   query.Cuisine = new RegExp(cuisineQuery, "i");

    // Comprehensive Title and Category Block Strategy
    // Combines BOTH explicit names (e.g., "beef") and categories (e.g., "meat")
    const allForbiddenRegexes = [...forbidName, ...forbidCat];
    if (allForbiddenRegexes.length > 0) {
        if (!query.$and) query.$and = [];
        query.$and.push({ Recipe_Title: { $nin: allForbiddenRegexes } });
        query.$and.push({ Category: { $nin: allForbiddenRegexes } });
    }

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
  } catch (e) { 
    next(e); 
  }
});

module.exports = router;
