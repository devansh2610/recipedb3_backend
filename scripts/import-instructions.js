// scripts/import-instructions.js
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const crypto = require('crypto');
const { pad8 } = require('../utils');
const RecipeInstruction = require('../models/RecipeInstruction');

const URI = process.env.MONGODB_URI;
const BATCH_SIZE = 2000;
const MAX_RECIPES = 20000; // Must match the recipe limit

// UPDATE PATH HERE
const CSV_PATH = 'D:/RecipeDB3/dataset/Second_Iteration/RecipeDB3_Instruction_Phrases.csv';

const hashRow = (obj) => crypto.createHash("sha1").update(JSON.stringify(obj)).digest("hex");

async function main() {
  await mongoose.connect(URI);
  console.log(`==> Starting Instructions Import (Recipes <= ${MAX_RECIPES})...`);

  let buffer = [];
  let count = 0;

  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => {
        const rIDVal = Number(row.Recipe_ID);
        // SKIP instructions for recipes we didn't import
        if (rIDVal > MAX_RECIPES) return;

        const rid = pad8(row.Recipe_ID);
        const _id = hashRow({ r: rid, i: row.Instruction, a: row.ACTION });

        buffer.push({
          _id: _id,
          Recipe_ID: rid,
          "Recipe Name": row["Recipe Name"],
          Instruction: row.Instruction,
          ACTION: row.ACTION,
          ACTION_lc: (row.ACTION || "").toLowerCase(),
          DRYFRESH: row.DRYFRESH,
          FORM: row.FORM,
          INGREDIENT: row.INGREDIENT,
          PREPROCESS: row.PREPROCESS,
          QUANTITY: row.QUANTITY,
          SIZE: row.SIZE,
          STATE: row.STATE,
          TEMPERATURE: row.TEMPERATURE,
          TIME: row.TIME,
          UNIT: row.UNIT,
          UTENSIL: row.UTENSIL,
          UTENSIL_lc: (row.UTENSIL || "").toLowerCase()
        });

        if (buffer.length >= BATCH_SIZE) {
          const batch = [...buffer];
          buffer = [];
          RecipeInstruction.insertMany(batch, { ordered: false })
            .then(() => {
              count += batch.length;
              if (count % 10000 === 0) console.log(`Inserted ${count} instructions...`);
            })
            .catch(e => {}); 
        }
      })
      .on('end', async () => {
        if (buffer.length) await RecipeInstruction.insertMany(buffer, { ordered: false }).catch(e => {});
        console.log(`Finished. Total: ${count + buffer.length}`);
        resolve();
      })
      .on('error', reject);
  });

  await mongoose.disconnect();
}

main().catch(console.error);