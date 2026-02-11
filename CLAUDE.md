# Tabular Review - Development Guide

## Project Overview
AI-powered document review app for lawyers. Upload documents (PDF/DOCX), define extraction columns, and use Google Gemini to extract structured data into a table. Includes citation verification and chat-based analysis.

## Architecture

**Frontend:** React 19 + TypeScript + Vite (port 3000)
**Backend:** FastAPI + Docling (port 8000)
**AI:** Google Gemini API + OpenRouter (DeepSeek, Qwen, Llama, GPT-OSS via `@google/genai` + `fetch`)
**Styling:** Tailwind CSS (CDN), Lucide icons
**Package manager:** pnpm

### Key directories
```
App.tsx              # Main component, all state lives here
components/          # UI components (DataGrid, VerificationSidebar, ChatInterface, etc.)
services/            # geminiService.ts, openRouterService.ts (LLM calls), documentProcessor.ts (backend calls)
utils/               # fileStorage.ts (persistence), sampleData.ts (demo data)
types.ts             # All TypeScript interfaces
server/              # Python FastAPI backend (main.py)
```

### Data flow
1. **Upload:** File → backend `/convert` (Docling, GPU-accelerated) → Markdown → Base64 in frontend state
2. **Extract:** For each (document, column) pair → Gemini API → structured JSON → ExtractionResult state
3. **Verify:** User clicks cell → VerificationSidebar shows value, confidence, quote highlight
4. **Chat:** User sends message → Gemini with full dataset context → response

## Development Commands

```bash
# Frontend
pnpm install          # Install dependencies
pnpm dev              # Start dev server (port 3000)
pnpm build            # Production build

# Backend
cd server
source venv/bin/activate
pip install -r requirements.txt
python main.py        # Start backend (port 8000)

# Or use the convenience script:
./start-backend.sh
```

## Environment Setup
Copy `.env.example` to `.env` and set:
- `VITE_GEMINI_API_KEY` — for Google Gemini models
- `VITE_OPENROUTER_API_KEY` — for OpenRouter models (optional)

## Conventions

### Branching
- Create feature branches off `main`: `feature/description` or `fix/description`
- PRs into `main`

### Code style
- Functional React components with hooks
- State managed in App.tsx (no external store)
- Services handle all external API calls
- Types defined in `types.ts`
- No test framework configured yet

### When making changes
- **New UI feature:** Add component in `components/`, wire it in `App.tsx`
- **New extraction logic:** Modify `services/geminiService.ts` or `services/openRouterService.ts`
- **New LLM provider:** Add a new service in `services/`, add provider to `Provider` type in `types.ts`, add models to `PROVIDER_MODELS` in `App.tsx`
- **New document type support:** Modify `server/main.py` and potentially `services/documentProcessor.ts`
- **New data type/field:** Update `types.ts` first, then propagate
- **Backend endpoint:** Add to `server/main.py`, call from a service in `services/`

### Important notes
- All state lives in `App.tsx` — no global store. Keep it that way unless complexity warrants a change.
- Gemini API key is client-side (`VITE_` prefix). This is intentional for the current architecture.
- Docling backend converts ALL document types to Markdown before the frontend stores them.
- MPS GPU acceleration is auto-detected on macOS — no config needed.
- Docker does NOT support GPU acceleration.

### Changelog rule
- **Every commit** must update `CHANGELOG.md` with a summary of the changes made and any open TODOs.
- Use the format: `## YYYY-MM-DD` header, then bullet points for changes and a `### TODO` subsection if applicable.
- Keep entries concise but specific enough to understand what changed without reading the diff.
