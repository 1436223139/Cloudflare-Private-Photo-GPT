import React, { useState, useRef, useEffect } from 'react';

interface Media {
  key: string;
  url: string;
  type: 'image' | 'video';
  timestamp: number;
  width?: number;
  height?: number;
  size: number;
}

// 自适应图片组件 - 根据实际比例显示
const AdaptiveImage: React.FC<{
  src: string;
  alt: string;
  onLoad: () => void;
  onError: () => void;
  className?: string;
}> = ({ src, alt, onLoad, onError, className = '' }) => {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // 创建一个隐藏的图片来获取尺寸信息
    const img = new Image();
    img.onload = () => {
      setAspectRatio(img.naturalHeight / img.naturalWidth);
      onLoad();
    };
    img.onerror = onError;
    img.src = src;
  }, [src, onLoad, onError]);

  // 如果已知比例，使用padding-top技巧保持比例
  if (aspectRatio !== null) {
    return (
      <div 
        className="relative w-full overflow-hidden"
        style={{ 
          paddingBottom: `${aspectRatio * 100}%`,
          maxHeight: '500px' // 限制最大高度防止过长图片
        }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover ${className}`}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  // 否则显示加载状态
  return (
    <div className="relative w-full overflow-hidden" style={{ paddingBottom: '75%' }}>
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-2xl flex items-center justify-center animate-pulse">
        <div className="text-2xl text-gray-500">📷</div>
      </div>
    </div>
  );
};

// 单个媒体卡片组件
const MediaCard: React.FC<{
  media: Media;
  idx: number;
  onPreview: () => void;
  onDownload: () => void;
  selected: boolean;
  onSelect: () => void;
  isSelectMode: boolean;
  isGuest: boolean; // 添加访客模式参数
}> = React.memo(({ media, idx, onPreview, onDownload, selected, onSelect, isSelectMode, isGuest }) => {
  const [loaded, setLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取缩略图URL
  const getThumbnailUrl = (url: string) => {
    return `${url}?width=600&quality=80&fit=scale-down`;
  };

  // 获取预览图URL
  const getPreviewUrl = (url: string) => {
    return `${url}?width=1200&quality=85&fit=scale-down`;
  };

  return (
    <div
      ref={containerRef}
      className="mb-6 break-inside-avoid cursor-zoom-in group animate-float"
      style={{ animationDelay: `${idx * 0.1}s` }}
      onClick={isSelectMode ? onSelect : onPreview}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`backdrop-blur-lg border rounded-2xl shadow-lg 
        overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:-translate-y-1 relative ${
          selected 
            ? 'border-teal-500 bg-teal-50/70' 
            : 'border-white/30 bg-white/70'
        }`}>
        {isSelectMode && !isGuest && ( // 访客模式下不显示选择框
          <div 
            className="absolute top-3 left-3 z-10"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              selected 
                ? 'bg-teal-500 border-teal-500' 
                : 'bg-white/80 border-white/50'
            }`}>
              {selected && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              )}
            </div>
          </div>
        )}
        
        {media.type === 'image' ? (
          <AdaptiveImage
            src={getThumbnailUrl(media.url)}
            alt={media.key}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={`transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/80 rounded-full p-4 backdrop-blur-sm">
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="absolute top-3 left-12">
          <span className="bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-bold">
            {media.type === 'image' ? '📷' : '🎬'}
          </span>
        </div>
        
        <div className={`absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-300 flex items-end p-4 ${
          isHovered ? 'opacity-100' : ''
        }`}>
          <span className="text-white text-sm font-medium truncate">
            {media.key.split('/').pop()}
          </span>
        </div>
        
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button
            className="bg-white/90 backdrop-blur-sm rounded-xl p-2 shadow-lg hover:bg-teal-100 transition-colors"
            onClick={e => { e.stopPropagation(); onDownload(); }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 13l6 6 6-6M10 3v16"/>
            </svg>
          </button>
        </div>
        <div className="px-3 py-2 bg-white/80 backdrop-blur-sm">
          <span className="text-sm text-gray-600 truncate block">{media.key.split('/').pop()}</span>
        </div>
      </div>
    </div>
  );
});

export default MediaCard;