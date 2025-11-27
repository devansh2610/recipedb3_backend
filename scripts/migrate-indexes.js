// scripts/migrate-indexes.js
// One-time (or re-runnable) migration:
// - creates indexes
// - lowercases shadow fields
// - denormalizes FlavorDB_Category & Dietrx_Category onto recipe_ingredients

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;

  const recipes = db.collection('recipes');
  const recipeIngredients = db.collection('recipe_ingredients');
  const recipeInstructions = db.collection('recipe_instructions');
  const ingredientsLookup = db.collection('ingredients_lookup');

  console.log("==> Creating/ensuring indexes...");

  // recipes
  await recipes.createIndex({ Recipe_ID: 1 }, { unique: true });
  await recipes.createIndex({ Cuisine: 1 });
  await recipes.createIndex({ Category: 1 });
  await recipes.createIndex({ Ratings_Count: -1, Ratings: -1, _id: 1 });
  await recipes.createIndex({ "Nutrition.Calories": 1 });
  await recipes.createIndex({ "Nutrition.Protein": 1 });
  await recipes.createIndex({ "Nutrition.Carbohydrates": 1 });
  await recipes.createIndex({ Image_URL: 1 });

  // Lowercase Recipe_Title into Recipe_Title_lc
  console.log("==> Backfilling recipes.Recipe_Title_lc ...");
  await recipes.updateMany(
    { Recipe_Title: { $exists: true } },
    [{ $set: { Recipe_Title_lc: { $toLower: "$Recipe_Title" } } }],
    { bypassDocumentValidation: true }
  );
  await recipes.createIndex({ Recipe_Title_lc: 1 });

  // recipe_ingredients
  await recipeIngredients.createIndex({ Recipe_ID: 1 });
  await recipeIngredients.createIndex({ Ing_ID: 1 });

  // Lowercase NAME into NAME_lc
  console.log("==> Backfilling recipe_ingredients.NAME_lc ...");
  await recipeIngredients.updateMany(
    { NAME: { $exists: true } },
    [{ $set: { NAME_lc: { $toLower: "$NAME" } } }],
    { bypassDocumentValidation: true }
  );
  await recipeIngredients.createIndex({ NAME_lc: 1 });
  await recipeIngredients.createIndex({ Recipe_ID: 1, NAME_lc: 1 });

  // ingredients_lookup
  await ingredientsLookup.createIndex({ Ing_ID: 1 }, { unique: true });
  await ingredientsLookup.createIndex({ FlavorDB_Category: 1 });
  await ingredientsLookup.createIndex({ Dietrx_Category: 1 });

  // Denormalize FlavorDB_Category & Dietrx_Category onto recipe_ingredients
  console.log("==> Denormalizing FlavorDB_Category & Dietrx_Category -> recipe_ingredients ...");
  await recipeIngredients.aggregate([
    {
      $lookup: {
        from: 'ingredients_lookup',
        localField: 'Ing_ID',
        foreignField: 'Ing_ID',
        as: 'L'
      }
    },
    { $unwind: { path: "$L", preserveNullAndEmptyArrays: true } },
    {
      $set: {
        FlavorDB_Category: { $ifNull: ["$L.FlavorDB_Category", ""] },
        Dietrx_Category: { $ifNull: ["$L.Dietrx_Category", ""] }
      }
    },
    {
      $project: {
        _id: 1, Recipe_ID: 1, Ing_ID: 1,
        Ingredient: 1, QUANTITY: 1, UNIT: 1, NAME: 1, NAME_lc: 1,
        STATE: 1, DF: 1, FORM: 1, SIZE: 1, PREPROCESSING: 1,
        FlavorDB_Category: 1, Dietrx_Category: 1
      }
    },
    {
      $merge: {
        into: 'recipe_ingredients',
        on: '_id',
        whenMatched: 'replace',
        whenNotMatched: 'insert'
      }
    }
  ]).toArray(); // force execution in Node

  await recipeIngredients.createIndex({ FlavorDB_Category: 1 });
  await recipeIngredients.createIndex({ Dietrx_Category: 1 });

  // recipe_instructions
  await recipeInstructions.createIndex({ Recipe_ID: 1 });

  console.log("==> Backfilling recipe_instructions.*_lc ...");
  await recipeInstructions.updateMany(
    {},
    [{
      $set: {
        COOKING_INSTRUCTION_lc: {
          $toLower: { $ifNull: ["$COOKING_INSTRUCTION", ""] }
        },
        UTENSIL_lc: {
          $toLower: { $ifNull: ["$UTENSIL", ""] }
        }
      }
    }],
    { bypassDocumentValidation: true }
  );
  await recipeInstructions.createIndex({ COOKING_INSTRUCTION_lc: 1 });
  await recipeInstructions.createIndex({ UTENSIL_lc: 1 });
  await recipeInstructions.createIndex({ Recipe_ID: 1, COOKING_INSTRUCTION_lc: 1 });
  await recipeInstructions.createIndex({ Recipe_ID: 1, UTENSIL_lc: 1 });

  console.log("==> Migration completed.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});