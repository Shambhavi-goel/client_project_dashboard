import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X } from 'lucide-react';

export const TaskFilters: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const dueFrom = searchParams.get('dueFrom') || '';
  const dueTo = searchParams.get('dueTo') || '';

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hasActiveFilters = Boolean(status || priority || dueFrom || dueTo);

  return (
    <div className="glass-card p-4 mb-6 border border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Filter label + fields */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-surface-200 uppercase tracking-wider pr-2 border-r border-white/10">
            <Filter className="w-3.5 h-3.5 text-brand-400" />
            Filters
          </div>

          {/* Status Select */}
          <select
            value={status}
            onChange={(e) => updateParam('status', e.target.value)}
            className="bg-surface-800 border border-white/10 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="TODO">Todo</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </select>

          {/* Priority Select */}
          <select
            value={priority}
            onChange={(e) => updateParam('priority', e.target.value)}
            className="bg-surface-800 border border-white/10 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          {/* Due From */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-surface-200">From:</span>
            <input
              type="date"
              value={dueFrom}
              onChange={(e) => updateParam('dueFrom', e.target.value)}
              className="bg-surface-800 border border-white/10 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Due To */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-surface-200">To:</span>
            <input
              type="date"
              value={dueTo}
              onChange={(e) => updateParam('dueTo', e.target.value)}
              className="bg-surface-800 border border-white/10 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        {/* Right: Reset button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs text-surface-200 hover:text-white px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
};
