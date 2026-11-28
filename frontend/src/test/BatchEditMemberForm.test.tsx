import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { FamilyMember, User } from '../types';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import BatchEditMemberForm from '../pages/BatchEditMemberForm';

vi.mock('../hooks/useFamilyMembers', () => ({ useFamilyMembers: vi.fn() }));

const user = { id: 1, role: 'admin' } as User;
const member = (id: number): FamilyMember => ({
  id,
  name: `成员${id}`,
  gender: 'male',
  generation: 2,
  birth_date: null,
} as FamilyMember);

describe('BatchEditMemberForm', () => {
  it('saves lunar birthdays for selected members', async () => {
    const updateMembersBatch = vi.fn().mockResolvedValue([]);
    vi.mocked(useFamilyMembers).mockReturnValue({
      members: [member(1), member(2)],
      generationChars: [{ id: 1, generation: 2, char: '德', hidden: false, created_at: null }],
      updateMembersBatch,
      getGenerationChar: vi.fn(() => '德'),
    } as unknown as ReturnType<typeof useFamilyMembers>);

    render(
      <MemoryRouter initialEntries={['/members/batch?action=edit']}>
        <Routes>
          <Route path="/members/batch" element={<BatchEditMemberForm user={user} />} />
          <Route path="/members" element={<div>成员列表</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '选择 成员1' }));
    const birthday = screen.getByLabelText('生日 成员1');
    fireEvent.change(birthday, { target: { value: '农历1900-01-01' } });
    fireEvent.blur(birthday);
    fireEvent.click(screen.getByRole('button', { name: /保存修改/ }));

    await waitFor(() => expect(updateMembersBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 1,
        birth_date: '1900-01-01',
        birth_calendar: 'lunar',
        birth_lunar_leap: 0,
      }),
    ]));
  });
});
