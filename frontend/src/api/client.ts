import type { FamilyMember, GenerationChar, User } from '../types';
import type { GalleryImage } from '../types/gallery';

declare global {
  interface Window {
    APP_CONFIG?: { apiBase?: string };
  }
}

export const API_BASE = (window.APP_CONFIG?.apiBase || '').replace(/\/+$/, '');

export function assetUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return url;
  return API_BASE + url;
}

const TOKEN_KEY = 'fm_token';

type AuthListener = (user: User | null) => void;
const listeners = new Set<AuthListener>();
let currentUser: User | null = null;

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function onAuthChange(cb: AuthListener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function notify() {
  listeners.forEach(cb => cb(currentUser));
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  formData?: FormData;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE}${path}`, { method: options.method || 'GET', headers, body });

  if (res.status === 401 && path !== '/api/auth/login') {
    localStorage.removeItem(TOKEN_KEY);
    currentUser = null;
    notify();
    throw new Error('登录已过期，请重新登录');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || `请求失败 (${res.status})`);
  }
  return data as T;
}

async function requestBlob(path: string): Promise<Blob> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    currentUser = null;
    notify();
    throw new Error('登录已过期，请重新登录');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error((data && data.error) || `请求失败 (${res.status})`);
  }
  return res.blob();
}

export const api = {
  async login(username: string, password: string): Promise<User> {
    const data = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    currentUser = data.user;
    notify();
    return data.user;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    currentUser = null;
    notify();
  },

  async restoreSession(): Promise<User | null> {
    if (!getToken()) return null;
    try {
      const data = await request<{ user: User }>('/api/auth/me');
      currentUser = data.user;
      notify();
      return currentUser;
    } catch {
      api.logout();
      return null;
    }
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const result = await request<{ ok: boolean }>('/api/auth/password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    });
    if (currentUser) {
      currentUser = { ...currentUser, password_change_required: false };
      notify();
    }
    return result;
  },

  getMembers() {
    return request<FamilyMember[]>('/api/members');
  },
  createMember(data: Partial<FamilyMember>) {
    return request<FamilyMember>('/api/members', { method: 'POST', body: data });
  },
  createMembersBatch(data: Partial<FamilyMember>[]) {
    return request<FamilyMember[]>('/api/members/batch', { method: 'POST', body: data });
  },
  updateMember(id: number, data: Partial<FamilyMember>) {
    return request<FamilyMember>(`/api/members/${id}`, { method: 'PUT', body: data });
  },
  deleteMember(id: number) {
    return request<{ ok: boolean }>(`/api/members/${id}`, { method: 'DELETE' });
  },

  getGenerationChars() {
    return request<GenerationChar[]>('/api/generation-chars');
  },
  createGenerationChar(data: { generation: number; char: string; hidden?: boolean }) {
    return request<GenerationChar>('/api/generation-chars', { method: 'POST', body: data });
  },
  updateGenerationChar(id: number, data: { generation?: number; char?: string; hidden?: boolean }) {
    return request<GenerationChar>(`/api/generation-chars/${id}`, { method: 'PUT', body: data });
  },
  deleteGenerationChar(id: number) {
    return request<{ ok: boolean }>(`/api/generation-chars/${id}`, { method: 'DELETE' });
  },

  getGallery() {
    return request<GalleryImage[]>('/api/gallery');
  },
  getGalleryImage(path: string) {
    return requestBlob(`/api/gallery/file?path=${encodeURIComponent(path)}`);
  },
  uploadGalleryImage(formData: FormData) {
    return request<GalleryImage>('/api/gallery', { method: 'POST', formData });
  },
  updateGalleryStatus(id: number, status: GalleryImage['status']) {
    return request<GalleryImage>(`/api/gallery/${id}/status`, { method: 'PATCH', body: { status } });
  },
  updateGalleryImage(id: number, data: Partial<GalleryImage>) {
    return request<GalleryImage>(`/api/gallery/${id}`, { method: 'PUT', body: data });
  },
  deleteGalleryImage(id: number) {
    return request<{ ok: boolean }>(`/api/gallery/${id}`, { method: 'DELETE' });
  },

  getUsers() {
    return request<User[]>('/api/users');
  },
  createUser(username: string, password: string, role: string) {
    return request<User>('/api/users', { method: 'POST', body: { username, password, role } });
  },
  updateUserRole(id: number, role: string) {
    return request<User>(`/api/users/${id}/role`, { method: 'PUT', body: { role } });
  },
  deleteUser(id: number) {
    return request<{ ok: boolean }>(`/api/users/${id}`, { method: 'DELETE' });
  },
};