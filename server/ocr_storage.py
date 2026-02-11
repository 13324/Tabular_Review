"""
Manages file-based storage for OCR data and page images.
Storage layout: server/ocr_data/{doc_id}/pages/page_N.png
                server/ocr_data/{doc_id}/ocr/page_N.json
"""
import os
import json
import shutil
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).parent / "ocr_data"


def _doc_dir(doc_id: str) -> Path:
    return BASE_DIR / doc_id


def create_document_storage(doc_id: str) -> Path:
    doc_dir = _doc_dir(doc_id)
    (doc_dir / "pages").mkdir(parents=True, exist_ok=True)
    (doc_dir / "ocr").mkdir(parents=True, exist_ok=True)
    return doc_dir


def save_page_image(doc_id: str, page_num: int, image) -> str:
    """Save a PIL Image as PNG. Returns the file path."""
    path = _doc_dir(doc_id) / "pages" / f"page_{page_num}.png"
    image.save(str(path), "PNG")
    return str(path)


def save_page_ocr(doc_id: str, page_num: int, ocr_result: list) -> str:
    """Save OCR result (list of regions) as JSON. Returns the file path."""
    path = _doc_dir(doc_id) / "ocr" / f"page_{page_num}.json"
    with open(path, "w") as f:
        json.dump(ocr_result, f)
    return str(path)


def get_page_image_path(doc_id: str, page_num: int) -> Optional[str]:
    path = _doc_dir(doc_id) / "pages" / f"page_{page_num}.png"
    if path.exists():
        return str(path)
    return None


def get_page_ocr(doc_id: str, page_num: int) -> Optional[list]:
    path = _doc_dir(doc_id) / "ocr" / f"page_{page_num}.json"
    if not path.exists():
        return None
    with open(path, "r") as f:
        return json.load(f)


def get_page_count(doc_id: str) -> int:
    pages_dir = _doc_dir(doc_id) / "pages"
    if not pages_dir.exists():
        return 0
    return len(list(pages_dir.glob("page_*.png")))


def cleanup_document(doc_id: str):
    doc_dir = _doc_dir(doc_id)
    if doc_dir.exists():
        shutil.rmtree(doc_dir)
