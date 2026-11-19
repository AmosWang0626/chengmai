import React, { useState, useMemo, useRef } from 'react';
import { User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Upload, Image as ImageIcon, Trash2, Eye, EyeOff,
  CheckCircle, AlertCircle, Tag, Filter, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import Layout from '../components/Layout';
import { useGallery } from '../hooks/useGallery';
import { assetUrl } from '../api/client';
import { useUserRole } from '../hooks/useUserRole';
import { GalleryImage } from '../types/gallery';

async function resizeImage(file: File, maxWidth: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.onerror = reject;
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface GalleryProps {
  user: User | null;
}

export default function Gallery({ user }: GalleryProps) {
  const { images, loading, error, allTags, refresh, uploadImage, updateImageStatus, deleteImage, updateImage } = useGallery(user?.id);
  const { isAdmin } = useUserRole(user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    tags: '',
    file: null as File | null,
    preview: '',
  });
  const [uploading, setUploading] = useState(false);

  const filteredImages = useMemo(() => {
    return images.filter(img => {
      const matchesTag = selectedTag ? img.tags?.includes(selectedTag) : true;
      const matchesSearch = searchTerm
        ? (img.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           img.description?.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      const matchesStatus = statusFilter ? img.status === statusFilter : true;
      return matchesTag && matchesSearch && matchesStatus;
    });
  }, [images, selectedTag, searchTerm, statusFilter]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        file,
        preview: URL.createObjectURL(file),
      }));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !user) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);

      const thumbBase64 = await resizeImage(uploadForm.file, 400);
      const thumbBlob = await (await fetch(`data:image/jpeg;base64,${thumbBase64}`)).blob();
      formData.append('thumbnail', thumbBlob, 'thumb.jpg');

      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('tags', JSON.stringify(
        uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      ));

      await uploadImage(formData);

      setShowUploadModal(false);
      setUploadForm({ title: '', description: '', tags: '', file: null, preview: '' });
    } catch (err) {
      console.error('上传失败:', err);
      alert(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝',
      hidden: '已隐藏',
    };
    return labels[status || ''] || status;
  };

  const getStatusColor = (status: string | null) => {
    const colors: Record<string, string> = {
      pending: 'bg-gilt-100 text-gilt-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      hidden: 'bg-slate-100 text-slate-600',
    };
    return colors[status || ''] || 'bg-slate-100 text-slate-600';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  return (
    <Layout user={user} title="家族图册">
      <div className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900">家族图册</h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">记录家族珍贵瞬间</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              筛选
            </button>
            {user && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-cinnabar-600 text-paper-card rounded-xl hover:bg-cinnabar-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                上传图片
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="ui-card p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="搜索标题或描述"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cinnabar-100 outline-none"
                  />
                </div>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="ui-input"
                >
                  <option value="">全部标签</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                {isAdmin && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="ui-input"
                  >
                    <option value="">全部状态</option>
                    <option value="pending">待审核</option>
                    <option value="approved">已通过</option>
                    <option value="rejected">已拒绝</option>
                    <option value="hidden">已隐藏</option>
                  </select>
                )}
              </div>
              {selectedTag && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">已选标签:</span>
                  <span className="px-1.5 py-px bg-cinnabar-50 text-cinnabar-700 rounded text-[11px]">
                    {selectedTag}
                  </span>
                  <button
                    onClick={() => setSelectedTag('')}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="text-center py-12 text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cinnabar-600 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : filteredImages.length === 0 ? (
          <div className="text-center py-12 text-slate-500 ui-card">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>暂无图片</p>
            {user && <p className="text-sm mt-1">点击上方"上传图片"按钮添加</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredImages.map((image) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer"
                onClick={() => setSelectedImage(image)}
              >
                <img
                  src={assetUrl(image.thumbnail_url || image.url)}
                  alt={image.title || '图片'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                {image.status !== 'approved' && (
                  <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[11px] font-medium ${getStatusColor(image.status)}`}>
                    {getStatusLabel(image.status)}
                  </div>
                )}
                {image.tags && image.tags.length > 0 && (
                  <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                    {image.tags.slice(0, 2).map((tag, idx) => (
                      <span key={idx} className="px-1.5 py-px bg-black/50 text-paper-card text-xs rounded">
                        {tag}
                      </span>
                    ))}
                    {image.tags.length > 2 && (
                      <span className="px-1.5 py-px bg-black/50 text-paper-card text-xs rounded">
                        +{image.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showUploadModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowUploadModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-paper-card rounded-xl shadow-lift w-full max-w-md overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Upload className="w-6 h-6 text-cinnabar-600" />
                    上传图片
                  </h2>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpload} className="p-4 space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-cinnabar-300 transition-colors"
                  >
                    {uploadForm.preview ? (
                      <img
                        src={uploadForm.preview}
                        alt="预览"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                    ) : (
                      <>
                        <ImageIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">点击选择图片</p>
                        <p className="text-xs text-slate-400 mt-1">支持 JPG、PNG 格式</p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  <div>
                    <label className="ui-label">标题</label>
                    <input
                      type="text"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                      className="ui-input"
                      placeholder="输入图片标题（可选）"
                    />
                  </div>

                  <div>
                    <label className="ui-label">描述</label>
                    <textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                      className="ui-input h-auto py-2 resize-none"
                      rows={3}
                      placeholder="输入图片描述（可选）"
                    />
                  </div>

                  <div>
                    <label className="ui-label">
                      <Tag className="w-4 h-4 inline mr-1" />
                      标签
                    </label>
                    <input
                      type="text"
                      value={uploadForm.tags}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                      className="ui-input"
                      placeholder="用逗号分隔多个标签，如：聚会,春节,2024"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="ui-btn-outline flex-1 h-9"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={!uploadForm.file || uploading}
                      className="ui-btn-primary flex-1 h-9"
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          上传中...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          确认上传
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedImage(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-paper-card rounded-xl shadow-lift w-full max-w-4xl max-h-[90vh] overflow-hidden"
              >
                <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                  <div className="flex-1 bg-black flex items-center justify-center p-4">
                    <img
                      src={assetUrl(selectedImage.url)}
                      alt={selectedImage.title || '图片'}
                      className="max-w-full max-h-[60vh] md:max-h-[80vh] object-contain"
                    />
                  </div>
                  <div className="w-full md:w-80 p-4 border-l border-slate-200 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg text-slate-800">图片详情</h3>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4 flex-1 overflow-auto">
                      <div>
                        <label className="text-sm text-slate-500">标题</label>
                        <p className="font-medium text-slate-800">{selectedImage.title || '-'}</p>
                      </div>

                      <div>
                        <label className="text-sm text-slate-500">描述</label>
                        <p className="text-slate-700">{selectedImage.description || '-'}</p>
                      </div>

                      <div>
                        <label className="text-sm text-slate-500">标签</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedImage.tags?.map((tag, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSelectedTag(tag);
                                setSelectedImage(null);
                              }}
                              className="px-1.5 py-px bg-cinnabar-50 text-cinnabar-700 rounded text-[11px] hover:bg-violet-200 transition-colors"
                            >
                              {tag}
                            </button>
                          )) || '-'}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-slate-500">状态</label>
                        <span className={`ml-2 px-2 py-0.5 rounded text-[11px] font-medium ${getStatusColor(selectedImage.status)}`}>
                          {getStatusLabel(selectedImage.status)}
                        </span>
                      </div>

                      <div>
                        <label className="text-sm text-slate-500">上传时间</label>
                        <p className="text-slate-700">{formatDate(selectedImage.uploaded_at)}</p>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="pt-4 border-t border-slate-200 space-y-2">
                        <p className="text-sm font-medium text-slate-700">管理操作</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedImage.status !== 'approved' && (
                            <button
                              onClick={() => {
                                updateImageStatus(selectedImage.id, 'approved');
                                setSelectedImage(null);
                              }}
                              className="flex items-center gap-1 px-3 py-2 bg-green-600 text-paper-card rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                              <CheckCircle className="w-4 h-4" />
                              通过
                            </button>
                          )}
                          {selectedImage.status !== 'rejected' && (
                            <button
                              onClick={() => {
                                updateImageStatus(selectedImage.id, 'rejected');
                                setSelectedImage(null);
                              }}
                              className="flex items-center gap-1 px-3 py-2 bg-red-600 text-paper-card rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                              <AlertCircle className="w-4 h-4" />
                              拒绝
                            </button>
                          )}
                          {selectedImage.status !== 'hidden' && (
                            <button
                              onClick={() => {
                                updateImageStatus(selectedImage.id, 'hidden');
                                setSelectedImage(null);
                              }}
                              className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-paper-card rounded-lg hover:bg-gray-700 transition-colors text-sm"
                            >
                              <EyeOff className="w-4 h-4" />
                              隐藏
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm('确定要删除这张图片吗？')) {
                                deleteImage(selectedImage.id);
                                setSelectedImage(null);
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            删除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
