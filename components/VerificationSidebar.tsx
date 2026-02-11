import React, { useEffect, useState, useRef } from 'react';
import { X, FileText, AlertCircle, Eye, ChevronLeft, ChevronRight } from './Icons';
import { ExtractionCell, DocumentFile, Column, BBox } from '../types';
import { PageImageViewer } from './PageImageViewer';
import { fetchPageCount, findQuoteAcrossPages, getPageImageUrl } from '../services/visualGroundingService';

type ViewMode = 'text' | 'visual';

interface VerificationSidebarProps {
  cell?: ExtractionCell | null;
  document: DocumentFile | null;
  column?: Column | null;
  onClose: () => void;
  onVerify?: () => void;
  isExpanded: boolean;
  onExpand: (expanded: boolean) => void;
}

export const VerificationSidebar: React.FC<VerificationSidebarProps> = ({
  cell,
  document,
  column,
  onClose,
  isExpanded,
  onExpand
}) => {
  const [decodedContent, setDecodedContent] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Visual grounding state
  const [viewMode, setViewMode] = useState<ViewMode>('text');
  const [visualLoading, setVisualLoading] = useState(false);
  const [visualError, setVisualError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Multi-page highlight state: page number → matched bboxes
  const [pageMatchMap, setPageMatchMap] = useState<Map<number, BBox[]>>(new Map());
  const [pagesWithMatches, setPagesWithMatches] = useState<number[]>([]);

  useEffect(() => {
    if (document) {
        try {
            const cleanContent = document.content.replace(/^data:.*;base64,/, '');
            const binaryString = atob(cleanContent);
            try {
                const decoded = decodeURIComponent(escape(binaryString));
                setDecodedContent(decoded);
            } catch (e) {
                setDecodedContent(binaryString);
            }
        } catch (e) {
            console.error("Decoding error", e);
            setDecodedContent("Unable to display document content.");
        }
    }
  }, [document]);

  // Reset view mode when cell/document changes
  useEffect(() => {
    setViewMode('text');
    setPageMatchMap(new Map());
    setPagesWithMatches([]);
    setVisualError(null);
  }, [cell, document?.id]);

  // Fetch page count when document changes and has OCR
  useEffect(() => {
    if (document?.hasOcr && document.docId) {
      fetchPageCount(document.docId)
        .then(count => setTotalPages(count))
        .catch(() => setTotalPages(0));
    } else {
      setTotalPages(0);
    }
  }, [document?.docId, document?.hasOcr]);

  // Set initial page from cell's page number
  useEffect(() => {
    if (cell?.page && cell.page > 0) {
      setCurrentPage(cell.page);
    } else {
      setCurrentPage(1);
    }
  }, [cell]);

  // When switching to visual mode, scan ALL pages for quote matches
  useEffect(() => {
    if (viewMode !== 'visual' || !document?.hasOcr || !document.docId || totalPages === 0) return;

    const docId = document.docId;
    const quote = cell?.quote || '';

    setVisualLoading(true);
    setVisualError(null);

    findQuoteAcrossPages(docId, totalPages, quote)
      .then(matchMap => {
        setPageMatchMap(matchMap);
        const matchedPages = Array.from(matchMap.keys()).sort((a, b) => a - b);
        setPagesWithMatches(matchedPages);
        // Auto-navigate to first page with matches if current page has none
        if (matchedPages.length > 0 && !matchMap.has(currentPage)) {
          setCurrentPage(matchedPages[0]);
        }
      })
      .catch(err => {
        console.error('[Visual] Failed to scan pages:', err);
        setVisualError('Failed to load visual data.');
        setViewMode('text');
      })
      .finally(() => setVisualLoading(false));
  }, [viewMode, document?.docId, document?.hasOcr, totalPages, cell?.quote]);

  // Auto-scroll to highlighted text when expanded or cell changes (text mode)
  useEffect(() => {
    if (isExpanded && cell?.quote && viewMode === 'text') {
        const timer = setTimeout(() => {
            if (scrollContainerRef.current) {
                const mark = scrollContainerRef.current.querySelector('mark');
                if (mark) {
                    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 300);
        return () => clearTimeout(timer);
    }
  }, [isExpanded, cell, decodedContent, viewMode]);

  const handleCitationClick = () => {
    onExpand(true);
  };

  const handleSwitchToVisual = () => {
    onExpand(true);
    setViewMode('visual');
  };

  const renderHighlightedContent = () => {
    if (!cell || !cell.quote || !decodedContent) {
        return <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{decodedContent}</div>;
    }

    const quote = cell.quote.trim();
    if (!quote) return <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{decodedContent}</div>;

    const escapedQuote = quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const loosePattern = escapedQuote.replace(/\s+/g, '[\\s\\W]*');
    const looseQuoteRegex = new RegExp(`(${loosePattern})`, 'gi');

    const parts = decodedContent.split(looseQuoteRegex);

    if (parts.length === 1) {
        return (
            <div className="relative">
                <div className="bg-red-50 border border-red-200 rounded p-2 mb-4 text-xs text-red-700 flex items-center gap-2 sticky top-0 z-10">
                    <AlertCircle className="w-3 h-3" />
                    Exact quote not found. Showing full text.
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{decodedContent}</div>
            </div>
        );
    }

    return (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {parts.map((part, i) => {
                const isMatch = looseQuoteRegex.test(part);
                looseQuoteRegex.lastIndex = 0;

                if (isMatch) {
                    return (
                        <mark key={i} className="bg-yellow-200 text-slate-900 px-0.5 rounded-sm border-b-2 border-yellow-400 font-medium">
                            {part}
                        </mark>
                    );
                }
                return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
        </div>
    );
  };

  const renderViewModeToggle = () => {
    if (!document?.hasOcr) return null;

    return (
      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 flex-shrink-0">
        <button
          onClick={() => { setViewMode('text'); }}
          className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
            viewMode === 'text'
              ? 'bg-white text-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Text
        </button>
        <button
          onClick={handleSwitchToVisual}
          className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 ${
            viewMode === 'visual'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Eye className="w-3 h-3" />
          Visual
        </button>
      </div>
    );
  };

  const renderPageNav = () => {
    if (totalPages <= 1) return null;

    const matchCount = pagesWithMatches.length;
    const currentMatchIndex = pagesWithMatches.indexOf(currentPage);
    const hasMatchOnPage = pageMatchMap.has(currentPage);

    return (
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-slate-600 min-w-[80px] text-center">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Match navigation */}
        {matchCount > 0 && (
          <div className="flex items-center gap-1.5">
            {matchCount > 1 && (
              <>
                <button
                  onClick={() => {
                    const prevIdx = currentMatchIndex > 0 ? currentMatchIndex - 1 : matchCount - 1;
                    setCurrentPage(pagesWithMatches[prevIdx]);
                  }}
                  className="px-1.5 py-0.5 text-[10px] font-medium text-amber-600 hover:bg-amber-50 rounded transition-colors"
                >
                  Prev match
                </button>
                <button
                  onClick={() => {
                    const nextIdx = currentMatchIndex < matchCount - 1 ? currentMatchIndex + 1 : 0;
                    setCurrentPage(pagesWithMatches[nextIdx]);
                  }}
                  className="px-1.5 py-0.5 text-[10px] font-medium text-amber-600 hover:bg-amber-50 rounded transition-colors"
                >
                  Next match
                </button>
              </>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              hasMatchOnPage
                ? 'text-amber-700 bg-amber-50 border border-amber-200'
                : 'text-slate-400 bg-slate-50 border border-slate-200'
            }`}>
              {matchCount} page{matchCount !== 1 ? 's' : ''} with matches
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderAnswerPanel = () => (
    <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white z-10 gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 flex-shrink-0">
                    <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                        {cell ? 'Analyst Review' : 'Document Preview'}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 truncate" title={document?.name}>
                        {document?.name}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                {renderViewModeToggle()}
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Body */}
        {cell && column ? (
            <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
                        {column.name}
                    </span>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                        cell.confidence === 'High' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        cell.confidence === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-700 border-red-200'
                    }`}>
                        {cell.confidence} Confidence
                    </span>
                </div>

                <div className="mb-8">
                     <div className="text-lg text-slate-900 leading-relaxed font-medium">
                        {cell.value}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI Reasoning</h4>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-sm text-slate-600 leading-relaxed inline">
                                {cell.reasoning}
                            </p>

                            {cell.quote && (
                                <button
                                    onClick={handleCitationClick}
                                    className="inline-flex items-center justify-center ml-1.5 align-middle px-1.5 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-[10px] font-bold rounded cursor-pointer border border-indigo-200 hover:border-indigo-300 transition-all transform active:scale-95"
                                    title="View in Document"
                                >
                                    {cell.page ? `p.${cell.page}` : 'Src'}
                                </button>
                            )}

                            {cell.quote && document?.hasOcr && (
                                <button
                                    onClick={handleSwitchToVisual}
                                    className="inline-flex items-center justify-center ml-1 align-middle px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-[10px] font-bold rounded cursor-pointer border border-amber-200 hover:border-amber-300 transition-all transform active:scale-95"
                                    title="View on original page"
                                >
                                    <Eye className="w-2.5 h-2.5 mr-0.5" />
                                    Visual
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="p-6 flex flex-col items-center justify-center flex-1 text-center">
                 <FileText className="w-12 h-12 text-slate-200 mb-4" />
                 <p className="text-sm text-slate-500">Document Preview Mode</p>
                 {!isExpanded && (
                     <button onClick={() => onExpand(true)} className="mt-4 text-indigo-600 text-xs font-bold hover:underline">
                        Open Document Viewer
                     </button>
                 )}
            </div>
        )}
    </div>
  );

  const renderDocumentPanel = () => {
    if (viewMode === 'visual' && document?.hasOcr && document.docId) {
      const currentBBoxes = pageMatchMap.get(currentPage) || [];
      const imageUrl = getPageImageUrl(document.docId, currentPage);

      return (
        <div className="h-full flex flex-col bg-slate-100 border-l border-slate-200 overflow-hidden">
          {renderPageNav()}
          <div className="flex-1 min-h-0">
            <PageImageViewer
              imageUrl={imageUrl}
              matchedBBoxes={currentBBoxes}
              isLoading={visualLoading}
            />
          </div>
          {visualError && (
            <div className="px-3 py-2 bg-red-50 text-red-600 text-xs border-t border-red-200">
              {visualError}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col bg-slate-100 border-l border-slate-200 overflow-hidden">
          <div className="flex-1 bg-slate-200 relative flex flex-col min-h-0">
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-8 md:p-12 scroll-smooth"
                >
                    <div className="max-w-[800px] w-full bg-white shadow-lg min-h-[800px] p-8 md:p-12 relative mx-auto text-left">
                        {renderHighlightedContent()}
                    </div>
                </div>
          </div>
      </div>
    );
  };

  if (!document) return null;

  return (
    <div className="h-full w-full flex">
        <div className={`${isExpanded ? 'w-[400px]' : 'w-full'} flex-shrink-0 transition-all duration-300 z-20 shadow-xl`}>
             {renderAnswerPanel()}
        </div>

        {isExpanded && (
            <div className="flex-1 animate-in slide-in-from-right duration-300 min-w-0">
                {renderDocumentPanel()}
            </div>
        )}
    </div>
  );
};
