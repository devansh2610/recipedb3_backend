const crypto = require("crypto");

// Always make IDs 8-digit strings
function pad8(x) {
  if (x === undefined || x === null) return "";
  return String(x).replace(/\D/g, "").padStart(8, "0");
}

// Number conversions (safe)
function toInt(s) {
  if (!s || s.trim() === "") return undefined;
  const n = parseInt(s, 10);
  return isNaN(n) ? undefined : n;
}
function toFloat(s) {
  if (!s || s.trim() === "") return undefined;
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

// Hash for deduplication (ingredient phrases, instructions)
function hashRow(obj) {
  return crypto.createHash("sha1").update(JSON.stringify(obj)).digest("hex");
}

module.exports = { pad8, toInt, toFloat, hashRow };
