import { BBox, OCRTextRegion, PageOCRData } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface PageVisualData {
  imageUrl: string;
  ocrData: PageOCRData;
}

export async function fetchPageVisualData(docId: string, pageNum: number): Promise<PageVisualData> {
  const ocrRes = await fetch(`${API_URL}/page-ocr/${docId}/${pageNum}`);

  if (!ocrRes.ok) {
    throw new Error(`Failed to fetch OCR data for page ${pageNum}`);
  }

  const ocrJson = await ocrRes.json();

  return {
    imageUrl: `${API_URL}/page-image/${docId}/${pageNum}`,
    ocrData: {
      page: ocrJson.page,
      regions: ocrJson.regions.map((r: any) => ({
        bbox: r.bbox as BBox,
        text: r.text as string,
        confidence: r.confidence as number,
      })),
    },
  };
}

export async function fetchPageCount(docId: string): Promise<number> {
  const res = await fetch(`${API_URL}/page-count/${docId}`);
  if (!res.ok) throw new Error('Failed to fetch page count');
  const data = await res.json();
  return data.page_count;
}

/**
 * Scan all pages for quote matches. Returns a map of page number → matched BBoxes.
 */
export async function findQuoteAcrossPages(
  docId: string,
  totalPages: number,
  quote: string,
  threshold: number = 0.5
): Promise<Map<number, BBox[]>> {
  const results = new Map<number, BBox[]>();
  if (!quote || totalPages === 0) return results;

  // Fetch OCR data for all pages in parallel
  const fetches = [];
  for (let p = 1; p <= totalPages; p++) {
    fetches.push(
      fetch(`${API_URL}/page-ocr/${docId}/${p}`)
        .then(res => res.ok ? res.json() : null)
        .then(json => json ? { page: p, regions: json.regions } : null)
        .catch(() => null)
    );
  }

  const pages = await Promise.all(fetches);

  for (const pageData of pages) {
    if (!pageData) continue;
    const ocrData: PageOCRData = {
      page: pageData.page,
      regions: pageData.regions.map((r: any) => ({
        bbox: r.bbox as BBox,
        text: r.text as string,
        confidence: r.confidence as number,
      })),
    };
    const boxes = matchQuoteToBBoxes(quote, ocrData, threshold);
    if (boxes.length > 0) {
      results.set(pageData.page, boxes);
    }
  }

  return results;
}

export function getPageImageUrl(docId: string, pageNum: number): string {
  return `${API_URL}/page-image/${docId}/${pageNum}`;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Match a quote string to OCR bounding boxes using fuzzy contiguous matching.
 * Returns the bboxes of the best matching contiguous sequence of OCR regions.
 */
export function matchQuoteToBBoxes(
  quote: string,
  ocrData: PageOCRData,
  threshold: number = 0.5
): BBox[] {
  if (!quote || !ocrData.regions.length) return [];

  const normQuote = normalize(quote);
  if (!normQuote) return [];

  const regions = ocrData.regions;
  let bestScore = 0;
  let bestStart = 0;
  let bestEnd = 0;

  // Sliding window: try all contiguous subsequences
  for (let start = 0; start < regions.length; start++) {
    let combined = '';
    for (let end = start; end < regions.length; end++) {
      combined += (end > start ? ' ' : '') + normalize(regions[end].text);

      const score = similarity(normQuote, combined);
      if (score > bestScore) {
        bestScore = score;
        bestStart = start;
        bestEnd = end;
      }

      // Early exit: if combined text is much longer than quote, no point continuing
      if (combined.length > normQuote.length * 2) break;
    }
  }

  if (bestScore < threshold) return [];

  return regions.slice(bestStart, bestEnd + 1).map(r => r.bbox);
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;

  if (longer.includes(shorter)) return shorter.length / longer.length;

  const overlap = longestCommonSubstring(a, b);
  return overlap / maxLen;
}

function longestCommonSubstring(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let max = 0;
  const prev = new Array(n + 1).fill(0);
  const curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
        if (curr[j] > max) max = curr[j];
      } else {
        curr[j] = 0;
      }
    }
    for (let j = 0; j <= n; j++) {
      prev[j] = curr[j];
      curr[j] = 0;
    }
  }
  return max;
}
