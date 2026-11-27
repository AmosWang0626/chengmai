import type { FamilyMember, GenerationChar } from '../../types';
import { buildForest, layoutTree, unitWidth } from './shared';
import type { CNode, LayoutOpts } from './shared';

export type TreeExportFormat = 'json' | 'svg' | 'png' | 'pdf';

export interface TreeExportOptions {
  mode: 'fan' | 'traditional';
  members: FamilyMember[];
  generationChars: GenerationChar[];
  rootMemberId: number | null;
  collapsedIds: Set<number>;
  includeCollapsed: boolean;
  showSpouse: boolean;
  showNotes: boolean;
  title: string;
}

export interface TreeSvgDocument {
  svg: string;
  width: number;
  height: number;
  body: string;
}

const BACKGROUND = '#F7F1E3';
const INK = '#302E28';
const MUTED = '#777064';
const CINNABAR = '#B33B2E';
const FONT = '"Songti SC", "STSong", "Noto Serif CJK SC", "Microsoft YaHei", serif';
const MAX_PIXELS = 32_000_000;
const MAX_CANVAS_SIDE = 32_767;
const TAU = Math.PI * 2;

const num = (value: number): string => Number(value.toFixed(3)).toString();
const isAscii = (char: string): boolean => char.charCodeAt(0) <= 0x7F;
const cleanXmlText = (value: string): string => Array.from(value).filter(char => {
  const code = char.charCodeAt(0);
  return (code >= 0x20 || code === 0x09 || code === 0x0A || code === 0x0D) && code !== 0xFFFE && code !== 0xFFFF;
}).join('');

/** All user-supplied SVG text and attribute values pass through this function. */
const xml = (value: string | number | null | undefined): string => cleanXmlText(String(value ?? ''))
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const textUnits = (value: string): number => Array.from(value).reduce((sum, char) =>
  sum + (isAscii(char) ? 0.56 : 1), 0);

const fittedText = (value: string, maxUnits: number): string => {
  const chars = Array.from(value);
  if (textUnits(value) <= maxUnits) return value;
  let result = '';
  let used = 0;
  for (const char of chars) {
    const width = isAscii(char) ? 0.56 : 1;
    if (used + width > maxUnits - 1) break;
    result += char;
    used += width;
  }
  return `${result}…`;
};

const year = (value: string | null): string => value ? value.slice(0, 4) : '';
const years = (birth: string | null, death: string | null): string => {
  const by = year(birth);
  const dy = year(death);
  if (by && dy) return `${by}–${dy}`;
  if (by) return `${by}–`;
  if (dy) return `–${dy}`;
  return '生卒未知';
};

const generationChar = (member: FamilyMember, chars: GenerationChar[]): string =>
  chars.find(char => char.generation === member.generation && !char.hidden)?.char
  || member.generation_char
  || '';

const exportedDate = (): string => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const genderFill = (gender: FamilyMember['gender']): string =>
  gender === 'male' ? '#E4EDFB' : gender === 'female' ? '#F8E2E9' : '#E1ECE7';

/**
 * Select a root branch when requested. A collapsed member remains visible, but
 * its descendants are omitted unless includeCollapsed is true. Enabling that
 * option exports and lays out the complete selected branch.
 */
export function selectTreeMembers(options: TreeExportOptions): FamilyMember[] {
  if (options.members.length === 0) throw new Error('没有可导出的家谱成员');

  const byId = new Map(options.members.map(member => [member.id, member]));
  const forest = buildForest(options.members);
  const nodeById = new Map<number, CNode>();
  const indexNodes = (node: CNode): void => {
    nodeById.set(node.id, node);
    node.children.forEach(indexNodes);
  };
  forest.forEach(indexNodes);
  const roots = options.rootMemberId === null
    ? forest
    : (() => {
      if (!byId.has(options.rootMemberId)) {
        throw new Error(`找不到作为导出根的成员 #${options.rootMemberId}`);
      }
      const root = nodeById.get(options.rootMemberId);
      return root ? [root] : [];
    })();

  if (roots.length === 0) throw new Error('家谱关系无效，找不到可导出的根节点');

  const selected: FamilyMember[] = [];
  const seen = new Set<number>();
  const collapsed = options.includeCollapsed ? new Set<number>() : options.collapsedIds;
  const walk = (node: CNode): void => {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    selected.push(byId.get(node.id)!);
    if (!collapsed.has(node.id)) node.children.forEach(walk);
  };
  roots.forEach(walk);
  return selected;
}

const svgStyle = `<style>
text { font-family: ${FONT}; text-rendering: geometricPrecision; }
.tree-card, .tree-spouse { stroke-linejoin: round; }
</style>`;

const header = (options: TreeExportOptions, width: number): { markup: string; height: number } => {
  const title = options.title.trim();
  const hasTitle = title.length > 0;
  return {
    height: hasTitle ? 108 : 68,
    markup: `${hasTitle ? `<text x="${num(width / 2)}" y="43" text-anchor="middle" font-size="27" font-weight="700" fill="${INK}">${xml(title)}</text>` : ''}
      <text x="${num(width / 2)}" y="${hasTitle ? 73 : 40}" text-anchor="middle" font-size="12" fill="${MUTED}">导出日期 ${exportedDate()}</text>
      <path d="M 28 ${hasTitle ? 88 : 50} H ${num(width - 28)}" stroke="#D8CDB7" stroke-width="1" />`,
  };
};

const legend = (width: number, y: number, showSpouse: boolean): string => {
  const items: Array<{ label: string; fill: string }> = [
    { label: '男', fill: genderFill('male') },
    { label: '女', fill: genderFill('female') },
    { label: '其他', fill: genderFill('other') },
  ];
  if (showSpouse) items.push({ label: '配偶', fill: '#F9E3E6' });
  const itemWidth = 82;
  const start = (width - items.length * itemWidth) / 2;
  return `<g data-tree-legend="true">${items.map((item, index) => {
    const x = start + index * itemWidth;
    return `<rect x="${num(x)}" y="${num(y)}" width="14" height="14" rx="2" fill="${item.fill}" stroke="#B9AE99" />
      <text x="${num(x + 21)}" y="${num(y + 12)}" font-size="12" fill="${MUTED}">${item.label}</text>`;
  }).join('')}</g>`;
};

const cardText = (
  x: number,
  y: number,
  width: number,
  lines: Array<{ value: string; size: number; color?: string; weight?: number }>,
): string => lines.map((line, index) => {
  const top = y + 48 + index * 23;
  return `<text x="${num(x + width / 2)}" y="${num(top)}" text-anchor="middle" font-size="${line.size}" font-weight="${line.weight ?? 400}" fill="${line.color ?? INK}">${xml(fittedText(line.value, (width - 16) / line.size))}</text>`;
}).join('');

function buildTraditional(options: TreeExportOptions, members: FamilyMember[]): TreeSvgDocument {
  const cw = 132;
  const ch = 190;
  const sw = 96;
  const sh = 158;
  const mgap = 16;
  const opts: LayoutOpts = {
    cw, ch,
    sw: options.showSpouse ? sw : 0,
    sh,
    mgap: options.showSpouse ? mgap : 0,
    gap: 38,
    level: 244,
    rootgap: 72,
    pad: 72,
  };
  const forest = buildForest(members);
  const collapsed = options.includeCollapsed ? new Set<number>() : options.collapsedIds;
  const placed = layoutTree(forest, collapsed, opts);
  const visible: CNode[] = [];
  const walk = (node: CNode): void => {
    visible.push(node);
    if (!collapsed.has(node.id)) node.children.forEach(walk);
  };
  forest.forEach(walk);

  const memberX = (node: CNode): number =>
    node.x + (options.showSpouse && node.spouse_name ? sw + mgap : 0);
  const marriageX = (node: CNode): number => node.x + unitWidth(node, opts) / 2;
  const lines: string[] = [];
  const cards: string[] = [];

  for (const node of visible) {
    const mx = memberX(node);
    const hasSpouse = options.showSpouse && Boolean(node.spouse_name);
    const char = generationChar(node, options.generationChars);

    if (hasSpouse) {
      lines.push(`<g data-marriage-id="${node.id}">
        <line x1="${num(node.x + sw)}" y1="${num(node.y + 47)}" x2="${num(mx)}" y2="${num(node.y + 47)}" stroke="${CINNABAR}" stroke-width="2" />
        <text x="${num(node.x + sw + mgap / 2)}" y="${num(node.y + 51)}" text-anchor="middle" font-size="11" fill="${CINNABAR}">♥</text>
      </g>`);
    }

    if (!collapsed.has(node.id) && node.children.length) {
      const busY = node.children[0].y - 27;
      const centers = node.children.map(child => marriageX(child));
      const paths = [`M ${num(marriageX(node))} ${num(node.y + ch)} V ${num(busY)}`];
      if (node.children.length > 1) {
        paths.push(`M ${num(Math.min(...centers))} ${num(busY)} H ${num(Math.max(...centers))}`);
      }
      node.children.forEach(child => paths.push(`M ${num(marriageX(child))} ${num(busY)} V ${num(child.y)}`));
      paths.forEach(path => lines.push(`<path d="${path}" fill="none" stroke="#625E53" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />`));
    }

    const memberLines: Array<{ value: string; size: number; color?: string; weight?: number }> = [
      { value: node.name, size: 22, weight: 700 },
      { value: `${node.gender === 'male' ? '♂' : node.gender === 'female' ? '♀' : '○'} ${years(node.birth_date, node.death_date)}`, size: 12, color: MUTED },
    ];
    if (options.showNotes) {
      const rank = node.sibling_rank ?? node.family_rank;
      if (rank) memberLines.push({ value: `行第 ${rank}`, size: 12, color: MUTED });
      if (node.occupation) memberLines.push({ value: node.occupation, size: 12, color: MUTED });
      if (node.notes) memberLines.push({ value: node.notes, size: 11, color: MUTED });
    }
    cards.push(`<g data-tree-member="${node.id}">
      <title>${xml(node.name)}</title>
      <rect class="tree-card" data-member-id="${node.id}" x="${num(mx)}" y="${num(node.y)}" width="${cw}" height="${ch}" rx="5" fill="${genderFill(node.gender)}" stroke="#817866" stroke-width="1.4" />
      <rect x="${num(mx + 8)}" y="${num(node.y + 8)}" width="25" height="25" rx="2" fill="none" stroke="${CINNABAR}" stroke-width="1.2" />
      <text data-generation-char="${node.id}" x="${num(mx + 20.5)}" y="${num(node.y + 26)}" text-anchor="middle" font-size="15" fill="${CINNABAR}">${xml(char || '·')}</text>
      ${cardText(mx, node.y, cw, memberLines.slice(0, 5))}
      ${collapsed.has(node.id) && node.children.length ? `<text x="${num(mx + cw - 8)}" y="${num(node.y + 22)}" text-anchor="end" font-size="11" fill="${CINNABAR}">+${node.children.length}</text>` : ''}
    </g>`);

    if (hasSpouse) {
      const spouseY = node.y + (ch - sh) / 2;
      const spouseLines: Array<{ value: string; size: number; color?: string; weight?: number }> = [
        { value: node.spouse_name!, size: 18, weight: 700 },
        { value: years(node.spouse_birth_date, node.spouse_death_date), size: 11, color: MUTED },
      ];
      if (options.showNotes) {
        if (node.spouse_origin) spouseLines.push({ value: node.spouse_origin, size: 11, color: MUTED });
        if (node.notes) spouseLines.push({ value: node.notes, size: 10, color: MUTED });
      }
      cards.push(`<g data-tree-spouse="${node.id}">
        <title>${xml(node.spouse_name)}</title>
        <rect class="tree-spouse" data-spouse-id="${node.id}" x="${num(node.x)}" y="${num(spouseY)}" width="${sw}" height="${sh}" rx="5" fill="#F9E3E6" stroke="#A88579" stroke-width="1.2" />
        <text x="${num(node.x + sw / 2)}" y="${num(spouseY + 26)}" text-anchor="middle" font-size="12" fill="${CINNABAR}">配</text>
        ${cardText(node.x, spouseY, sw, spouseLines.slice(0, 4))}
      </g>`);
    }
  }

  const heading = header(options, placed.worldW);
  const legendHeight = 64;
  const height = heading.height + placed.worldH + legendHeight;
  const body = `${svgStyle}
    <rect data-tree-background="true" x="0" y="0" width="${num(placed.worldW)}" height="${num(height)}" fill="${BACKGROUND}" />
    <rect x="18" y="18" width="${num(Math.max(0, placed.worldW - 36))}" height="${num(height - 36)}" fill="none" stroke="#C9BCA4" stroke-width="1.2" />
    ${heading.markup}
    <g data-traditional-lines="true" transform="translate(0 ${heading.height})">${lines.join('')}</g>
    <g data-traditional-cards="true" transform="translate(0 ${heading.height})">${cards.join('')}</g>
    ${legend(placed.worldW, height - 40, options.showSpouse)}`;
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${num(placed.worldW)}" height="${num(height)}" viewBox="0 0 ${num(placed.worldW)} ${num(height)}">${body}</svg>`,
    width: placed.worldW,
    height,
    body,
  };
}

interface FanSector {
  node: CNode;
  a0: number;
  a1: number;
  depth: number;
}

interface FanLabel {
  key: string;
  text: string;
  detail: string;
  angle: number;
  outer: number;
  spouse: boolean;
}

function arcPath(cx: number, cy: number, a0: number, a1: number, ri: number, ro: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const point = (radius: number, angle: number) => `${num(cx + radius * Math.cos(angle))} ${num(cy + radius * Math.sin(angle))}`;
  return `M ${point(ro, a0)} A ${ro} ${ro} 0 ${large} 1 ${point(ro, a1)} L ${point(ri, a1)} A ${ri} ${ri} 0 ${large} 0 ${point(ri, a0)} Z`;
}

function buildFan(options: TreeExportOptions, members: FamilyMember[]): TreeSvgDocument {
  const forest = buildForest(members);
  if (forest.length > 1) {
    const gap = 48;
    const diagrams = forest.map(root => buildFan({
      ...options,
      rootMemberId: root.id,
    }, selectTreeMembers({ ...options, members, rootMemberId: root.id })));
    const width = diagrams.reduce((sum, diagram) => sum + diagram.width, 0) + gap * (diagrams.length - 1);
    const height = Math.max(...diagrams.map(diagram => diagram.height));
    let x = 0;
    const body = diagrams.map(diagram => {
      const markup = `<svg x="${num(x)}" y="0" width="${num(diagram.width)}" height="${num(diagram.height)}" viewBox="0 0 ${num(diagram.width)} ${num(diagram.height)}">${diagram.body}</svg>`;
      x += diagram.width + gap;
      return markup;
    }).join('');
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(height)}" viewBox="0 0 ${num(width)} ${num(height)}"><rect width="${num(width)}" height="${num(height)}" fill="${BACKGROUND}"/>${body}</svg>`,
      width,
      height,
      body,
    };
  }
  const root = options.rootMemberId === null ? forest[0] : forest.find(node => node.id === options.rootMemberId);
  if (!root) throw new Error('家谱关系无效，找不到扇形图根节点');

  const innerR = 76;
  const ringW = 82;
  const band = 17;
  const gap = 7;
  const pitch = ringW + (options.showSpouse ? band + gap : gap);
  const collapsed = options.includeCollapsed ? new Set<number>() : options.collapsedIds;
  const sectors: FanSector[] = [];
  const bands: FanSector[] = [];
  let maxDepth = 0;

  const weight = (node: CNode): number =>
    collapsed.has(node.id) || !node.children.length
      ? 1
      : node.children.reduce((sum, child) => sum + weight(child), 0);
  const walk = (node: CNode, a0: number, a1: number, depth: number): void => {
    maxDepth = Math.max(maxDepth, depth);
    if (depth > 0) sectors.push({ node, a0, a1, depth });
    if (options.showSpouse && node.spouse_name) bands.push({ node, a0, a1, depth });
    if (collapsed.has(node.id) || !node.children.length) return;
    const total = node.children.reduce((sum, child) => sum + weight(child), 0);
    let angle = a0;
    node.children.forEach(child => {
      const next = angle + (a1 - a0) * weight(child) / total;
      walk(child, angle, next, depth + 1);
      angle = next;
    });
  };
  walk(root, -Math.PI / 2, -Math.PI / 2 + TAU, 0);

  const outerR = innerR + maxDepth * pitch + (options.showSpouse ? band + gap : 0);
  const heading = header(options, 2 * (outerR + 230));
  const size = 2 * (outerR + 230);
  const cx = size / 2;
  const cy = heading.height + size / 2;
  const baseLegendY = cy + size / 2 + 26;
  const ring = (depth: number) => ({
    ri: innerR + (depth - 1) * pitch,
    ro: innerR + (depth - 1) * pitch + ringW,
  });
  const bandOf = (depth: number) => depth === 0
    ? { ri: innerR - band - 7, ro: innerR - 7 }
    : { ri: ring(depth).ro + 3, ro: ring(depth).ro + 3 + band };

  const internalLabels: string[] = [];
  const externalLabels: FanLabel[] = [];
  const fontSize = 16;
  const addExternal = (key: string, name: string, detail: string, angle: number, radius: number, spouse: boolean): void => {
    externalLabels.push({ key, text: name, detail, angle, outer: radius, spouse });
  };

  for (const sector of sectors) {
    const { node } = sector;
    const { ri, ro } = ring(sector.depth);
    const midAngle = (sector.a0 + sector.a1) / 2;
    const midRadius = (ri + ro) / 2;
    const arcWidth = (sector.a1 - sector.a0) * midRadius;
    const char = generationChar(node, options.generationChars);
    const detail = options.showNotes
      ? [node.generation ? `第${node.generation}世${char ? ` · ${char}` : ''}` : '', years(node.birth_date, node.death_date), node.notes || ''].filter(Boolean).join(' · ')
      : '';
    const labelText = `${node.name}${char ? ` · ${char}` : ''}`;
    if (arcWidth >= textUnits(labelText) * fontSize && fontSize * 1.4 <= ro - ri - 8) {
      let degrees = midAngle * 180 / Math.PI;
      if (Math.cos(midAngle) < 0) degrees += 180;
      internalLabels.push(`<text data-fan-label="${xml(String(node.id))}" x="${num(cx + midRadius * Math.cos(midAngle))}" y="${num(cy + midRadius * Math.sin(midAngle))}" transform="rotate(${num(degrees)} ${num(cx + midRadius * Math.cos(midAngle))} ${num(cy + midRadius * Math.sin(midAngle))})" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" fill="${INK}">${xml(labelText)}</text>`);
    } else {
      addExternal(`member-${node.id}`, labelText, detail, midAngle, ro, false);
    }
  }

  for (const spouseBand of bands) {
    const { node } = spouseBand;
    const { ri, ro } = bandOf(spouseBand.depth);
    const midAngle = (spouseBand.a0 + spouseBand.a1) / 2;
    const midRadius = (ri + ro) / 2;
    const name = node.spouse_name!;
    const detail = options.showNotes
      ? [years(node.spouse_birth_date, node.spouse_death_date), node.spouse_origin || '', node.notes || ''].filter(Boolean).join(' · ')
      : '';
    if (spouseBand.depth > 0 && (spouseBand.a1 - spouseBand.a0) * midRadius >= textUnits(name) * 11) {
      let degrees = midAngle * 180 / Math.PI + 90;
      if (Math.cos(midAngle) < 0) degrees += 180;
      internalLabels.push(`<text data-fan-label="${xml(String(node.id))}" x="${num(cx + midRadius * Math.cos(midAngle))}" y="${num(cy + midRadius * Math.sin(midAngle))}" transform="rotate(${num(degrees)} ${num(cx + midRadius * Math.cos(midAngle))} ${num(cy + midRadius * Math.sin(midAngle))})" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="#9A2E1E">${xml(name)}</text>`);
    } else if (spouseBand.depth > 0) {
      addExternal(`spouse-${node.id}`, name, detail, midAngle, ro, true);
    }
  }

  const labelWidth = 210;
  const labelX = outerR + 48;
  const minLabelY = heading.height + 22;
  const maxSideLabels = Math.max(...[1, -1].map(side => externalLabels.filter(label =>
    (Math.cos(label.angle) >= 0 ? 1 : -1) === side).length));
  const legendY = Math.max(baseLegendY, minLabelY + maxSideLabels * 24 + 20);
  const height = legendY + 52;
  const maxLabelY = legendY - 20;
  const externalMarkup: string[] = [];
  for (const side of [1, -1]) {
    const labels = externalLabels
      .filter(label => (Math.cos(label.angle) >= 0 ? 1 : -1) === side)
      .sort((a, b) => Math.sin(a.angle) - Math.sin(b.angle));
    const step = labels.length > 1
      ? Math.min(42, (maxLabelY - minLabelY) / (labels.length - 1))
      : 0;
    labels.forEach((label, index) => {
      const desiredY = cy + (outerR + 28) * Math.sin(label.angle);
      let labelY = labels.length === 1 ? desiredY : minLabelY + index * step;
      labelY = Math.max(minLabelY, Math.min(maxLabelY, labelY));
      const ax = cx + (label.outer + 2) * Math.cos(label.angle);
      const ay = cy + (label.outer + 2) * Math.sin(label.angle);
      const ex = cx + side * labelX;
      const detailSize = step < 25 ? 8 : 10;
      externalMarkup.push(`<g data-fan-external-label="${xml(label.key)}">
        <path data-fan-leader="true" d="M ${num(ax)} ${num(ay)} L ${num(ex - side * 16)} ${num(labelY)} H ${num(ex - side * 4)}" fill="none" stroke="#AAA18F" stroke-width="1" />
        <circle cx="${num(ax)}" cy="${num(ay)}" r="1.8" fill="${label.spouse ? CINNABAR : '#8E877A'}" />
        <text x="${num(ex)}" y="${num(labelY + (label.detail ? -2 : 5))}" text-anchor="${side === 1 ? 'start' : 'end'}" font-size="13" font-weight="700" fill="${label.spouse ? '#9A2E1E' : INK}">${xml(fittedText(label.text, labelWidth / 13))}</text>
        ${label.detail ? `<text x="${num(ex)}" y="${num(labelY + detailSize + 5)}" text-anchor="${side === 1 ? 'start' : 'end'}" font-size="${detailSize}" fill="${MUTED}">${xml(fittedText(label.detail, labelWidth / detailSize))}</text>` : ''}
      </g>`);
    });
  }

  const generationMarkup: string[] = [];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const { ri } = ring(depth);
    const generation = root.generation === null ? depth : root.generation + depth - 1;
    const char = options.generationChars.find(item => item.generation === generation && !item.hidden)?.char || '';
    generationMarkup.push(`<g data-fan-generation="${depth}">
      <circle cx="${num(cx)}" cy="${num(cy)}" r="${num(ri)}" fill="none" stroke="#DCD5C6" stroke-width="1" stroke-dasharray="3 6" />
      <text x="${num(cx + 5)}" y="${num(cy - ri - 5)}" font-size="11" fill="${MUTED}">${xml(`第${generation}世${char ? ` · ${char}` : ''}`)}</text>
    </g>`);
  }

  const memberMarkup = sectors.map(sector => {
    const { ri, ro } = ring(sector.depth);
    const title = options.showNotes && sector.node.notes ? `${sector.node.name}\n${sector.node.notes}` : sector.node.name;
    return `<path data-fan-member="${sector.node.id}" data-member-id="${sector.node.id}" d="${arcPath(cx, cy, sector.a0, sector.a1, ri, ro)}" fill="${genderFill(sector.node.gender)}" stroke="#FFFDF8" stroke-width="2"><title>${xml(title)}</title></path>`;
  }).join('');
  const spouseMarkup = bands.map(spouseBand => {
    const { ri, ro } = bandOf(spouseBand.depth);
    const title = options.showNotes && spouseBand.node.notes ? `${spouseBand.node.spouse_name}\n${spouseBand.node.notes}` : spouseBand.node.spouse_name!;
    return `<path data-fan-spouse-ring="${spouseBand.node.id}" d="${arcPath(cx, cy, spouseBand.a0, spouseBand.depth === 0 ? spouseBand.a0 + TAU - 0.0001 : spouseBand.a1, ri, ro)}" fill="#F9E3E6" stroke="#FFFDF8" stroke-width="1.5"><title>${xml(title)}</title></path>`;
  }).join('');
  const rootSpouseLabel = options.showSpouse && root.spouse_name
    ? `<text x="${num(cx)}" y="${num(cy - (innerR - band / 2 - 7))}" text-anchor="middle" font-size="10" fill="#9A2E1E">${xml(fittedText(root.spouse_name, (innerR - band - 10) / 10))}</text>`
    : '';
  const rootCenterR = options.showSpouse && root.spouse_name ? innerR - band - 12 : innerR - 10;
  const rootNote = options.showNotes && root.notes ? fittedText(root.notes, (rootCenterR - 10) / 8) : '';
  const rootMarkup = `<circle data-fan-root="true" data-member-id="${root.id}" cx="${num(cx)}" cy="${num(cy)}" r="${num(rootCenterR)}" fill="${CINNABAR}" stroke="#FFFDF8" stroke-width="2"><title>${xml(root.name)}</title></circle>
    <text x="${num(cx)}" y="${num(cy - (rootNote ? 13 : 3))}" text-anchor="middle" font-size="${Math.min(20, rootCenterR / Math.max(2, textUnits(root.name)) * 1.55)}" font-weight="700" fill="#FFFDF8">${xml(fittedText(root.name, (rootCenterR - 10) / 11))}</text>
    ${rootSpouseLabel}
    ${options.showNotes ? `<text x="${num(cx)}" y="${num(cy + 15)}" text-anchor="middle" font-size="9" fill="#FAE4DE">${xml(`${root.generation ? `第${root.generation}世` : ''}${generationChar(root, options.generationChars) ? ` · ${generationChar(root, options.generationChars)}` : ''}`)}</text>` : ''}
    ${rootNote ? `<text x="${num(cx)}" y="${num(cy + 30)}" text-anchor="middle" font-size="8" fill="#FAE4DE">${xml(rootNote)}</text>` : ''}`;

  const body = `${svgStyle}
    <rect data-tree-background="true" x="0" y="0" width="${num(size)}" height="${num(height)}" fill="${BACKGROUND}" />
    <rect x="18" y="18" width="${num(size - 36)}" height="${num(height - 36)}" fill="none" stroke="#C9BCA4" stroke-width="1.2" />
    ${heading.markup}
    <g data-fan-generations="true">${generationMarkup.join('')}</g>
    <g data-fan-spouse-rings="true">${spouseMarkup}</g>
    <g data-fan-member-arcs="true">${memberMarkup}</g>
    <g data-fan-internal-labels="true">${internalLabels.join('')}</g>
    ${rootMarkup}
    <g data-fan-external-labels="true">${externalMarkup.join('')}</g>
    ${legend(size, legendY, options.showSpouse)}`;
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${num(size)}" height="${num(height)}" viewBox="0 0 ${num(size)} ${num(height)}">${body}</svg>`,
    width: size,
    height,
    body,
  };
}

export function buildTreeSvg(options: TreeExportOptions): TreeSvgDocument {
  const members = selectTreeMembers(options);
  return options.mode === 'fan'
    ? buildFan(options, members)
    : buildTraditional(options, members);
}

export function buildTreeJson(options: TreeExportOptions): string {
  return JSON.stringify({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    rootMemberId: options.rootMemberId,
    members: selectTreeMembers(options),
    generationChars: options.generationChars,
  }, null, 2);
}

const rasterScale = (width: number, height: number, preferred = 2): number => Math.max(
  0.01,
  Math.min(preferred, Math.sqrt(MAX_PIXELS / (width * height)), MAX_CANVAS_SIDE / Math.max(width, height)),
);

const svgImage = (svg: string, objectUrls: Set<string>): Promise<HTMLImageElement> => {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  objectUrls.add(url);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('SVG 栅格化失败'));
    image.src = url;
  });
};

const canvasBlob = (canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('画布导出失败')), type, quality);
  });

const paintCanvas = (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  width: number,
  height: number,
  scale: number,
): void => {
  canvas.width = Math.max(1, Math.floor(width * scale));
  canvas.height = Math.max(1, Math.floor(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('浏览器不支持 Canvas 2D');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
};

const safeFilename = (title: string): string => {
  const value = Array.from(title.trim()).map(char => {
    const code = char.charCodeAt(0);
    return code < 0x20 || /[\\/:*?"<>|]/.test(char) ? '_' : char;
  }).join('').slice(0, 80);
  return value || 'family-tree';
};

const triggerDownload = (blob: Blob, filename: string, objectUrls: Set<string>): void => {
  const url = URL.createObjectURL(blob);
  objectUrls.add(url);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
  }
};

const pageSvg = (document: TreeSvgDocument, y: number, height: number): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${num(document.width)}" height="${num(height)}" viewBox="0 ${num(y)} ${num(document.width)} ${num(height)}">${document.body}</svg>`;

async function exportPdf(options: TreeExportOptions, document: TreeSvgDocument, objectUrls: Set<string>): Promise<void> {
  // Deliberately avoid svg2pdf text conversion: Chinese glyphs are embedded as
  // high-resolution Canvas pixels rather than depending on unembedded PDF fonts.
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const footerHeight = 24;
  const imageWidth = pageWidth - margin * 2;
  const imageHeight = pageHeight - margin * 2 - footerHeight;
  const sourcePageHeight = document.width * imageHeight / imageWidth;
  const pageCount = Math.max(1, Math.ceil(document.height / sourcePageHeight));

  for (let index = 0; index < pageCount; index++) {
    if (index > 0) pdf.addPage();
    pdf.setFillColor(247, 241, 227);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    const y = index * sourcePageHeight;
    const sliceHeight = Math.min(sourcePageHeight, document.height - y);
    const image = await svgImage(pageSvg(document, y, sliceHeight), objectUrls);
    const canvas = window.document.createElement('canvas');
    const scale = rasterScale(document.width, sliceHeight, 2);
    paintCanvas(canvas, image, document.width, sliceHeight, scale);
    const drawnHeight = imageWidth * sliceHeight / document.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, imageWidth, drawnHeight, undefined, 'FAST');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(110, 104, 92);
    pdf.text(`Page ${index + 1} of ${pageCount}`, pageWidth / 2, pageHeight - 13, { align: 'center' });
  }

  triggerDownload(pdf.output('blob'), `${safeFilename(options.title)}.pdf`, objectUrls);
}

export async function exportTree(options: TreeExportOptions, format: TreeExportFormat): Promise<void> {
  if (options.members.length === 0) throw new Error('没有可导出的家谱成员');
  const objectUrls = new Set<string>();
  try {
    if (format === 'json') {
      triggerDownload(
        new Blob([buildTreeJson(options)], { type: 'application/json;charset=utf-8' }),
        `${safeFilename(options.title)}.json`,
        objectUrls,
      );
      return;
    }

    const document = buildTreeSvg(options);
    if (format === 'svg') {
      triggerDownload(
        new Blob([document.svg], { type: 'image/svg+xml;charset=utf-8' }),
        `${safeFilename(options.title)}.svg`,
        objectUrls,
      );
      return;
    }
    if (format === 'png') {
      const image = await svgImage(document.svg, objectUrls);
      const canvas = window.document.createElement('canvas');
      paintCanvas(canvas, image, document.width, document.height, rasterScale(document.width, document.height, 2));
      const blob = await canvasBlob(canvas);
      triggerDownload(blob, `${safeFilename(options.title)}.png`, objectUrls);
      return;
    }
    if (format === 'pdf') {
      await exportPdf(options, document, objectUrls);
      return;
    }
    throw new Error(`不支持的导出格式：${String(format)}`);
  } finally {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls.clear();
  }
}
