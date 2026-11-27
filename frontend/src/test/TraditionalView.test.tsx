import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TraditionalView from '../pages/tree/TraditionalView';

const panZoom = vi.hoisted(() => ({
  centerOn: vi.fn(),
  setView: vi.fn(),
  viewportRef: { current: null as HTMLDivElement | null },
}));

vi.mock('../hooks/useFamilyMembers', () => ({
  useFamilyMembers: () => ({
    members: [
      { id: 1, name: '祖先', gender: 'male', parent_id: null, family_rank: 1, sibling_rank: 1, generation: 1 },
      { id: 2, name: '父辈', gender: 'male', parent_id: 1, family_rank: 1, sibling_rank: 1, generation: 2 },
      { id: 3, name: '孙辈', gender: 'male', parent_id: 2, family_rank: 1, sibling_rank: 1, generation: 3 },
    ],
    loading: false,
    error: null,
    generationChars: [],
    refresh: vi.fn(),
  }),
}));

vi.mock('../hooks/useUserRole', () => ({
  useUserRole: () => ({ canEditContent: false }),
}));

vi.mock('../components/MemberPanel', () => ({
  default: ({ node }: { node: { name: string } }) => <div data-testid="member-panel">{node.name}</div>,
}));

vi.mock('../components/TreeExportMenu', () => ({ default: () => null }));

vi.mock('../pages/tree/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('../pages/tree/shared')>();
  return {
    ...actual,
    usePanZoom: () => ({
      view: { x: 0, y: 0, s: 1 },
      setView: panZoom.setView,
      viewportSize: { w: 1200, h: 900 },
      anim: false,
      dragging: false,
      viewportRef: panZoom.viewportRef,
      zoomAt: vi.fn(),
      centerOn: panZoom.centerOn,
      fit: vi.fn(),
      onMouseDown: vi.fn(),
    }),
  };
});

const renderView = () => render(
  <MemoryRouter initialEntries={['/graph?style=traditional']}>
    <TraditionalView user={null} />
  </MemoryRouter>,
);

describe('TraditionalView interactions', () => {
  it('collapses a branch without opening details', async () => {
    renderView();
    const fold = screen.getAllByTitle('折叠此代')[0];
    fold.focus();
    fireEvent.click(fold);

    await waitFor(() => expect(screen.getAllByRole('button', { name: /查看.*详情/ })).toHaveLength(1));
    expect(screen.queryByTestId('member-panel')).not.toBeInTheDocument();
  });

  it('expands the ancestor path and opens details when searching', async () => {
    renderView();
    fireEvent.click(screen.getAllByTitle('折叠此代')[0]);
    await waitFor(() => expect(screen.getAllByRole('button', { name: /查看.*详情/ })).toHaveLength(1));

    const input = screen.getByPlaceholderText('搜索姓名，回车定位');
    fireEvent.change(input, { target: { value: '孙辈' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(await screen.findByTestId('member-panel')).toHaveTextContent('孙辈');
    await waitFor(() => expect(screen.getAllByRole('button', { name: /查看.*详情/ })).toHaveLength(3));
  });
});
