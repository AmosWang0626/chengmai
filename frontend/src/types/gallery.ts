export interface GalleryImage {
  id: string;
  user_id: string | null;
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  tags: string[] | null;
  status: 'pending' | 'approved' | 'rejected' | 'hidden' | null;
  uploaded_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
}
