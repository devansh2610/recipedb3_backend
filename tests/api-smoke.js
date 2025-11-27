/* eslint-disable no-console */
const BASE = process.env.BASE_URL || "http://localhost:3000/api";
const ROOT = `${BASE}/recipes`; // matches app.use('/api/recipes', ...)

async function readBodySafe(res) {
  const t = await res.text();
  try { return JSON.parse(t); } catch { return t; }
}

async function hit(label, path, validate) {
  const url = path.startsWith("http") ? path : `${ROOT}${path}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url);
    const ms = Date.now() - t0;
    const body = await readBodySafe(res);
    let ok = res.ok;

    // Optional validator (throws on failure)
    let vMsg = "";
    if (ok && typeof validate === "function") {
      try {
        vMsg = validate(body) || "";
      } catch (e) {
        ok = false;
        vMsg = `VALIDATION: ${e.message}`;
      }
    }

    console.log(`${ok ? "✅" : "❌"}  [${res.status}] ${label.padEnd(34)} ${url}  (${ms}ms) ${vMsg ? "- " + vMsg : ""}`);
    return { label, url, status: res.status, ok, body };
  } catch (err) {
    const ms2 = Date.now() - t0;
    console.log(`❌  [ERR] ${label.padEnd(34)} ${url}  (${ms2}ms) -> ${err.message}`);
    return { label, url, status: 0, ok: false, error: err };
  }
}

/** Validators (array-only where applicable) **/
const isArrayMax7 = (body) => {
  if (!Array.isArray(body)) throw new Error("expected array");
  if (body.length > 7) throw new Error(`array length > 7 (${body.length})`);
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
  // body.recipe may be null (allowed)
  return `date=${body.date}`;
};

(async () => {
  // 1) Discover some fields to drive realistic requests
  const discover = await hit("discover recipesinfo (page=1)", "/recipesinfo?page=1", isArrayMax7);
  const first = Array.isArray(discover.body) && discover.body[0] ? discover.body[0] : {};
  const rid = first.Recipe_ID || "00000001";
  const cuisine = first.Cuisine || "indian";
  const category = first.Category || "Dessert";
  const titleWord = (first.Recipe_Title || "chicken").split(/\s+/)[0];

  // 2) Endpoints requiring Recipe_ID (note: instructions & similar are paged arrays)
  const withId = [
    ["search-recipe/{id}",                     `/search-recipe/${rid}`,                          isObject],
    ["instructions/{id} (paged 7)",            `/instructions/${rid}?page=1`,                    isArrayMax7],
    ["nutritioninfo/{id}",                     `/nutritioninfo/${rid}`,                          isObject],
    ["micronutritioninfo/{id}",                `/micronutritioninfo/${rid}`,                     isObject],
    ["similar/{id} (paged 7)",                 `/similar/${rid}?page=1`,                         isArrayMax7],
  ];

  // 3) Paged list endpoints – ALL must return array length ≤ 7
  const paged = [
    ["recipesinfo (paged 7)",                  `/recipesinfo?page=1`,                            isArrayMax7],
    ["top-rated (paged 7)",                    `/top-rated?page=1`,                              isArrayMax7],
    ["with-image (paged 7)",                   `/with-image?page=1`,                             isArrayMax7],
    ["calories (paged 7)",                     `/calories?min=100&max=1000&page=1`,             isArrayMax7],
    ["byenergy/energy (paged 7)",              `/byenergy/energy?min=100&max=1000&page=1`,      isArrayMax7],
    ["protein-range (paged 7)",                `/protein-range?min=0&max=200&page=1`,           isArrayMax7],
    ["recipes-by-carbs (paged 7)",             `/recipes-by-carbs?min=0&max=300&page=1`,        isArrayMax7],
    ["recipes/range (paged 7)",                `/recipes/range?calories_min=50&calories_max=1000&protein_min=0&protein_max=200&page=1`, isArrayMax7],
    ["category (paged 7)",                     `/category?category=${encodeURIComponent(category)}&page=1`, isArrayMax7],
    ["recipes_cuisine/cuisine/{region}",       `/recipes_cuisine/cuisine/${encodeURIComponent(cuisine)}?page=1`, isArrayMax7],
    ["ingredients/flavor/{flavor}",            `/ingredients/flavor/Spice?page=1`,              isArrayMax7],
    ["recipes-method/{method}",                `/recipes-method/bake?page=1`,                    isArrayMax7],
    ["byutensils/utensils",                    `/byutensils/utensils?utensils=pan,skillet,wok&page=1`, isArrayMax7],
    ["by-ingredients",                         `/by-ingredients?include=onion,tomato&exclude=beef&page=1`, isArrayMax7],
    ["by-ingredients-categories-title",        `/by-ingredients-categories-title?includeFlavor=Spices&category=${encodeURIComponent(category)}&title=${encodeURIComponent(titleWord)}&page=1`, isArrayMax7],
    ["recipe-diet",                            `/recipe-diet?diet=vegetarian&page=1`,           isArrayMax7],
    ["region-diet",                            `/region-diet?region=${encodeURIComponent(cuisine)}&diet=vegetarian&page=1`, isArrayMax7],
    ["recipeByTitle",                          `/recipeByTitle?title=${encodeURIComponent(titleWord)}&page=1`, isArrayMax7],
  ];

  // 4) Special endpoints
  const specials = [
    ["facets (object)",                        `/facets`,                                        isObject],
    ["random (exactly 7 every call)",          `/random`,                                        isArrayExactly7],
    ["recipeofday (object)",                   `/recipeofday`,                                   isDayPicker],
    ["recipe-Day-category (object)",           `/recipe-Day-category?category=${encodeURIComponent(category)}`, isDayPicker],
    ["recipe-day/with-ingredients-categories", `/recipe-day/with-ingredients-categories?includeFlavor=Spices`, isDayPicker],
    ["meal-plan (object)",                     `/meal-plan?target_calories=1800&meals=3&cuisine=${encodeURIComponent(cuisine)}`, isObject],
  ];

  const results = [];
  results.push(discover);
  for (const [label, path, val] of withId) results.push(await hit(label, path, val));
  for (const [label, path, val] of paged)  results.push(await hit(label, path, val));
  for (const [label, path, val] of specials) results.push(await hit(label, path, val));

  const ok = results.filter(r => r.ok).length;
  const total = results.length;
  console.log("\n========== SUMMARY ==========");
  console.log(`Passed: ${ok}/${total}`);
  const failed = results.filter(r => !r.ok);
  if (failed.length) {
    console.log("\nFailed endpoints:");
    failed.forEach(f => console.log(` - ${f.label}  -> ${f.url}  [status: ${f.status}]`));
  }
})();
