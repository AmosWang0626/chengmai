import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '../types';
import MemberList from '../pages/MemberList';

vi.mock('../hooks/useFamilyMembers', () => ({
  useFamilyMembers: () => ({
    members: [],
    generationChars: [],
    loading: false,
    error: '',
    deleteMember: vi.fn(),
    refresh: vi.fn(),
    reorderMembers: vi.fn(),
  }),
}));

vi.mock('../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../components/BatchChildrenModal', () => ({ default: () => null }));
vi.mock('../components/SiblingOrderDialog', () => ({ default: () => null }));
vi.mock('../pages/MemberTreeView', () => ({ default: () => <div>tree view</div> }));
vi.mock('../pages/GenerationView', () => ({ default: () => <div>generation view</div> }));

const Location = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
};

describe('member view tabs', () => {
  it('switches between canonical query-driven views', () => {
    render(
      <MemoryRouter initialEntries={['/members?view=tree']}>
        <Routes><Route path="/members" element={<MemberList user={{ id: 1, role: 'admin' } as User} />} /></Routes>
        <Location />
      </MemoryRouter>,
    );

    expect(screen.getByRole('tab', { name: '世系' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('tree view')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '世代' }));

    expect(screen.getByText('generation view')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '世代' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('location')).toHaveTextContent('/members?view=generations');

    fireEvent.click(screen.getByRole('tab', { name: '表格' }));

    expect(screen.getByRole('tab', { name: '表格' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('location')).toHaveTextContent('/members');
  });
});
