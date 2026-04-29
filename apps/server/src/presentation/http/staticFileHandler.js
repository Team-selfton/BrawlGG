const fs = require("node:fs/promises");
const path = require("node:path");
const { sendNotFound } = require("./httpResponse");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function createStaticFileHandler({ webRootDir }) {
  return async function serveStatic(reqUrl, res) {
    const relativePath = resolveRelativePath(reqUrl.pathname);
    const resolvedPath = path.normalize(path.join(webRootDir, relativePath));

    if (!resolvedPath.startsWith(webRootDir)) {
      sendNotFound(res);
      return;
    }

    try {
      const stat = await fs.stat(resolvedPath);
      if (stat.isDirectory()) {
        sendNotFound(res);
        return;
      }

      const extension = path.extname(resolvedPath).toLowerCase();
      const contentType = MIME_TYPES[extension] || "application/octet-stream";
      const content = await fs.readFile(resolvedPath);

      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    } catch {
      sendNotFound(res);
    }
  };
}

function resolveRelativePath(pathname) {
  if (pathname === "/") {
    return "/public/index.html";
  }

  if (pathname === "/docs" || pathname === "/docs/") {
    return "/public/swagger.html";
  }

  return pathname;
}

module.exports = { createStaticFileHandler };
