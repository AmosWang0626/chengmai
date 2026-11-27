import React from 'react';

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-paper p-6">
          <div className="ui-card max-w-md p-6 text-center" role="alert">
            <h1 className="font-display text-xl font-bold text-slate-900">页面暂时无法显示</h1>
            <p className="mt-2 text-sm text-slate-600">请重新加载页面；如果问题持续出现，请检查服务状态。</p>
            <button type="button" className="ui-btn-primary mt-5" onClick={() => window.location.reload()}>重新加载</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
