// utils/diet.js

// 1. Strict Word Boundary Logic (\b)
// Prevents "egg" from blocking "eggplant", "ham" from blocking "graham crackers"
const rx = (s) => new RegExp(`\\b${s}[s]?\\b`, "i");

function patternsForDiet(diet) {
  const d = String(diet || "").toLowerCase();

  // 2. The Master Meat List
  // Includes specific cuts and poultry often missed by generic "Meat" categories
  const meatNames = [
    rx("beef"), rx("pork"), rx("chicken"), rx("mutton"), rx("lamb"),
    rx("turkey"), rx("duck"), rx("goose"), rx("bison"), rx("venison"), // Added Poultry/Game
    rx("steak"), rx("filet"), rx("ribs"), rx("veal"), rx("bacon"), rx("ham"), 
    rx("liver"), rx("pâté"), rx("chorizo"), rx("salami"), rx("pepperoni"), rx("prosciutto") // Processed
  ];

  // 3. Hidden Animal Products (Non-Meat)
  const animalByproducts = [
    rx("gelatin"), rx("lard"), rx("tallow"), rx("rennet")
  ];

  // 4. Seafood List (for non-pescatarians)
  const seafoodNames = [
    rx("fish"), rx("prawn"), rx("shrimp"), rx("crab"), rx("lobster"), 
    rx("oyster"), rx("clam"), rx("mussel"), rx("anchovy"), rx("squid"), 
    rx("salmon"), rx("tuna"), rx("cod"), rx("trout")
  ];

  // 5. Dairy/Egg List
  const dairyEggNames = [
    rx("egg"), rx("milk"), rx("cheese"), rx("butter"), rx("yogurt"), 
    rx("ghee"), rx("cream"), rx("mayo"), rx("whey"), rx("casein"), rx("lactose")
  ];

  switch (d) {
    case "vegan":
      return {
        // Block ANY animal category
        forbidCat: [rx("meat"), rx("seafood"), rx("fish"), rx("egg"), rx("dairy"), rx("milk"), rx("cheese"), rx("butter"), rx("ghee"), rx("yogurt"), rx("honey"), rx("non-veg")],
        // Block names of all animal products + hidden ingredients
        forbidName: [
          ...meatNames, ...seafoodNames, ...dairyEggNames, ...animalByproducts,
          rx("honey"), rx("beeswax")
        ]
      };

    case "vegetarian":
      return {
        forbidCat: [rx("meat"), rx("seafood"), rx("fish"), rx("egg"), rx("non-veg")],
        // Block Meat + Seafood + Byproducts (Gelatin/Lard)
        // Note: Eggs/Dairy are allowed
        forbidName: [...meatNames, ...seafoodNames, ...animalByproducts]
      };

    case "eggetarian":
      return {
        forbidCat: [rx("meat"), rx("seafood"), rx("fish"), rx("non-veg")],
        // Block Meat + Seafood + Byproducts (EXCEPT Egg)
        forbidName: [...meatNames, ...seafoodNames, ...animalByproducts] 
      };

    case "pescatarian":
      return {
        // Block Land Meat categories
        forbidCat: [rx("meat"), rx("chicken"), rx("beef"), rx("pork"), rx("lamb"), rx("mutton"), rx("non-veg")],
        // Block ONLY Land Meats (Fish/Seafood allowed)
        // We also block Lard/Gelatin as they are usually beef/pork based
        forbidName: [...meatNames, rx("lard"), rx("tallow")] 
      };

    default:
      return { forbidCat: [], forbidName: [] };
  }
}

module.exports = { patternsForDiet };