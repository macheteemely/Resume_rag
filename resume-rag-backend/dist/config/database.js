"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
exports.getDb = getDb;
exports.getClient = getClient;
const mongodb_1 = require("mongodb");
const env_1 = require("./env");
let client = null;
let db = null;
async function connectDatabase() {
    if (client && db)
        return; // already connected — reuse
    if (!env_1.ENV.MONGODB_URI || env_1.ENV.MONGODB_URI === "YOUR_MONGODB_CONNECTION_STRING") {
        throw new Error("MONGODB_URI is not configured in .env");
    }
    client = new mongodb_1.MongoClient(env_1.ENV.MONGODB_URI);
    await client.connect();
    db = client.db(env_1.ENV.MONGODB_DB_NAME);
    console.log(`[DB] Connected to MongoDB — database: ${env_1.ENV.MONGODB_DB_NAME}`);
}
function getDb() {
    if (!db) {
        throw new Error("Database not initialised. Call connectDatabase() first.");
    }
    return db;
}
function getClient() {
    if (!client) {
        throw new Error("MongoClient not initialised. Call connectDatabase() first.");
    }
    return client;
}
