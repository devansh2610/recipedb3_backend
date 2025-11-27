const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");

router.get("/", async (_req, res, next) => {
  try {
    const r = await Recipe.aggregate([
      { $facet: {
          cuisines: [
            { $match: { Cuisine: { $exists: true, $ne: "" } } },
            { $group: { _id: "$Cuisine", count: { $sum: 1 } } },
            { $sort: { count: -1 } }, { $limit: 100 }
          ],
          categories: [
            { $match: { Category: { $exists: true, $ne: "" } } },
            { $group: { _id: "$Category", count: { $sum: 1 } } },
            { $sort: { count: -1 } }, { $limit: 100 }
          ]
      }}
    ]);
    res.json(r[0]);
  } catch (e) { next(e); }
});

module.exports = router;
