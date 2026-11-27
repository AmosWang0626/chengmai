import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import ProtectedImage from '../components/ProtectedImage';

vi.mock('../api/client', () => ({
  api: {
    getGalleryImage: vi.fn(),
  },
}));

const getGalleryImage = vi.mocked(api.getGalleryImage);

describe('ProtectedImage', () => {
  beforeEach(() => {
    getGalleryImage.mockReset();
  });

  it('loads protected images through the authenticated API and displays the Blob', async () => {
    const blob = new Blob(['image-data'], { type: 'image/png' });
    getGalleryImage.mockResolvedValue(blob);
    vi.mocked(URL.createObjectURL).mockReturnValue('blob:protected-image');

    const { unmount } = render(
      <ProtectedImage src="gallery/private.png" alt="家族合影" className="gallery-image" />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(getGalleryImage).toHaveBeenCalledWith('gallery/private.png');

    const image = await screen.findByRole('img', { name: '家族合影' });
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(image).toHaveAttribute('src', 'blob:protected-image');
    expect(image).toHaveClass('gallery-image');

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:protected-image');
  });

  it('shows the fallback state when authenticated Blob loading fails', async () => {
    getGalleryImage.mockRejectedValue(new Error('登录已过期，请重新登录'));

    render(<ProtectedImage src="gallery/missing.png" alt="缺失的老照片" />);

    const fallback = await screen.findByRole('img', { name: '缺失的老照片' });
    expect(fallback).toHaveTextContent('缺失的老照片');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('does not request already-public image URLs through the authenticated API', async () => {
    render(<ProtectedImage src="https://example.com/photo.jpg" alt="公开照片" />);

    expect(await screen.findByRole('img', { name: '公开照片' })).toHaveAttribute(
      'src',
      'https://example.com/photo.jpg',
    );
    expect(getGalleryImage).not.toHaveBeenCalled();
  });
});
