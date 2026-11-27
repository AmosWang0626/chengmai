import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { FamilyMember, User } from '../types';
import GenerationView from '../pages/GenerationView';

vi.mock('../hooks/useFamilyMembers', () => ({
  useFamilyMembers: () => ({
    members: [
      { id: 1, name: '祖父', parent_id: null, generation: 1, generation_char: '德', gender: 'male' },
      { id: 2, name: '父亲', parent_id: 1, generation: 2, generation_char: '永', gender: 'male' },
      { id: 3, name: '儿子', parent_id: 2, generation: 3, generation_char: '昌', gender: 'male' },
    ] as FamilyMember[],
    loading: false,
    error: '',
    refresh: vi.fn(),
  }),
}));

describe('GenerationView', () => {
  it('shows each member only in their own generation group', async () => {
    render(
      <MemoryRouter>
        <GenerationView user={{ id: 1, role: 'admin' } as User} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('儿子')).toBeInTheDocument());
    expect(screen.getAllByText('祖父')).toHaveLength(1);
    expect(screen.getAllByText('父亲')).toHaveLength(1);
    expect(screen.getAllByText('儿子')).toHaveLength(1);
  });
});
