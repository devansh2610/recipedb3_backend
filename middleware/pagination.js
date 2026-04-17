function pageParams(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 7;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

async function findPaged(Model, query = {}, options = {}, req) {
  const { limit, skip } = pageParams(req);
  const q = Model.find(query);
  if (options.sort) q.sort(options.sort);
  if (options.select) q.select(options.select);
  
  const items = await q.skip(skip).limit(limit + 1).lean();
  
  const hasNext = items.length > limit;
  if (hasNext) {
    items.pop();
  }
  
  return { results: items, hasNext };
}

function sliceIdsForPage(ids, req) {
  const { limit, skip } = pageParams(req);
  
  const sliced = ids.slice(skip, skip + limit + 1);
  
  const hasNext = sliced.length > limit;
  if (hasNext) {
    sliced.pop();
  }
  
  return { results: sliced, hasNext };
}

module.exports = { pageParams, findPaged, sliceIdsForPage };