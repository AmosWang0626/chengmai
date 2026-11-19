import React from 'react';
import { CNode, genderTint } from '../pages/tree/shared';
import '../pages/familyTreeCanvas.css';

interface MemberPanelProps {
  node: CNode;
  isSpouse: boolean;
  collapsed: boolean;
  onClose: () => void;
  onCenter: () => void;
  onFold: () => void;
}

/* 谱图共用详情面板：方章头像 + 世代/字辈小签 + 统一按钮语言 */
const MemberPanel: React.FC<MemberPanelProps> = ({ node, isSpouse, collapsed, onClose, onCenter, onFold }) => {
  const name = isSpouse ? node.spouse_name! : node.name;
  const tint = isSpouse ? 'bg-slate-100 text-slate-600' : genderTint(node.gender);
  const row = (k: string, v: React.ReactNode) =>
    v ? <div className="tc-row" key={k}><span className="k">{k}</span><span className="v">{v}</span></div> : null;

  return (
    <aside className="tc-panel" data-stop-pan>
      <div className="head">
        <span className={`ui-avatar w-11 h-11 text-lg ${tint}`}>{name.slice(-1)}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold text-slate-900 truncate">{name}</h3>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {isSpouse ? (
              <>
                <span className="ui-chip bg-slate-100 text-slate-600">配偶</span>
                <span className="text-[11px] text-slate-400 truncate">{node.name} 的配偶</span>
              </>
            ) : (
              <>
                <span className="ui-chip bg-gilt-100 text-gilt-700 num">第{node.generation || '?'}世</span>
                {node.generation_char && <span className="ui-chip bg-cinnabar-50 text-cinnabar-700">{node.generation_char}字辈</span>}
                <span className="ui-chip bg-slate-100 text-slate-500">{node.gender === 'male' ? '男' : node.gender === 'female' ? '女' : '其他'}</span>
              </>
            )}
          </div>
        </div>
        <button className="ui-icon-btn flex-shrink-0" onClick={onClose} title="关闭">✕</button>
      </div>
      <div className="body">
        {isSpouse ? (
          <>
            {row('姓名', node.spouse_name)}
            {row('配偶', node.name)}
            {row('籍贯', node.spouse_origin)}
            {row('出生', node.spouse_birth_date)}
            {row('逝世', node.spouse_death_date)}
          </>
        ) : (
          <>
            {row('同辈排行', node.sibling_rank ? `第${node.sibling_rank}位` : '')}
            {row('家庭排序', node.family_rank ? `第${node.family_rank}位` : '')}
            {row('出生', node.birth_date)}
            {row('逝世', node.death_date)}
            {row('电话', node.phone)}
            {row('邮箱', node.email)}
            {row('地址', node.address)}
            {row('职业', node.occupation)}
            {row('学历', node.education)}
            {row('简介', node.bio)}
            {row('配偶', node.spouse_name)}
            {row('配偶籍贯', node.spouse_origin)}
            {row('备注', node.notes)}
            {row('子女数', node.children.length ? `${node.children.length} 人` : '')}
          </>
        )}
      </div>
      <div className="foot">
        <button className="ui-btn-primary flex-1" onClick={onCenter}>居中显示</button>
        {!isSpouse && node.children.length > 0 && (
          <button className="ui-btn-outline flex-1" onClick={onFold}>{collapsed ? '展开此代' : '折叠此代'}</button>
        )}
      </div>
    </aside>
  );
};

export default MemberPanel;