from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from docling.document_converter import DocumentConverter
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.accelerator_options import AcceleratorDevice, AcceleratorOptions
from docling.datamodel.base_models import InputFormat
from docling.document_converter import PdfFormatOption
import tempfile
import os
import shutil
import platform
import uuid

from ocr_storage import (
    create_document_storage, save_page_image, save_page_ocr,
    get_page_image_path, get_page_ocr, get_page_count,
)

app = FastAPI()

# Configure CORS
# In production, replace with specific origins
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173", # Vite default
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize converter with GPU acceleration if available
# Use MPS (Metal Performance Shaders) on Apple Silicon Macs
def create_converter():
    if platform.system() == "Darwin":  # macOS
        print("Detected macOS - enabling MPS (Metal) GPU acceleration")
        accelerator_options = AcceleratorOptions(
            device=AcceleratorDevice.MPS,
            num_threads=4
        )
    else:
        print("Running on CPU (MPS not available)")
        accelerator_options = AcceleratorOptions(
            device=AcceleratorDevice.AUTO,
            num_threads=4
        )

    # Configure PDF pipeline with accelerator options
    pdf_pipeline_options = PdfPipelineOptions()
    pdf_pipeline_options.accelerator_options = accelerator_options

    return DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pdf_pipeline_options)
        }
    )

converter = create_converter()

@app.post("/convert")
async def convert_document(file: UploadFile = File(...)):
    try:
        # Create a temporary file to save the uploaded content
        # Docling needs a file path
        suffix = os.path.splitext(file.filename)[1]
        if not suffix:
            suffix = ""

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        try:
            # Convert the document with Docling
            result = converter.convert(tmp_path)
            markdown_content = result.document.export_to_markdown()

            # Run OCR pipeline for PDFs
            doc_id = None
            has_ocr = False

            if suffix.lower() == ".pdf":
                try:
                    from ocr_processor import process_pdf
                    doc_id = str(uuid.uuid4())
                    create_document_storage(doc_id)

                    images, ocr_results = process_pdf(tmp_path)
                    for i, (img, ocr_data) in enumerate(zip(images, ocr_results)):
                        save_page_image(doc_id, i + 1, img)
                        save_page_ocr(doc_id, i + 1, ocr_data)

                    has_ocr = True
                    print(f"[OCR] Processed {len(images)} pages for doc_id={doc_id}")
                except Exception as ocr_err:
                    print(f"[OCR] Non-fatal error: {ocr_err}")
                    # OCR failure is non-fatal — doc_id may be set but has_ocr stays False
                    doc_id = None
                    has_ocr = False

            return {
                "markdown": markdown_content,
                "doc_id": doc_id,
                "has_ocr": has_ocr,
            }
        finally:
            # Clean up the temporary file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    except Exception as e:
        print(f"Error converting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/page-image/{doc_id}/{page_num}")
async def get_page_image(doc_id: str, page_num: int):
    path = get_page_image_path(doc_id, page_num)
    if not path:
        raise HTTPException(status_code=404, detail="Page image not found")
    return FileResponse(path, media_type="image/png")


@app.get("/page-ocr/{doc_id}/{page_num}")
async def get_page_ocr_data(doc_id: str, page_num: int):
    data = get_page_ocr(doc_id, page_num)
    if data is None:
        raise HTTPException(status_code=404, detail="OCR data not found")
    return {"page": page_num, "regions": data}


@app.get("/page-count/{doc_id}")
async def get_page_count_endpoint(doc_id: str):
    count = get_page_count(doc_id)
    if count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"page_count": count}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
