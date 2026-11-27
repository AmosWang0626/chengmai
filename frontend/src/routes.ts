export const ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
  graph: '/graph',
  members: '/members',
  memberNew: '/members/new',
  memberEdit: '/members/:id/edit',
  memberBatch: '/members/batch',
  gallery: '/gallery',
  generationChars: '/generation-chars',
  accounts: '/accounts',
} as const;

export const memberEditPath = (id: number) => `/members/${id}/edit`;
