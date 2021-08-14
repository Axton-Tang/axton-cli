'use strict';

const path = require('path');
const Package = require('@axton-cli/package');
const log = require('@axton-cli/log');

const SETTINGS = {
  init: '@axton-cli/init'
};

const CACHE_DIR = 'dependencies';

async function exec() {
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  let storeDir = '';
  let pkg;
  log.verbose('homePath', homePath);


  const cmdObj = arguments[arguments.length - 1];
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = 'latest';

  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR);
    storeDir = path.resolve(targetPath, 'node_modules');
    log.verbose('targetPath', targetPath);
    log.verbose('storeDir', storeDir);
    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion
    });
    if (await pkg.exists()) {
      // 更新 package
      await pkg.update();
    } else {
      // 安装package
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion
    });
  }
  const rootFile = pkg.getRootFilePath();
  if (rootFile) {
    try {
      log.verbose('rootFile', rootFile);
      await require(rootFile).call(null, Array.from(arguments));
    } catch(e) {
      log.error(e.message);
    }
  }
}

module.exports = exec;
