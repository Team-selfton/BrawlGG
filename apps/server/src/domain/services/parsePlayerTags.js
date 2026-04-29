const { normalizeTag } = require("./normalizeTag");

function parsePlayerTags(rawInput, maxCount = 10) {
  const safeMaxCount = Number.isFinite(maxCount) ? Math.max(1, maxCount) : 10;
  const joined = Array.isArray(rawInput) ? rawInput.join(",") : String(rawInput || "");
  const tags = joined
    .split(/[\s,]+/g)
    .map((rawTag) => normalizeTag(rawTag))
    .filter(Boolean);

  const uniqueTags = [];
  const seen = new Set();

  for (const tag of tags) {
    if (seen.has(tag)) continue;
    seen.add(tag);
    uniqueTags.push(tag);

    if (uniqueTags.length >= safeMaxCount) {
      break;
    }
  }

  return uniqueTags;
}

module.exports = { parsePlayerTags };
