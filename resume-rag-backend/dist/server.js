"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const PORT = env_1.ENV.PORT;
async function startServer() {
    try {
        // Connect to MongoDB before accepting requests
        await (0, database_1.connectDatabase)();
        app_1.default.listen(PORT, () => {
            console.log(`[Server] resume-rag-backend running on http://localhost:${PORT}`);
            console.log(`[Server] Environment: ${env_1.ENV.NODE_ENV}`);
        });
    }
    catch (err) {
        console.error("[Server] Failed to start:", err);
        process.exit(1);
    }
}
startServer();
