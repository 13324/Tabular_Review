# Changelog

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
