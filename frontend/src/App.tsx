import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import LoginForm from './components/LoginForm';
import Navbar from './components/Navbar';
import StatsCard from './components/StatsCard';
import UploadForm from './components/UploadForm';
import SelectionToolbar from './components/SelectionToolbar';
import Pagination from './components/Pagination';
import MediaCard from './components/MediaCard';
import MediaPreview from './components/MediaPreview';
import { FloatingElements } from './components/FloatingElements';
import { getMediaType, encodeKey } from './utils/media';

interface Media {
  key: string;
  url: string;
  type: 'image' | 'video';
  timestamp: number;
  width?: number;
  height?: number;
  size: number;
}

interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
}

// 主应用组件
const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isGuest, setIsGuest] = useState(false); // 添加访客状态
  const [isGuestDisabled, setIsGuestDisabled] = useState(false); // 添加访客禁用状态
  const [isGuestGloballyDisabled, setIsGuestGloballyDisabled] = useState(false); // 添加访客全局禁用状态
  const [username, setUsername] = useState(''); // 添加用户名状态
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false); // 添加登录加载状态
  const [guestLoggingIn, setGuestLoggingIn] = useState(false); // 添加访客登录加载状态
  const [media, setMedia] = useState<Media[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPath, setUploadPath] = useState('');
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15); // 增加每页显示数量
  const [gradientPosition, setGradientPosition] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // 添加加载状态
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // 动态背景效果
  useEffect(() => {
    const interval = setInterval(() => {
      setGradientPosition(prev => (prev + 1) % 360);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // 页面加载时检查认证状态
  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('jwtToken');
      const guestStatus = localStorage.getItem('isGuest');
      
      if (token) {
        // 验证令牌有效性
        const isValid = await validateToken(token);
        if (isValid) {
          // 获取访客访问状态
          await fetchGuestAccessStatus(token);
          const success = await loadMedia();
          if (success) {
            setIsLoggedIn(true);
            setIsGuest(false);
          }
        } else {
          // 令牌无效，清除它
          localStorage.removeItem('jwtToken');
          // 检查是否可以使用访客模式
          const success = await loadMedia();
          if (success) {
            setIsGuest(true);
            setIsLoggedIn(false);
            localStorage.setItem('isGuest', 'true');
          }
        }
      } else if (guestStatus === 'true') {
        // 检查访客状态
        const success = await loadMedia();
        if (success) {
          setIsGuest(true);
          setIsLoggedIn(false);
        } else {
          // 访客模式加载失败，清除访客状态
          localStorage.removeItem('isGuest');
        }
      } else {
        // 尝试以访客身份加载（检查访客是否被禁用）
        try {
          const res = await fetch('/api/list');
          if (res.status === 401) {
            // 访客被禁用，不需要做任何事
          } else {
            // 访客未被禁用，可以加载媒体
            const success = await loadMedia();
            if (success) {
              setIsGuest(true);
              setIsLoggedIn(false);
              localStorage.setItem('isGuest', 'true');
            }
          }
        } catch (e) {
          console.error('检查访客状态失败:', e);
        }
      }
      
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  // 验证JWT令牌有效性
  const validateToken = async (token: string) => {
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };
      
      // 发送一个简单的请求来验证令牌
      const res = await fetch('/api/list', {
        headers,
        method: 'HEAD' // 使用HEAD方法减少数据传输
      });
      
      // 如果返回401或403，令牌无效
      if (res.status === 401 || res.status === 403) {
        return false;
      }
      
      return res.ok;
    } catch (error) {
      // 网络错误，假设令牌无效
      return false;
    }
  };

  // 获取访客访问状态
  const fetchGuestAccessStatus = async (token: string) => {
    try {
      const res = await fetch('/api/guest', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setIsGuestDisabled(data.disabled);
        setIsGuestGloballyDisabled(data.global || false);
      } else if (res.status === 403 || res.status === 400) {
        // 如果访客访问被全局禁用
        setIsGuestDisabled(true);
        setIsGuestGloballyDisabled(true);
      }
    } catch (e) {
      console.error('获取访客访问状态失败:', e);
      // 出错时保持当前状态
    }
  };

  // 切换访客登录状态
  const toggleGuestAccess = async () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return;
    
    try {
      const newDisabledStatus = !isGuestDisabled;
      
      const res = await fetch('/api/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ disabled: newDisabledStatus })
      });
      
      if (res.ok) {
        const data = await res.json();
        // 正确更新状态
        setIsGuestDisabled(data.disabled);
        setIsGuestGloballyDisabled(data.global || false);
        
        // 如果当前是访客且禁用了访客访问，则退出访客模式
        if (isGuest && data.disabled) {
          setIsGuest(false);
          localStorage.removeItem('isGuest');
          alert('访客访问已被禁用，即将返回登录页面');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else if (res.status === 400) {
        const text = await res.text();
        alert(text);
        // 重新获取访客访问状态以确保状态同步
        await fetchGuestAccessStatus(token);
      } else if (res.status === 403) {
        alert('没有权限操作访客访问设置');
        // 重新获取访客访问状态以确保状态同步
        await fetchGuestAccessStatus(token);
      } else {
        alert('操作失败，请重试');
        // 重新获取访客访问状态以确保状态同步
        await fetchGuestAccessStatus(token);
      }
    } catch (e) {
      console.error('切换访客访问状态失败:', e);
      alert('操作失败，请重试');
      // 重新获取访客访问状态以确保状态同步
      const token = localStorage.getItem('jwtToken');
      if (token) {
        await fetchGuestAccessStatus(token);
      }
    }
  };

  const getDynamicGradient = () => {
    const speed = 0.5;
    const pos = (gradientPosition * speed) % 360;
    const pos2 = (pos + 120) % 360;
    const pos3 = (pos + 240) % 360;
    
    return {
      background: `linear-gradient(135deg, 
        hsl(${pos}, 60%, 70%) 0%, 
        hsl(${pos2}, 65%, 65%) 50%, 
        hsl(${pos3}, 60%, 70%) 100%)`,
      transition: 'background 0.3s ease'
    };
  };


  // 计算分页数据
  const indexOfLastMedia = currentPage * itemsPerPage;
  const indexOfFirstMedia = indexOfLastMedia - itemsPerPage;
  
  const filteredMedia = media
    .filter(m => m.key.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.timestamp - a.timestamp;
      } else {
        return a.timestamp - b.timestamp;
      }
    });
  
  const currentMedia = filteredMedia.slice(indexOfFirstMedia, indexOfLastMedia);
  const totalPages = Math.ceil(filteredMedia.length / itemsPerPage);

  // API 调用
  const loadMedia = async () => {
    const token = localStorage.getItem('jwtToken');
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const res = await fetch('/api/list', {
        headers
      });
      
      if (res.status === 401) {
        setIsLoggedIn(false);
        setIsGuest(false);
        setPassword('');
        setUsername('');
        localStorage.removeItem('jwtToken'); // 清除无效令牌
        localStorage.removeItem('isGuest'); // 清除访客状态
        return false;
      }
      
      if (res.status === 403) {
        // 禁止访问，可能是访客访问被禁用
        if (isGuest) {
          setIsGuest(false);
          localStorage.removeItem('isGuest');
          alert('访客访问已被禁用，请登录后操作');
        }
        return false;
      }
      
      if (res.status === 429) {
        alert('请求过于频繁，请稍后再试');
        return false;
      }
      
      if (!res.ok) {
        alert('加载媒体失败，请重试');
        return false;
      }
      
      const data = await res.json();
      
      const mediaList: Media[] = data
        .map((obj: any) => {
          const type = getMediaType(obj.key);
          if (!type) return null;
          
          const timestamp = obj.uploaded ? new Date(obj.uploaded).getTime() : Date.now();
          
          return {
            key: obj.key,
            url: `/r2/${encodeKey(obj.key)}`,
            type,
            timestamp,
            width: obj.width || null,
            height: obj.height || null,
            size: obj.size || 0
          };
        })
        .filter(Boolean) as Media[];
      
      setMedia(mediaList);
      setCurrentPage(1);
      return true;
    } catch (error) {
      console.error('加载媒体时发生网络错误:', error);
      alert('网络错误，请检查您的连接');
      return false;
    }
  };

  const handleLogin = async (username: string, password: string) => {
    setLoggingIn(true); // 设置登录加载状态
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          alert('用户名或密码错误');
        } else if (response.status === 429) {
          alert('请求过于频繁，请稍后再试');
        } else {
          alert('登录失败，请重试');
        }
        return;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        alert('登录失败，请重试');
        return;
      }
      
      // 存储JWT令牌
      localStorage.setItem('jwtToken', data.token);
      localStorage.removeItem('isGuest'); // 清除访客状态
      
      // 获取访客访问状态
      await fetchGuestAccessStatus(data.token);
      
      const success = await loadMedia();
      if (success) {
        setIsLoggedIn(true);
        setIsGuest(false);
      } else {
        // 如果加载媒体失败，退出登录状态
        setIsLoggedIn(false);
        setIsGuest(false);
        localStorage.removeItem('jwtToken');
        alert('无法加载媒体数据，请重试');
      }
    } catch (error) {
      alert('网络错误，请检查您的连接');
    } finally {
      setLoggingIn(false); // 重置登录加载状态
    }
  };

  const handleGuestLogin = async () => {
    setGuestLoggingIn(true); // 设置访客登录加载状态
    try {
      // 首先检查访客是否被禁用
      const res = await fetch('/api/list');
      if (res.status === 401) {
        alert('访客访问已被管理员禁用');
        return;
      }
      
      const success = await loadMedia();
      if (success) {
        setIsGuest(true);
        setIsLoggedIn(false);
        localStorage.setItem('isGuest', 'true'); // 保存访客状态
        localStorage.removeItem('jwtToken'); // 清除可能存在的令牌
      }
    } catch (e) {
      console.error('访客登录失败:', e);
      alert('访客登录失败，请重试');
    } finally {
      setGuestLoggingIn(false); // 重置访客登录加载状态
    }
  };

  const updateUploadProgress = useCallback((filename: string, progress: number, status: 'uploading' | 'success' | 'error') => {
    setUploadProgress(prev => {
      const existingIndex = prev.findIndex(item => item.filename === filename);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { filename, progress, status };
        return updated;
      } else {
        return [...prev, { filename, progress, status }];
      }
    });
  }, []);

  const handleFolderUpload = async (filesToUpload: FileList) => {
    if (isGuest) {
      alert('访客模式下无法上传文件，请登录后操作');
      return;
    }

    setUploading(true);
    setUploadProgress([]);

    try {
      const token = localStorage.getItem('jwtToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 逐个上传文件
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        updateUploadProgress(file.name, 0, 'uploading');

        const form = new FormData();
        form.append('file', file);
        form.append('path', uploadPath);

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: form,
            headers
          });

          if (res.status === 401) {
            alert('认证已失效，请重新登录');
            setIsLoggedIn(false);
            setIsGuest(false);
            setPassword('');
            setUsername('');
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('isGuest');
            return;
          }

          if (res.status === 429) {
            updateUploadProgress(file.name, 0, 'error');
            alert('请求过于频繁，请稍后再试');
            continue;
          }

          if (res.status === 400) {
            updateUploadProgress(file.name, 0, 'error');
            const text = await res.text();
            console.error(`上传 ${file.name} 失败:`, text);
            continue;
          }

          if (res.ok) {
            updateUploadProgress(file.name, 100, 'success');
          } else {
            updateUploadProgress(file.name, 0, 'error');
            console.error(`上传 ${file.name} 失败`);
          }
        } catch (error) {
          updateUploadProgress(file.name, 0, 'error');
          console.error(`上传 ${file.name} 失败:`, error);
        }
      }

      // 重新加载媒体列表
      await loadMedia();
    } catch (error) {
      alert('上传过程中发生错误，请重试');
    } finally {
      setUploading(false);
      // 重置文件选择
      setFile(null);
      setFiles(null);
      setUploadPath('');
    }
  };

  const handleFileSelect = (selectedFile: File | null, selectedFiles: FileList | null) => {
    setFile(selectedFile);
    setFiles(selectedFiles);
  };

  const handleUpload = async (filesToUpload: FileList | null) => {
    // 访客模式下不能上传
    if (isGuest) {
      alert('访客模式下无法上传文件，请登录后操作');
      return;
    }
    
    // 如果有文件夹，则上传文件夹
    if (filesToUpload && filesToUpload.length > 0) {
      handleFolderUpload(filesToUpload);
      return;
    }
    
    // 否则如果有单个文件，则上传单个文件
    if (file) {
      setUploading(true);
      updateUploadProgress(file.name, 0, 'uploading');
      
      const form = new FormData();
      form.append('file', file);
      form.append('path', uploadPath);
      
      const token = localStorage.getItem('jwtToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: form,
          headers
        });
        
        if (res.status === 401) {
          updateUploadProgress(file.name, 0, 'error');
          alert('认证已失效，请重新登录');
          setIsLoggedIn(false);
          setIsGuest(false);
          setPassword('');
          setUsername('');
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('isGuest');
          return;
        }
        
        if (res.status === 429) {
          updateUploadProgress(file.name, 0, 'error');
          alert('请求过于频繁，请稍后再试');
          return;
        }
        
        // 处理存储空间不足或文件过大错误
        if (res.status === 400) {
          updateUploadProgress(file.name, 0, 'error');
          const text = await res.text();
          alert(text);
          return;
        }
        
        updateUploadProgress(file.name, 100, 'success');
        setFile(null);
        setUploadPath('');
        await loadMedia();
      } catch (error) {
        updateUploadProgress(file.name, 0, 'error');
        alert('上传失败，请重试');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDownload = (mediaItem: Media) => {
    const a = document.createElement('a');
    a.href = mediaItem.url;
    a.download = mediaItem.key.split('/').pop() || 
      (mediaItem.type === 'image' ? 'image.jpg' : 'video.mp4');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleBatchDownload = async () => {
    setDownloading(true);
    try {
      for (const mediaItem of media) {
        await new Promise(res => setTimeout(res, 200));
        handleDownload(mediaItem);
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async (mediaKey: string) => {
    // 访客模式下不能删除
    if (isGuest) {
      alert('访客模式下无法删除文件，请登录后操作');
      return;
    }
    
    if (!window.confirm('确定要删除这个文件吗？')) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('jwtToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/upload`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ key: mediaKey })
      });
      
      if (res.status === 401) {
        alert('认证已失效，请重新登录');
        setIsLoggedIn(false);
        setIsGuest(false);
        setPassword('');
        setUsername('');
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('isGuest');
        return;
      }
      
      if (res.status === 429) {
        alert('请求过于频繁，请稍后再试');
        return;
      }
      
      if (!res.ok) {
        throw new Error('删除失败');
      }
      
      setMedia(prev => prev.filter(m => m.key !== mediaKey));
      setSelectedMedia(prev => {
        const newSet = new Set(prev);
        newSet.delete(mediaKey);
        return newSet;
      });
      
      alert('删除成功');
    } catch (error) {
      alert('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const handleBatchDelete = async () => {
    // 访客模式下不能批量删除
    if (isGuest) {
      alert('访客模式下无法删除文件，请登录后操作');
      return;
    }
    
    if (selectedMedia.size === 0) {
      alert('请先选择要删除的文件');
      return;
    }
    
    if (!window.confirm(`确定要删除选中的 ${selectedMedia.size} 个文件吗？`)) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('jwtToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/upload`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ keys: Array.from(selectedMedia) })
      });
      
      if (res.status === 401) {
        alert('认证已失效，请重新登录');
        setIsLoggedIn(false);
        setIsGuest(false);
        setPassword('');
        setUsername('');
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('isGuest');
        return;
      }
      
      if (res.status === 429) {
        alert('请求过于频繁，请稍后再试');
        return;
      }
      
      if (!res.ok) {
        throw new Error('删除失败');
      }
      
      setMedia(prev => prev.filter(m => !selectedMedia.has(m.key)));
      setSelectedMedia(new Set());
      setIsSelectMode(false);
      
      alert('删除成功');
    } catch (error) {
      alert('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const toggleMediaSelection = (key: string) => {
    // 访客模式下不能选择文件
    if (isGuest) {
      alert('访客模式下无法选择文件，请登录后操作');
      return;
    }
    
    setSelectedMedia(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    // 访客模式下不能全选
    if (isGuest) {
      alert('访客模式下无法选择文件，请登录后操作');
      return;
    }
    
    if (selectedMedia.size === currentMedia.length) {
      setSelectedMedia(new Set());
    } else {
      setSelectedMedia(new Set(currentMedia.map(m => m.key)));
    }
  };

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // 登录页面渲染
  if (isLoading) {
    // 显示加载状态
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-cyan-400 via-emerald-300 to-teal-300">
        <FloatingElements />
        <div className="backdrop-blur-xl bg-white/60 border border-white/30 rounded-3xl shadow-2xl p-10 w-80 flex flex-col gap-6 relative z-10">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-400 drop-shadow">Flow Album</h2>
            <p className="text-gray-600 mb-6">正在加载...</p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn && !isGuest) {
    return (
      <LoginForm 
        onLogin={handleLogin}
        onGuestLogin={handleGuestLogin}
        loggingIn={loggingIn}
        guestLoggingIn={guestLoggingIn}
        isGuestDisabled={isGuestDisabled || isGuestGloballyDisabled}
      />
    );
  }

  const handleLogout = () => {
    // 退出登录逻辑
    setIsLoggedIn(false); // 设置登录状态为false
    setIsGuest(false); // 设置访客状态为false
    setPassword(''); // 清空密码
    setUsername(''); // 清空用户名
    localStorage.removeItem('jwtToken'); // 移除JWT令牌
    localStorage.removeItem('isGuest'); // 移除访客状态
  };

  // 主界面渲染
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-300 via-emerald-200 to-teal-300"
         style={getDynamicGradient()}>
      <FloatingElements />
      <Navbar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onLogout={handleLogout}
        isGuest={isGuest}
        isLoggedIn={isLoggedIn}
        isGuestDisabled={isGuestDisabled}
        isGuestGloballyDisabled={isGuestGloballyDisabled}
        onToggleGuestAccess={isLoggedIn ? toggleGuestAccess : undefined}
      />

      <div className="max-w-6xl mx-auto mb-6 px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard title="总媒体数" value={media.length} icon="📁" />
          <StatsCard title="图片数" value={media.filter(m => m.type === 'image').length} icon="📷" />
          <StatsCard title="视频数" value={media.filter(m => m.type === 'video').length} icon="🎬" />
          <StatsCard title="当前页" value={currentPage} icon="📄" />
          
          <div className="backdrop-blur-lg bg-white/50 border border-white/30 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">排序</span>
              <select 
                className="bg-white/80 border border-white/50 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value as 'newest' | 'oldest');
                  setCurrentPage(1);
                }}
              >
                <option value="newest">最新</option>
                <option value="oldest">最旧</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 仅在登录状态下显示上传功能 */}
      {!isGuest && (
        <UploadForm 
          uploadPath={uploadPath}
          onPathChange={setUploadPath}
          onFileSelect={handleFileSelect}
          onUpload={handleUpload}
          uploading={uploading}
          file={file}
          files={files}
          onBatchDownload={handleBatchDownload}
          downloading={downloading}
          mediaCount={media.length}
        />
      )}

      {/* 仅在登录状态下显示选择模式 */}
      {!isGuest && (
        <SelectionToolbar
          selectedCount={selectedMedia.size}
          isSelectMode={isSelectMode}
          onSelectModeChange={setIsSelectMode}
          onSelectAll={toggleSelectAll}
          onBatchDelete={handleBatchDelete}
          currentMediaCount={currentMedia.length}
          deleting={deleting}
        />
      )}

      <div className="max-w-7xl mx-auto columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-5 px-4">
        {currentMedia.map((mediaItem, idx) => (
          <MediaCard
            key={mediaItem.key}
            media={mediaItem}
            idx={idx}
            onPreview={() => setPreviewIdx(indexOfFirstMedia + idx)}
            onDownload={() => handleDownload(mediaItem)}
            selected={selectedMedia.has(mediaItem.key)}
            onSelect={() => toggleMediaSelection(mediaItem.key)}
            isSelectMode={isSelectMode}
            isGuest={isGuest} // 传递访客模式状态
          />
        ))}
      </div>

      {currentMedia.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="backdrop-blur-lg bg-white/50 border border-white/30 rounded-2xl p-12 inline-block">
            <div className="text-5xl mb-4">📁</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">没有找到媒体文件</h3>
            <p className="text-gray-500">
              {searchTerm ? '尝试使用其他关键词搜索' : '上传一些图片或视频开始使用吧'}
            </p>
          </div>
        </div>
      )}

      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={paginate}
      />

      {previewIdx !== null && (
        <MediaPreview
          media={filteredMedia}
          previewIdx={previewIdx}
          isGuest={isGuest}
          onClose={() => setPreviewIdx(null)}
          onPrev={() => setPreviewIdx(prev => prev !== null && prev > 0 ? prev - 1 : prev)}
          onNext={() => setPreviewIdx(prev => prev !== null && prev < filteredMedia.length - 1 ? prev + 1 : prev)}
          onDownload={handleDownload}
          onDelete={handleDelete}
        />
      )}

      {/* 上传进度悬浮框 */}
      {(uploading || uploadProgress.length > 0) && (
        <div className="fixed bottom-6 right-6 w-80 backdrop-blur-xl bg-white/90 border border-white/50 rounded-2xl shadow-2xl z-50">
          <div className="p-4 border-b border-white/30 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">上传进度</h3>
            <button 
              onClick={() => setUploadProgress([])}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {uploadProgress.map((item, index) => (
              <div key={index} className="p-3 border-b border-white/20 last:border-b-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700 truncate">{item.filename}</span>
                  {item.status === 'uploading' && (
                    <span className="text-xs text-blue-600">{item.progress}%</span>
                  )}
                  {item.status === 'success' && (
                    <span className="text-xs text-green-600">完成</span>
                  )}
                  {item.status === 'error' && (
                    <span className="text-xs text-red-600">失败</span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      item.status === 'uploading' ? 'bg-blue-500' : 
                      item.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="max-w-7xl mx-auto px-4 py-8 text-center text-white/80 text-sm">
        <p>© 2025 Flow Album - 私人云媒体库</p>
        {isGuest && (
          <p className="mt-2 text-xs">访客模式 - 仅可查看和下载</p>
        )}
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;