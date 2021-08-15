'use strict';


const log = require('npmlog');

log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info'; // 判断 debug 模式

log.heading = 'axton-cli';  // 修改前缀
log.headingStyle = { fg: 'black', bg: 'white' };
log.addLevel('success', 2000, { fg: 'green', bold: true })  // 添加自定义命令

module.exports = log;
