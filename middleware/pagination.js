// middleware/pagination.js
// Fixed 7-items-per-page pagination helpers (no metadata in responses).

function pageParams(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 7;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// For simple .find() queries over a Mongoose Model
async function findPaged(Model, query = {}, options = {}, req) {
  const { limit, skip } = pageParams(req);
  const q = Model.find(query);
  if (options.sort) q.sort(options.sort);
  if (options.select) q.select(options.select);
  const items = await q.skip(skip).limit(limit).lean();
  return items;
}

// For pipelines where you first produce a list of IDs, then fetch docs.
// We just slice IDs for the requested page.
function sliceIdsForPage(ids, req) {
  const { limit, skip } = pageParams(req);
  return ids.slice(skip, skip + limit);
}

module.exports = { pageParams, findPaged, sliceIdsForPage };
