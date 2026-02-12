import React, { useState, useEffect } from 'react';
import { Playbook, Column } from '../types';
import { X, BookOpen, Trash2, Plus, Play } from './Icons';
import { loadPlaybooks, savePlaybook, deletePlaybook } from '../utils/fileStorage';

interface PlaybookLibraryProps {
  columns: Column[];
  onLoadPlaybook: (playbook: Playbook) => void;
  onClose: () => void;
}

export const PlaybookLibrary: React.FC<PlaybookLibraryProps> = ({
  columns,
  onLoadPlaybook,
  onClose,
}) => {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');

  useEffect(() => {
    setPlaybooks(loadPlaybooks());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this playbook?')) {
      deletePlaybook(id);
      setPlaybooks(loadPlaybooks());
    }
  };

  const handleSave = () => {
    if (!saveName.trim()) return;
    savePlaybook(
      saveName.trim(),
      saveDescription.trim(),
      columns.map(({ name, type, prompt }) => ({ name, type, prompt }))
    );
    setPlaybooks(loadPlaybooks());
    setShowSaveForm(false);
    setSaveName('');
    setSaveDescription('');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-10 lg:inset-20 bg-white rounded-2xl shadow-2xl z-50 flex flex-col animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Playbooks</h2>
              <p className="text-sm text-slate-500">{playbooks.length} playbook{playbooks.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSaveForm(!showSaveForm)}
              disabled={columns.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              Save Current Columns
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Save Form */}
        {showSaveForm && (
          <div className="p-4 border-b border-slate-200 bg-indigo-50/50">
            <div className="max-w-lg space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g., NDA Review, Loan Agreement Analysis"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="What does this playbook extract?"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Playbook
                </button>
                <button
                  onClick={() => { setShowSaveForm(false); setSaveName(''); setSaveDescription(''); }}
                  className="px-4 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold rounded-md transition-all"
                >
                  Cancel
                </button>
                <span className="text-xs text-slate-500 ml-2">
                  {columns.length} column{columns.length !== 1 ? 's' : ''} will be saved
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Playbook Grid */}
        <div className="flex-1 overflow-auto p-4">
          {playbooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 bg-slate-100 rounded-full mb-4">
                <BookOpen className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No playbooks yet</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Create a playbook to save a set of columns you can quickly load for common review tasks.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playbooks.map(playbook => (
                <div
                  key={playbook.id}
                  className="group p-4 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{playbook.name}</span>
                      {playbook.builtIn && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-full font-semibold">
                          Built-in
                        </span>
                      )}
                    </div>
                    {!playbook.builtIn && (
                      <button
                        onClick={(e) => handleDelete(playbook.id, e)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition-all"
                        title="Delete playbook"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {playbook.description && (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">{playbook.description}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {playbook.columns.map((col, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full"
                      >
                        {col.name}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {playbook.columns.length} column{playbook.columns.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => onLoadPlaybook(playbook)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md transition-all active:scale-95"
                    >
                      <Play className="w-3 h-3" />
                      Load
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <p className="text-xs text-slate-500 text-center">
            Load a playbook to replace your current columns with a pre-configured set
          </p>
        </div>
      </div>
    </>
  );
};
