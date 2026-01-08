require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const recipes = db.collection('recipes');
  const recipeIngredients = db.collection('recipe_ingredients');
  const recipeInstructions = db.collection('recipe_instructions');
  const ingredientsLookup = db.collection('ingredients_lookup');
  const ingredientCategories = db.collection('ingredients_category_predicted');

  console.log("==> Starting Iteration 2 Migration...");

  // --- Helper to Pad IDs to 8 digits (Mongo Pipeline) ---
  // Logic: Prepend "00000000", then slice the last 8 characters.
  const pad8Pipeline = (field) => [
    {
      $set: {
        [field]: {
          $let: {
            vars: { s: { $concat: ["00000000", { $toString: `$${field}` }] } },
            in: { $substrCP: ["$$s", { $subtract: [{ $strLenCP: "$$s" }, 8] }, 8] }
          }
        }
      }
    }
  ];

  // 1. Fix IDs (Recipe_ID, Ing_ID) in all collections
  console.log("==> Enforcing 8-digit ID padding...");
  await recipes.updateMany({}, pad8Pipeline("Recipe_ID"));
  await recipeIngredients.updateMany({}, pad8Pipeline("Recipe_ID"));
  await recipeIngredients.updateMany({}, pad8Pipeline("Ing_ID"));
  await recipeInstructions.updateMany({}, pad8Pipeline("Recipe_ID"));
  await ingredientsLookup.updateMany({}, pad8Pipeline("Ing_ID"));
  await ingredientCategories.updateMany({}, pad8Pipeline("Ing_ID"));

  // 2. Create Indexes
  console.log("==> Creating indexes...");

  // Recipes
  await recipes.createIndex({ Recipe_ID: 1 }, { unique: true });
  await recipes.createIndex({ Cuisine: 1 });
  await recipes.createIndex({ Category: 1 });
  await recipes.createIndex({ Ratings_Count: -1, Ratings: -1 });
  await recipes.createIndex({ "Nutrition.Calories": 1 });
  await recipes.createIndex({ "Nutrition.Protein": 1 });

  // Recipe Title LC
  console.log("==> Backfilling recipes.Recipe_Title_lc...");
  await recipes.updateMany(
    { Recipe_Title: { $exists: true } },
    [{ $set: { Recipe_Title_lc: { $toLower: "$Recipe_Title" } } }]
  );
  await recipes.createIndex({ Recipe_Title_lc: 1 });

  // 3. Recipe Ingredients (New Schema)
  // Fields: Ingredient_Phrases, NAME, QUANTITY, UNIT, STATE, TEMP, DF, Ing_ID
  await recipeIngredients.createIndex({ Recipe_ID: 1 });
  await recipeIngredients.createIndex({ Ing_ID: 1 });

  console.log("==> Backfilling recipe_ingredients.NAME_lc...");
  await recipeIngredients.updateMany(
    { NAME: { $exists: true } },
    [{ $set: { NAME_lc: { $toLower: "$NAME" } } }]
  );
  await recipeIngredients.createIndex({ NAME_lc: 1 });

  // 4. Denormalization (The Big Join)
  // We need to pull `FlavorDB_Category` from `ingredients_lookup`
  // AND `Predicted_Category` from `ingredients_category_predicted`
  console.log("==> Denormalizing Categories -> recipe_ingredients...");

  // We use an aggregation pipeline with $merge to update the collection in place
  await recipeIngredients.aggregate([
    // Join FlavorDB Info
    {
      $lookup: {
        from: 'ingredients_lookup',
        localField: 'Ing_ID',
        foreignField: 'Ing_ID',
        as: 'FlavorInfo'
      }
    },
    { $unwind: { path: "$FlavorInfo", preserveNullAndEmptyArrays: true } },
    
    // Join Predicted Category (Diet Info)
    {
      $lookup: {
        from: 'ingredients_category_predicted',
        localField: 'Ing_ID',
        foreignField: 'Ing_ID',
        as: 'CatInfo'
      }
    },
    { $unwind: { path: "$CatInfo", preserveNullAndEmptyArrays: true } },

    // Set fields
    {
      $set: {
        FlavorDB_Category: { $ifNull: ["$FlavorInfo.FlavorDB_Category", ""] },
        Predicted_Category: { $ifNull: ["$CatInfo.Predicted_Category", ""] }
      }
    },
    
    // Cleanup temp arrays
    { $project: { FlavorInfo: 0, CatInfo: 0 } },

    // Merge back
    {
      $merge: {
        into: 'recipe_ingredients',
        on: '_id',
        whenMatched: 'replace',
        whenNotMatched: 'discard'
      }
    }
  ]).toArray();

  await recipeIngredients.createIndex({ FlavorDB_Category: 1 });
  await recipeIngredients.createIndex({ Predicted_Category: 1 }); // Needed for /recipe-diet

  // 5. Recipe Instructions (New Schema)
  // Fields: ACTION, INGREDIENT, DRYFRESH, PREPROCESS, UTENSIL, etc.
  await recipeInstructions.createIndex({ Recipe_ID: 1 });

  console.log("==> Backfilling recipe_instructions.ACTION_lc...");
  // Note: CSV field is ACTION, not COOKING_INSTRUCTION anymore
  await recipeInstructions.updateMany(
    { ACTION: { $exists: true } },
    [{ $set: { ACTION_lc: { $toLower: "$ACTION" } } }]
  );
  
  // Optional: UTENSIL_lc if needed for /byutensils
  console.log("==> Backfilling recipe_instructions.UTENSIL_lc...");
  await recipeInstructions.updateMany(
    { UTENSIL: { $exists: true } },
    [{ $set: { UTENSIL_lc: { $toLower: "$UTENSIL" } } }]
  );

  await recipeInstructions.createIndex({ ACTION_lc: 1 });
  await recipeInstructions.createIndex({ UTENSIL_lc: 1 });

  console.log("==> Migration v2 completed successfully.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});