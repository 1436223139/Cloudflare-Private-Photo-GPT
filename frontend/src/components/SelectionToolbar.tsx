import React from 'react';

interface SelectionToolbarProps {
  selectedCount: number;
  isSelectMode: boolean;
  onSelectModeChange: (mode: boolean) => void;
  onSelectAll: () => void;
  onBatchDelete: () => void;
  currentMediaCount: number;
  deleting: boolean;
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectedCount,
  isSelectMode,
  onSelectModeChange,
  onSelectAll,
  onBatchDelete,
  currentMediaCount,
  deleting
}) => {
  const buttonBaseClass = "h-12 px-6 rounded-2xl font-bold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  const buttonSecondaryClass = `${buttonBaseClass} bg-white/90 backdrop-blur-sm border border-white/50 hover:border-teal-400 hover:bg-teal-50/80`;
  const buttonDangerClass = `${buttonBaseClass} bg-gradient-to-r from-red-500 to-pink-500 hover:from-pink-500 hover:to-red-400 text-white hover:shadow-lg hover:scale-105`;

  if (isSelectMode) {
    return (
      <div className="fixed bottom-8 right-8 z-30 backdrop-blur-lg bg-white/80 border border-white/50 rounded-2xl shadow-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            已选择 {selectedCount} 项
          </span>
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={() => onSelectModeChange(false)}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex flex-col gap-2">
          <button
            className={buttonSecondaryClass}
            onClick={onSelectAll}
          >
            {selectedCount === currentMediaCount 
              ? '取消全选' 
              : '全选当前页'}
          </button>
          
          <button
            className={buttonDangerClass}
            onClick={onBatchDelete}
            disabled={deleting || selectedCount === 0}
          >
            {deleting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                删除中...
              </span>
            ) : (
              `删除选中 (${selectedCount})`
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      className={`fixed bottom-8 left-8 z-30 ${buttonSecondaryClass} rounded-full p-4 shadow-xl`}
      onClick={() => onSelectModeChange(true)}
      title="进入选择模式"
    >
      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    </button>
  );
};

export default SelectionToolbar;