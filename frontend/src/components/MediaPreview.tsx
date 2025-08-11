import React from 'react';

interface Media {
  key: string;
  url: string;
  type: 'image' | 'video';
  timestamp: number;
  width?: number;
  height?: number;
  size: number;
}

interface MediaPreviewProps {
  media: Media[];
  previewIdx: number;
  isGuest: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDownload: (mediaItem: Media) => void;
  onDelete: (mediaKey: string) => void;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({
  media,
  previewIdx,
  isGuest,
  onClose,
  onPrev,
  onNext,
  onDownload,
  onDelete
}) => {
  if (previewIdx === null || previewIdx >= media.length) return null;

  const currentMedia = media[previewIdx];
  const startIndex = Math.max(0, previewIdx - 2);
  const endIndex = Math.min(media.length, previewIdx + 3);

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-between z-10 px-8">
          <button 
            className="bg-white/20 hover:bg-white/40 rounded-full p-4 text-white transition-all transform hover:scale-110"
            onClick={e => {
              e.stopPropagation();
              if (previewIdx > 0) onPrev();
            }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          
          <button
            className="bg-white/20 hover:bg-white/40 rounded-full p-4 text-white transition-all transform hover:scale-110"
            onClick={e => {
              e.stopPropagation();
              if (previewIdx < media.length - 1) onNext();
            }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        <div className="absolute top-8 right-8 flex flex-col gap-4 z-10">
          <button
            className="bg-white/20 hover:bg-white/40 rounded-full p-3 text-white transition-all transform hover:scale-110"
            onClick={e => {
              e.stopPropagation();
              onDownload(currentMedia);
            }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 16l8 8 8-8M12 4v20"/>
            </svg>
          </button>
          
          <button
            className="bg-white/20 hover:bg-white/40 rounded-full p-3 text-white transition-all transform hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* 仅在登录状态下显示删除按钮 */}
        {!isGuest && (
          <div className="absolute top-8 left-8 z-10">
            <button
              className="bg-red-500/80 hover:bg-red-500 rounded-full p-3 text-white transition-all transform hover:scale-110 flex items-center"
              onClick={e => {
                e.stopPropagation();
                onDelete(currentMedia.key);
                onClose();
              }}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        )}

        <div className="relative max-w-7xl max-h-[85vh] w-auto h-auto flex items-center justify-center">
          {currentMedia.type === 'image' ? (
            <img
              src={currentMedia.url}
              alt="预览"
              className="max-h-[85vh] max-w-full object-contain"
              onClick={e => e.stopPropagation()}
              loading="eager"
              decoding="async"
            />
          ) : (
            <video 
              controls
              autoPlay
              className="max-h-[85vh] max-w-full object-contain"
              onClick={e => e.stopPropagation()}
            >
              <source src={currentMedia.url} type="video/mp4" />
              您的浏览器不支持视频播放。
            </video>
          )}
        </div>
        
        <div className="absolute bottom-8 left-0 right-0 text-center text-white z-10">
          <p className="font-medium text-lg">{currentMedia.key.split('/').pop()}</p>
          <p className="text-sm text-gray-300 mt-1">
            {previewIdx + 1} / {media.length}
          </p>
        </div>
        
        <div className="absolute bottom-24 left-0 right-0 flex gap-4 justify-center z-10">
          {media.slice(startIndex, endIndex).map((mediaItem, i) => {
            const realIdx = startIndex + i;
            return (
              <div 
                key={mediaItem.key}
                className={`relative h-16 w-16 rounded-xl border-2 cursor-pointer transition-all duration-200 overflow-hidden flex-shrink-0 ${
                  realIdx === previewIdx 
                    ? 'border-teal-500 scale-110 shadow-lg' 
                    : 'border-white/60 opacity-70 hover:opacity-100'
                }`}
                onClick={e => {
                  e.stopPropagation();
                  // We need a way to change the preview index
                  // This would require passing a function to handle index changes
                }}
              >
                {mediaItem.type === 'image' ? (
                  <img
                    src={`${mediaItem.url}?width=100&quality=70&fit=cover`}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'h-full w-full bg-gray-200 flex items-center justify-center';
                        placeholder.innerHTML = '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="gray"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>';
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                ) : (
                  <div className="h-full w-full bg-black/20 flex items-center justify-center">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute bottom-0.5 right-0.5">
                  <span className="bg-black/50 text-white text-[8px] rounded-full px-0.5">
                    {mediaItem.type === 'image' ? '📷' : '🎬'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MediaPreview;