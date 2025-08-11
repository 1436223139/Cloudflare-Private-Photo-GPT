import React, { useState } from 'react';

interface NavbarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onLogout: () => void;
  isGuest: boolean;
  isGuestDisabled?: boolean;
  isGuestGloballyDisabled?: boolean;
  onToggleGuestAccess?: () => Promise<void>;
  isLoggedIn?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ 
  searchTerm, 
  onSearchChange, 
  onLogout, 
  isGuest,
  isGuestDisabled,
  isGuestGloballyDisabled,
  onToggleGuestAccess,
  isLoggedIn
}) => {
  const [isTogglingGuest, setIsTogglingGuest] = useState(false);
  
  const buttonSecondaryClass = "h-12 px-6 rounded-2xl font-bold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white/90 backdrop-blur-sm border border-white/50 hover:border-teal-400 hover:bg-teal-50/80";
  const buttonEnableGuestClass = "h-12 px-4 rounded-2xl font-bold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-500 to-emerald-400 hover:from-emerald-500 hover:to-green-400 text-white";
  const buttonDisableGuestClass = "h-12 px-4 rounded-2xl font-bold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-orange-400 hover:from-orange-500 hover:to-amber-400 text-white";

  const handleToggleGuestAccess = async () => {
    if (!onToggleGuestAccess) return;
    
    setIsTogglingGuest(true);
    try {
      await onToggleGuestAccess();
    } finally {
      setIsTogglingGuest(false);
    }
  };

  return (
    <nav className="w-full backdrop-blur-2xl bg-white/40 border-b border-white/30 shadow-lg flex items-center justify-between px-8 py-4 mb-8 sticky top-0 z-20">
      <span className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500">
        Flow Album
      </span>
      <div className="flex items-center gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索媒体..."
            className="px-4 py-2 rounded-full bg-white/80 border border-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm w-48 transition-all"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        {/* 管理员功能：切换访客访问权限 */}
        {isLoggedIn && onToggleGuestAccess && (
          <button 
            className={isGuestDisabled ? buttonEnableGuestClass : buttonDisableGuestClass}
            onClick={handleToggleGuestAccess}
            disabled={!!isGuestGloballyDisabled || isTogglingGuest}
            title={isGuestGloballyDisabled ? "访客访问已被环境变量全局禁用" : (isGuestDisabled ? "启用访客访问" : "禁用访客访问")}
          >
            {isTogglingGuest ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                处理中...
              </>
            ) : isGuestGloballyDisabled ? '访客已全局禁用' : (isGuestDisabled ? '启用访客' : '禁用访客')}
          </button>
        )}
        
        <button className={buttonSecondaryClass} onClick={onLogout}>
          {isGuest ? '返回登录' : '退出'}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;