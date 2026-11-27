import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

vi.mock('../api/client', () => ({
  api: {
    restoreSession: vi.fn().mockResolvedValue({
      id: 1,
      username: 'admin',
      role: 'admin',
      password_change_required: false,
    }),
  },
  onAuthChange: vi.fn(() => () => undefined),
}));

vi.mock('../hooks/FamilyDataProvider', () => ({
  FamilyDataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../pages/LoginPage', () => ({ default: () => <div>login page</div> }));
vi.mock('../pages/DashboardPage', () => ({ default: () => <div>dashboard page</div> }));
vi.mock('../pages/TreeGraphPage', () => ({ default: () => <div>graph page</div> }));
vi.mock('../pages/MemberList', () => ({ default: () => <div>members page</div> }));
vi.mock('../pages/MemberForm', () => ({ default: () => <div>member form page</div> }));
vi.mock('../pages/BatchMemberForm', () => ({ default: () => <div>batch add page</div> }));
vi.mock('../pages/BatchEditMemberForm', () => ({ default: () => <div>batch edit page</div> }));
vi.mock('../pages/AccountManagement', () => ({ default: () => <div>accounts page</div> }));
vi.mock('../pages/GenerationCharManagement', () => ({ default: () => <div>generation chars page</div> }));
vi.mock('../pages/Gallery', () => ({ default: () => <div>gallery page</div> }));

describe('canonical routes', () => {
  beforeEach(() => {
    window.location.hash = '/dashboard';
  });

  it('redirects the legacy tree page to the member tree tab', async () => {
    window.location.hash = '/tree';
    render(<App />);

    expect(await screen.findByText('members page')).toBeInTheDocument();
    expect(window.location.hash).toBe('#/members?view=tree');
  });

  it('redirects the legacy edit URL to the canonical member edit path', async () => {
    window.location.hash = '/members/edit/7';
    render(<App />);

    expect(await screen.findByText('member form page')).toBeInTheDocument();
    expect(window.location.hash).toBe('#/members/7/edit');
  });

  it('migrates the graph mode parameter while preserving other query state', async () => {
    window.location.hash = '/tree-canvas?mode=traditional&root=1&focus=2';
    render(<App />);

    expect(await screen.findByText('graph page')).toBeInTheDocument();
    const target = new URLSearchParams(window.location.hash.split('?')[1]);
    expect(target.get('style')).toBe('traditional');
    expect(target.get('root')).toBe('1');
    expect(target.get('focus')).toBe('2');
    expect(target.has('mode')).toBe(false);
  });

  it('keeps the legacy batch-edit link working through the shared batch route', async () => {
    window.location.hash = '/members/batch-edit';
    render(<App />);

    expect(await screen.findByText('batch edit page')).toBeInTheDocument();
    expect(window.location.hash).toBe('#/members/batch?action=edit');
  });
});
