import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex justify-center">
      <div className="flex items-center gap-2">
        <button
          className={`px-4 py-2 rounded-xl ${
            currentPage === 1 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-white/80 hover:bg-white text-gray-700'
          }`}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          上一页
        </button>
        
        {[...Array(totalPages)].map((_, i) => {
          const pageNum = i + 1;
          if (
            pageNum === 1 || 
            pageNum === totalPages || 
            (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
          ) {
            return (
              <button
                key={pageNum}
                className={`w-10 h-10 rounded-xl ${
                  currentPage === pageNum
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-400 text-white'
                    : 'bg-white/80 hover:bg-white text-gray-700'
                }`}
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </button>
            );
          }
          
          if (
            (pageNum === currentPage - 3 && pageNum > 2) ||
            (pageNum === currentPage + 3 && pageNum < totalPages - 1)
          ) {
            return (
              <span key={pageNum} className="px-2 py-2 text-gray-500">
                ...
              </span>
            );
          }
          
          return null;
        })}
        
        <button
          className={`px-4 py-2 rounded-xl ${
            currentPage === totalPages 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-white/80 hover:bg-white text-gray-700'
          }`}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          下一页
        </button>
      </div>
    </div>
  );
};

export default Pagination;