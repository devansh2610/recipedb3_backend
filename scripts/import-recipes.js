// scripts/import-recipes.js
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Recipe = require('../models/Recipe');
const { pad8 } = require('../utils');

const BATCH_SIZE = 1000;
const URI = process.env.MONGODB_URI;
// LIMIT THE DATASET TO FIT IN FREE TIER
const MAX_RECIPES = 20000;

// UPDATE PATHS HERE
const GENERAL_CSV = 'D:/RecipeDB3/dataset/Second_Iteration/RecipeDB3_General.csv';
const NUTRITION_CSV = 'D:/RecipeDB3/dataset/Second_Iteration/RecipeDB3_Nutrition.csv';

async function importGeneral() {
  console.log(`==> Starting General Import (Limit: ${MAX_RECIPES})...`);
  const results = [];
  let count = 0;
  let skipped = 0;

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(GENERAL_CSV).pipe(csv());

    stream.on('data', (data) => {
      // Stop processing if we hit the limit
      if (count >= MAX_RECIPES) {
        skipped++;
        return; 
      }

      const rID = Number(data.Recipe_ID);
      // Double check: if the CSV isn't perfectly sorted, skip high IDs
      if (rID > MAX_RECIPES) return;

      results.push({
        Recipe_ID: pad8(data.Recipe_ID),
        Recipe_Title: data.Recipe_Title,
        Recipe_Title_lc: (data.Recipe_Title || "").toLowerCase(),
        URL: data.URL,
        Source: data.Source,
        Image_ID: pad8(data.Image_ID),
        Image_URL: data.Image_URL,
        Prep_Time: data.Prep_Time,
        Cook_Time: data.Cook_Time,
        Total_Time: data.Total_Time,
        Instructions: data.Instructions,
        Cuisine: data.Cuisine,
        Category: data.Category,
        Servings: Number(data.Servings) || 0,
        Ratings: Number(data.Ratings) || 0,
        Ratings_Count: Number(data.Votes) || 0
      });

      if (results.length >= BATCH_SIZE) {
        const batch = [...results];
        results.length = 0;
        Recipe.insertMany(batch, { ordered: false })
          .then(() => {
            count += batch.length;
            if (count % 5000 === 0) console.log(`Inserted ${count} recipes...`);
          })
          .catch(err => console.error("Batch insert error:", err.message));
      }
    });

    stream.on('end', async () => {
      if (results.length > 0) {
        await Recipe.insertMany(results, { ordered: false }).catch(e => {});
        count += results.length;
      }
      // Destroy stream to stop reading if we exited early
      stream.destroy();
      console.log(`Finished General Import. Inserted: ${count}`);
      resolve();
    });

    stream.on('error', reject);
  });
}

async function importNutrition() {
  console.log('==> Starting Nutrition Update...');
  let bulkOps = [];
  let count = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream(NUTRITION_CSV)
      .pipe(csv())
      .on('data', (data) => {
        // Only update if ID is within our limit
        if (Number(data.Recipe_ID) > MAX_RECIPES) return;

        bulkOps.push({
          updateOne: {
            filter: { Recipe_ID: pad8(data.Recipe_ID) },
            update: {
              $set: {
                Nutrition: {
                  Calories: Number(data['Calories(Kcal)']),
                  Fat: Number(data['Fat(gm)']),
                  Saturated_Fat: Number(data['Saturated_Fat(gm)']),
                  Cholesterol: Number(data['Cholesterol(gm)']),
                  Sodium: Number(data['Sodium(gm)']),
                  Carbohydrates: Number(data['Carbohydrates(gm)']),
                  Fiber: Number(data['Fiber(gm)']),
                  Sugar: Number(data['Sugar(gm)']),
                  Protein: Number(data['Protein(gm)'])
                }
              }
            }
          }
        });

        if (bulkOps.length >= BATCH_SIZE) {
          const ops = [...bulkOps];
          bulkOps.length = 0;
          Recipe.bulkWrite(ops, { ordered: false })
            .then(() => {
              count += ops.length;
              if (count % 5000 === 0) console.log(`Updated ${count} nutrition records...`);
            })
            .catch(err => console.error("Bulk update error:", err.message));
        }
      })
      .on('end', async () => {
        if (bulkOps.length > 0) {
          await Recipe.bulkWrite(bulkOps, { ordered: false }).catch(e => {});
          count += bulkOps.length;
        }
        console.log(`Finished Nutrition Update. Total: ${count}`);
        resolve();
      })
      .on('error', reject);
  });
}

async function main() {
  await mongoose.connect(URI);
  await importGeneral();
  await importNutrition();
  console.log("Recipes Import Complete.");
  await mongoose.disconnect();
}

main().catch(console.error);