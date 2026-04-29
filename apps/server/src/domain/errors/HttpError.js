class HttpError extends Error {
  constructor(statusCode, reason, message, details = null) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.reason = reason;
    this.details = details;
  }
}

module.exports = { HttpError };
