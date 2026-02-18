
# Tabular Review for Bulk Document Analysis

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/framework-React-61DAFB.svg)
![AI](https://img.shields.io/badge/AI-Google%20Gemini-8E75B2.svg)
![AI](https://img.shields.io/badge/AI-OpenRouter-FF6600.svg)
![AI](https://img.shields.io/badge/AI-Scaleway-7B3FE4.svg)

An AI-powered document review workspace that transforms unstructured legal contracts into structured, queryable datasets. Designed for legal professionals, auditors, and procurement teams to accelerate due diligence and contract analysis.

## 🚀 Features

- **AI-Powered Extraction**: Automatically extract key clauses, dates, amounts, and entities from PDFs using Google Gemini, open-source models via OpenRouter (DeepSeek, Qwen, Llama, GPT-OSS), or EU-hosted models via Scaleway Generative APIs (GDPR-friendly).
- **High-Fidelity Conversion**: Uses **Docling** (running locally) to convert PDFs and DOCX files to clean Markdown text, preserving formatting and structure without hallucination.
- **Dynamic Schema**: Define columns with natural language prompts (e.g., "What is the governing law?").
- **Playbooks**: Save and reuse named column presets for common review tasks (e.g., "PE Side Letter Review", "Convertible Loan Agreement"). Built-in playbooks included.
- **Visual Grounding**: Click any extracted cell to view the source quote highlighted directly on the original PDF page image, with bounding-box overlays at 150 DPI.
- **Verification & Citations**: Text-mode verification shows the exact source quote and confidence score alongside the AI's reasoning.
- **Spreadsheet Interface**: A high-density, Excel-like grid for managing bulk document reviews.
- **Integrated Chat Analyst**: Ask questions across your entire dataset (e.g., "Which contract has the most favorable MFN clause?").

## 🎬 Demo

https://github.com/user-attachments/assets/b63026d8-3df6-48a8-bb4b-eb8f24d3a1ca

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **AI Integration**:
  - Google GenAI SDK — Gemini 2.5 Flash, 2.5 Pro, 2.0 Flash
  - OpenRouter API — DeepSeek R1/V3, Qwen 2.5 72B, Llama 3.3 70B, GPT-OSS 120B
  - Scaleway Generative APIs — Qwen 3 235B, DeepSeek R1 70B, Llama 3.3 70B, Mistral Small 3.2 (EU-hosted)
- **Backend**: FastAPI + Docling (GPU-accelerated on Apple Silicon via MPS)

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/tabular-review.git
cd tabular-review
```

### 2. Setup Frontend
Install Node dependencies:
```bash
pnpm install
```

Create a `.env` file in the root directory (copy from `.env.example`):
```env
VITE_GEMINI_API_KEY=your_google_api_key_here
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here   # optional
VITE_SCALEWAY_API_KEY=your_scaleway_api_key_here       # optional
```

### 3. Setup Backend (Docling)
The backend is required for document conversion.

```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Run
Start the backend (in one terminal):
```bash
cd server
source venv/bin/activate
python main.py
```

Start the frontend (in another terminal):
```bash
pnpm dev
```

### 🐳 Docker Deployment (Alternative)

Run the full stack with Docker — no Python environment setup needed.

1. **Setup environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

2. **Build and run**:
   ```bash
   docker compose up --build
   ```

3. **Access the application**:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:8000/docs

> **Note**: API keys are baked into the frontend bundle at build time (Vite `VITE_*` variables). Do not push built images to public registries.

The Docker setup includes:
- **Frontend**: React app served as static files
- **Backend**: FastAPI with Docling document processing (CPU mode in Docker; MPS GPU only available natively on macOS)

## 🛡 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Disclaimer**: This tool is an AI assistant and should not be used as a substitute for professional legal advice. Always verify AI-generated results against the original documents.
