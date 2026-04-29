function sanitizeCountryCode(rawCountry) {
  const normalized = String(rawCountry || "global")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  return normalized || "global";
}

module.exports = { sanitizeCountryCode };
