import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FamilyMember, GenerationChar } from '../types';
import {
  buildTreeJson,
  buildTreeSvg,
  exportTree,
  selectTreeMembers,
} from '../pages/tree/treeExport';
import type { TreeExportOptions } from '../pages/tree/treeExport';

const member = (id: number, name: string, parent_id: number | null, generation = 1): FamilyMember => ({
  id,
  user_id: null,
  name,
  gender: id % 2 === 0 ? 'female' : 'male',
  birth_date: '1900-01-01',
  death_date: null,
  phone: null,
  email: null,
  address: null,
  occupation: null,
  education: null,
  bio: null,
  notes: null,
  avatar_url: `https://example.invalid/avatar-${id}.png`,
  parent_id,
  spouse_name: null,
  spouse_origin: null,
  spouse_birth_date: null,
  spouse_death_date: null,
  generation,
  generation_char: null,
  sibling_rank: id,
  family_rank: id,
  created_at: null,
  updated_at: null,
});

const members: FamilyMember[] = [
  member(1, '始祖', null, 1),
  member(2, '长子', 1, 2),
  member(3, '长孙', 2, 3),
  member(4, '次子', 1, 2),
  member(5, '另一支始祖', null, 1),
  member(6, '另一支后代', 5, 2),
];

const generationChars: GenerationChar[] = [
  { id: 1, generation: 1, char: '元', hidden: false, created_at: null },
  { id: 2, generation: 2, char: '德', hidden: false, created_at: null },
  { id: 3, generation: 3, char: '昌', hidden: false, created_at: null },
];

const options = (overrides: Partial<TreeExportOptions> = {}): TreeExportOptions => ({
  mode: 'traditional',
  members,
  generationChars,
  rootMemberId: null,
  collapsedIds: new Set(),
  includeCollapsed: false,
  showSpouse: true,
  showNotes: true,
  title: '测试家谱',
  ...overrides,
});

const ids = (selected: FamilyMember[]) => selected.map(item => item.id);
const parseSvg = (svg: string) => {
  const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
  expect(parsed.querySelector('parsererror')).toBeNull();
  return parsed;
};

beforeEach(() => {
  vi.mocked(URL.createObjectURL).mockReset();
  vi.mocked(URL.revokeObjectURL).mockReset();
});

describe('selectTreeMembers', () => {
  it('selects only the requested root branch and its descendants', () => {
    expect(ids(selectTreeMembers(options({ rootMemberId: 2 })))).toEqual([2, 3]);
  });

  it('keeps a collapsed member but excludes its descendants', () => {
    expect(ids(selectTreeMembers(options({ rootMemberId: 1, collapsedIds: new Set([1]) })))).toEqual([1]);
    expect(ids(selectTreeMembers(options({ collapsedIds: new Set([2]) })))).toEqual([1, 2, 4, 5, 6]);
  });

  it('includes collapsed descendants when includeCollapsed is enabled', () => {
    expect(ids(selectTreeMembers(options({
      rootMemberId: 1,
      collapsedIds: new Set([1, 2]),
      includeCollapsed: true,
    })))).toEqual([1, 2, 3, 4]);
  });

  it('rejects empty input and a missing root', () => {
    expect(() => selectTreeMembers(options({ members: [] }))).toThrow('没有可导出的家谱成员');
    expect(() => selectTreeMembers(options({ rootMemberId: 999 }))).toThrow('找不到作为导出根的成员');
  });
});

describe('buildTreeSvg', () => {
  it('escapes XML in titles, names, generation characters, spouse data and notes', () => {
    const dangerousName = '张<三 & 李> "四" \'五\'';
    const dangerousTitle = '<家谱 & "谱" \'甲\'>';
    const dangerousNotes = '<私密 & "事">';
    const data = [
      {
        ...member(1, dangerousName, null, 1),
        spouse_name: '王&妻',
        spouse_origin: '<籍贯>',
        notes: dangerousNotes,
      },
      member(2, '子', 1, 2),
    ];
    const result = buildTreeSvg(options({ members: data, title: dangerousTitle }));

    expect(result.svg).not.toContain('<家谱');
    expect(result.svg).not.toContain('张<三');
    expect(result.svg).toContain('&lt;家谱 &amp; &quot;谱&quot; &apos;甲&apos;&gt;');
    expect(result.svg).toContain('张&lt;三 &amp; 李&gt; &quot;四&quot; &apos;五&apos;');
    expect(result.svg).toContain('王&amp;妻');
    expect(result.svg).toContain('&lt;私密 &amp; &quot;事&quot;&gt;');

    const svg = parseSvg(result.svg);
    expect(svg.documentElement.localName).toBe('svg');
    expect(svg.querySelector('title')?.textContent).toBe(dangerousName);
    expect(svg.querySelector('rect[data-tree-background]')?.getAttribute('fill')).toBe('#F7F1E3');
    expect(svg.documentElement.getAttribute('viewBox')).toBe(`0 0 ${result.width} ${result.height}`);
  });

  it('is self-contained and never references avatars or other external images', () => {
    const result = buildTreeSvg(options());
    expect(result.svg).not.toContain('example.invalid');
    expect(result.svg).not.toContain('<image');
    expect(result.svg).not.toMatch(/\bhref\s*=/i);
    expect(result.svg).not.toMatch(/url\s*\(/i);
    expect(result.body).toContain('<style>');
    expect(result.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('builds a traditional tree with member/spouse cards, hanging lines and generation characters', () => {
    const data = [{ ...members[0], spouse_name: '始祖配偶' }, ...members.slice(1)];
    const result = buildTreeSvg(options({ members: data, rootMemberId: 1 }));
    expect(result.body).toContain('data-traditional-cards="true"');
    expect(result.body).toContain('data-traditional-lines="true"');
    expect(result.body).toContain('data-member-id="1"');
    expect(result.body).toContain('data-spouse-id="1"');
    expect(result.body).toContain('data-generation-char="2"');
    expect(result.body).toContain('>德</text>');
    expect(result.body).toMatch(/<path d="M [^"]+" fill="none" stroke="#625E53"/);
    expect(result.body).toContain('transform="translate(0 108)"');
    expect(result.body).not.toContain('data-member-id="5"');
  });

  it('honors showSpouse and showNotes in traditional output', () => {
    const data = [{ ...members[0], notes: '只在校注开启时显示', spouse_name: '配偶' }, members[1]];
    const shown = buildTreeSvg(options({ members: data }));
    const hidden = buildTreeSvg(options({ members: data, showSpouse: false, showNotes: false }));
    expect(shown.body).toContain('data-spouse-id="1"');
    expect(shown.body).toContain('只在校注开启时显示');
    expect(hidden.body).not.toContain('data-spouse-id=');
    expect(hidden.body).not.toContain('只在校注开启时显示');
  });

  it('lays out collapsed descendants when includeCollapsed is enabled', () => {
    const result = buildTreeSvg(options({
      rootMemberId: 1,
      collapsedIds: new Set([1, 2]),
      includeCollapsed: true,
    }));
    expect(result.body).toContain('data-member-id="3"');
    expect(result.body).toContain('data-member-id="4"');
    expect(result.body).not.toContain('+2</text>');
  });

  it('builds a fan tree with a root centre, member arcs, spouse rings, labels and leader lines', () => {
    const longName = '一位名字非常非常长需要放到扇形图外部引线标注的家族成员';
    const data = [
      { ...member(1, '始祖', null, 1), spouse_name: '始祖配偶' },
      { ...member(2, longName, 1, 2), notes: '长孙备注' },
      member(4, '次子', 1, 2),
    ];
    const result = buildTreeSvg(options({ mode: 'fan', members: data, rootMemberId: 1 }));
    expect(result.height).toBeGreaterThan(result.width);
    expect(result.body).toContain('data-fan-root="true"');
    expect(result.body).toContain('data-fan-member="2"');
    expect(result.body).toContain('data-fan-spouse-ring="1"');
    expect(result.body).toContain('data-fan-generation="1"');
    expect(result.body).toContain('第1世 · 元');
    expect(result.body).toContain('data-fan-leader="true"');
    expect(result.body).toContain('data-fan-external-label="member-2"');
    expect(result.body).toContain('>始祖</text>');
    const externalLabel = parseSvg(result.svg).querySelector('[data-fan-external-label="member-2"] text');
    expect(externalLabel?.textContent).toContain(`${longName} · 德`);
    expect(externalLabel?.textContent).not.toContain('…');
    expect(externalLabel?.querySelectorAll('tspan').length).toBeGreaterThan(1);
    expect(result.body).not.toContain('example.invalid');
    parseSvg(result.svg);
  });

  it('shrinks labels so narrow fan sectors still show member names', () => {
    const children = Array.from({ length: 30 }, (_, index) => member(index + 2, `成员${index + 1}`, 1, 2));
    const result = buildTreeSvg(options({ mode: 'fan', members: [members[0], ...children], rootMemberId: 1 }));
    const svg = parseSvg(result.svg);

    expect(svg.querySelectorAll('[data-fan-label]')).toHaveLength(children.length);
    expect(result.body).toContain('data-fan-label="2"');
    expect(result.body).not.toContain('data-fan-external-label="member-2"');
  });

  it('exports fan members and labels without guide circles, frames or leader lines', () => {
    const longName = '一位名字非常非常长需要放到扇形图外部引线标注的家族成员';
    const data = [{ ...members[0], spouse_name: '始祖配偶' }, { ...member(2, longName, 1, 2) }, members[3]];
    const result = buildTreeSvg(options({ mode: 'fan', members: data, rootMemberId: 1, showGuides: false }));
    const svg = parseSvg(result.svg);

    expect(result.body).toContain('data-fan-root="true"');
    expect(result.body).toContain('data-fan-member="2"');
    expect(result.body).toContain('data-fan-external-label="member-2"');
    expect(result.body).toContain('始祖配偶');
    expect(result.body).not.toContain('data-fan-generations=');
    expect(result.body).not.toContain('data-fan-leader=');
    expect(result.body).not.toContain('stroke="#C9BCA4"');
    expect(result.body).not.toContain('stroke="#D8CDB7"');
    expect(svg.querySelectorAll('path[fill="none"], circle[fill="none"]')).toHaveLength(0);
  });

  it('includes every root when exporting a multi-root fan tree', () => {
    const result = buildTreeSvg(options({ mode: 'fan', rootMemberId: null }));
    const svg = parseSvg(result.svg);
    expect(svg.querySelectorAll('[data-fan-root]')).toHaveLength(2);
    expect(result.body).toContain('data-member-id="1"');
    expect(result.body).toContain('data-member-id="5"');
    expect(result.body).toContain('data-member-id="6"');
  });

  it('honors root, collapse, spouse and note options in fan output', () => {
    const data = [{ ...members[0], spouse_name: '配偶', notes: '根备注' }, members[1], members[2]];
    const collapsed = buildTreeSvg(options({
      mode: 'fan',
      members: data,
      rootMemberId: 1,
      collapsedIds: new Set([1]),
    }));
    expect(collapsed.body).toContain('data-fan-root="true"');
    expect(collapsed.body).not.toContain('data-fan-member="2"');
    expect(collapsed.body).toContain('根备注');

    const plain = buildTreeSvg(options({
      mode: 'fan',
      members: data,
      showSpouse: false,
      showNotes: false,
    }));
    expect(plain.body).not.toContain('data-fan-spouse-ring=');
    expect(plain.body).not.toContain('根备注');
  });
});

describe('buildTreeJson', () => {
  it('contains the versioned schema, timestamp, root and selected data', () => {
    const json = JSON.parse(buildTreeJson(options({ rootMemberId: 2, collapsedIds: new Set([2]) })));
    expect(json.schemaVersion).toBe(1);
    expect(new Date(json.exportedAt).toISOString()).toBe(json.exportedAt);
    expect(json.rootMemberId).toBe(2);
    expect(json.members.map((item: FamilyMember) => item.id)).toEqual([2]);
    expect(json.generationChars).toEqual(generationChars);
  });

  it('exports collapsed descendants when requested', () => {
    const json = JSON.parse(buildTreeJson(options({
      rootMemberId: 1,
      collapsedIds: new Set([1]),
      includeCollapsed: true,
    })));
    expect(ids(json.members)).toEqual([1, 2, 3, 4]);
  });
});

describe('exportTree', () => {
  it.each(['json', 'svg'] as const)('downloads %s and revokes its object URL', async format => {
    vi.mocked(URL.createObjectURL).mockReturnValue(`blob:tree-${format}`);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await exportTree(options(), format);

    expect(click).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(`blob:tree-${format}`);
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('adds a timestamp to the downloaded filename', async () => {
    let filename = '';
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      filename = this.download;
    });

    await exportTree(options(), 'json');

    expect(filename).toMatch(/^测试家谱_\d{8}-\d{6}\.json$/);
    expect(click).toHaveBeenCalledOnce();
  });

  it('rejects an empty tree without creating a download', async () => {
    await expect(exportTree(options({ members: [] }), 'json')).rejects.toThrow('没有可导出的家谱成员');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
