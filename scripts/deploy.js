/**
 * 构建后部署脚本：将 dist 目录内容同步到指定路径
 * 
 * 配置方式（优先级从高到低）：
 *   1. 命令行参数：node scripts/deploy.js /path/to/target
 *   2. 环境变量：SIYUAN_PLUGIN_DIR=/path/to/plugins
 *   3. 下方 DEPLOY_TARGET 常量
 */
import fs from 'fs';
import path from 'path';

// ============ 配置区 ============
// 直接写死目标路径（留空则使用环境变量或命令行参数）
// const DEPLOY_TARGET = '/Users/lixiaoming/Documents/siyuan/我的文档/data/plugins/siyuan-plugin-task-daily';
const DEPLOY_TARGET = '/Users/lixiaoming/Documents/我的文档/data/plugins/siyuan-plugin-task-daily';
// ================================

function getTargetDir() {
    // 1. 命令行参数
    const arg = process.argv[2];
    if (arg) return arg;

    // 2. 常量配置
    if (DEPLOY_TARGET) return DEPLOY_TARGET;

    // 3. 环境变量
    const env = process.env.SIYUAN_PLUGIN_DIR;
    if (env) {
        const pluginName = JSON.parse(fs.readFileSync('plugin.json', 'utf-8')).name;
        return path.join(env, pluginName);
    }

    return null;
}

function cleanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        fs.rmSync(fullPath, { recursive: true, force: true });
    }
}

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// 主流程
const targetDir = getTargetDir();
if (!targetDir) {
    console.error('[deploy] 未配置目标路径，请设置 DEPLOY_TARGET 常量、环境变量或命令行参数');
    process.exit(1);
}

const distDir = path.join(process.cwd(), 'dist');
if (!fs.existsSync(distDir)) {
    console.error('[deploy] dist 目录不存在，请先运行 build');
    process.exit(1);
}

console.log(`[deploy] dist -> ${targetDir}`);

// 清空目标目录
cleanDir(targetDir);
console.log('[deploy] 已清空目标目录');

// 复制 dist 到目标
copyDir(distDir, targetDir);
console.log('[deploy] 部署完成');
