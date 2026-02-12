import { SavedProject, ColumnLibrary, ColumnTemplate, Playbook } from '../types';
import { SAMPLE_COLUMNS } from './sampleData';

// ============================================
// Project Save/Load Functions
// ============================================

export const saveProject = async (project: SavedProject): Promise<boolean> => {
  const jsonString = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const filename = `${project.name.replace(/\s+/g, '_').toLowerCase()}.tabular-project.json`;

  // Always use the download fallback - it's more reliable across browsers
  // The File System Access API has issues with Safari and some security contexts
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err: any) {
    console.error('Save project error:', err);
    throw new Error(`Failed to save: ${err.message}`);
  }
};

export const loadProject = async (): Promise<SavedProject | null> => {
  // Create and append input to DOM — some browsers require this for click() to work
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.tabular-project.json';
  input.style.display = 'none';
  document.body.appendChild(input);

  return new Promise<SavedProject | null>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      if (input.parentNode) input.parentNode.removeChild(input);
    };

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) {
        if (!settled) { settled = true; cleanup(); resolve(null); }
        return;
      }

      try {
        const text = await file.text();
        const project = JSON.parse(text) as SavedProject;

        if (!validateProject(project)) {
          throw new Error('Invalid project file structure');
        }

        if (!settled) { settled = true; cleanup(); resolve(project); }
      } catch (err: any) {
        console.error('Load project error:', err);
        if (!settled) { settled = true; cleanup(); reject(new Error(`Failed to load: ${err.message}`)); }
      }
    });

    // Fallback for cancel: detect when window regains focus without a file selected
    window.addEventListener('focus', function onFocus() {
      setTimeout(() => {
        window.removeEventListener('focus', onFocus);
        if (!settled && (!input.files || input.files.length === 0)) {
          settled = true;
          cleanup();
          resolve(null);
        }
      }, 500);
    });

    input.click();
  });
};

const validateProject = (project: any): project is SavedProject => {
  return (
    project &&
    typeof project.version === 'number' &&
    typeof project.name === 'string' &&
    Array.isArray(project.columns) &&
    Array.isArray(project.documents) &&
    typeof project.results === 'object'
  );
};

// ============================================
// Column Library Save/Load Functions
// ============================================

const LIBRARY_STORAGE_KEY = 'tabular-review-column-library';

export const saveColumnLibrary = async (library: ColumnLibrary, toFile: boolean = false): Promise<boolean> => {
  // Always save to localStorage as backup
  localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
  
  if (toFile) {
    const jsonString = JSON.stringify(library, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    if (isFileSystemAccessSupported()) {
      try {
        const handle = await window.showSaveFilePicker!({
          suggestedName: 'column-library.json',
          types: [{
            description: 'Column Library',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return false;
        }
        throw err;
      }
    } else {
      // Fallback: download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'column-library.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    }
  }
  
  return true;
};

export const loadColumnLibrary = (): ColumnLibrary => {
  // Load from localStorage
  const stored = localStorage.getItem(LIBRARY_STORAGE_KEY);
  if (stored) {
    try {
      const library = JSON.parse(stored) as ColumnLibrary;
      if (validateLibrary(library)) {
        return library;
      }
    } catch {
      // Invalid JSON, return empty
    }
  }
  
  return { version: 1, templates: [] };
};

export const importColumnLibrary = async (): Promise<ColumnLibrary | null> => {
  if (isFileSystemAccessSupported()) {
    try {
      const [handle] = await window.showOpenFilePicker!({
        types: [{
          description: 'Column Library',
          accept: { 'application/json': ['.json'] }
        }]
      });
      const file = await handle.getFile();
      const text = await file.text();
      const library = JSON.parse(text) as ColumnLibrary;
      
      if (!validateLibrary(library)) {
        throw new Error('Invalid library file structure');
      }
      
      // Merge with existing library
      const existing = loadColumnLibrary();
      const merged = mergeLibraries(existing, library);
      await saveColumnLibrary(merged);
      
      return merged;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return null;
      }
      throw err;
    }
  } else {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        
        try {
          const text = await file.text();
          const library = JSON.parse(text) as ColumnLibrary;
          
          if (!validateLibrary(library)) {
            throw new Error('Invalid library file structure');
          }
          
          const existing = loadColumnLibrary();
          const merged = mergeLibraries(existing, library);
          await saveColumnLibrary(merged);
          
          resolve(merged);
        } catch (err) {
          reject(err);
        }
      };
      
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
};

const validateLibrary = (library: any): library is ColumnLibrary => {
  return (
    library &&
    typeof library.version === 'number' &&
    Array.isArray(library.templates)
  );
};

const mergeLibraries = (existing: ColumnLibrary, imported: ColumnLibrary): ColumnLibrary => {
  const existingIds = new Set(existing.templates.map(t => t.id));
  const newTemplates = imported.templates.filter(t => !existingIds.has(t.id));
  
  return {
    version: 1,
    templates: [...existing.templates, ...newTemplates]
  };
};

// ============================================
// Column Template Helpers
// ============================================

export const addTemplateToLibrary = (template: Omit<ColumnTemplate, 'id' | 'createdAt'>): ColumnTemplate => {
  const library = loadColumnLibrary();
  const newTemplate: ColumnTemplate = {
    ...template,
    id: `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString()
  };
  
  library.templates.push(newTemplate);
  saveColumnLibrary(library);
  
  return newTemplate;
};

export const removeTemplateFromLibrary = (templateId: string): void => {
  const library = loadColumnLibrary();
  library.templates = library.templates.filter(t => t.id !== templateId);
  saveColumnLibrary(library);
};

export const updateTemplateInLibrary = (templateId: string, updates: Partial<Omit<ColumnTemplate, 'id' | 'createdAt'>>): void => {
  const library = loadColumnLibrary();
  const index = library.templates.findIndex(t => t.id === templateId);
  if (index !== -1) {
    library.templates[index] = { ...library.templates[index], ...updates };
    saveColumnLibrary(library);
  }
};

// ============================================
// Playbook Functions
// ============================================

const PLAYBOOK_STORAGE_KEY = 'tabular-review-playbooks';

const BUILT_IN_PE_PLAYBOOK: Playbook = {
  id: 'pb_builtin_pe_side_letter',
  name: 'PE Side Letter Review',
  description: 'Extract key terms from private equity side letters: investor entity, dates, commitment amounts, MFN clauses, co-investment rights, and power of attorney provisions.',
  columns: SAMPLE_COLUMNS.map(({ name, type, prompt }) => ({ name, type, prompt })),
  createdAt: '2025-01-01T00:00:00.000Z',
  builtIn: true,
};

const BUILT_IN_CLA_PLAYBOOK: Playbook = {
  id: 'pb_builtin_cla',
  name: 'Convertible Loan Agreement',
  description: 'Extract key terms from convertible loan agreements (CLAs): loan amount, disbursement, maturity, interest, conversion rights, discount, valuation cap, and subordination.',
  columns: [
    { name: 'Title', type: 'text', prompt: 'What is the title of this agreement? Return the full title as stated in the document.' },
    { name: 'Date', type: 'date', prompt: 'What is the date of this convertible loan agreement?' },
    { name: 'Lender', type: 'text', prompt: 'Identify the full legal name of the lender.' },
    { name: 'Borrower', type: 'text', prompt: 'Identify the full legal name of the borrower (the company).' },
    { name: 'Loan Amount', type: 'text', prompt: 'What is the loan amount (principal)? Return the amount including currency, e.g. "EUR 500,000".' },
    { name: 'Disbursement', type: 'text', prompt: 'Are disbursement terms specified? If yes, extract the timeline (e.g. number of business days after signing) and any conditions. If not addressed, return "Not specified".' },
    { name: 'Maturity Date', type: 'date', prompt: 'What is the maturity date of the convertible loan? If no maturity date is specified, return "Not specified".' },
    { name: 'Interest Rate', type: 'text', prompt: 'Is an interest rate specified? If yes, state the rate, when interest is payable, and whether interest accrues if the loan converts (e.g. "1.5% p.a., payable upon repayment, no interest accrued if converted"). If no interest provision, return "Not specified".' },
    { name: 'Lender Conversion Right', type: 'boolean', prompt: 'Does the lender have a conversion right? Answer Yes or No.' },
    { name: 'Lender Conversion Terms', type: 'text', prompt: 'If the lender has a conversion right, describe it: when can the lender convert (e.g. in any financing round, only in a qualified financing round, upon maturity, or both)? Extract the full terms. If the lender has no conversion right, return "N/A".' },
    { name: 'Company Conversion Right', type: 'boolean', prompt: 'Does the company (borrower) have a right to force conversion? Answer Yes or No.' },
    { name: 'Company Conversion Terms', type: 'text', prompt: 'If the company has a conversion right, describe it: when can the company force conversion (e.g. in a qualified financing round, upon maturity, or both)? Extract the full terms. If the company has no conversion right, return "N/A".' },
    { name: 'Qualified Financing Defined', type: 'boolean', prompt: 'Is there a definition of a "qualified financing round" (or similar concept like a qualifying event)? Answer Yes or No.' },
    { name: 'Qualified Financing Threshold', type: 'text', prompt: 'If a qualified financing round is defined, extract the threshold amount and conditions (e.g. "equity round with cash investments of at least EUR 1,000,000 in aggregate"). If not defined, return "N/A".' },
    { name: 'Discount', type: 'text', prompt: 'Is the lender entitled to a discount on the share price paid by cash investors in a financing round? If yes, return the percentage and any details (e.g. "15% discount"). If no discount is provided, return "No discount".' },
    { name: 'Valuation Cap', type: 'text', prompt: 'Is there a valuation cap on the pre-money valuation for conversion? If yes, extract the cap amount and the resulting per-share price if stated. If no valuation cap, return "No cap".' },
    { name: 'Maturity Conversion Price', type: 'text', prompt: 'Is there a fixed conversion price per share for conversion at maturity (i.e. outside a financing round)? If yes, extract it. If not specified, return "Not specified".' },
    { name: 'Subordination', type: 'text', prompt: 'Is there a subordination clause? Specifically, is there a qualified subordination (qualifizierter Rangrücktritt)? If yes, describe the key terms. If no subordination provision, return "Not included".' },
  ],
  createdAt: '2025-01-01T00:00:00.000Z',
  builtIn: true,
};

const BUILT_IN_PLAYBOOKS: Playbook[] = [BUILT_IN_PE_PLAYBOOK, BUILT_IN_CLA_PLAYBOOK];

export const loadPlaybooks = (): Playbook[] => {
  const stored = localStorage.getItem(PLAYBOOK_STORAGE_KEY);
  let userPlaybooks: Playbook[] = [];
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        userPlaybooks = parsed;
      }
    } catch {
      // Invalid JSON, ignore
    }
  }
  return [...BUILT_IN_PLAYBOOKS, ...userPlaybooks];
};

export const savePlaybook = (name: string, description: string, columns: { name: string; type: string; prompt: string }[]): Playbook => {
  const stored = localStorage.getItem(PLAYBOOK_STORAGE_KEY);
  let userPlaybooks: Playbook[] = [];
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) userPlaybooks = parsed;
    } catch { /* ignore */ }
  }

  const newPlaybook: Playbook = {
    id: `pb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    description,
    columns: columns as Playbook['columns'],
    createdAt: new Date().toISOString(),
  };

  userPlaybooks.push(newPlaybook);
  localStorage.setItem(PLAYBOOK_STORAGE_KEY, JSON.stringify(userPlaybooks));
  return newPlaybook;
};

export const deletePlaybook = (id: string): void => {
  const stored = localStorage.getItem(PLAYBOOK_STORAGE_KEY);
  if (!stored) return;
  try {
    let userPlaybooks: Playbook[] = JSON.parse(stored);
    userPlaybooks = userPlaybooks.filter(p => p.id !== id);
    localStorage.setItem(PLAYBOOK_STORAGE_KEY, JSON.stringify(userPlaybooks));
  } catch { /* ignore */ }
};

export const getTemplateCategories = (): string[] => {
  const library = loadColumnLibrary();
  const categories = new Set<string>();
  library.templates.forEach(t => {
    if (t.category) {
      categories.add(t.category);
    }
  });
  return Array.from(categories).sort();
};
