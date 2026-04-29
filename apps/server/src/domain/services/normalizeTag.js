function normalizeTag(rawTag) {
  if (!rawTag || typeof rawTag !== "string") return "";
  const decoded = decodeURIComponent(rawTag).trim().toUpperCase();
  const withoutHash = decoded.startsWith("#") ? decoded.slice(1) : decoded;
  return withoutHash.replace(/[^0289PYLQGRJCUV]/g, "");
}

module.exports = { normalizeTag };
