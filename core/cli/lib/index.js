'use strict';

module.exports = core;

const path = require('path');
const semver = require('semver');
const colors = require('colors');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;
const commander = require('commander');

const pkg = require('../package.json');
const log = require('@axton-cli/log');
const exec = require('@axton-cli/exec');

const {
	LOWEST_NODE_VERSION,
	DEFAULT_CLI_HOME
} = require('./const');

const program = new commander.Command();

async function core() {
  try {
		if (!process.argv.slice(2).length) {
			showCliInfo();
		}
		await prepare();
		registerCommand();
	} catch(e) {
		log.error(e.message);
		if (program.opts().debug) {
			console.log(e);
		}
	}
}

function showCliInfo() {
	console.log(colors.cyan("欢迎使用 axton-cli 脚手架！"));
	console.log(colors.cyan("开发者："), "Axton Tang");
	console.log(colors.cyan("N p m： "), colors.underline("https://www.npmjs.com/package/@axton-cli/core"));
	console.log(colors.cyan("Github："), colors.underline("https://github.com/Axton-Tang/axton-cli"));
	console.log(colors.cyan(`
  ##   #    # #####  ####  #    #        ####  #      # 
 #  #   #  #    #   #    # ##   #       #    # #      # 
#    #   ##     #   #    # # #  # ##### #      #      # 
######   ##     #   #    # #  # #       #      #      # 
#    #  #  #    #   #    # #   ##       #    # #      # 
#    # #    #   #    ####  #    #        ####  ###### # 
	\n`));
}

async function prepare() {
	checkPkgVersion();
	checkNodeVersion()
	checkRoot();
	checkUserHome();
	checkEnv();
	await checkGlobalUpdate();
}

function registerCommand () {
	program
		.name('axton-cli')
		.usage('<command> [options]')
		.version(pkg.version)
		.option('-d, --debug', '是否开启调试模式', false)
		.option('-tp, --targetPath <targetPath>', '是否指定本地文件调试路径', '')

	program
		.command('init [projectName]')
		.option('-f, --force', '是否强制初始化项目')
		.action(exec);
	
	program
		.command('info')
		.description('查看脚手架信息')
		.action(() => {
			showCliInfo();
		})
	
	// 开启 debug 模式
	program.on('option:debug', () => {
		const options = program.opts();
		if (options.debug) {
			process.env.LOG_LEVEL = 'verbose';
		} else {
			process.env.LOG_LEVEL = 'info';
		}
		log.level = process.env.LOG_LEVEL;
		log.verbose('进入 debug 模式');
	})

	program.on('option:targetPath', () => {
		const options = program.opts();
		process.env.CLI_TARGET_PATH = options.targetPath;
	})

	// 对未知命令监听
	program.on('command:*', (obj) => {
		console.error(colors.red('未知命令：', obj[0]));
		const availableCommands = program.commands.map(cmd => cmd.name());
		if (availableCommands.length > 0) {
			console.log('可用命令：', availableCommands.join(','));
		}
	})

	program.parse(process.argv);
}

async function checkGlobalUpdate() {
	const currentVersion = pkg.version;
	const npmName = pkg.name;
	const { getNpmSemverVersion } = require('@axton-cli/get-npm-info');
	const latestVersion = await getNpmSemverVersion(currentVersion, npmName);
	if (latestVersion && semver.gt(latestVersion, currentVersion)) {
		 log.warn(colors.yellow(`请手动更新 ${npmName}，当前版本：${currentVersion}，最新版本：${latestVersion}
                更新命令： npm install -g ${npmName}`));
	}
}

function checkEnv() {
	const dotenv = require('dotenv');
	dotenv.config({
		path: path.resolve(userHome, '.env') // 通过此方式设置环境变量，之后可以通过process.env来获取
	})
	createCliConfig();
}

function createCliConfig() {
	const cliConfig = {
		home: userHome
	};
	if (process.env.CLI_HOME) {
		cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
	} else {
		cliConfig['cliHome'] = path.join(userHome, DEFAULT_CLI_HOME);
	}
	process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

function checkUserHome() {
	if (!userHome || !pathExists(userHome)) {
		throw new Error(colors.red('当前登录用户主目录不存在！'));
	}
}

function checkRoot() {
	const rootCheck = require('root-check');
	rootCheck();
}

function checkNodeVersion() {
	const currentVersion = process.version;
	const lowestVersion = LOWEST_NODE_VERSION;
	if (!semver.gte(currentVersion, lowestVersion)) {
		throw new Error(colors.red(`Node.js 的最低版本要求为 ${lowestVersion}`));
	}
}

function checkPkgVersion() {
	log.notice('cli', pkg.version);
}
