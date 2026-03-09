# SiYuan Task Note Management Plugin

思源笔记任务管理插件。默认聚焦三大核心入口：任务提醒、项目看板、日历视图。

## 功能概览

- 任务提醒：支持时间提醒、重复规则、优先级、分类
- 项目看板：支持项目分组、状态流转、任务聚合
- 日历视图：支持按时间查看任务与安排
- 任务联动：支持与文档/块关联并快速跳转
- 高级功能：四象限、番茄钟高级入口、批量高级入口可按需开启

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
