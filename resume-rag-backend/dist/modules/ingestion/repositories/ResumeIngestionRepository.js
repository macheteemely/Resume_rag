"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeIngestionRepository = void 0;
const mongodb_1 = require("mongodb");
const database_1 = require("../../../config/database");
class ResumeIngestionRepository {
    get collection() {
        return (0, database_1.getDb)().collection("resumes");
    }
    async insertResume(doc) {
        const result = await this.collection.insertOne(doc);
        return result.insertedId.toString();
    }
    async findById(id) {
        const doc = await this.collection.findOne({ _id: new mongodb_1.ObjectId(id) });
        return doc;
    }
    async existsByFileName(fileName) {
        const count = await this.collection.countDocuments({ fileName });
        return count > 0;
    }
}
exports.ResumeIngestionRepository = ResumeIngestionRepository;
