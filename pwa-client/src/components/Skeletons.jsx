import React from 'react';

export const CardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden p-4 relative animate-pulse">
    <div className="flex justify-between items-start mb-3">
      <div className="flex space-x-2">
        <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </div>
      <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
    <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
    <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
    <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
    <div className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
  </div>
);

export const EmptyState = ({ title, description, icon: Icon, action }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 my-8">
    <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4 shadow-sm">
      <Icon size={32} />
    </div>
    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-4">{description}</p>
    {action && (
      <button onClick={action.onClick} className="text-xs font-bold text-brand-blue dark:text-blue-400 bg-brand-light dark:bg-blue-900/20 px-4 py-2 rounded-xl transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/40">
        {action.label}
      </button>
    )}
  </div>
);
