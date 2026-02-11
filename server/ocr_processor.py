"""
PDF text extraction with bounding boxes using PyMuPDF.
No OCR needed — extracts from the PDF's embedded text layer.
"""
import fitz  # PyMuPDF
from PIL import Image
import io


def pdf_to_page_images(pdf_path: str, dpi: int = 150) -> list:
    """Convert PDF to list of PIL Images (one per page)."""
    doc = fitz.open(pdf_path)
    images = []
    zoom = dpi / 72.0
    matrix = fitz.Matrix(zoom, zoom)
    for page in doc:
        pix = page.get_pixmap(matrix=matrix)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        images.append(img)
    doc.close()
    return images


def extract_text_regions(pdf_path: str, dpi: int = 150) -> list:
    """
    Extract text with bounding boxes from each page.
    Returns list (one per page) of lists of regions:
      [{"bbox": [[x1,y1],[x2,y2],[x3,y3],[x4,y4]], "text": str, "confidence": 1.0}]

    Bounding boxes are scaled to match the rendered image at the given DPI.
    """
    doc = fitz.open(pdf_path)
    zoom = dpi / 72.0
    all_pages = []

    for page in doc:
        blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]
        regions = []
        for block in blocks:
            if block["type"] != 0:  # skip image blocks
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    text = span["text"].strip()
                    if not text:
                        continue
                    # bbox is (x0, y0, x1, y1) in PDF points — scale to image pixels
                    x0, y0, x1, y1 = span["bbox"]
                    x0 *= zoom
                    y0 *= zoom
                    x1 *= zoom
                    y1 *= zoom
                    # Convert to 4-corner polygon format for consistency
                    bbox = [
                        [x0, y0],
                        [x1, y0],
                        [x1, y1],
                        [x0, y1],
                    ]
                    regions.append({
                        "bbox": bbox,
                        "text": text,
                        "confidence": 1.0,
                    })
        all_pages.append(regions)

    doc.close()
    return all_pages


def process_pdf(pdf_path: str, dpi: int = 150) -> tuple:
    """
    Full pipeline: PDF → page images + text regions with bboxes.
    Returns (images: list[PIL.Image], text_regions: list[list[dict]])
    """
    print(f"[PDF] Rendering pages at {dpi} DPI...")
    images = pdf_to_page_images(pdf_path, dpi=dpi)
    print(f"[PDF] Extracting text regions from {len(images)} pages...")
    text_regions = extract_text_regions(pdf_path, dpi=dpi)
    print(f"[PDF] Done — {sum(len(r) for r in text_regions)} text regions found")
    return images, text_regions
