import React, { useState, useEffect } from 'react';
import { PieChart, ScrollText } from 'lucide-react';
import { User } from '../types';
import Layout from '../components/Layout';
import FanView from './tree/FanView';
import TraditionalView from './tree/TraditionalView';
import './familyTreeCanvas.css';

interface ViewProps {
  user: User | null;
}

/* 两种图谱风格：扇形谱图（默认）与传统图谱（谱页吊线为主体、融合画布夫妻双卡） */
const MODES = [
  { id: 'fan', label: '扇形谱图', desc: '环状放射 · 婚环配偶 · 双击换根', icon: PieChart },
  { id: 'traditional', label: '传统图谱', desc: '竖排右起 · 夫妻双柱 · 墨线吊挂', icon: ScrollText },
];

const readMode = () => {
  const stored = localStorage.getItem('fm_tree_mode_v2');
  if (stored === 'fan') return 'fan';
  if (stored === 'traditional' || stored === 'scroll' || stored === 'canvas') return 'traditional';
  return 'fan';
};

const FamilyTreeCanvas: React.FC<ViewProps> = ({ user }) => {
  const [mode, setMode] = useState(readMode);
  useEffect(() => { localStorage.setItem('fm_tree_mode_v2', mode); }, [mode]);

  return (
    <Layout user={user} title="家谱图谱">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="ui-seg" role="tablist" aria-label="谱图风格">
            {MODES.map(m => (
              <button key={m.id} role="tab" aria-selected={mode === m.id} onClick={() => setMode(m.id)}
                title={m.desc}
                className={`ui-seg-item ${mode === m.id ? 'active' : ''}`}>
                <m.icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            ))}
          </div>
          <span className="hidden md:inline text-[11px] text-slate-400">
            {MODES.find(m => m.id === mode)?.desc}
          </span>
        </div>
        {mode === 'fan' ? <FanView user={user} /> : <TraditionalView user={user} />}
      </div>
    </Layout>
  );
};

export default FamilyTreeCanvas;