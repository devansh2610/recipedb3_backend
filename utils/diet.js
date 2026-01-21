const rx = (s) => new RegExp(s, "i");

function patternsForDiet(diet) {
  const d = String(diet || "").toLowerCase();

  // Each entry is a regex applied to Dietrx_Category or NAME.
  // "Forbidden" means that if any ingredient matches these, the recipe is excluded.
  switch (d) {
    case "vegan":
      return {
        forbidCat: [rx("meat"), rx("seafood"), rx("fish"), rx("egg"), rx("dairy"), rx("milk"), rx("cheese"), rx("butter"), rx("ghee"), rx("yogurt"), rx("honey"), rx("non-veg")],
        forbidName: [rx("beef"), rx("pork"), rx("chicken"), rx("mutton"), rx("lamb"), rx("fish"), rx("prawn"), rx("shrimp"), rx("egg"), rx("milk"), rx("cheese"), rx("butter"), rx("yogurt"), rx("ghee"), rx("honey")]
      };
    case "vegetarian":
      return {
        forbidCat: [rx("meat"), rx("seafood"), rx("fish"), rx("egg"), rx("non-veg")],
        forbidName: [rx("beef"), rx("pork"), rx("chicken"), rx("mutton"), rx("lamb"), rx("fish"), rx("prawn"), rx("shrimp"), rx("egg")]
      };
    case "eggetarian":
      return {
        forbidCat: [rx("meat"), rx("seafood"), rx("fish"), rx("non-veg")],
        forbidName: [rx("beef"), rx("pork"), rx("chicken"), rx("mutton"), rx("lamb"), rx("fish"), rx("prawn"), rx("shrimp")]
      };
    case "pescatarian":
      return {
        forbidCat: [rx("meat"), rx("chicken"), rx("beef"), rx("pork"), rx("lamb"), rx("mutton"), rx("non-veg")],
        forbidName: [rx("beef"), rx("pork"), rx("chicken"), rx("mutton"), rx("lamb")]
      };
    default:
      // Unknown/empty diet -> no restrictions (caller should validate)
      return { forbidCat: [], forbidName: [] };
  }
}

module.exports = { patternsForDiet };
