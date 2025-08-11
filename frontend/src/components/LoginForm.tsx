import React, { useState, useEffect } from 'react';
import { FloatingElements } from './FloatingElements';

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onGuestLogin: () => Promise<void>;
  loggingIn: boolean;
  guestLoggingIn: boolean;
  isGuestDisabled?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  onLogin, 
  onGuestLogin,
  loggingIn,
  guestLoggingIn,
  isGuestDisabled = false
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isCheckingGuestStatus, setIsCheckingGuestStatus] = useState(true);
  const [actualGuestDisabled, setActualGuestDisabled] = useState(isGuestDisabled);

  // 检查实际的访客状态
  useEffect(() => {
    const checkGuestStatus = async () => {
      setIsCheckingGuestStatus(true);
      try {
        // 直接调用API检查访客状态，而不是依赖传入的props
        const res = await fetch('/api/list');
        if (res.status === 401) {
          // 获取具体的错误信息来判断是哪种禁用
          const text = await res.text();
          if (text.includes('环境变量')) {
            setActualGuestDisabled(true); // 全局禁用
          } else {
            setActualGuestDisabled(true); // 管理员禁用
          }
        } else {
          setActualGuestDisabled(false);
        }
      } catch (e) {
        console.error('检查访客状态失败:', e);
        setActualGuestDisabled(false);
      } finally {
        setIsCheckingGuestStatus(false);
      }
    };

    checkGuestStatus();
  }, []);

  // 样式常量
  const buttonBaseClass = "h-12 px-6 rounded-2xl font-bold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  const buttonPrimaryClass = `${buttonBaseClass} bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-emerald-500 hover:to-teal-400 text-white hover:shadow-lg hover:scale-105`;
  const buttonGuestClass = `${buttonBaseClass} bg-gradient-to-r from-purple-500 to-indigo-400 hover:from-indigo-500 hover:to-purple-400 text-white hover:shadow-lg hover:scale-105`;

  const handleLoginClick = () => {
    if (!username) {
      alert('请输入用户名');
      return;
    }
    if (!password) {
      alert('请输入密码');
      return;
    }
    onLogin(username, password);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-cyan-400 via-emerald-300 to-teal-300">
      <FloatingElements />
      <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl shadow-2xl p-10 w-80 flex flex-col gap-6 relative z-10">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-400 drop-shadow">Flow Album</h2>
          <p className="text-gray-600 mb-6">私人云媒体库</p>
        </div>
        <input
          type="text"
          className="border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white/80 text-lg"
          placeholder="请输入用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && !password && document.querySelector<HTMLInputElement>('.password-input')?.focus()}
        />
        <input
          type="password"
          className="border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white/80 text-lg password-input"
          placeholder="请输入密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleLoginClick()}
        />
        <button
          className={`${buttonPrimaryClass} flex items-center justify-center`}
          onClick={handleLoginClick}
          disabled={loggingIn}
        >
          {loggingIn ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              登录中...
            </>
          ) : '登录'}
        </button>
        
        <div className="relative flex items-center justify-center my-2">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-gray-500 text-sm">或者</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>
        
        <button
          className={`${buttonGuestClass} flex items-center justify-center`}
          onClick={onGuestLogin}
          disabled={guestLoggingIn || actualGuestDisabled || isCheckingGuestStatus}
          title={actualGuestDisabled ? "访客访问已被管理员禁用" : ""}
        >
          {isCheckingGuestStatus ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              检查中...
            </>
          ) : actualGuestDisabled ? (
            '访客已禁用'
          ) : guestLoggingIn ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              加载中...
            </>
          ) : (
            <>
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              访客浏览
            </>
          )}
        </button>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© 2025 Flow Album</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;