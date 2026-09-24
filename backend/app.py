import os
from datetime import datetime, timezone
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient, ReturnDocument
from bson import ObjectId
from bson.errors import InvalidId

app = Flask(__name__)
CORS(app, origins=os.getenv("CORS_ORIGINS", "*").split(","))

PORT = int(os.getenv("PORT", "5000"))
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/smartfarm")
DB_NAME = os.getenv("MONGO_DB", "smartfarm")
SEED_ON_START = os.getenv("SEED_ON_START", "true").lower() == "true"

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]
crops = db.crops

ALLOWED_STATUS = {"Growing", "Ready to Harvest", "Harvested"}
ALLOWED_WATER = {"OK", "Needs Water"}
ALLOWED_FERTILIZER = {"OK", "Needs Fertilizer"}

SEED_CROPS = [
    {"name": "Wheat", "field": "Field A", "area": 2.5, "plantingDate": "2026-06-15", "expectedHarvestDate": "2026-09-15", "status": "Growing", "waterStatus": "OK", "fertilizerStatus": "OK", "lastWatered": "2026-08-10", "lastFertilized": "2026-07-30", "notes": "Crop growing normally"},
    {"name": "Corn", "field": "Field B", "area": 3, "plantingDate": "2026-06-01", "expectedHarvestDate": "2026-08-20", "status": "Ready to Harvest", "waterStatus": "OK", "fertilizerStatus": "OK", "lastWatered": "2026-08-09", "lastFertilized": "2026-07-25", "notes": "Ready for harvesting"},
    {"name": "Soybean", "field": "Field C", "area": 2, "plantingDate": "2026-06-20", "expectedHarvestDate": "2026-09-25", "status": "Growing", "waterStatus": "Needs Water", "fertilizerStatus": "OK", "lastWatered": "2026-08-05", "lastFertilized": "2026-07-28", "notes": "Soil is getting dry"},
    {"name": "Tomato", "field": "Field D", "area": 1.5, "plantingDate": "2026-07-01", "expectedHarvestDate": "2026-09-10", "status": "Growing", "waterStatus": "OK", "fertilizerStatus": "Needs Fertilizer", "lastWatered": "2026-08-11", "lastFertilized": "2026-07-15", "notes": "Fertilizer required this week"},
    {"name": "Potato", "field": "Field E", "area": 2.2, "plantingDate": "2026-05-20", "expectedHarvestDate": "2026-08-25", "status": "Ready to Harvest", "waterStatus": "Needs Water", "fertilizerStatus": "Needs Fertilizer", "lastWatered": "2026-08-04", "lastFertilized": "2026-07-10", "notes": "Prepare for harvest"},
]


def serialize(doc):
    if not doc:
        return None
    result = dict(doc)
    result["_id"] = str(result["_id"])
    return result


def validate_payload(data, partial=False):
    if not isinstance(data, dict):
        return "Request body must be a JSON object"
    required = ["name", "field", "area", "plantingDate", "expectedHarvestDate"]
    if not partial:
        missing = [key for key in required if key not in data]
        if missing:
            return f"Missing fields: {', '.join(missing)}"
    if "area" in data:
        try:
            if float(data["area"]) <= 0:
                return "area must be greater than 0"
        except (TypeError, ValueError):
            return "area must be a number"
    if "status" in data and data["status"] not in ALLOWED_STATUS:
        return "Invalid status"
    if "waterStatus" in data and data["waterStatus"] not in ALLOWED_WATER:
        return "Invalid waterStatus"
    if "fertilizerStatus" in data and data["fertilizerStatus"] not in ALLOWED_FERTILIZER:
        return "Invalid fertilizerStatus"
    return None


@app.get("/")
def root():
    return jsonify({"service": "smart-farm-api", "status": "running"})


@app.get("/health")
def health():
    return jsonify({"status": "healthy"})


@app.get("/ready")
def ready():
    try:
        client.admin.command("ping")
        return jsonify({"status": "ready"})
    except Exception:
        return jsonify({"status": "not-ready"}), 503


@app.get("/api/crops")
def get_crops():
    return jsonify([serialize(c) for c in crops.find().sort("createdAt", -1)])


@app.get("/api/crops/<crop_id>")
def get_crop(crop_id):
    try:
        crop = crops.find_one({"_id": ObjectId(crop_id)})
    except InvalidId:
        return jsonify({"message": "Invalid crop id"}), 400
    if not crop:
        return jsonify({"message": "Crop not found"}), 404
    return jsonify(serialize(crop))


@app.post("/api/crops")
def create_crop():
    data = request.get_json(silent=True) or {}
    error = validate_payload(data)
    if error:
        return jsonify({"message": error}), 400
    now = datetime.now(timezone.utc)
    data["area"] = float(data["area"])
    data.setdefault("status", "Growing")
    data.setdefault("waterStatus", "OK")
    data.setdefault("fertilizerStatus", "OK")
    data.setdefault("notes", "")
    data["createdAt"] = now
    data["updatedAt"] = now
    result = crops.insert_one(data)
    return jsonify(serialize(crops.find_one({"_id": result.inserted_id}))), 201


@app.put("/api/crops/<crop_id>")
def update_crop(crop_id):
    data = request.get_json(silent=True) or {}
    error = validate_payload(data, partial=True)
    if error:
        return jsonify({"message": error}), 400
    try:
        oid = ObjectId(crop_id)
    except InvalidId:
        return jsonify({"message": "Invalid crop id"}), 400
    data.pop("_id", None)
    if "area" in data:
        data["area"] = float(data["area"])
    data["updatedAt"] = datetime.now(timezone.utc)
    result = crops.find_one_and_update({"_id": oid}, {"$set": data}, return_document=ReturnDocument.AFTER)
    if not result:
        return jsonify({"message": "Crop not found"}), 404
    return jsonify(serialize(result))


@app.delete("/api/crops/<crop_id>")
def delete_crop(crop_id):
    try:
        oid = ObjectId(crop_id)
    except InvalidId:
        return jsonify({"message": "Invalid crop id"}), 400
    result = crops.delete_one({"_id": oid})
    if result.deleted_count == 0:
        return jsonify({"message": "Crop not found"}), 404
    return jsonify({"message": "Crop deleted successfully"})


@app.get("/api/dashboard")
def dashboard():
    return jsonify({
        "total": crops.count_documents({}),
        "readyToHarvest": crops.count_documents({"status": "Ready to Harvest"}),
        "needsWater": crops.count_documents({"waterStatus": "Needs Water"}),
        "needsFertilizer": crops.count_documents({"fertilizerStatus": "Needs Fertilizer"}),
        "growing": crops.count_documents({"status": "Growing"}),
    })


def seed_data():
    if not SEED_ON_START or crops.count_documents({}) > 0:
        return
    now = datetime.now(timezone.utc)
    documents = []
    for crop in SEED_CROPS:
        item = dict(crop)
        item["area"] = float(item["area"])
        item["createdAt"] = now
        item["updatedAt"] = now
        documents.append(item)
    crops.insert_many(documents)


try:
    crops.create_index("createdAt")
    crops.create_index("status")
    crops.create_index("waterStatus")
    crops.create_index("fertilizerStatus")
    seed_data()
except Exception as exc:
    app.logger.warning("Database initialization deferred: %s", exc)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
