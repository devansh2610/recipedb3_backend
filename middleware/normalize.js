// middleware/normalize.js
const { pad8 } = require("../utils");   // use shared helper

function parseList(s) {
  if (!s) return [];
  return String(s).split(",").map(v => v.trim()).filter(Boolean);
}

function normalize(req, _res, next) {
  if (req.params.id) req.params.id = pad8(req.params.id);
  if (req.query.ingId) req.query.ingId = pad8(req.query.ingId);

  req.query._include   = parseList(req.query.include);
  req.query._exclude   = parseList(req.query.exclude);
  req.query._cuisines  = parseList(req.query.cuisine);
  req.query._categories= parseList(req.query.category);

  next();
}

module.exports = { normalize, pad8, parseList };
