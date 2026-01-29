// tests/api-smoke-v2.js
/* eslint-disable no-console */
const BASE = process.env.BASE_URL || "http://localhost:3000/api";
const ROOT = `${BASE}/recipes`;

// Helper to parse JSON safely
async function readBodySafe(res) {
  const t = await res.text();
  try { return JSON.parse(t); } catch { return t; }
}

// Helper to make requests
async function hit(label, path, validate) {
  const url = path.startsWith("http") ? path : `${ROOT}${path}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url);
    const ms = Date.now() - t0;
    const body = await readBodySafe(res);
    let ok = res.ok;

    // Optional validator
    let vMsg = "";
    if (ok && typeof validate === "function") {
      try {
        vMsg = validate(body) || "";
      } catch (e) {
        ok = false;
        vMsg = `VALIDATION: ${e.message}`;
      }
    }

    console.log(`${ok ? "✅" : "❌"}  [${res.status}] ${label.padEnd(40)} ${url}  (${ms}ms) ${vMsg ? "- " + vMsg : ""}`);
    return { label, url, status: res.status, ok, body };
  } catch (err) {
    const ms2 = Date.now() - t0;
    console.log(`❌  [ERR] ${label.padEnd(40)} ${url}  (${ms2}ms) -> ${err.message}`);
    return { label, url, status: 0, ok: false, error: err };
  }
}

/** Validators **/

// Standard list validator
const isArrayMax7 = (body) => {
  if (!Array.isArray(body)) throw new Error("expected array");
  if (body.length > 7) throw new Error(`array length > 7 (${body.length})`);
  return `items=${body.length}`;
};

// Iteration 2: Instructions must have 'ACTION' instead of 'COOKING_INSTRUCTION'
const isInstructionArray = (body) => {
  if (!Array.isArray(body)) throw new Error("expected array");
  if (body.length > 0) {
    const first = body[0];
    if (first.ACTION === undefined && first.Instruction === undefined) {
      throw new Error("Missing 'ACTION' or 'Instruction' fields (Check schema migration)");
    }
  }
  return `items=${body.length}`;
};

const isArrayExactly7 = (body) => {
  if (!Array.isArray(body)) throw new Error("expected array");
  if (body.length !== 7) throw new Error(`expected exactly 7 items (got ${body.length})`);
  return "7/7";
};

const isObject = (body) => {
  if (!body || Array.isArray(body) || typeof body !== "object") throw new Error("expected object");
  return "ok";
};

const isDayPicker = (body) => {
  if (!body || typeof body !== "object") throw new Error("expected object");
  if (!body.date) throw new Error("missing date");
  return `date=${body.date}`;
};

(async () => {
  console.log("==> Starting Smoke Test (Iteration 2) <==\n");

  // 1) Discover some fields from the first page of recipes
  // We use this to get a valid ID and Categories present in your 20k dataset
  const discover = await hit("Discovery (recipesinfo)", "/recipesinfo?page=1", isArrayMax7);
  
  if (!discover.ok || !discover.body.length) {
    console.error("!!! Cannot verify API: /recipesinfo returned no items. check database import !!!");
    process.exit(1);
  }

  const first = discover.body[0];
  const rid = first.Recipe_ID; // Should be 8-digit string
  const cuisine = first.Cuisine || "American";
  const category = first.Category || "Main Dish";
  // Pick a word from title for search test (e.g. "Gumbo" -> "Gumbo")
  const titleWord = (first.Recipe_Title || "chicken").split(/\s+/)[0].replace(/[^a-zA-Z]/g, "");

  console.log(`\nUsing Discovery Context: ID=${rid}, Cuisine=${cuisine}, Category=${category}, Title=${titleWord}\n`);

  // 2) Endpoints requiring Recipe_ID
  const withId = [
    ["search-recipe/{id}",                     `/search-recipe/${rid}`,                          isObject],
    // UPDATED: Validates new schema keys (ACTION, etc.)
    ["instructions/{id}",                      `/instructions/${rid}?page=1`,                    isInstructionArray], 
    ["nutritioninfo/{id}",                     `/nutritioninfo/${rid}`,                          isObject],
    ["micronutritioninfo/{id}",                `/micronutritioninfo/${rid}`,                     isObject],
    ["similar/{id}",                           `/similar/${rid}?page=1`,                         isArrayMax7],
  ];

  // 3) Paged list endpoints (General)
  const paged = [
    ["recipesinfo",                            `/recipesinfo?page=1`,                            isArrayMax7],
    ["top-rated",                              `/top-rated?page=1`,                              isArrayMax7],
    ["with-image",                             `/with-image?page=1`,                             isArrayMax7],
    ["calories (range)",                       `/calories?min=100&max=1000&page=1`,              isArrayMax7],
    ["protein-range",                          `/protein-range?min=10&max=200&page=1`,           isArrayMax7],
    ["category",                               `/category?category=${encodeURIComponent(category)}&page=1`, isArrayMax7],
    ["recipes_cuisine",                        `/recipes_cuisine/cuisine/${encodeURIComponent(cuisine)}?page=1`, isArrayMax7],
    ["recipeByTitle",                          `/recipeByTitle?title=${encodeURIComponent(titleWord)}&page=1`, isArrayMax7],
  ];

  // 4) Iteration 2 Specific Logic Tests (Diet, Ingredients, Methods)
  const logicTests = [
    // Uses 'ACTION_lc' column
    ["recipes-method (fry)",                   `/recipes-method/fry?page=1`,                     isArrayMax7],
    ["recipes-method (add)",                   `/recipes-method/add?page=1`,                     isArrayMax7],
    
    // Uses 'UTENSIL_lc' column
    ["byutensils",                             `/byutensils/utensils?utensils=pan,skillet&page=1`, isArrayMax7],
    
    // Uses 'Predicted_Category' (New Diet Logic)
    ["recipe-diet (vegan)",                    `/recipe-diet?diet=vegan&page=1`,                 isArrayMax7],
    ["region-diet (cuisine+vegan)",            `/region-diet?region=${encodeURIComponent(cuisine)}&diet=vegetarian&page=1`, isArrayMax7],
    
    // Uses 'FlavorDB_Category'
    ["ingredients/flavor (Spice)",             `/ingredients/flavor/Spice?page=1`,               isArrayMax7],
    
    // Uses denormalized 'NAME_lc'
    ["by-ingredients (include)",               `/by-ingredients?include=salt&page=1`,            isArrayMax7],
    
    // The "Mega Filter" - Uses Predicted_Category & FlavorDB_Category
    ["by-ingredients-categories-title",        `/by-ingredients-categories-title?includeDiet=vegetarian&title=${encodeURIComponent(titleWord)}&page=1`, isArrayMax7],
  ];

  // 5) Special/One-off endpoints
  const specials = [
    ["facets",                                 `/facets`,                                        isObject],
    ["random (Fresh 7)",                       `/random`,                                        isArrayExactly7],
    ["recipeofday",                            `/recipeofday`,                                   isDayPicker],
    ["meal-plan",                              `/meal-plan?target_calories=2000&meals=3`,        isObject],
  ];

  const results = [];
  
  // Run tests
  for (const [label, path, val] of withId) results.push(await hit(label, path, val));
  for (const [label, path, val] of paged)  results.push(await hit(label, path, val));
  for (const [label, path, val] of logicTests) results.push(await hit(label, path, val));
  for (const [label, path, val] of specials) results.push(await hit(label, path, val));

  // Summary
  const ok = results.filter(r => r.ok).length;
  const total = results.length;
  console.log("\n========== SUMMARY ==========");
  console.log(`Passed: ${ok}/${total}`);
  
  const failed = results.filter(r => !r.ok);
  if (failed.length) {
    console.log("\nFailed endpoints:");
    failed.forEach(f => console.log(` - ${f.label}  -> ${f.url}  [status: ${f.status}]`));
    process.exit(1);
  } else {
    console.log("\n✅ All Smoke Tests Passed!");
    process.exit(0);
  }
})();