import os
import logging
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import influxdb_client

# ---------- Logging ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("influx_api")

# ---------- FastAPI ----------
app = FastAPI(title="Influx Only API", version="0.1.0")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# ---------- Influx Settings (ENV 우선, 없으면 기본값) ----------
INFLUXDB_URL = os.getenv("INFLUXDB_URL", "http://infopath.iptime.org:8086")
INFLUXDB_TOKEN = os.getenv(
	"INFLUXDB_TOKEN",
	"l_5yaiIU4AHMpemIMA-ZChQbLMAbkXgllf-4NXUfR6vKnR12tG2X5lnuYXIVij8ZzuxeImNS5mBkQtQuk5elhw==",
)
INFLUXDB_ORG = os.getenv("INFLUXDB_ORG", "infopath")
DEFAULT_BUCKET_TEST = os.getenv("INFLUX_BUCKET_TEST", "testspc")
DEFAULT_BUCKET_SPEC = os.getenv("INFLUX_BUCKET_SPEC", "testspecspc")

influx_client = influxdb_client.InfluxDBClient(url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG)
query_api = influx_client.query_api()


def _escape_double_quotes(text: str) -> str:
	return text.replace('"', '\\"')


@app.get("/")
async def root() -> Dict[str, Any]:
	return {
		"message": "Influx Only API is running",
		"influx": {"url": INFLUXDB_URL, "org": INFLUXDB_ORG},
	}


@app.get("/gettest")
async def gettest(
	tag: Optional[List[str]] = Query(None),
	bucket: Optional[str] = None,
	window: str = "1d",
	measurement: str = "TESTSPC",
):
	"""
	InfluxDB TEST 계열 데이터 조회 (기본: bucket=testspc, measurement=TESTSPC)
	- 단일: ?tag=A
	- 멀티: ?tag=A&tag=B
	- 윈도우 집계 변경: &window=6h
	"""
	if not tag:
		raise HTTPException(status_code=400, detail="tag 파라미터를 하나 이상 제공해야 합니다.")

	selected_bucket = bucket or DEFAULT_BUCKET_TEST

	if len(tag) == 1:
		conditions = f"r[\"TAGID\"] == \"{_escape_double_quotes(tag[0])}\""
	else:
		conditions = " or ".join([f"r[\"TAGID\"] == \"{_escape_double_quotes(t)}\"" for t in tag])

	flux_query = f'''
	from(bucket: "{selected_bucket}")
	  |> range(start: -5y, stop: now())
	  |> filter(fn: (r) => r["_measurement"] == "{measurement}")
	  |> filter(fn: (r) => {conditions})
	  |> aggregateWindow(every: {window}, fn: mean, createEmpty: false)
	'''

	try:
		tables = query_api.query(org=INFLUXDB_ORG, query=flux_query)
		results: List[Dict[str, Any]] = []
		for table in tables:
			for record in table.records:
				raw_value = record.values.get("_value")
				rounded_value = round(float(raw_value), 3) if raw_value is not None else None
				results.append({
					"_time": record.values.get("_time"),
					"TAGID": record.values.get("TAGID"),
					"_value": rounded_value,
				})
		return {"success": True, "data": results, "bucket": selected_bucket}
	except Exception as e:
		logger.exception("InfluxDB 쿼리 오류")
		raise HTTPException(status_code=500, detail=f"InfluxDB 쿼리 오류: {e}")


@app.get("/getspectest")
async def getspectest(
	tag: str,
	bucket: Optional[str] = None,
	window: str = "4h",
	measurement: str = "TESTSPECSPC",
):
	"""
	Spec 계열 데이터 조회 (VALUE, LSL, USL, LCL, UCL)
	기본: bucket=testspecspc, measurement=TESTSPECSPC
	"""
	if not tag:
		raise HTTPException(status_code=400, detail="tag 파라미터를 제공해야 합니다.")

	selected_bucket = bucket or DEFAULT_BUCKET_SPEC
	conditions = f"r[\"TAGID\"] == \"{_escape_double_quotes(tag)}\""

	flux_query = f'''
	from(bucket: "{selected_bucket}")
	  |> range(start: -5y, stop: now())
	  |> filter(fn: (r) => r["_measurement"] == "{measurement}")
	  |> filter(fn: (r) => {conditions})
	  |> aggregateWindow(every: {window}, fn: mean, createEmpty: false)
	'''

	try:
		tables = query_api.query(org=INFLUXDB_ORG, query=flux_query)
		time_to_data: Dict[str, Dict[str, Any]] = {}
		for table in tables:
			for record in table.records:
				field_name = record.values.get("_field")
				field_value = record.values.get("_value")
				time_key = record.values.get("_time")

				rounded_value = round(float(field_value), 3) if field_value is not None else None

				if time_key not in time_to_data:
					time_to_data[time_key] = {
						"_time": time_key,
						"_value": None,
						"lsl": None,
						"usl": None,
						"lcl": None,
						"ucl": None,
					}

				if field_name == "VALUE":
					time_to_data[time_key]["_value"] = rounded_value
				elif field_name == "LSL":
					time_to_data[time_key]["lsl"] = rounded_value
				elif field_name == "USL":
					time_to_data[time_key]["usl"] = rounded_value
				elif field_name == "LCL":
					time_to_data[time_key]["lcl"] = rounded_value
				elif field_name == "UCL":
					time_to_data[time_key]["ucl"] = rounded_value

		results = list(time_to_data.values())
		return {"success": True, "data": results, "bucket": selected_bucket}
	except Exception as e:
		logger.exception("InfluxDB 쿼리 오류")
		raise HTTPException(status_code=500, detail=f"InfluxDB 쿼리 오류: {e}")


# uvicorn 실행 명령 예:
# python -m uvicorn python.influx_api:app --host 0.0.0.0 --port 8000 --reload
