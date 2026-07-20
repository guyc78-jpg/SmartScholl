// In-memory page data cache (stale-while-revalidate).
// A page that was already visited renders instantly from this cache
// while fresh data loads in the background.
const cache = new Map();

export const getPageCache = (key) => cache.get(key) ?? null;
export const setPageCache = (key, value) => { cache.set(key, value); };