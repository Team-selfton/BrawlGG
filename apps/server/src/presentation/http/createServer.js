const http = require("node:http");
const { URL } = require("node:url");

function createServer({ routeApi, serveStatic }) {
  return http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url, `http://${req.headers.host}`);

      if (requestUrl.pathname.startsWith("/api/")) {
        await routeApi(req, requestUrl, res);
        return;
      }

      await serveStatic(requestUrl, res);
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          reason: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown server error."
        })
      );
    }
  });
}

module.exports = { createServer };
