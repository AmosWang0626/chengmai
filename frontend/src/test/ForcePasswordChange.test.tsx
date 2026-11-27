import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import ForcePasswordChange from '../components/ForcePasswordChange';

vi.mock('../api/client', () => ({
  api: {
    changePassword: vi.fn(),
  },
}));

const changePassword = vi.mocked(api.changePassword);

function fillPasswordForm(current: string, next: string, confirmation: string) {
  fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: current } });
  fireEvent.change(screen.getByLabelText('新密码'), { target: { value: next } });
  fireEvent.change(screen.getByLabelText('确认新密码'), { target: { value: confirmation } });
}

describe('ForcePasswordChange', () => {
  beforeEach(() => {
    changePassword.mockReset();
  });

  it('rejects mismatched confirmation passwords without calling the API', async () => {
    render(<ForcePasswordChange username="editor" />);
    fillPasswordForm('initial-password', 'new-password', 'different-password');

    fireEvent.click(screen.getByRole('button', { name: '修改并继续' }));

    expect(await screen.findByText('两次输入的新密码不一致')).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('submits matching valid passwords', async () => {
    changePassword.mockResolvedValue({ ok: true });
    render(<ForcePasswordChange username="editor" />);
    fillPasswordForm('initial-password', 'new-password', 'new-password');

    fireEvent.click(screen.getByRole('button', { name: '修改并继续' }));

    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith('initial-password', 'new-password');
    });
    expect(screen.queryByText('两次输入的新密码不一致')).not.toBeInTheDocument();
  });
});
