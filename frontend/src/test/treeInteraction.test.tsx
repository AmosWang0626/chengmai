import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { FamilyMember } from '../types';
import SiblingOrderControl from '../components/SiblingOrderControl';
import SiblingOrderDialog from '../components/SiblingOrderDialog';
import { intersectsViewport, viewportBounds } from '../pages/tree/shared';
import { useTreeUrlState } from '../pages/tree/urlState';

const member = (id: number, parentId: number | null, familyRank: number): FamilyMember => ({
  id,
  name: `成员${id}`,
  gender: id % 2 ? 'male' : 'female',
  parent_id: parentId,
  family_rank: familyRank,
  sibling_rank: familyRank,
  generation: 2,
  generation_char: null,
  spouse_name: null,
} as FamilyMember);

describe('SiblingOrderControl', () => {
  it('submits the complete generation group across different parents', async () => {
    const onReorder = vi.fn().mockResolvedValue([]);
    const otherGeneration = { ...member(5, null, 1), generation: 3 };
    render(<SiblingOrderControl generation={2} onReorder={onReorder} members={[
      member(3, 11, 3), member(1, null, 1), member(2, 10, 2), member(4, 10, 4), otherGeneration,
    ]} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: '上移 成员4' }));

    await waitFor(() => expect(onReorder).toHaveBeenCalledWith(2, [1, 2, 4, 3]));
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual([
      '1. 成员1', '2. 成员2', '3. 成员4', '4. 成员3',
    ]);
  });

  it('restores the previous order and shows an error when saving fails', async () => {
    const onReorder = vi.fn().mockRejectedValue(new Error('排序保存失败'));
    render(<SiblingOrderControl generation={2} onReorder={onReorder} members={[
      member(1, 10, 1), member(2, 10, 2),
    ]} />);

    fireEvent.click(screen.getByRole('button', { name: '下移 成员1' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('排序保存失败');
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual([
      '1. 成员1', '2. 成员2',
    ]);
  });

  it('supports drag and drop reordering', async () => {
    const onReorder = vi.fn().mockResolvedValue([]);
    render(<SiblingOrderControl generation={2} onReorder={onReorder} members={[
      member(1, 10, 1), member(2, 11, 2), member(3, 10, 3),
    ]} />);
    const items = screen.getAllByRole('listitem');

    fireEvent.dragStart(items[0]);
    fireEvent.dragOver(items[2]);
    fireEvent.drop(items[2]);

    await waitFor(() => expect(onReorder).toHaveBeenCalledWith(2, [2, 3, 1]));
  });

  it('hides controls for groups with fewer than two siblings', () => {
    render(<SiblingOrderControl generation={2} onReorder={vi.fn()} members={[member(1, 10, 1)]} />);
    expect(screen.queryByRole('heading', { name: '同辈排序' })).not.toBeInTheDocument();
  });
  it('groups dialog options by generation instead of parent', () => {
    render(<SiblingOrderDialog open onClose={vi.fn()} onReorder={vi.fn()} members={[
      member(1, 10, 1), member(2, 11, 2), { ...member(3, 10, 1), generation: 3 },
    ]} />);

    expect(screen.getByRole('option', { name: '第2世（2 人）' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /第3世/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('tree URL state', () => {
  it('removes stale root and focus parameters when their state is cleared', async () => {
    const Location = () => {
      const location = useLocation();
      const [selection, setSelection] = useState({ rootId: 1 as number | null, focusId: 2 as number | null });
      useTreeUrlState({ ...selection, collapsed: new Set<number>(), term: '' });
      return <>
        <output data-testid="search">{location.search}</output>
        <button onClick={() => setSelection({ rootId: null, focusId: null })}>清空状态</button>
      </>;
    };
    render(<MemoryRouter initialEntries={['/tree?root=1&focus=2']}><Location /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: '清空状态' }));

    await waitFor(() => expect(screen.getByTestId('search')).toBeEmptyDOMElement());
    expect(screen.getByTestId('search').textContent).not.toContain('root=');
    expect(screen.getByTestId('search').textContent).not.toContain('focus=');
  });
});

describe('tree viewport culling', () => {
  const view = { x: -100, y: -50, s: 2 };
  const size = { w: 800, h: 600 };

  it('maps the visible screen area back to world coordinates', () => {
    expect(viewportBounds(view, size, 20)).toEqual({
      left: 40, top: 15, right: 460, bottom: 335,
    });
  });

  it('keeps intersecting boxes and excludes distant boxes', () => {
    const bounds = viewportBounds(view, size);
    expect(intersectsViewport({ left: 50, top: 20, right: 120, bottom: 80 }, bounds)).toBe(true);
    expect(intersectsViewport({ left: 50, top: 400, right: 120, bottom: 480 }, bounds)).toBe(false);
    expect(intersectsViewport({ left: 600, top: 20, right: 680, bottom: 80 }, bounds)).toBe(false);
  });
});
