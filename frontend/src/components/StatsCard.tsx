import React from 'react';

// 统计信息卡片组件
const StatsCard: React.FC<{ title: string; value: number | string; icon: string }> = ({ title, value, icon }) => {
  return (
    <div className="backdrop-blur-lg bg-white/50 border border-white/30 rounded-2xl p-4 shadow-lg hover:scale-105 transition-all duration-300">
      <div className="flex items-center">
        <span className="text-2xl mr-2">{icon}</span>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-xl font-bold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;