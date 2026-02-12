# Changelog

## 2026-02-11 — Scaleway Provider Support

### Added: Scaleway Generative APIs as third LLM provider
- Created `services/scalewayService.ts` — OpenAI-compatible API client for Scaleway (extraction, prompt generation, chat)
  - Exponential-backoff retry on 429 rate limits
  - Strips `<think>...</think>` tokens from reasoning model responses
  - Configurable base URL via `VITE_SCALEWAY_BASE_URL` (defaults to `https://api.scaleway.ai/v1`)
- Added `'scaleway'` to `Provider` type in `types.ts`
- Added 6 Scaleway models to `PROVIDER_MODELS` in `App.tsx`: Qwen 3 235B, DeepSeek R1 70B, Llama 3.3 70B, Mistral Small 3.2, GPT-OSS 120B, Qwen 3 Coder 30B
- Updated `App.tsx` extraction dispatch to route to Scaleway service
- Updated `components/ChatInterface.tsx` to dispatch chat to Scaleway service
- Updated `components/AddColumnMenu.tsx` to dispatch prompt generation to Scaleway service
- Added `VITE_SCALEWAY_API_KEY` and `VITE_SCALEWAY_BASE_URL` to `.env.example`
- EU-hosted (Paris data center) — suitable for GDPR-compliant workflows

## 2026-02-11 — Visual Grounding + Load Project Fix

### Added: Visual Grounding (PDF page image + bounding box overlay)
- PDF pages rendered as images (150 DPI) with text bounding boxes extracted via PyMuPDF — no OCR needed, uses embedded PDF text layer
- New backend files: `server/ocr_processor.py` (PyMuPDF text extraction with bbox), `server/ocr_storage.py` (file-based page image/OCR data storage)
- New endpoints: `GET /page-image/{doc_id}/{page_num}`, `GET /page-ocr/{doc_id}/{page_num}`, `GET /page-count/{doc_id}`
- New frontend service: `services/visualGroundingService.ts` — fetches page images + text region data, fuzzy quote-to-bbox matching across all pages
- New component: `components/PageImageViewer.tsx` — renders page image with SVG bbox overlay, zoom/pan controls, pulsing highlight animation
- Updated `components/VerificationSidebar.tsx` — Text/Visual toggle in header, multi-page match navigation (Prev/Next match), "Visual" shortcut button in reasoning panel
- Updated `types.ts` with `BBox`, `OCRTextRegion`, `PageOCRData` types; `DocumentFile` gains optional `docId` and `hasOcr`
- Updated `services/documentProcessor.ts` to return `{ markdown, docId, hasOcr }` from backend
- Updated `App.tsx` `processUploadedFiles` to store `docId` and `hasOcr` on each `DocumentFile`
- Added `PyMuPDF`, `Pillow` to `server/requirements.txt`
- Added `ZoomIn`, `ZoomOut`, `Maximize2`, `Move`, `ChevronUp` icon exports
- OCR failure is non-fatal — falls back gracefully to text-only mode
- Backward compatible: old projects without OCR data load in text-only mode; DOCX files remain text-only
- Added `server/generate_mock_letters.py` — generates 50 mock virtual share allotment letter PDFs for testing

### Fixed: Project Load
- Fixed Load Project not opening file picker — reuses existing DOM file input element to ensure browser user-gesture requirements are met
- Moved confirmation dialog to after file selection (browser blocks file pickers preceded by `window.confirm`)
- Fixed race condition in `fileStorage.ts` where focus-based cancel detection resolved the promise before file read completed

## 2026-02-11

### Added: OpenRouter provider support
- Added `Provider` type (`'gemini' | 'openrouter'`) and `selectedProvider` to `SavedProject` in `types.ts`
- Created `services/openRouterService.ts` — mirrors geminiService with OpenRouter's OpenAI-compatible API
  - Supports extraction, prompt generation, and chat analysis
  - Strips `<think>...</think>` tokens from DeepSeek R1 responses
  - Exponential-backoff retry on 429 errors
  - Detailed error logging (response body) for troubleshooting
- Replaced flat `MODELS` array with grouped `PROVIDER_MODELS` in `App.tsx` (two-level dropdown with provider section headers)
- Available OpenRouter models: GPT-OSS 120B (free), DeepSeek R1 671B, DeepSeek V3 671B, Qwen 2.5 72B, Llama 3.3 70B
- Updated `ChatInterface.tsx` and `AddColumnMenu.tsx` to accept `provider` prop and dispatch to correct service
- Added `VITE_OPENROUTER_API_KEY` to `.env.example`
- Provider selection persists in project save/load (backward compatible — defaults to `'gemini'` for old files)

### TODO
- Add configurable base URL for self-hosted endpoints (vLLM/Ollama) — enables GDPR-compliant on-premise deployment
- Test structured JSON extraction reliability across all OpenRouter models (some may need prompt tuning)
- Consider adding provider status indicator (API key missing / not configured) in the UI
