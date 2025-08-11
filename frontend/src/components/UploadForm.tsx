import React, { useState, useRef } from 'react';

interface UploadFormProps {
  uploadPath: string;
  onPathChange: (path: string) => void;
  onFileSelect: (file: File | null, files?: FileList | null) => void;
  onUpload: (files?: FileList | null) => void;
  uploading: boolean;
  file: File | null;
  files: FileList | null;
  onBatchDownload: () => void;
  downloading: boolean;
  mediaCount: number;
}

interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
}

const UploadForm: React.FC<UploadFormProps> = ({
  uploadPath,
  onPathChange,
  onFileSelect,
  onUpload,
  uploading,
  file,
  files,
  onBatchDownload,
  downloading,
  mediaCount
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const inputBaseClass = 'h-12 px-4 rounded-2xl bg-white/90 backdrop-blur-sm border border-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400 text-base transition-all w-full';
  const buttonBaseClass = 'h-12 px-6 rounded-2xl font-bold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed';
  const buttonPrimaryClass = `${buttonBaseClass} bg-gradient-to-r from-blue-500 to-teal-400 hover:from-teal-500 hover:to-blue-400 text-white hover:shadow-lg hover:scale-105`;


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    onFileSelect(selectedFile, null);
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    onFileSelect(null, selectedFiles);
  };

  return (
    <>
      <div className="max-w-6xl mx-auto mb-8 backdrop-blur-2xl bg-white/60 border border-white/30 rounded-3xl shadow-xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
          <input
            type="text"
            className={inputBaseClass}
            placeholder="上传路径（可选）"
            value={uploadPath}
            onChange={e => onPathChange(e.target.value)}
          />
          
          <div className="relative">
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              ref={folderInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFolderSelect}
              // @ts-ignore
              webkitdirectory="true"
              multiple
            />
            <div className="flex gap-2">
              <button
                className={`${inputBaseClass} text-left overflow-hidden`}
                onClick={() => inputRef.current?.click()}
              >
                {file ? (
                  <span className="truncate block">{file.name}</span>
                ) : (
                  <span className="text-gray-500">未选择任何文件</span>
                )}
              </button>
              <button
                className={`${inputBaseClass} text-left overflow-hidden`}
                onClick={() => folderInputRef.current?.click()}
              >
                {files && files.length > 0 ? (
                  <span className="truncate block">{files.length} 个文件</span>
                ) : (
                  <span className="text-gray-500">未选择任何文件夹</span>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 justify-end">
            <button
              className={buttonPrimaryClass}
              onClick={() => onUpload(files)}
              disabled={(!file && (!files || files.length === 0)) || uploading}
            >
              {uploading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  上传中...
                </span>
              ) : '上传'}
            </button>
            <button
              className={buttonPrimaryClass}
              onClick={onBatchDownload}
              disabled={downloading || mediaCount === 0}
            >
              {downloading ? '打包中...' : '打包下载'}
            </button>
          </div>
        </div>
      </div>

    </>
  );
};

export default UploadForm;