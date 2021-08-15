'use strict';

const path = require('path');
const fs = require('fs');
const inquirer = require('inquirer');
const semver = require('semver');
const userHome = require('user-home');
const axios = require('axios');
const fse = require('fs-extra');
const ejs = require('ejs');
const log = require('@axton-cli/log');
const Package = require('@axton-cli/package');
const { spinnerStart } = require('@axton-cli/utils');

let projectName, force, projectInfo, templates, selectTemplateInfo, templateNpm;

const BASE_URL = 'http://cli.axton.top/project/getTemplate';
axios.defaults.timeout = 10000;

async function init(argv) {
  projectName = argv[0] || '';
  force = !!argv[1].force;
  log.verbose('projectName', projectName);
  log.verbose('force', force);
  // 准备阶段
  const prepareRes = await prepare();
  if (prepareRes) {
    // 下载模板
    await downloadTemplate();
    // 安装模板
    await installTemplate();
  }
}

async function prepare() {
  // 获取项目模板
  await getProjectTemplates();

  const localPath = process.cwd();
  const fileList = fs.readdirSync(localPath);
  // 判断当前安装目录是否为空
  const isCwdEmpty = fileList.length ? false : true;
  if (!isCwdEmpty) {
    if (force) {
      fse.emptyDirSync(localPath);
    } else {
      const { ifContinue } = await inquirer.prompt({
        type: 'confirm',
        name: 'ifContinue',
        default: false,
        message: '当前文件夹不为空，是否继续创建项目？'
      });
      if (ifContinue) {
        fse.emptyDirSync(localPath);
      } else {
        return false;
      }
    }
  }
  // 获取项目信息
  projectInfo = await getProjectInfo();
  log.verbose("项目信息", projectInfo);
  return true;
}

async function getProjectTemplates() {
  await axios.get(BASE_URL).then(res => {
    if (res && res.data && res.data.length) {
      templates = res.data;
      log.verbose('项目模板信息', templates);
    } else {
      throw new Error('项目模板获取失败！');
    }
  }).catch(() => {
    throw new Error('项目模板获取失败！');
  })
}

async function getProjectInfo() {
  const projectInfo = await inquirer.prompt([{
    type: 'input',
    name: 'projectName',
    message: '请输入项目名称',
    validate: function(v) {
      return !!v.length;
    }
  }, {
    type: 'input',
    name: 'projectVersion',
    message: '请输入项目版本号',
    default: '1.0.0',
    validate: function(v) {
      return !!semver.valid(v);
    },
    filter: function(v) {
      if (!!semver.valid(v)) {
        return semver.valid(v);
      } else {
        return v;
      }
    }
  }, {
    type: 'list',
    name: 'projectTemplate',
    message: '请选择项目模板',
    choices: function () {
      return templates.map(item => ({
        name: item.name,
        value: item.npmName
      }))
    }
  }]);
  return projectInfo;
}

async function downloadTemplate() {
  selectTemplateInfo = templates.find(item => item.npmName === projectInfo.projectTemplate);
  log.verbose('选中的模板信息', selectTemplateInfo);
  const targetPath = path.resolve(userHome, '.axton-cli', 'template');
  const storeDir = path.resolve(userHome, '.axton-cli', 'template', 'node_modules');
  const { npmName, version } = selectTemplateInfo;
  templateNpm = new Package({
    targetPath,
    storeDir,
    packageName: npmName,
    packageVersion: version
  })
  if (! await templateNpm.exists()) {
    const spinner = spinnerStart('正在下载模板...');
    try {
      await templateNpm.install();
      log.success('模板下载成功！');
    } catch(e) {
      throw e;
    } finally {
      spinner.stop(true);
    }
  } else {
    const spinner = spinnerStart('正在更新模板...');
    try {
      await templateNpm.update();
      spinner.stop(true);
      log.success('模板更新成功！');
    } catch (e) {
      throw e;
    } finally {
      spinner.stop(true);
    }
  }
}

async function installTemplate() {
  let spinner = spinnerStart('正在安装模板...');
  try{
    const templatePath = path.resolve(templateNpm.cacheFilePath, 'template');
    const targetPath = process.cwd();
    fse.ensureDirSync(templatePath);
    fse.ensureDirSync(targetPath);
    fse.copySync(templatePath, targetPath);
    ejsRender();
    spinner.stop(true);
    log.success('模板安装成功！');
  } catch (e) {
    throw e;
  } finally {
    spinner.stop(true);
  }
}

function ejsRender() {
  return new Promise((resolve, reject) => {
    const dir = process.cwd();
    require('glob')('**', {
      cwd: dir,
      ignore: ['node_modules/**', 'public/**', 'src/assets/**'],
      nodir: true
    }, (err, files) => {
      if (err) {
        reject(err);
      }
      Promise.all(files.map(file => {
        const filePath = path.join(dir, file);
        return new Promise((res, rej) => {
          ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
            if (err) {
              rej(err);
            } else {
              fse.writeFileSync(filePath, result);
              res(result);
            }
          })
        })
      })).then(() => {
        resolve()
      }).catch(err => {
        reject(err);
      })
    })
  })
}

module.exports = init;
