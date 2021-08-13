'use strict';

const path = require('path');
const fse = require('fs-extra');
const pkgDir = require('pkg-dir').sync;
const pathExists = require('path-exists').sync;
const npminstall = require('npminstall');
const { isObject } = require('@axton-cli/utils');
const { getDefaultRegistry, getNpmLatestVersion } = require('@axton-cli/get-npm-info');
const formatPath = require('@axton-cli/format-path');

class Package {
  constructor(options) {
    if (!options) {
      throw new Error('Package 类的 options 不能为空！')
    }
    if (!isObject(options)) {
      throw new Error('Package 类的 options 必须为对象！')
    }
    this.targetPath = options.targetPath;
    this.storeDir = options.storeDir;
    this.packageName = options.packageName;
    this.packageVersion = options.packageVersion;
    this.cacheFilePathPrefix = this.packageName.replace('/', '_');
  }

  async prepare() {
    // 如果目录不存在，将其创建好
    if (this.storeDir && !pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir);
    }
    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  // 由于缓存路径中的文件命名为 _@axton-cli_init@1.1.0@@axton-cli/ 的格式，此处需要按照此格式生成路径
  get cacheFilePath() {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`);
  }

  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`);
  }


  async exists() {
    if (this.storeDir) {
      await this.prepare();
      return pathExists(this.cacheFilePath);
    } else {
      return pathExists(this.targetPath);
    }
  }

  async install() {
    await this.prepare();

    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [{
        name: this.packageName,
        version: this.packageVersion
      }]
    });
  }

  async update() {
    await this.prepare();
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    if (!pathExists(latestFilePath)) {
      await npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [{
          name: this.packageName,
          version: latestPackageVersion
        }]
      });
      this.packageVersion = packageVersion;
    }
  }

  // 获取入口文件路径（main）
  getRootFilePath() {
    function _getRootFile(targetPath) {
      const dir = pkgDir(targetPath);
      if (dir) {
        const pkgFile = require(path.resolve(dir, 'package.json'));
        if (pkgFile && pkgFile.main) {
          return formatPath(path.resolve(dir, pkgFile.main));
        }
      }
      return null;
    }
    if (this.storeDir) {
      return _getRootFile(this.cacheFilePath);
    } else {
      return _getRootFile(this.targetPath);
    }
    
  }

}

module.exports = Package;
