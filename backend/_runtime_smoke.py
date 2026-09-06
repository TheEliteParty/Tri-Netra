import asyncio
import base64
import json
import math
import time

import httpx
import websockets

BASE = "http://127.0.0.1:8000"
WS = "ws://127.0.0.1:8000"
results = []
state = {}


def record(name, ok, note=""):
    results.append({"flow": name, "ok": bool(ok), "note": str(note)})


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def jwt_payload(token):
    part = token.split(".")[1]
    part += "=" * (-len(part) % 4)
    return json.loads(base64.urlsafe_b64decode(part))


def finite_json(value):
    if isinstance(value, float):
        return math.isfinite(value)
    if isinstance(value, dict):
        return all(finite_json(v) for v in value.values())
    if isinstance(value, list):
        return all(finite_json(v) for v in value)
    return True


async def main():
    async with httpx.AsyncClient(base_url=BASE, timeout=30.0) as client:
        for path in ("/health", "/api/health"):
            started = time.perf_counter()
            response = await client.get(path)
            record(path, response.status_code == 200 and response.json().get("status") == "healthy", f"HTTP {response.status_code}; {1000*(time.perf_counter()-started):.1f} ms")

        credentials = {
            "admin": ("admin@trinetra.gov.in", "admin123"),
            "district": ("district@trinetra.gov.in", "district123"),
            "field": ("field@trinetra.gov.in", "field123"),
            "citizen": ("citizen@trinetra.gov.in", "demo123"),
        }
        tokens = {}
        for role, (email, password) in credentials.items():
            response = await client.post("/api/auth/login", json={"email": email, "password": password})
            body = response.json()
            token = body.get("token", "")
            tokens[role] = token
            payload = jwt_payload(token) if token else {}
            record(f"login:{role}", response.status_code == 200 and payload.get("role") == body.get("user", {}).get("role") and isinstance(payload.get("districts"), list), f"HTTP {response.status_code}; districts={payload.get('districts')}")
        response = await client.post("/api/auth/login", json={"email": credentials["admin"][0], "password": "invalid"})
        record("login:invalid", response.status_code == 401, f"HTTP {response.status_code}")
        for label, headers in (("missing", {}), ("invalid", bearer("not-a-jwt"))):
            response = await client.post("/api/ml/train", headers=headers)
            record(f"protected:{label}", response.status_code == 401, f"HTTP {response.status_code}")

        dashboard_paths = ("/api/dashboard/stats", "/api/dashboard/risk-heatmap", "/api/dashboard/rainfall-trend", "/api/dashboard/risk-trend", "/api/dashboard/state-summary")
        for path in dashboard_paths:
            response = await client.get(path)
            record(path, response.status_code == 200 and finite_json(response.json()), f"HTTP {response.status_code}; JSON={response.headers.get('content-type', '').startswith('application/json')}")

        response = await client.get("/api/sensors/stations")
        stations = response.json()
        record("stations:list", response.status_code == 200 and len(stations) == 28, f"HTTP {response.status_code}; count={len(stations)}")
        station_id = "NER-001"
        other_station = next(item for item in stations if item.get("district") != "Gangtok")
        state["other_station"] = {"station_id": other_station["station_id"], "district": other_station["district"]}
        response = await client.get(f"/api/sensors/stations/{station_id}")
        record("stations:detail", response.status_code == 200 and response.json().get("station", {}).get("station_id") == station_id, f"HTTP {response.status_code}; readings={len(response.json().get('readings', []))}")
        response = await client.get(f"/api/sensors/stations/{station_id}/history?hours=720")
        state["history_before"] = len(response.json())
        record("stations:history", response.status_code == 200 and isinstance(response.json(), list), f"HTTP {response.status_code}; count={len(response.json())}")

        prediction_payload = {"latitude": 27.3389, "longitude": 88.6065, "slope": 38, "rainfall_mm": 80, "soil_moisture": 70}
        response = await client.post("/api/predict", json=prediction_payload)
        prediction = response.json().get("risk_assessment", {})
        risk_score = prediction.get("risk_score")
        record("predict", response.status_code == 200 and isinstance(risk_score, (int, float)) and 0 <= risk_score <= 100 and prediction.get("risk_level") in {"low", "moderate", "high", "critical"} and finite_json(response.json()), f"HTTP {response.status_code}; score={risk_score}; level={prediction.get('risk_level')}")
        response = await client.post("/api/ml/predict", json={"latitude": 27.3389, "longitude": 88.6065, "slope": 38, "rainfall_24hr": 80})
        ml = response.json()
        record("ml:predict", response.status_code == 200 and 0 <= ml.get("risk_score", -1) <= 100 and ml.get("risk_level") in {"low", "moderate", "high", "critical"} and finite_json(ml), f"HTTP {response.status_code}; score={ml.get('risk_score')}; level={ml.get('risk_level')}")
        response = await client.get("/api/ml/risk/grid?resolution=5")
        record("ml:risk-grid", response.status_code == 200 and finite_json(response.json()), f"HTTP {response.status_code}; type={type(response.json()).__name__}")

        for path in ("/api/alerts", "/api/alerts/active", "/api/alerts/stats"):
            response = await client.get(path)
            record(path, response.status_code == 200 and finite_json(response.json()), f"HTTP {response.status_code}")

        report_data = {"report_type": "landslide", "description": "Runtime smoke-test report", "latitude": "27.3389", "longitude": "88.6065", "reporter_name": "Runtime Smoke Test", "reporter_language": "en"}
        response = await client.post("/api/reports", data=report_data, headers=bearer(tokens["citizen"]))
        report_id = response.json().get("report_id")
        state["report_id"] = report_id
        record("reports:create", response.status_code == 200 and isinstance(report_id, int), f"HTTP {response.status_code}; id={report_id}")
        response = await client.get("/api/reports")
        record("reports:list", response.status_code == 200 and any(item.get("id") == report_id for item in response.json()), f"HTTP {response.status_code}; persisted=true")
        response = await client.put(f"/api/reports/{report_id}/verify", headers=bearer(tokens["admin"]))
        record("reports:verify", response.status_code == 200, f"HTTP {response.status_code}")

        response = await client.post("/api/simulate/landslide", json={"station_id": station_id, "intensity": "high"}, headers=bearer(tokens["field"]))
        single = response.json()
        alert = single.get("alert")
        alert_id = alert.get("id") if isinstance(alert, dict) else None
        state["alert_id"] = alert_id
        record("simulator:single", response.status_code == 200 and single.get("status") == "success" and single.get("simulation") and single.get("risk_assessment") and alert_id, f"HTTP {response.status_code}; alert_id={alert_id}")
        response = await client.post("/api/simulate/batch?stations_count=2&intensity=moderate", headers=bearer(tokens["district"]))
        batch = response.json()
        record("simulator:batch", response.status_code == 200 and batch.get("stations_count") == 2 and len(batch.get("events", [])) == 2, f"HTTP {response.status_code}; events={len(batch.get('events', []))}")

        segmentation_calls = [
            ("segmentation:models", "GET", "/api/segmentation/models", None),
            ("segmentation:station", "GET", f"/api/segmentation/station/{station_id}", None),
            ("segmentation:inference", "POST", "/api/segmentation/inference", {"station_name": "Smoke ROI", "lat": 27.3389, "lng": 88.6065, "slope_angle": 38, "soil_moisture": 70, "rainfall_24h": 80}),
            ("segmentation:roi", "POST", "/api/segmentation/scan-roi", {"location_name": "Smoke ROI", "lat": 27.3389, "lng": 88.6065, "slope_angle": 38, "soil_moisture": 70, "rainfall_24h": 80}),
        ]
        for name, method, path, payload in segmentation_calls:
            response = await client.request(method, path, json=payload)
            body = response.json()
            record(name, response.status_code == 200 and finite_json(body), f"HTTP {response.status_code}; data_mode={body.get('data_mode', 'nested/unspecified')}")

        response = await client.get(f"/api/ndma-briefing/{station_id}")
        ndma = response.json()
        record("ndma:valid", response.status_code == 200 and ndma.get("data_mode") == "prototype_simulation" and ndma.get("classification") == "PROTOTYPE / NOT FOR OPERATIONAL USE", f"HTTP {response.status_code}; schema fields={len(ndma)}")
        response = await client.get("/api/ndma-briefing/INVALID-STATION")
        record("ndma:invalid", response.status_code == 404, f"HTTP {response.status_code}")

        for name, path, content_type in (
            ("export:geojson", "/api/export/geojson", "application/geo+json"),
            ("export:csv", "/api/export/csv", "text/csv"),
            ("export:risk-zones", "/api/export/risk-zones", "application/geo+json"),
        ):
            response = await client.get(path)
            actual = response.headers.get("content-type", "")
            record(name, response.status_code == 200 and len(response.content) > 20 and content_type in actual, f"HTTP {response.status_code}; {actual}; bytes={len(response.content)}")

        try:
            async with websockets.connect(f"{WS}/ws/alerts/Gangtok", open_timeout=3):
                record("ws:unauthenticated", False, "unexpected connection")
        except Exception as exc:
            code = getattr(exc, "code", None)
            status = getattr(getattr(exc, "response", None), "status_code", None)
            record("ws:unauthenticated", code in {4401, 1008} or status in {401, 403}, f"rejected={type(exc).__name__}; HTTP={status}; code={code}")

        try:
            async with websockets.connect(f"{WS}/ws/alerts/Darjeeling?token={tokens['field']}", open_timeout=3) as socket:
                await socket.recv()
                record("ws:district-auth", False, "unexpected subscription")
        except Exception as exc:
            code = getattr(exc, "code", None)
            status = getattr(getattr(exc, "response", None), "status_code", None)
            record("ws:district-auth", code == 4403 or status == 403, f"rejected={type(exc).__name__}; HTTP={status}; code={code}")

        async with websockets.connect(f"{WS}/ws/alerts/Gangtok?token={tokens['field']}") as district_socket, websockets.connect(f"{WS}/ws/alerts/all?token={tokens['admin']}") as admin_socket:
            connected_district = json.loads(await district_socket.recv())
            connected_admin = json.loads(await admin_socket.recv())
            await district_socket.send("subscribe:Gangtok")
            subscribed = json.loads(await district_socket.recv())
            record("ws:authenticated-subscribe", connected_district.get("type") == "connected" and connected_admin.get("type") == "connected" and subscribed.get("type") == "subscribed", f"district={subscribed.get('district')}")

            response = await client.post("/api/simulate/landslide", json={"station_id": station_id, "intensity": "high"}, headers=bearer(tokens["field"]))
            created_alert_id = response.json().get("alert", {}).get("id")
            state["alert_id"] = created_alert_id
            created_district = json.loads(await asyncio.wait_for(district_socket.recv(), 5))
            created_admin = json.loads(await asyncio.wait_for(admin_socket.recv(), 5))
            record("ws:alert.created", created_district.get("type") == "alert.created" and created_admin.get("type") == "alert.created" and created_district.get("alert", {}).get("id") == created_alert_id, f"alert_id={created_alert_id}")

            response = await client.put(f"/api/alerts/{created_alert_id}/acknowledge", headers=bearer(tokens["district"]))
            updated_district = json.loads(await asyncio.wait_for(district_socket.recv(), 5))
            updated_admin = json.loads(await asyncio.wait_for(admin_socket.recv(), 5))
            record("alerts:acknowledge+ws", response.status_code == 200 and updated_district.get("type") == "alert.updated" and updated_admin.get("alert", {}).get("status") == "acknowledged", f"HTTP {response.status_code}")

            response = await client.put(f"/api/alerts/{created_alert_id}/resolve", headers=bearer(tokens["admin"]))
            resolved_district = json.loads(await asyncio.wait_for(district_socket.recv(), 5))
            resolved_admin = json.loads(await asyncio.wait_for(admin_socket.recv(), 5))
            record("alerts:resolve+ws", response.status_code == 200 and resolved_district.get("alert", {}).get("status") == "resolved" and resolved_admin.get("type") == "alert.updated", f"HTTP {response.status_code}")

            response = await client.post("/api/simulate/landslide", json={"station_id": other_station["station_id"], "intensity": "high"}, headers=bearer(tokens["admin"]))
            isolated_admin = json.loads(await asyncio.wait_for(admin_socket.recv(), 5))
            isolated = False
            try:
                await asyncio.wait_for(district_socket.recv(), 1)
            except asyncio.TimeoutError:
                isolated = True
            record("ws:district-isolation", response.status_code == 200 and isolated and isolated_admin.get("type") == "alert.created", f"other={other_station['district']}; isolated={isolated}")

    print(json.dumps({"results": results, "state": state}, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
