import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PieChart, ScrollText } from 'lucide-react';
import { User } from '../types';
import Layout from '../components/Layout';
import FanView from './tree/FanView';
import TraditionalView from './tree/TraditionalView';
import './treeGraph.css';

type GraphStyle = 'fan' | 'traditional';

const GRAPH_STYLES = [
  { id: 'fan' as const, label: '扇形谱图', desc: '环状放射 · 婚环配偶 · 双击换根', icon: PieChart },
  { id: 'traditional' as const, label: '传统图谱', desc: '竖排右起 · 夫妻双柱 · 墨线吊挂', icon: ScrollText },
];

const isGraphStyle = (value: string | null): value is GraphStyle => value === 'fan' || value === 'traditional';

const readStyle = (): GraphStyle => {
  const stored = localStorage.getItem('tree.graphStyle') || localStorage.getItem('fm_tree_mode_v2');
  if (stored === 'fan') return 'fan';
  if (stored === 'traditional' || stored === 'scroll' || stored === 'canvas') return 'traditional';
  return 'fan';
};

export default function TreeGraphPage({ user }: { user: User | null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const requestedValue = params.get('style') || params.get('mode');
  const requestedStyle = isGraphStyle(requestedValue) ? requestedValue : null;
  const [style, setStyleState] = useState<GraphStyle>(() => requestedStyle || readStyle());
  const internalStyleChange = useRef(false);

  const setStyle = (next: GraphStyle) => {
    internalStyleChange.current = true;
    setStyleState(next);
  };

  useEffect(() => {
    if (requestedStyle && requestedStyle !== style && !internalStyleChange.current) {
      setStyleState(requestedStyle);
      return;
    }
    internalStyleChange.current = false;
    const nextParams = new URLSearchParams(location.search);
    nextParams.delete('mode');
    if (nextParams.get('style') === style) return;
    nextParams.set('style', style);
    navigate({ pathname: location.pathname, search: `?${nextParams.toString()}` }, { replace: true });
  }, [style, requestedStyle, location.pathname, location.search, navigate]);

  useEffect(() => {
    localStorage.setItem('tree.graphStyle', style);
    localStorage.removeItem('fm_tree_mode_v2');
  }, [style]);

  return (
    <Layout user={user} title="家谱图谱">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="ui-seg" role="tablist" aria-label="谱图风格">
            {GRAPH_STYLES.map(item => (
              <button key={item.id} type="button" role="tab" aria-selected={style === item.id} onClick={() => setStyle(item.id)}
                title={item.desc}
                className={`ui-seg-item ${style === item.id ? 'active' : ''}`}>
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <span className="hidden md:inline text-[11px] text-slate-400">
            {GRAPH_STYLES.find(item => item.id === style)?.desc}
          </span>
        </div>
        {style === 'fan' ? <FanView user={user} /> : <TraditionalView user={user} />}
      </div>
    </Layout>
  );
}
