// scripts/import-ingredients.js
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const crypto = require('crypto');
const { pad8 } = require('../utils');

const Ingredient = require('../models/Ingredient');
const IngredientCategory = require('../models/IngredientCategory');
const RecipeIngredient = require('../models/RecipeIngredient');

const URI = process.env.MONGODB_URI;
const BATCH_SIZE = 5000;
const MAX_RECIPES = 20000; // Limit for phrases only

// UPDATE PATHS HERE
const ING_LOOKUP_CSV = 'D:/RecipeDB3/dataset/Second_Iteration/RecipeDB3_Ingredient.csv';
const ING_CAT_CSV = 'D:/RecipeDB3/dataset/Second_Iteration/RecipeDB3_Ingredient_Category_Predicted.csv';
const ING_PHRASES_CSV = 'D:/RecipeDB3/dataset/Second_Iteration/RecipeDB3_Ingredient_Phrases.csv';

const hashRow = (obj) => crypto.createHash("sha1").update(JSON.stringify(obj)).digest("hex");

async function runImport(model, csvPath, mapFn, label, useLimit = false) {
  console.log(`==> Starting ${label}...`);
  let buffer = [];
  let count = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => {
        // FILTER: If this is the phrases table, check Recipe_ID
        if (useLimit) {
            if (Number(data.Recipe_ID) > MAX_RECIPES) return;
        }

        const doc = mapFn(data);
        if (doc) buffer.push(doc);

        if (buffer.length >= BATCH_SIZE) {
          const batch = [...buffer];
          buffer = [];
          model.insertMany(batch, { ordered: false })
            .then(() => {
              count += batch.length;
              if (count % 50000 === 0) console.log(`   ${label}: ${count} rows...`);
            })
            .catch(e => {}); 
        }
      })
      .on('end', async () => {
        if (buffer.length) await model.insertMany(buffer, { ordered: false }).catch(e => {});
        console.log(`Finished ${label}. Total: ${count + buffer.length}`);
        resolve();
      })
      .on('error', reject);
  });
}

async function main() {
  await mongoose.connect(URI);

  // 1. Ingredient Lookup (Import All - small file)
  await runImport(Ingredient, ING_LOOKUP_CSV, (row) => ({
    Ing_ID: pad8(row.Ing_ID),
    Ingredient: row.Ingredient,
    Frequency: Number(row.Frequency),
    Generic_Name: row.Generic_Name || row.generic_name,
    Wiki_Link: row.Wiki_Link || row.wikilink,
    Wiki_Image: row.Wiki_Image || row.wikiimage,
    FlavorDB_Category: row.FlavorDB_Category,
    FlavorDB_Link: row.FlavorDB_Link,
    FlavorDB_ID: row.FlavorDB_ID
  }), "Ingredients Lookup", false);

  // 2. Ingredient Categories (Import All - small file)
  await runImport(IngredientCategory, ING_CAT_CSV, (row) => ({
    Ing_ID: pad8(row.Ing_ID),
    Ingredient: row.Ingredient,
    Frequency: Number(row.Frequency),
    Predicted_Category: row.Predicted_Category
  }), "Ingredient Categories", false);

  // 3. Recipe Ingredients Phrases (LIMIT THIS ONE)
  await runImport(RecipeIngredient, ING_PHRASES_CSV, (row) => {
    const rawId = pad8(row.Recipe_ID);
    const _id = hashRow({ r: rawId, i: row.Ingredient_Phrases, q: row.QUANTITY });
    return {
      _id: _id,
      Recipe_ID: rawId,
      Ingredient_Phrases: row.Ingredient_Phrases || row.Ingredient,
      NAME: row.NAME,
      NAME_lc: (row.NAME || "").toLowerCase(),
      QUANTITY: row.QUANTITY,
      UNIT: row.UNIT,
      STATE: row.STATE,
      TEMP: row.TEMP,
      Ing_ID: pad8(row.Ing_ID)
    };
  }, "Recipe Ingredients Phrases", true); // <--- True enables the limit

  console.log("Ingredients Import Complete.");
  await mongoose.disconnect();
}

main().catch(console.error);