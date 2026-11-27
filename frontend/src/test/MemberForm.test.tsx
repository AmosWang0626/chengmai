import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FamilyMember, User } from '../types';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import MemberForm from '../pages/MemberForm';

vi.mock('../hooks/useFamilyMembers', () => ({ useFamilyMembers: vi.fn() }));

const user = { id: 1, role: 'admin' } as User;
const member = (id: number, generation: number): FamilyMember => ({
  id,
  name: `成员${id}`,
  generation,
  gender: 'male',
} as FamilyMember);

const mockMembers = (members: FamilyMember[]) => {
  vi.mocked(useFamilyMembers).mockReturnValue({
    members,
    generationChars: [],
    addMember: vi.fn(),
    updateMember: vi.fn(),
    getGenerationChar: vi.fn(() => ''),
  } as unknown as ReturnType<typeof useFamilyMembers>);
};

const renderForm = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/members/new" element={<MemberForm user={user} />} />
      <Route path="/members/:id/edit" element={<MemberForm user={user} />} />
    </Routes>
  </MemoryRouter>,
);

describe('MemberForm', () => {
  beforeEach(() => {
    mockMembers([]);
  });

  it('defaults new members to the highest existing generation', () => {
    mockMembers([member(1, 1), member(2, 4)]);
    renderForm('/members/new');

    expect(screen.getAllByRole('combobox')[1]).toHaveValue('4');
  });

  it('does not overwrite unsaved edits when shared member data refreshes', () => {
    mockMembers([member(7, 2)]);
    const { rerender } = renderForm('/members/7/edit');
    const name = screen.getByPlaceholderText('请输入姓名');
    fireEvent.change(name, { target: { value: '未保存的姓名' } });

    mockMembers([{ ...member(7, 2), name: '服务端刷新后的姓名' }]);
    rerender(
      <MemoryRouter initialEntries={['/members/7/edit']}>
        <Routes>
          <Route path="/members/new" element={<MemberForm user={user} />} />
          <Route path="/members/:id/edit" element={<MemberForm user={user} />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText('请输入姓名')).toHaveValue('未保存的姓名');
  });
});
