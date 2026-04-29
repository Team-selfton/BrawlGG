function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function sendRedirect(res, location, headers = {}) {
  res.writeHead(302, { Location: location, ...headers });
  res.end();
}

function sendNotFound(res) {
  sendJson(res, 404, { message: "Not found." });
}

module.exports = {
  sendJson,
  sendRedirect,
  sendNotFound
};
