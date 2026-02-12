export interface DocumentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string; // Base64 string for PDF/Images, or raw text for TXT
  mimeType: string;
  docId?: string;   // Backend OCR document ID (for visual grounding)
  hasOcr?: boolean;  // Whether OCR data is available on backend
  converting?: boolean; // True while backend conversion is in progress
}

// Visual grounding / OCR types
export type BBox = [[number, number], [number, number], [number, number], [number, number]];

export interface OCRTextRegion {
  bbox: BBox;
  text: string;
  confidence: number;
}

export interface PageOCRData {
  page: number;
  regions: OCRTextRegion[];
}

export type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'list';

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  prompt: string;
  status: 'idle' | 'extracting' | 'completed' | 'error';
  width?: number;
}

export interface ExtractionCell {
  value: string;
  confidence: 'High' | 'Medium' | 'Low';
  quote: string;
  page: number;
  reasoning: string;
  // UI State for review workflow
  status?: 'verified' | 'needs_review' | 'edited';
}

export interface ExtractionResult {
  [docId: string]: {
    [colId: string]: ExtractionCell | null;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export type Provider = 'gemini' | 'openrouter' | 'scaleway';
export type ViewMode = 'grid' | 'chat';
export type SidebarMode = 'none' | 'verify' | 'chat';

// Project persistence types
export interface SavedProject {
  version: 1;
  name: string;
  savedAt: string;  // ISO timestamp
  columns: Column[];
  documents: DocumentFile[];
  results: ExtractionResult;
  selectedModel: string;
  selectedProvider?: Provider;
}

// Column template library types
export interface ColumnTemplate {
  id: string;
  name: string;
  type: ColumnType;
  prompt: string;
  category?: string;  // e.g., "Legal", "Financial", "Dates"
  createdAt: string;
}

export interface ColumnLibrary {
  version: 1;
  templates: ColumnTemplate[];
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  columns: { name: string; type: ColumnType; prompt: string }[];
  createdAt: string;
  builtIn?: boolean;
}