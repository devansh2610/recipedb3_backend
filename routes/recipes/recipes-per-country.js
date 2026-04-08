const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const { cacheRoute } = require("../../middleware/cache");

// GET /recipes-per-country
router.get("/", cacheRoute(86_400_000), async (req, res, next) => {
  try {
    const stats = await Recipe.aggregate([
      // if Cuisine is null, missing, or an empty string, treat it as "Other"
      {
        $project: {
          Cuisine: {
            $cond: [
              { $in: ["$Cuisine", [null, "", undefined]] },
              "Other",
              "$Cuisine"
            ]
          }
        }
      },
      // group by the sanitized Cuisine field and count the total recipes
      { 
        $group: { 
          _id: "$Cuisine", 
          total_recipes: { $sum: 1 } 
        } 
      },
      // Sort alphabetically by region/cuisine name
      { 
        $sort: { _id: 1 } 
      } 
    ]);

    // i am mapping Cuisine to the 'country' key to satisfy the naming convention
    const result = stats.map(stat => ({
      country: stat._id,
      total_recipes: stat.total_recipes
    }));

    res.json(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router;