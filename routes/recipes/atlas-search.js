const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");
const { cacheRoute } = require("../../middleware/cache");

// GET /atlas-search/autocomplete?q=chic
// For the search bar dropdown (Fast top 10 suggestions)
router.get("/autocomplete", cacheRoute(60_000), async (req, res, next) => {
  try {
    const query = (req.query.q || "").trim();
    if (query.length < 2) return res.json([]);

    const suggestions = await Recipe.aggregate([
      {
        $search: {
          index: "recipe_title_search",
          autocomplete: {
            query: query,
            path: "Recipe_Title",
            fuzzy: { maxEdits: 1 } // Allows minor typos while typing (e.g., "chik")
          }
        }
      },
      { $limit: 10 },
      // Return only what the frontend needs for a quick dropdown
      { $project: { Recipe_ID: 1, Recipe_Title: 1, Image_URL: 1, _id: 0 } }
    ]);

    res.json(suggestions);
  } catch (e) {
    next(e);
  }
});

// GET /atlas-search/search?q=chicken&page=1
// For the main search results page (Includes heavier typo tolerance)
router.get("/search", cacheRoute(60_000), async (req, res, next) => {
  try {
    const query = (req.query.q || "").trim();
    const page = parseInt(req.query.page) || 1;
    const limit = 7;
    const skip = (page - 1) * limit;

    if (!query) return res.json([]);

    const results = await Recipe.aggregate([
      {
        $search: {
          index: "recipe_title_search",
          text: {
            query: query,
            path: "Recipe_Title",
            fuzzy: { maxEdits: 2 } // Allows larger typos (e.g., "chikcen" -> "chicken")
          }
        }
      },
      { $skip: skip },
      { $limit: limit },
      { 
        $project: { 
          Recipe_ID: 1, Recipe_Title: 1, Image_URL: 1, Cuisine: 1, Category: 1,
          Ratings: 1, Ratings_Count: 1, "Nutrition.Calories": 1, _id: 0
        } 
      }
    ]);

    res.json(results);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
