import React from 'react';

// 装饰性元素组件
export const FloatingElements: React.FC = () => {
  return (
    <>
      <div className="fixed top-1/4 left-10 w-24 h-24 rounded-full bg-gradient-to-r from-cyan-400 to-teal-300 opacity-20 blur-xl animate-pulse"></div>
      <div className="fixed bottom-1/3 right-20 w-32 h-32 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 opacity-20 blur-xl animate-pulse"></div>
      <div className="fixed top-1/3 right-1/3 w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-emerald-300 opacity-20 blur-xl animate-pulse"></div>
      <div className="fixed top-20 right-1/4 w-0 h-0 border-l-[15px] border-l-transparent border-b-[25px] border-b-cyan-300 border-r-[15px] border-r-transparent opacity-20 animate-bounce"></div>
      <div className="fixed bottom-40 left-1/4 w-8 h-8 bg-teal-300 rotate-45 opacity-20 animate-bounce"></div>
    </>
  );
};