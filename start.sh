#!/usr/bin/env bash
# 承脉 ChengMai · 统一启动脚本
# 用法：
#   ./start.sh            生产模式：按需构建 jar / dist，启动后端（8080，同进程托管前端）
#   ./start.sh dev        开发模式：后端 8080 + 前端 dev server 3266（热更新）
#   ./start.sh stop       停止本脚本启动的前后端进程
#   ./start.sh restart    重启后端（重建 jar 后必须重启，见 README）
#   ./start.sh status     查看运行状态
#   ./start.sh build      仅构建（后端 jar + 前端 dist），不启动
# 环境变量：PORT（后端端口，默认 8080）、DATA_DIR、STATIC_DIR、MVN（maven 路径）、SKIP_TESTS=1 跳过单测
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$(pwd)
RUN="$ROOT/run"
mkdir -p "$RUN"

PORT="${PORT:-8080}"
DEV_PORT=3266
JAR="backend/target/chengmai-backend.jar"
MVN="${MVN:-mvn}"
command -v "$MVN" >/dev/null 2>&1 || MVN="$HOME/tools/apache-maven-3.9.16/bin/mvn"

log()  { printf '\033[31m[承脉]\033[0m %s\n' "$*"; }
ok()   { printf '\033[32m[承脉]\033[0m %s\n' "$*"; }

pid_of() { # $1=backend|frontend
  local f="$RUN/$1.pid"
  [ -f "$f" ] || return 1
  local p; p=$(cat "$f" 2>/dev/null || true)
  [ -n "$p" ] && kill -0 "$p" 2>/dev/null || return 1
  echo "$p"
}

wait_port() { # $1=port $2=名称
  local i
  for i in $(seq 1 60); do
    if curl -s -o /dev/null "http://localhost:$1/"; then ok "$2 已就绪 → http://localhost:$1"; return 0; fi
    sleep 1
  done
  log "$2 启动超时，查看 $RUN/$2.log"
  return 1
}

build_backend() {
  log "构建后端 jar（含单测$( [ "${SKIP_TESTS:-}" = 1 ] && echo '，已跳过' )）…"
  if [ "${SKIP_TESTS:-}" = 1 ]; then
    "$MVN" -q -f backend/pom.xml package -DskipTests
  else
    "$MVN" -q -f backend/pom.xml package
  fi
  ok "后端构建完成：$JAR"
}

build_frontend() {
  [ -d frontend/node_modules ] || (cd frontend && npm install)
  log "构建前端 dist…"
  (cd frontend && npm run build)
  ok "前端构建完成：frontend/dist"
}

start_backend() {
  if pid_of backend >/dev/null; then ok "后端已在运行（pid $(pid_of backend)）"; return 0; fi
  [ -f "$JAR" ] || build_backend
  # 运行快照而非 target 原文件：后续 mvn package 覆盖 jar 时，不会破坏运行中 JVM 的懒加载
  local run_jar="$RUN/chengmai-backend.jar"
  cp "$JAR" "$run_jar"
  log "启动后端（端口 ${PORT}）…"
  nohup java --enable-native-access=ALL-UNNAMED -jar "$run_jar" >"$RUN/backend.log" 2>&1 &
  echo $! >"$RUN/backend.pid"
  wait_port "$PORT" backend
}

start_frontend() {
  if pid_of frontend >/dev/null; then ok "前端 dev 已在运行（pid $(pid_of frontend)）"; return 0; fi
  local occ
  occ=$(lsof -i:"$DEV_PORT" -sTCP:LISTEN -t 2>/dev/null | head -1 || true)
  if [ -n "$occ" ]; then log "端口 $DEV_PORT 被外部进程 $occ 占用，请先处理（kill ${occ}）"; return 1; fi
  [ -d frontend/node_modules ] || (cd frontend && npm install)
  log "启动前端 dev server（端口 ${DEV_PORT}）…"
  # 单进程入口 dev-server.js；bash 后台 fork 拓扑下 $! 未必等于监听进程，故启动后按端口反查真实 pid
  (cd frontend && nohup node dev-server.js >"$RUN/frontend.log" 2>&1 &)
  wait_port "$DEV_PORT" frontend
  lsof -i:"$DEV_PORT" -sTCP:LISTEN -t 2>/dev/null | head -1 >"$RUN/frontend.pid"
}

stop_one() { # $1=backend|frontend
  local p
  if p=$(pid_of "$1"); then
    log "停止 ${1}（pid ${p}，含子进程组）…"
    kill -- "-$p" 2>/dev/null || kill "$p" 2>/dev/null || true
    local i
    for i in $(seq 1 10); do kill -0 "$p" 2>/dev/null || break; sleep 1; done
    if kill -0 "$p" 2>/dev/null; then kill -9 -- "-$p" 2>/dev/null || kill -9 "$p" 2>/dev/null || true; fi
    rm -f "$RUN/$1.pid"
    ok "$1 已停止"
  else
    rm -f "$RUN/$1.pid"
    log "$1 未在运行"
  fi
}

status() {
  local p
  if p=$(pid_of backend); then ok "后端  运行中 pid=$p  → http://localhost:$PORT"; else log "后端  未运行"; fi
  if p=$(pid_of frontend); then ok "前端  运行中 pid=$p  → http://localhost:$DEV_PORT"; else log "前端  未运行（生产模式由后端托管 dist）"; fi
}

case "${1:-start}" in
  start)
    [ -d frontend/dist ] || build_frontend
    start_backend
    ok "生产模式就绪：http://localhost:$PORT （前端由后端同进程托管）"
    ;;
  dev)
    start_backend
    start_frontend
    ok "开发模式就绪：前端 http://localhost:$DEV_PORT （代理 /api → ${PORT}）"
    ;;
  stop)
    stop_one frontend
    stop_one backend
    ;;
  restart)
    stop_one backend
    start_backend
    ;;
  status)
    status
    ;;
  build)
    build_backend
    build_frontend
    ;;
  *)
    echo "用法：$0 {start|dev|stop|restart|status|build}"
    exit 1
    ;;
esac