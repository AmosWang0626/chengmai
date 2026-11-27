import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PieChart, Users, Image, BookOpen, Shield,
  LogOut, ChevronLeft, ChevronRight, Menu
} from 'lucide-react';
import { useUserRole } from '../hooks/useUserRole';
import { useNavCounts } from '../hooks/useNavCounts';
import { api } from '../api/client';
import { ROUTES } from '../routes';

interface LayoutProps {
  user: User | null;
  children: React.ReactNode;
  title?: string;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  editorOnly?: boolean;
  count?: 'members' | 'photos' | 'chars' | 'users';
  pending?: boolean;
}

interface NavGroup {
  label: string;
  adminOnly?: boolean;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: '总览',
    items: [{ path: ROUTES.dashboard, label: '首页', icon: LayoutDashboard }]
  },
  {
    label: '家谱',
    items: [
      { path: ROUTES.graph, label: '家谱图谱', icon: PieChart },
      { path: ROUTES.members, label: '成员', icon: Users, count: 'members' },
      { path: ROUTES.generationChars, label: '字辈', icon: BookOpen, count: 'chars', editorOnly: true }
    ]
  },
  {
    label: '家族资料',
    items: [{ path: ROUTES.gallery, label: '家族图册', icon: Image, count: 'photos', pending: true }]
  },
  {
    label: '系统管理',
    adminOnly: true,
    items: [{ path: ROUTES.accounts, label: '账号管理', icon: Shield, count: 'users' }]
  }
];

const roleLabel: Record<string, string> = { admin: '管理员', editor: '编辑', viewer: '访客' };

const Layout: React.FC<LayoutProps> = ({ user, children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, canEditContent } = useUserRole(user);
  const counts = useNavCounts(user?.id, isAdmin);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileWasOpen = useRef(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarCollapsed(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (sidebarRef.current) sidebarRef.current.inert = isMobile && !mobileMenuOpen;
    if (isMobile && mobileMenuOpen) {
      sidebarRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    } else if (isMobile && mobileWasOpen.current) {
      mobileMenuButtonRef.current?.focus();
    }
    mobileWasOpen.current = isMobile && mobileMenuOpen;
  }, [isMobile, mobileMenuOpen]);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
      if (event.key !== 'Tab' || !isMobile || !mobileMenuOpen || !sidebarRef.current) return;
      const focusable = Array.from(sidebarRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobile, mobileMenuOpen]);

  const now = new Date();
  const dateText = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const weekText = '日一二三四五六'[now.getDay()];
  const showLabels = isMobile || !sidebarCollapsed;
  const iconOnly = !isMobile && sidebarCollapsed;
  const currentGroup = NAV_GROUPS.find(g => g.items.some(i => i.path === location.pathname));

  const handleLogout = () => {
    api.logout();
    navigate(ROUTES.login);
  };

  const badgeOf = (item: NavItem): { text: string; warn: boolean; title?: string } | null => {
    if (!counts || !item.count) return null;
    if (item.pending && isAdmin && counts.pending > 0) {
      return { text: String(counts.pending), warn: true, title: `${counts.pending} 张照片待审核` };
    }
    const n = counts[item.count];
    return { text: String(n), warn: false };
  };

  const renderItem = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return null;
    if (item.editorOnly && !canEditContent) return null;
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    const badge = badgeOf(item);
    return (
      <Link key={item.path} to={item.path}
        className={`relative flex items-center gap-2.5 rounded-lg px-2.5 h-9 text-[13px] transition-colors ${
          iconOnly ? 'justify-center px-0' : ''
        } ${
          isActive ? 'bg-cinnabar-50 text-cinnabar-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-cinnabar-700'
        }`}
        title={iconOnly ? `${item.label}${badge ? ` · ${badge.text}` : ''}` : badge?.title}>
        {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-cinnabar-600" />}
        <Icon className="w-4 h-4 flex-shrink-0" />
        {showLabels && <span className="truncate">{item.label}</span>}
        {showLabels && badge && (
          <span className={`nav-badge ${isActive ? 'active' : ''} ${badge.warn ? 'warn' : ''}`}>{badge.text}</span>
        )}
        {iconOnly && badge?.warn && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-gilt-500" />
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex">
      {mobileMenuOpen && isMobile && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside ref={sidebarRef} aria-label="主导航" className={`fixed inset-y-0 left-0 z-50 bg-paper-card border-r border-slate-200 transform transition-all duration-300 ${
        isMobile ? (mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64') : (sidebarCollapsed ? 'w-14' : 'w-56')
      }`}>
        <div className="h-full flex flex-col">
          <div className="h-12 px-3 flex items-center gap-2.5 border-b border-slate-100">
            <span className="seal w-8 h-8 text-base">承</span>
            {showLabels && (
              <span className="font-display text-[15px] font-bold text-slate-900 tracking-wide">承脉</span>
            )}
            {showLabels && (
              <span className="ml-auto text-[10px] text-slate-400 num">v3.0</span>
            )}
          </div>

          <nav aria-label="功能菜单" className="flex-1 px-2 pb-2 overflow-y-auto">
            {NAV_GROUPS.map(group => {
              if (group.adminOnly && !isAdmin) return null;
              const items = group.items.filter(i => (!i.adminOnly || isAdmin) && (!i.editorOnly || canEditContent));
              if (!items.length) return null;
              return (
                <div key={group.label}>
                  {showLabels
                    ? <div className="nav-group">{group.label}</div>
                    : <div className="mx-2 my-2 border-t border-slate-100" />}
                  <div className="space-y-0.5">{items.map(renderItem)}</div>
                </div>
              );
            })}
          </nav>

          {!isMobile && (
            <div className="px-2 py-1.5 border-t border-slate-100">
              <button aria-label={sidebarCollapsed ? '展开菜单' : '收起菜单'} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-full h-7 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:bg-slate-50 hover:text-cinnabar-700 rounded-lg transition-colors">
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-3.5 h-3.5" /><span>收起菜单</span></>}
              </button>
            </div>
          )}

          <div className="p-2 border-t border-slate-100">
            {showLabels ? (
              <div className="flex items-center gap-2 px-1 py-1">
                <span className="w-7 h-7 rounded-md bg-gilt-100 text-gilt-700 font-display font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {(user?.username || '?').slice(0, 1).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 truncate">{user?.username || ''}</p>
                  <p className="text-[10px] text-slate-400">{roleLabel[user?.role || ''] || user?.role}</p>
                </div>
                <button onClick={handleLogout} className="ui-icon-btn" title="退出登录" aria-label="退出登录">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="w-7 h-7 rounded-md bg-gilt-100 text-gilt-700 font-display font-bold text-sm flex items-center justify-center">
                  {(user?.username || '?').slice(0, 1).toUpperCase()}
                </span>
                <button onClick={handleLogout} className="ui-icon-btn" title="退出登录" aria-label="退出登录">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className={`flex-1 min-h-screen transition-all duration-300 ${isMobile ? 'pl-0' : (sidebarCollapsed ? 'ml-14' : 'ml-56')}`}>
        {title && (
          <header className="bg-paper/85 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
            <div className="h-12 px-3 sm:px-4 flex items-center gap-2">
              <button ref={mobileMenuButtonRef} aria-label="打开导航菜单" aria-expanded={mobileMenuOpen}
                onClick={() => isMobile ? setMobileMenuOpen(true) : navigate(ROUTES.dashboard)} className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg">
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              {currentGroup && (
                <>
                  <span className="hidden sm:inline text-xs text-slate-400">{currentGroup.label}</span>
                  <ChevronRight className="hidden sm:inline w-3 h-3 text-slate-300" />
                </>
              )}
              <span className="font-display text-base font-semibold text-slate-900 tracking-wide">{title}</span>
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden sm:inline text-xs text-slate-500 num">{dateText} · 周{weekText}</span>
                {user && (
                  <span className="px-1.5 py-0.5 rounded-md bg-gilt-100 text-gilt-700 text-[11px] font-medium">{roleLabel[user.role] || user.role}</span>
                )}
              </div>
            </div>
          </header>
        )}
        <div className="p-3 sm:p-4">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;