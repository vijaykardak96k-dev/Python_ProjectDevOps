import os
os.environ["MONGO_URI"] = "mongodb://localhost:27017/smartfarm_test"
os.environ["SEED_ON_START"] = "false"

from backend.app import app


def test_root():
    client = app.test_client()
    response = client.get("/")
    assert response.status_code == 200
    assert response.get_json()["service"] == "smart-farm-api"
