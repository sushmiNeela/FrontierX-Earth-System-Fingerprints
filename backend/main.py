
import csv
import hashlib
import io
import os
import threading

from pathlib import Path, PurePosixPath
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


# ============================================================
# CONFIGURATION
# ============================================================

load_dotenv(Path(__file__).with_name(".env"))

APPEEARS_BASE_URL = os.getenv(
    "APPEEARS_API_BASE_URL",
    "https://appeears.earthdatacloud.nasa.gov/api"
).rstrip("/")

APPEEARS_USERNAME = os.getenv("APPEEARS_USERNAME")
APPEEARS_PASSWORD = os.getenv("APPEEARS_PASSWORD")

TOKEN_CACHE = {
    "token": None,
    "created_at": None,
}

TOKEN_LOCK = threading.Lock()
TOKEN_VALIDITY_SECONDS = 45 * 60

SUPPORTED_PRODUCTS = {
    "MOD11A1.061": {
        "name": "MODIS/Terra Land Surface Temperature",
        "variable": "Land Surface Temperature",
        "task_submission_allowed": True,
    },
    "MOD13Q1.061": {
        "name": "MODIS Vegetation Indices",
        "variable": "NDVI",
        "task_submission_allowed": True,
    },
    "SPL3SMP_E.006": {
        "name": "SMAP Enhanced L3 Radiometer Global Daily Soil Moisture",
        "variable": "Soil Moisture",
        "task_submission_allowed": True,
    },
    "NASADEM_NC.001": {
        "name": "NASADEM Elevation 30m",
        "variable": "Elevation (Ancillary)",
        "task_submission_allowed": False,
    },
    "NASADEM_NUMNC.001": {
        "name": "NASADEM Number of Observations 30m",
        "variable": "Elevation Observation Count (QA Ancillary)",
        "task_submission_allowed": False,
    },
}


# ============================================================
# VERIFIED NASA TASK DOWNLOAD ROUTING
# ============================================================

DATA_ROOT = Path(r"E:\EarthSystemFingerprintsData\raw\appeears")

TASK_DOWNLOAD_DIRECTORIES = {
    "934b1497-cb1a-4018-89dc-74d3aedb179f": "Bangladesh_LST",
    "cca99388-af14-4506-95ed-b7008b918d20":
        "Bangladesh_SM_2018_2025",
    "e618fa2f-5475-465c-ad0b-a975c258fa1e":
        "IGP_NDVI_LEGACY_RECTANGULAR_AOI",
    "a83c3bdc-b590-4a8c-b859-c82c38f761e8":
        "Amazon_BR163_LST",
    "627c1233-a9c0-4c20-b21f-b4d936aee355":
        "Amazon_BR163_NDVI",
    "3ce55963-389b-4db4-a9bf-485a3b8bb352":
        "Amazon_BR163_SM",
}


def resolve_task_download_directory(task_id: str) -> Path:

    relative_directory = TASK_DOWNLOAD_DIRECTORIES.get(task_id)

    if relative_directory is None:
        raise HTTPException(
            status_code=403,
            detail="Download blocked: task ID has no verified destination."
        )

    return DATA_ROOT / relative_directory


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Earth System Fingerprints API",
    description="NASA AppEEARS integration for Earth System Fingerprints",
    version="1.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{port}"
        for port in range(5100, 5200)
    ] + [
        f"http://127.0.0.1:{port}"
        for port in range(5100, 5200)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# TOKEN MANAGEMENT
# ============================================================

def get_token(force_refresh: bool = False) -> str:

    with TOKEN_LOCK:

        if not APPEEARS_USERNAME or not APPEEARS_PASSWORD:
            raise HTTPException(
                status_code=500,
                detail="NASA AppEEARS credentials are missing."
            )

        now = datetime.now(timezone.utc)

        if not force_refresh and TOKEN_CACHE["token"]:

            age = (
                now - TOKEN_CACHE["created_at"]
            ).total_seconds()

            if age < TOKEN_VALIDITY_SECONDS:
                return TOKEN_CACHE["token"]

        try:

            response = requests.post(
                f"{APPEEARS_BASE_URL}/login",
                auth=(
                    APPEEARS_USERNAME,
                    APPEEARS_PASSWORD
                ),
                timeout=60,
            )

            response.raise_for_status()

            data = response.json()
            token = data.get("token")

            if not token:
                raise HTTPException(
                    status_code=502,
                    detail="NASA AppEEARS did not return an access token."
                )

            TOKEN_CACHE["token"] = token
            TOKEN_CACHE["created_at"] = now

            return token

        except requests.RequestException as exc:

            print("NASA authentication error:", exc)

            raise HTTPException(
                status_code=502,
                detail="NASA AppEEARS authentication failed."
            )


# ============================================================
# NASA API GET REQUEST
# ============================================================

def nasa_get(endpoint: str):

    token = get_token()

    url = (
        f"{APPEEARS_BASE_URL.rstrip('/')}/"
        f"{endpoint.lstrip('/')}"
    )

    try:

        response = requests.get(
            url,
            headers={
                "Authorization": f"Bearer {token}"
            },
            timeout=120,
        )

        if response.status_code == 401:

            token = get_token(force_refresh=True)

            response = requests.get(
                url,
                headers={
                    "Authorization": f"Bearer {token}"
                },
                timeout=120,
            )

        response.raise_for_status()

        return response.json()

    except requests.RequestException as exc:

        print("NASA GET error:", exc)

        raise HTTPException(
            status_code=502,
            detail="NASA AppEEARS data request failed."
        )


# ============================================================
# NASA API POST REQUEST
# ============================================================

def nasa_post(endpoint: str, payload: dict):

    token = get_token()

    url = (
        f"{APPEEARS_BASE_URL.rstrip('/')}/"
        f"{endpoint.lstrip('/')}"
    )

    try:

        response = requests.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=120,
        )

        if response.status_code == 401:

            token = get_token(force_refresh=True)

            response = requests.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                timeout=120,
            )

        response.raise_for_status()

        return response.json()

    except requests.RequestException as exc:

        print("NASA POST error:", exc)

        raise HTTPException(
            status_code=502,
            detail="NASA AppEEARS data submission failed."
        )


# ============================================================
# BASIC ENDPOINTS
# ============================================================

@app.get("/")
def root():

    return {
        "project": "Earth System Fingerprints",
        "status": "operational",
        "version": "1.4.0",
        "service": "NASA AppEEARS API",
    }


@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": "earth-system-fingerprints-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ============================================================
# NASA API STATUS
# ============================================================

@app.get("/api/nasa/status")
def nasa_status():

    token = get_token()

    return {
        "status": "connected",
        "service": "NASA AppEEARS",
        "authentication": "successful",
        "token_available": bool(token),
    }


# ============================================================
# NASA PRODUCT DISCOVERY
# ============================================================

@app.get("/api/nasa/products")
def nasa_products():

    data = nasa_get("product")

    if isinstance(data, list):
        products = data

    elif isinstance(data, dict):
        products = list(data.values())

    else:
        products = []

    selected = []

    for product in products:

        product_id = product.get("ProductAndVersion")

        if product_id in SUPPORTED_PRODUCTS:

            selected.append({
                **product,
                "project_variable":
                    SUPPORTED_PRODUCTS[product_id]["variable"]
            })

    return {
        "source": "NASA AppEEARS",
        "supported_product_count": len(selected),
        "products": selected,
    }


# ============================================================
# NASA PRODUCT LAYERS
# ============================================================

@app.get("/api/nasa/layers/{product_id}")
def nasa_layers(product_id: str):

    if product_id not in SUPPORTED_PRODUCTS:
        raise HTTPException(
            status_code=404,
            detail="Product is not in the supported product list."
        )

    data = nasa_get(f"product/{product_id}")

    layers = data if isinstance(data, dict) else {}

    return {
        "source": "NASA AppEEARS",
        "product_id": product_id,
        "variable": SUPPORTED_PRODUCTS[product_id]["variable"],
        "layer_count": len(layers),
        "layers": layers,
    }


# ============================================================
# NASA TASK STATUS
# ============================================================

@app.get("/api/nasa/tasks/{task_id}")
def nasa_task_status(task_id: str):

    if not task_id.strip():
        raise HTTPException(
            status_code=400,
            detail="Task ID is required."
        )

    data = nasa_get(f"task/{task_id}")

    return {
        "source": "NASA AppEEARS",
        "task_id": task_id,
        "task": data,
    }


# ============================================================
# NASA TASK BUNDLE
# ============================================================

@app.get("/api/nasa/tasks/{task_id}/bundle")
def nasa_task_bundle(task_id: str):

    if not task_id.strip():
        raise HTTPException(
            status_code=400,
            detail="Task ID is required."
        )

    data = nasa_get(f"bundle/{task_id}")

    files = (
        data.get("files", [])
        if isinstance(data, dict)
        else []
    )

    return {
        "source": "NASA AppEEARS",
        "task_id": task_id,
        "file_count": len(files),
        "files": files,
    }


# ============================================================
# NASA TASK SUBMISSION
# ============================================================

@app.post("/api/nasa/tasks")
def submit_nasa_task(payload: dict):

    if not isinstance(payload, dict) or not payload:
        raise HTTPException(
            status_code=400,
            detail="Task payload is required."
        )

    if payload.get("task_type") != "area":
        raise HTTPException(
            status_code=400,
            detail="Only area tasks are supported."
        )

    params = payload.get("params")

    if not isinstance(params, dict):
        raise HTTPException(
            status_code=400,
            detail="Task params must be an object."
        )

    layers = params.get("layers")

    if not isinstance(layers, list) or not layers:
        raise HTTPException(
            status_code=400,
            detail="At least one product layer is required."
        )

    for item in layers:

        if not isinstance(item, dict):
            raise HTTPException(
                status_code=400,
                detail="Each layer entry must be an object."
            )

        product_id = item.get("product")
        layer_name = item.get("layer")

        if product_id not in SUPPORTED_PRODUCTS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported NASA product: {product_id}"
            )

        product_config = SUPPORTED_PRODUCTS[product_id]

        if not product_config.get("task_submission_allowed", False):
            raise HTTPException(
                status_code=400,
                detail=f"Task submission is disabled for ancillary product: {product_id}"
            )

        if not isinstance(layer_name, str) or not layer_name.strip():
            raise HTTPException(
                status_code=400,
                detail=f"A valid layer name is required for {product_id}."
            )

    dates = params.get("dates")

    if not isinstance(dates, list) or not dates:
        raise HTTPException(
            status_code=400,
            detail="At least one date range is required."
        )

    for date_range in dates:

        if not isinstance(date_range, dict):
            raise HTTPException(
                status_code=400,
                detail="Each date range must be an object."
            )

        if not date_range.get("startDate") or not date_range.get("endDate"):
            raise HTTPException(
                status_code=400,
                detail="Both startDate and endDate are required."
            )

    if not params.get("geo"):
        raise HTTPException(
            status_code=400,
            detail="A geographic boundary is required."
        )

    result = nasa_post("task", payload)

    return {
        "source": "NASA AppEEARS",
        "submission": result,
    }


# ============================================================
# NASA TASK LIST
# ============================================================

@app.get("/api/nasa/tasks")
def nasa_task_list():

    data = nasa_get("task")

    return {
        "source": "NASA AppEEARS",
        "tasks": data,
    }


# ============================================================
# NASA STREAMING FILE DOWNLOAD WITH INTEGRITY VALIDATION
# Existing route — writes to verified local directory
# ============================================================

@app.post("/api/nasa/tasks/{task_id}/files/{file_id}/download")
def download_nasa_task_file(task_id: str, file_id: str):

    if not task_id.strip() or not file_id.strip():
        raise HTTPException(
            status_code=400,
            detail="Task ID and file ID are required."
        )

    bundle = nasa_get(f"bundle/{task_id}")
    files = bundle.get("files", [])

    selected = next(
        (f for f in files if f.get("file_id") == file_id),
        None
    )

    if not selected:
        raise HTTPException(
            status_code=404,
            detail="File ID was not found in this NASA task bundle."
        )

    raw_filename = selected.get("file_name")

    if (
        not isinstance(raw_filename, str)
        or not raw_filename.strip()
        or "\\" in raw_filename
        or raw_filename.startswith("/")
        or any(part in ("", ".", "..") for part in raw_filename.split("/"))
    ):
        raise HTTPException(
            status_code=502,
            detail="NASA bundle returned an unsafe filename."
        )

    filename = PurePosixPath(raw_filename).name

    if not filename or Path(filename).name != filename:
        raise HTTPException(
            status_code=502,
            detail="NASA bundle returned an invalid filename."
        )

    expected_size = int(selected["file_size"])
    expected_sha256 = selected["sha256"].lower()

    output_dir = resolve_task_download_directory(task_id)
    output_dir.mkdir(parents=True, exist_ok=True)

    if (
        expected_size < 0
        or len(expected_sha256) != 64
        or any(ch not in "0123456789abcdef" for ch in expected_sha256)
    ):
        raise HTTPException(
            status_code=502,
            detail="NASA bundle returned invalid file integrity metadata."
        )

    destination = output_dir / filename
    temporary = output_dir / (filename + ".part")

    token = get_token()

    url = (
        f"{APPEEARS_BASE_URL.rstrip('/')}/"
        f"bundle/{task_id}/{file_id}"
    )

    response = None

    try:

        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            stream=True,
            timeout=(30, 180)
        )

        if response.status_code == 401:

            response.close()
            token = get_token(force_refresh=True)

            response = requests.get(
                url,
                headers={"Authorization": f"Bearer {token}"},
                stream=True,
                timeout=(30, 180)
            )

        response.raise_for_status()

        digest = hashlib.sha256()
        downloaded = 0

        try:

            with open(temporary, "wb") as output:

                for chunk in response.iter_content(
                    chunk_size=8 * 1024 * 1024
                ):

                    if chunk:
                        output.write(chunk)
                        digest.update(chunk)
                        downloaded += len(chunk)

        finally:
            response.close()

        actual_sha256 = digest.hexdigest()

        if downloaded != expected_size:
            raise HTTPException(
                status_code=502,
                detail={
                    "error": "Downloaded file size mismatch",
                    "expected": expected_size,
                    "actual": downloaded
                }
            )

        if actual_sha256 != expected_sha256:
            raise HTTPException(
                status_code=502,
                detail="SHA-256 verification failed."
            )

        temporary.replace(destination)

        return {
            "status": "downloaded_and_verified",
            "source": "NASA AppEEARS",
            "task_id": task_id,
            "file_id": file_id,
            "filename": filename,
            "path": str(destination),
            "bytes": downloaded,
            "sha256": actual_sha256,
            "size_verified": True,
            "sha256_verified": True
        }

    except HTTPException:

        if temporary.exists():
            temporary.unlink()

        raise

    except requests.RequestException as exc:

        if temporary.exists():
            temporary.unlink()

        print("NASA file download error:", exc)

        raise HTTPException(
            status_code=502,
            detail="NASA AppEEARS file download failed."
        )

    except OSError as exc:

        if temporary.exists():
            temporary.unlink()

        print("Local file write error:", exc)

        raise HTTPException(
            status_code=500,
            detail="Could not write the downloaded NASA file."
        )


# ============================================================
# NASA AppEEARS QUALITY API
# Metadata and QA decoding only
# ============================================================

QUALITY_SUPPORTED_PRODUCTS = {
    "MOD11A1.061",
    "MOD13Q1.061",
    "SPL3SMP_E.006",
}


def validate_quality_product(product_id: str):

    if product_id not in QUALITY_SUPPORTED_PRODUCTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported NASA product: {product_id}"
        )


def validate_quality_layer(layer_name: str):

    if not layer_name or not layer_name.strip():
        raise HTTPException(
            status_code=400,
            detail="Quality layer name is required."
        )


@app.get("/api/nasa/quality/{product_id}")
def nasa_quality_product(product_id: str):

    validate_quality_product(product_id)

    data = nasa_get(
        f"quality/{quote(product_id, safe='.')}"
    )

    return {
        "source": "NASA AppEEARS Quality API",
        "product_id": product_id,
        "quality": data,
    }


@app.get("/api/nasa/quality/{product_id}/{layer_name}")
def nasa_quality_layer(product_id: str, layer_name: str):

    validate_quality_product(product_id)
    validate_quality_layer(layer_name)

    data = nasa_get(
        f"quality/{quote(product_id, safe='.')}/"
        f"{quote(layer_name, safe='')}"
    )

    return {
        "source": "NASA AppEEARS Quality API",
        "product_id": product_id,
        "layer": layer_name,
        "quality": data,
    }


@app.get(
    "/api/nasa/quality/{product_id}/{layer_name}/{quality_value}"
)
def nasa_quality_decode(
    product_id: str,
    layer_name: str,
    quality_value: int
):

    validate_quality_product(product_id)
    validate_quality_layer(layer_name)

    if quality_value < 0:
        raise HTTPException(
            status_code=400,
            detail="Quality value cannot be negative."
        )

    data = nasa_get(
        f"quality/{quote(product_id, safe='.')}/"
        f"{quote(layer_name, safe='')}/"
        f"{quality_value}"
    )

    return {
        "source": "NASA AppEEARS Quality API",
        "product_id": product_id,
        "layer": layer_name,
        "quality_value": quality_value,
        "decoded": data,
    }


# ============================================================
# IGP NDVI STATISTICS CSV — RAM ONLY
# No local file creation; maximum 100 KB
# ============================================================

@app.get("/api/nasa/tasks/igp-ndvi/statistics")
def read_igp_ndvi_statistics():

    task_id = "e618fa2f-5475-465c-ad0b-a975c258fa1e"
    file_id = "8b8f29e6-bf2d-47c8-8e07-ee7b03ee257c"

    # Retrieve authoritative bundle metadata
    bundle = nasa_get(f"bundle/{task_id}")

    if not isinstance(bundle, dict):
        raise HTTPException(
            status_code=502,
            detail="Invalid NASA bundle response."
        )

    selected = next(
        (
            item for item in bundle.get("files", [])
            if item.get("file_id") == file_id
        ),
        None
    )

    if selected is None:
        raise HTTPException(
            status_code=404,
            detail="IGP NDVI Statistics CSV not found."
        )

    if selected.get("file_name") != "MOD13Q1-061-Statistics.csv":
        raise HTTPException(
            status_code=403,
            detail="Unexpected NASA file."
        )

    try:
        expected_size = int(selected["file_size"])
        expected_sha256 = selected["sha256"].lower()

    except (KeyError, TypeError, ValueError, AttributeError):
        raise HTTPException(
            status_code=502,
            detail="Invalid NASA file integrity metadata."
        )

    if expected_size <= 0 or expected_size > 100_000:
        raise HTTPException(
            status_code=413,
            detail="CSV exceeds the permitted 100 KB limit."
        )

    if (
        len(expected_sha256) != 64
        or any(c not in "0123456789abcdef" for c in expected_sha256)
    ):
        raise HTTPException(
            status_code=502,
            detail="Invalid NASA SHA256 metadata."
        )

    url = (
        f"{APPEEARS_BASE_URL.rstrip('/')}/"
        f"bundle/{task_id}/{file_id}"
    )

    token = get_token()
    response = None

    try:

        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            stream=True,
            timeout=(30, 60)
        )

        if response.status_code == 401:

            response.close()
            token = get_token(force_refresh=True)

            response = requests.get(
                url,
                headers={"Authorization": f"Bearer {token}"},
                stream=True,
                timeout=(30, 60)
            )

        response.raise_for_status()

        content = bytearray()

        for chunk in response.iter_content(chunk_size=8192):

            if chunk:
                content.extend(chunk)

            if len(content) > 100_000:
                raise HTTPException(
                    status_code=413,
                    detail="CSV exceeded the 100 KB memory limit."
                )

        data = bytes(content)

    except HTTPException:
        raise

    except requests.RequestException as exc:

        print("NASA CSV retrieval error:", exc)

        raise HTTPException(
            status_code=502,
            detail="NASA AppEEARS CSV retrieval failed."
        )

    finally:

        if response is not None:
            response.close()

    # Verify exact file size
    if len(data) != expected_size:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "CSV size verification failed",
                "expected": expected_size,
                "actual": len(data)
            }
        )

    # Verify SHA256
    actual_sha256 = hashlib.sha256(data).hexdigest()

    if actual_sha256 != expected_sha256:
        raise HTTPException(
            status_code=502,
            detail="CSV SHA256 verification failed."
        )

    # Parse CSV entirely in memory
    try:

        decoded = data.decode("utf-8-sig")

        reader = csv.DictReader(
            io.StringIO(decoded)
        )

        rows = list(reader)
        columns = reader.fieldnames

    except (UnicodeDecodeError, csv.Error) as exc:

        raise HTTPException(
            status_code=502,
            detail=f"CSV parsing failed: {str(exc)}"
        )

    return {
        "source": "NASA AppEEARS",
        "task_id": task_id,
        "filename": selected["file_name"],
        "bytes_in_memory": len(data),
        "sha256_verified": True,
        "storage": "RAM only; no local file created",
        "row_count": len(rows),
        "columns": columns,
        "statistics": rows
    }


# ============================================================
# BANGLADESH LST STATISTICS + QA — RAM ONLY
# No local file creation; combined maximum 1 MB
# ============================================================

@app.get("/api/nasa/tasks/bangladesh-lst/statistics")
def read_bangladesh_lst_statistics():

    task_id = "934b1497-cb1a-4018-89dc-74d3aedb179f"

    allowed_files = {
        "707f79f1-4704-4538-920a-82a9e9639289":
            "MOD11A1-061-Statistics.csv",
        "faeec58a-9e9e-4c2b-adce-2048cfc811a7":
            "MOD11A1-061-QC-Day-Statistics-QA.csv",
    }

    bundle = nasa_get(f"bundle/{task_id}")

    if not isinstance(bundle, dict):
        raise HTTPException(502, "Invalid NASA bundle response.")

    manifest = {
        item.get("file_id"): item
        for item in bundle.get("files", [])
    }

    results = {}
    total_bytes = 0

    for file_id, expected_name in allowed_files.items():

        selected = manifest.get(file_id)

        if not selected or selected.get("file_name") != expected_name:
            raise HTTPException(404, f"NASA file not found: {expected_name}")

        try:
            expected_size = int(selected["file_size"])
            expected_hash = selected["sha256"].lower()
        except (KeyError, TypeError, ValueError, AttributeError):
            raise HTTPException(502, "Invalid NASA integrity metadata.")

        if expected_size <= 0 or expected_size > 1_000_000:
            raise HTTPException(413, "CSV exceeds memory limit.")

        total_bytes += expected_size

        if total_bytes > 1_000_000:
            raise HTTPException(413, "Combined CSV size exceeds 1 MB.")

        if len(expected_hash) != 64:
            raise HTTPException(502, "Invalid SHA256 metadata.")

        url = (
            f"{APPEEARS_BASE_URL.rstrip('/')}/"
            f"bundle/{task_id}/{file_id}"
        )

        token = get_token()
        response = None

        try:
            response = requests.get(
                url,
                headers={"Authorization": f"Bearer {token}"},
                stream=True,
                timeout=(30, 60)
            )

            if response.status_code == 401:
                response.close()
                token = get_token(force_refresh=True)
                response = requests.get(
                    url,
                    headers={"Authorization": f"Bearer {token}"},
                    stream=True,
                    timeout=(30, 60)
                )

            response.raise_for_status()

            content = bytearray()

            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    content.extend(chunk)

                if len(content) > expected_size:
                    raise HTTPException(413, "Unexpected file size.")

            data = bytes(content)

        except HTTPException:
            raise

        except requests.RequestException as exc:
            raise HTTPException(
                502, f"NASA retrieval failed: {str(exc)}"
            )

        finally:
            if response is not None:
                response.close()

        if len(data) != expected_size:
            raise HTTPException(502, "File size verification failed.")

        actual_hash = hashlib.sha256(data).hexdigest()

        if actual_hash != expected_hash:
            raise HTTPException(502, "SHA256 verification failed.")

        try:
            reader = csv.DictReader(
                io.StringIO(data.decode("utf-8-sig"))
            )
            rows = list(reader)
            columns = reader.fieldnames

        except (UnicodeDecodeError, csv.Error) as exc:
            raise HTTPException(502, f"CSV parsing failed: {str(exc)}")

        results[expected_name] = {
            "bytes_in_memory": len(data),
            "sha256_verified": True,
            "row_count": len(rows),
            "columns": columns,
            "statistics": rows
        }

    return {
        "source": "NASA AppEEARS",
        "task_id": task_id,
        "storage": "RAM only; no local file created",
        "total_bytes_in_memory": total_bytes,
        "files": results
    }


# ============================================================
# BANGLADESH LST TREND ANALYSIS — PRELIMINARY JSON API
# RAM only; no local data files
# ============================================================

@app.get("/api/analysis/bangladesh-lst/trend")
def bangladesh_lst_trend():

    import numpy as np
    from scipy.stats import theilslopes, kendalltau

    payload = read_bangladesh_lst_statistics()

    filename = "MOD11A1-061-Statistics.csv"
    rows = payload["files"][filename]["statistics"]

    daily = [
        row for row in rows
        if 2018 <= int(row["Date"][:4]) <= 2025
    ]

    if not daily:
        raise HTTPException(422, "No LST records for 2018–2025.")

    max_count = max(float(row["Count"]) for row in daily)
    threshold = max_count * 0.10

    groups = {}

    for row in daily:
        count = float(row["Count"])

        if count < threshold:
            continue

        month = row["Date"][:7]
        groups.setdefault(month, []).append(row)

    monthly = []

    for month, records in sorted(groups.items()):

        if len(records) < 10:
            continue

        total_count = sum(float(r["Count"]) for r in records)

        weighted_mean_k = sum(
            float(r["Mean"]) * float(r["Count"])
            for r in records
        ) / total_count

        monthly.append({
            "month": month,
            "days": len(records),
            "pixel_days": int(total_count),
            "lst_celsius": weighted_mean_k - 273.15
        })

    if len(monthly) < 24:
        raise HTTPException(422, "Insufficient eligible monthly records.")

    x = np.array([
        int(v["month"][:4]) +
        (int(v["month"][5:7]) - 0.5) / 12
        for v in monthly
    ])

    y = np.array([v["lst_celsius"] for v in monthly])
    weights = np.array([v["pixel_days"] for v in monthly])
    month_numbers = np.array([
        int(v["month"][5:7]) for v in monthly
    ])

    # Coverage-filtered Sen's slope
    sen = theilslopes(y, x)

    # Season-adjusted sensitivity analysis
    climatology = {
        m: np.mean(y[month_numbers == m])
        for m in np.unique(month_numbers)
    }

    adjusted = np.array([
        y[i] - climatology[month_numbers[i]]
        for i in range(len(y))
    ])

    adjusted_sen = theilslopes(adjusted, x)
    adjusted_kendall = kendalltau(x, adjusted)

    # Pixel-count weighted linear trend
    coefficients = np.polyfit(x, y, 1, w=np.sqrt(weights))
    fitted = coefficients[0] * x + coefficients[1]

    weighted_rmse = np.sqrt(
        np.average((y - fitted) ** 2, weights=weights)
    )

    return {
        "source": "NASA AppEEARS MOD11A1.061",
        "region": "Bangladesh",
        "period": "2018-2025",
        "analysis_status": "PRELIMINARY_NOT_QA_FILTERED",
        "daily_records": len(daily),
        "coverage_threshold_pixels": threshold,
        "eligible_months": len(monthly),
        "excluded_months": 96 - len(monthly),
        "coverage_filtered_sen": {
            "slope_celsius_per_year": float(sen.slope),
            "ci95_lower": float(sen.low_slope),
            "ci95_upper": float(sen.high_slope)
        },
        "season_adjusted_sensitivity": {
            "kendall_tau": float(adjusted_kendall.statistic),
            "p_value": float(adjusted_kendall.pvalue),
            "sen_slope_celsius_per_year": float(adjusted_sen.slope),
            "ci95_lower": float(adjusted_sen.low_slope),
            "ci95_upper": float(adjusted_sen.high_slope)
        },
        "coverage_weighted_linear": {
            "slope_celsius_per_year": float(coefficients[0]),
            "weighted_rmse_celsius": float(weighted_rmse),
            "total_pixel_days": int(weights.sum())
        },
        "monthly_series": monthly,
        "limitations": [
            "AppEEARS aggregate means are not pixel-level QA-filtered means.",
            "Coverage threshold is a sensitivity filter, not an official NASA QA rule.",
            "Seasonal adjustment uses this same dataset.",
            "Autocorrelation-robust inference and pixel-level validation remain pending."
        ]
    }


# ============================================================
# IGP NDVI TREND ANALYSIS
# NASA AppEEARS MOD13Q1.061
# Period: 2018-2025
# ============================================================

@app.get("/api/analysis/igp-ndvi/trend")
def igp_ndvi_trend():

    import numpy as np
    from datetime import datetime
    from scipy.stats import theilslopes, kendalltau

    # Retrieve verified AppEEARS statistics in RAM
    result = read_igp_ndvi_statistics()

    rows = result.get("statistics", [])

    if not rows:
        raise HTTPException(
            status_code=502,
            detail="No IGP NDVI statistics returned by NASA AppEEARS."
        )

    # Select valid observations from 2018-2025
    observations = []

    for row in rows:

        try:
            date = datetime.strptime(
                row["Date"][:10],
                "%Y-%m-%d"
            )

            if not (2018 <= date.year <= 2025):
                continue

            mean = float(row["Mean"])
            count = float(row["Count"])

            if not np.isfinite(mean) or not np.isfinite(count):
                continue

            if count <= 0:
                continue

            # Decimal year for date-based trend estimation
            year_start = datetime(date.year, 1, 1)
            next_year = datetime(date.year + 1, 1, 1)

            decimal_year = (
                date.year
                + (date - year_start).total_seconds()
                / (next_year - year_start).total_seconds()
            )

            observations.append({
                "date": date.strftime("%Y-%m-%d"),
                "year": date.year,
                "decimal_year": decimal_year,
                "ndvi": mean,
                "count": count
            })

        except (KeyError, ValueError, TypeError):
            continue

    observations.sort(key=lambda item: item["date"])

    if len(observations) < 30:
        raise HTTPException(
            status_code=422,
            detail="Insufficient valid observations for trend analysis."
        )

    # Convert to numerical arrays
    x = np.array(
        [item["decimal_year"] for item in observations],
        dtype=float
    )

    y = np.array(
        [item["ndvi"] for item in observations],
        dtype=float
    )

    weights = np.array(
        [item["count"] for item in observations],
        dtype=float
    )

    # Date-based Sen's slope and confidence interval
    sen = theilslopes(y, x, alpha=0.95)

    # Original Kendall trend test
    kendall = kendalltau(x, y)

    # Pixel-count weighted linear trend
    coefficients = np.polyfit(
        x,
        y,
        1,
        w=np.sqrt(weights)
    )

    fitted = (
        coefficients[0] * x
        + coefficients[1]
    )

    weighted_rmse = np.sqrt(
        np.average(
            (y - fitted) ** 2,
            weights=weights
        )
    )

    # Annual pixel-count weighted NDVI
    annual_summary = []

    for year in range(2018, 2026):

        yearly = [
            item for item in observations
            if item["year"] == year
        ]

        if not yearly:
            continue

        yearly_counts = np.array(
            [item["count"] for item in yearly],
            dtype=float
        )

        yearly_means = np.array(
            [item["ndvi"] for item in yearly],
            dtype=float
        )

        annual_summary.append({
            "year": year,
            "observations": len(yearly),
            "total_pixel_observations": int(
                yearly_counts.sum()
            ),
            "weighted_mean_ndvi": float(
                np.average(
                    yearly_means,
                    weights=yearly_counts
                )
            )
        })

    return {
        "source": "NASA AppEEARS MOD13Q1.061",
        "region": "Indo-Gangetic Plain",
        "period": "2018-2025",
        "analysis_status": "PRELIMINARY_NOT_QA_FILTERED",

        "observation_count": len(observations),

        "sen_trend": {
            "slope_ndvi_per_year": float(sen.slope),
            "ci95_lower": float(sen.low_slope),
            "ci95_upper": float(sen.high_slope)
        },

        "kendall_trend": {
            "tau": float(kendall.statistic),
            "p_value": float(kendall.pvalue)
        },

        "coverage_weighted_linear": {
            "slope_ndvi_per_year": float(coefficients[0]),
            "weighted_rmse": float(weighted_rmse),
            "total_pixel_observations": int(weights.sum())
        },

        "annual_summary": annual_summary,

        "observation_series": observations,

        "limitations": [
            "AppEEARS aggregate means are not pixel-level QA-filtered means.",
            "Seasonal vegetation patterns may influence the overall trend.",
            "Autocorrelation-robust inference remains pending.",
            "Spatial harmonization and pixel-level validation remain pending."
        ]
    }


# ============================================================
# AMAZON FRONTIER — VERIFIED STATISTICS CSV APIs
# RAM ONLY — NO LOCAL FILE DOWNLOAD
# ============================================================

def _read_amazon_statistics_csv(task_id: str, file_id: str, expected_name: str):

    bundle = nasa_get(f"bundle/{task_id}")

    if not isinstance(bundle, dict):
        raise HTTPException(502, "Invalid NASA bundle response.")

    selected = next(
        (f for f in bundle.get("files", []) if f.get("file_id") == file_id),
        None
    )

    if not selected or selected.get("file_name") != expected_name:
        raise HTTPException(404, "Expected Amazon statistics CSV not found.")

    try:
        expected_size = int(selected["file_size"])
        expected_hash = selected["sha256"].lower()
    except (KeyError, TypeError, ValueError, AttributeError):
        raise HTTPException(502, "Invalid NASA integrity metadata.")

    if expected_size <= 0 or expected_size > 1_000_000:
        raise HTTPException(413, "CSV exceeds the 1 MB memory limit.")

    if len(expected_hash) != 64 or any(
        c not in "0123456789abcdef" for c in expected_hash
    ):
        raise HTTPException(502, "Invalid NASA SHA256 metadata.")

    url = f"{APPEEARS_BASE_URL.rstrip('/')}/bundle/{task_id}/{file_id}"
    token = get_token()
    response = None

    try:
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            stream=True,
            timeout=(30, 90)
        )

        if response.status_code == 401:
            response.close()
            token = get_token(force_refresh=True)
            response = requests.get(
                url,
                headers={"Authorization": f"Bearer {token}"},
                stream=True,
                timeout=(30, 90)
            )

        response.raise_for_status()
        content = bytearray()

        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                content.extend(chunk)
            if len(content) > 1_000_000:
                raise HTTPException(413, "CSV exceeded RAM limit.")

        data = bytes(content)

    except HTTPException:
        raise
    except requests.RequestException as exc:
        print("Amazon NASA CSV retrieval error:", exc)
        raise HTTPException(502, "NASA CSV retrieval failed.")
    finally:
        if response is not None:
            response.close()

    if len(data) != expected_size:
        raise HTTPException(502, "NASA CSV size verification failed.")

    actual_hash = hashlib.sha256(data).hexdigest()

    if actual_hash != expected_hash:
        raise HTTPException(502, "NASA CSV SHA256 verification failed.")

    try:
        reader = csv.DictReader(
            io.StringIO(data.decode("utf-8-sig"))
        )
        rows = list(reader)
        columns = reader.fieldnames
    except (UnicodeDecodeError, csv.Error) as exc:
        raise HTTPException(502, f"CSV parsing failed: {str(exc)}")

    return {
        "source": "NASA AppEEARS",
        "region": "Amazon Frontier BR163",
        "task_id": task_id,
        "filename": expected_name,
        "bytes_in_memory": len(data),
        "sha256_verified": True,
        "storage": "RAM only; no local file created",
        "row_count": len(rows),
        "columns": columns,
        "statistics": rows
    }


@app.get("/api/nasa/tasks/amazon-lst/statistics")
def read_amazon_lst_statistics():
    return _read_amazon_statistics_csv(
        "a83c3bdc-b590-4a8c-b859-c82c38f761e8",
        "81212776-0ce3-4db9-b450-45a632e7ba80",
        "MOD11A1-061-Statistics.csv"
    )


@app.get("/api/nasa/tasks/amazon-ndvi/statistics")
def read_amazon_ndvi_statistics():
    return _read_amazon_statistics_csv(
        "627c1233-a9c0-4c20-b21f-b4d936aee355",
        "a11dbf86-ed3e-4343-87af-ae52d403bb2d",
        "MOD13Q1-061-Statistics.csv"
    )


@app.get("/api/nasa/tasks/amazon-sm/statistics")
def read_amazon_sm_statistics():
    return _read_amazon_statistics_csv(
        "3ce55963-389b-4db4-a9bf-485a3b8bb352",
        "ebbb71d5-ad29-4760-b81d-1acf5430c0f7",
        "SPL3SMP-E-006-Statistics.csv"
    )


# ============================================================
# AMAZON FRONTIER — PRELIMINARY TREND ANALYSIS
# NASA AppEEARS verified statistics CSVs; RAM only
# ============================================================

def _amazon_trend_analysis(payload, variable, unit, kelvin_to_celsius=False):
    import numpy as np
    from datetime import datetime
    from collections import defaultdict
    from scipy.stats import theilslopes, kendalltau

    rows = payload.get("statistics", [])
    daily = defaultdict(list)

    for row in rows:
        try:
            date = datetime.strptime(row["Date"][:10], "%Y-%m-%d")
            mean = float(row["Mean"])
            count = float(row["Count"])

            if not np.isfinite(mean) or not np.isfinite(count) or count <= 0:
                continue

            if kelvin_to_celsius:
                mean -= 273.15

            daily[date].append((mean, count))

        except (KeyError, TypeError, ValueError):
            continue

    observations = []

    for date, values in daily.items():
        total_count = sum(count for _, count in values)

        if total_count <= 0:
            continue

        weighted_mean = sum(
            mean * count for mean, count in values
        ) / total_count

        observations.append((date, weighted_mean, total_count))

    observations.sort(key=lambda item: item[0])

    if len(observations) < 10:
        raise HTTPException(
            status_code=422,
            detail=f"Insufficient valid {variable} observations."
        )

    dates = [item[0] for item in observations]
    y = np.array([item[1] for item in observations], dtype=float)
    weights = np.array([item[2] for item in observations], dtype=float)

    origin = dates[0]

    x = np.array([
        (date - origin).days / 365.2425
        for date in dates
    ], dtype=float)

    sen = theilslopes(y, x, alpha=0.95)
    kendall = kendalltau(x, y)

    coefficients = np.polyfit(x, y, 1, w=np.sqrt(weights))

    # Seasonal sensitivity analysis
    month_groups = defaultdict(list)

    for date, value in zip(dates, y):
        month_groups[date.month].append(value)

    monthly_climatology = {
        month: float(np.mean(values))
        for month, values in month_groups.items()
    }

    grand_mean = float(np.mean(y))

    adjusted = np.array([
        value - monthly_climatology[date.month] + grand_mean
        for date, value in zip(dates, y)
    ])

    adjusted_sen = theilslopes(adjusted, x, alpha=0.95)
    adjusted_kendall = kendalltau(x, adjusted)

    # Actual daily observations from NASA statistics
    observation_series = []

    for date, value, count in observations:
        record = {
            "date": date.strftime("%Y-%m-%d"),
            "value": float(value),
            "pixel_count": int(count)
        }

        if variable == "Normalized Difference Vegetation Index":
            record["ndvi"] = float(value)

        observation_series.append(record)

    # Actual monthly weighted means for LST chart
    monthly_groups = defaultdict(list)

    if kelvin_to_celsius:
        for date, value, count in observations:
            month = date.strftime("%Y-%m")
            monthly_groups[month].append((value, count))

    monthly_series = []

    for month, values in sorted(monthly_groups.items()):
        total_count = sum(count for _, count in values)

        if total_count <= 0:
            continue

        monthly_mean = sum(
            value * count for value, count in values
        ) / total_count

        monthly_series.append({
            "month": month,
            "lst_celsius": float(monthly_mean)
        })

    return {
        "source": "NASA AppEEARS",
        "region": "Amazon Frontier BR163",
        "variable": variable,
        "unit": unit,
        "analysis_status": "PRELIMINARY_NOT_PIXEL_QA_FILTERED",

        "observation_count": len(observations),
        "first_date": dates[0].strftime("%Y-%m-%d"),
        "last_date": dates[-1].strftime("%Y-%m-%d"),

        "total_pixel_observations": int(np.sum(weights)),
        "median_pixels_per_observation": float(np.median(weights)),
        "mean_value": float(np.mean(y)),

        "observation_series": observation_series,
        "monthly_series": monthly_series,

        "sen_trend": {
            "slope_per_year": float(sen.slope),
            "ci95_lower": float(sen.low_slope),
            "ci95_upper": float(sen.high_slope)
        },

        "kendall_trend_test": {
            "tau": float(kendall.statistic),
            "p_value": float(kendall.pvalue)
        },

        "pixel_count_weighted_linear_slope_per_year": float(coefficients[0]),

        "season_adjusted_sensitivity": {
            "sen_slope_per_year": float(adjusted_sen.slope),
            "ci95_lower": float(adjusted_sen.low_slope),
            "ci95_upper": float(adjusted_sen.high_slope),
            "kendall_tau": float(adjusted_kendall.statistic),
            "kendall_p_value": float(adjusted_kendall.pvalue)
        },

        "limitations": [
            "AppEEARS area statistics; not pixel-level time-series analysis.",
            "Pixel-level product QA filtering has not been applied here.",
            "Season-adjusted results are sensitivity analysis, not independent validation.",
            "Autocorrelation-robust significance testing remains pending."
        ]
    }

@app.get("/api/analysis/amazon-lst/trend")
def amazon_lst_trend():
    return _amazon_trend_analysis(
        read_amazon_lst_statistics(),
        "Land Surface Temperature",
        "degrees Celsius",
        kelvin_to_celsius=True
    )


@app.get("/api/analysis/amazon-ndvi/trend")
def amazon_ndvi_trend():
    return _amazon_trend_analysis(
        read_amazon_ndvi_statistics(),
        "Normalized Difference Vegetation Index",
        "NDVI"
    )


@app.get("/api/analysis/amazon-sm/trend")
def amazon_sm_trend():
    return _amazon_trend_analysis(
        read_amazon_sm_statistics(),
        "Surface Soil Moisture",
        "m3/m3"
    )


# ============================================================
# VERIFIED NASA SOIL MOISTURE STATISTICS — RAM ONLY
# Bangladesh + Indo-Gangetic Plain
# ============================================================

def _read_verified_sm_statistics_csv(task_id: str, file_id: str, region: str):

    expected_name = "SPL3SMP-E-006-Statistics.csv"
    bundle = nasa_get(f"bundle/{task_id}")

    if not isinstance(bundle, dict):
        raise HTTPException(502, "Invalid NASA bundle response.")

    selected = next(
        (f for f in bundle.get("files", []) if f.get("file_id") == file_id),
        None
    )

    if not selected or selected.get("file_name") != expected_name:
        raise HTTPException(404, f"{region} Soil Moisture CSV not found.")

    try:
        expected_size = int(selected["file_size"])
        expected_hash = selected["sha256"].lower()
    except (KeyError, TypeError, ValueError, AttributeError):
        raise HTTPException(502, "Invalid NASA integrity metadata.")

    if expected_size <= 0 or expected_size > 1_000_000:
        raise HTTPException(413, "CSV exceeds the 1 MB RAM limit.")

    if len(expected_hash) != 64 or any(
        c not in "0123456789abcdef" for c in expected_hash
    ):
        raise HTTPException(502, "Invalid NASA SHA256 metadata.")

    url = f"{APPEEARS_BASE_URL.rstrip('/')}/bundle/{task_id}/{file_id}"
    token = get_token()
    response = None

    try:
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            stream=True,
            timeout=(30, 90)
        )

        if response.status_code == 401:
            response.close()
            token = get_token(force_refresh=True)
            response = requests.get(
                url,
                headers={"Authorization": f"Bearer {token}"},
                stream=True,
                timeout=(30, 90)
            )

        response.raise_for_status()
        content = bytearray()

        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                content.extend(chunk)
            if len(content) > 1_000_000:
                raise HTTPException(413, "CSV exceeded RAM limit.")

        data = bytes(content)

    except HTTPException:
        raise
    except requests.RequestException as exc:
        print("NASA Soil Moisture CSV retrieval error:", exc)
        raise HTTPException(502, "NASA CSV retrieval failed.")
    finally:
        if response is not None:
            response.close()

    if len(data) != expected_size:
        raise HTTPException(502, "NASA CSV size verification failed.")

    actual_hash = hashlib.sha256(data).hexdigest()

    if actual_hash != expected_hash:
        raise HTTPException(502, "NASA CSV SHA256 verification failed.")

    try:
        reader = csv.DictReader(
            io.StringIO(data.decode("utf-8-sig"))
        )
        rows = list(reader)
        columns = reader.fieldnames
    except (UnicodeDecodeError, csv.Error) as exc:
        raise HTTPException(502, f"CSV parsing failed: {str(exc)}")

    if not rows or not columns or "Date" not in columns or "Mean" not in columns:
        raise HTTPException(502, "Statistics CSV is missing required columns.")

    return {
        "source": "NASA AppEEARS",
        "region": region,
        "task_id": task_id,
        "filename": expected_name,
        "bytes_in_memory": len(data),
        "sha256_verified": True,
        "storage": "RAM only; no local file created",
        "row_count": len(rows),
        "columns": columns,
        "statistics": rows
    }


@app.get("/api/nasa/tasks/bangladesh-sm/statistics")
def read_bangladesh_sm_statistics():
    return _read_verified_sm_statistics_csv(
        "0a58eaa5-0242-46c9-830e-0e44b042e554",
        "e7b56356-daf0-4fae-b73d-a80bae56ef44",
        "Bangladesh"
    )


@app.get("/api/nasa/tasks/igp-sm/statistics")
def read_igp_sm_statistics():
    return _read_verified_sm_statistics_csv(
        "0dbce586-3f48-4178-817a-0436429d080f",
        "c74958c3-8520-4d3f-880c-adf023585774",
        "Indo-Gangetic Plain"
    )


# ============================================================
# BANGLADESH + IGP SOIL MOISTURE TREND ANALYSIS
# Reuses the verified statistical analysis engine
# ============================================================

@app.get("/api/analysis/bangladesh-sm/trend")
def bangladesh_sm_trend():

    result = _amazon_trend_analysis(
        read_bangladesh_sm_statistics(),
        "Surface Soil Moisture",
        "m3/m3"
    )

    result["region"] = "Bangladesh"
    result["analysis_status"] = "PRELIMINARY_NOT_PIXEL_QA_FILTERED"
    result["task_id"] = "0a58eaa5-0242-46c9-830e-0e44b042e554"

    return result


@app.get("/api/analysis/igp-sm/trend")
def igp_sm_trend():

    result = _amazon_trend_analysis(
        read_igp_sm_statistics(),
        "Surface Soil Moisture",
        "m3/m3"
    )

    result["region"] = "Indo-Gangetic Plain"
    result["analysis_status"] = "PRELIMINARY_NOT_PIXEL_QA_FILTERED"
    result["task_id"] = "0dbce586-3f48-4178-817a-0436429d080f"

    return result


