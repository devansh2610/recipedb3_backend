const express = require("express");
const router = express.Router();
const Recipe = require("../../models/Recipe");

// Always returns a fresh random 7 (pagination doesn't apply meaningfully here)
router.get("/", async (req, res, next) => {
  try {
    const docs = await Recipe.aggregate([{ $sample: { size: 7 } }]);
    res.json(docs);
  } catch (e) { next(e); }
});

module.exports = router;
