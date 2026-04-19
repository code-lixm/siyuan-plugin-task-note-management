# SiYuan Task Note Management Plugin

思源笔记任务管理插件。默认聚焦三大核心入口：任务提醒、项目看板、日历视图。

## 功能概览

- 任务提醒：支持时间提醒、重复规则、优先级、分类
- 项目看板：支持项目分组、状态流转、任务聚合
- 日历视图：支持按时间查看任务与安排
- 任务联动：支持与文档/块关联并快速跳转
- 高级功能：四象限、番茄钟高级入口、批量高级入口可按需开启

## 架构说明（精简后）

- 入口统一：主要动作通过统一 action 层触发，减少重复入口逻辑
- 功能分层：默认核心模式 + 可选高级模式（showAdvancedFeatures）
- 同步收敛：ICS 调度使用单一实现，避免双实现分叉
- 上下文对话框：文档/块提醒查看统一入口（ContextRemindersDialog）

## 安装

在思源笔记插件管理中搜索并安装本插件，安装后启用即可使用。

## 快速开始

1. 打开插件面板，先使用默认精简模式（任务/看板/日历）
2. 按需在设置中开启“显示高级功能”
3. 在任务中绑定文档或块，形成执行与笔记联动

## 开发

```bash
npm install
npm run dev
npm run build
```

常用脚本：

```bash
npm run make-install
npm run make-link
```

## 数据存储

插件使用思源插件数据存储，核心数据文件包括：

- `reminder.json`
- `project.json`
- `habit.json`
- `pomodoro_record.json`
- `reminder-settings.json`
- `statuses.json`
- `categories.json`

## 更新日志

见 `CHANGELOG.md`。
