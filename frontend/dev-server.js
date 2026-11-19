// 单进程 dev server 入口：绕过 webpack-cli 的多层 spawn（node→sh→cli→server），
// 便于 start.sh 以 pid 精确管理生命周期；配置仍复用 webpack.config.js
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');

const config = require('./webpack.config.js')({}, { mode: 'development' });
const compiler = webpack(config);
const server = new WebpackDevServer(config.devServer, compiler);

server.startCallback(() => {
  console.log(`[dev] http://localhost:${config.devServer.port}`);
});