"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestId = requestId;
const uuid_1 = require("uuid");
// Attach a unique request ID to every incoming request.
// Re-uses the x-request-id header if provided by the caller (useful for tracing).
function requestId(req, res, next) {
    const id = req.headers["x-request-id"] || (0, uuid_1.v4)();
    req.requestId = id;
    res.setHeader("x-request-id", id);
    next();
}
