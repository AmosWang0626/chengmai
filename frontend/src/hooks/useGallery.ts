import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { GalleryImage } from '../types/gallery';

export function useGallery(userId: number | undefined) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getGallery();
      setImages(data || []);

      const tags = new Set<string>();
      data?.forEach((img: GalleryImage) => {
        img.tags?.forEach(tag => tags.add(tag));
      });
      setAllTags(Array.from(tags).sort());
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取图片失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const uploadImage = async (formData: FormData) => {
    await api.uploadGalleryImage(formData);
    await fetchImages();
  };

  const updateImageStatus = async (id: number, status: GalleryImage['status']) => {
    await api.updateGalleryStatus(id, status);
    await fetchImages();
  };

  const deleteImage = async (id: number) => {
    await api.deleteGalleryImage(id);
    await fetchImages();
  };

  const updateImage = async (id: number, data: Partial<GalleryImage>) => {
    await api.updateGalleryImage(id, data);
    await fetchImages();
  };

  return {
    images,
    loading,
    error,
    allTags,
    refresh: fetchImages,
    uploadImage,
    updateImageStatus,
    deleteImage,
    updateImage,
  };
}