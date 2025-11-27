const express = require("express");
const router = express.Router();
const RecipeInstruction = require("../../models/RecipeInstruction");
const { pageParams } = require("../../middleware/pagination");

router.get("/:id", async (req, res, next) => {
  try {
    const { skip, limit } = pageParams(req);
    const list = await RecipeInstruction.find({ Recipe_ID: req.params.id })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json(list);
  } catch (e) { next(e); }
});

module.exports = router;
