# 项目概述

## 项目名称
SiYuan Task Note Management Plugin (siyuan-plugin-task-daily)

## 项目目的
思源笔记任务管理插件，实现防弹笔记法（Bullet Journal Method）。提供任务提醒、项目看板、日历视图等核心功能，支持与文档/块联动。

## 核心功能
1. **任务提醒** - 支持时间提醒、重复规则、优先级、分类
2. **项目看板** - 支持项目分组、状态流转、任务聚合
3. **日历视图** - 支持按时间查看任务与安排
4. **高级功能** - 四象限、番茄钟、习惯追踪等

## Tech Stack
- **语言**: TypeScript 5.1.3
- **构建**: Vite 5.2.9
- **框架**: Svelte 4.2.19 (仅部分UI组件)
- **UI库**: FullCalendar 6.1.20, Milkdown 7.18.0
- **样式**: SCSS/Sass
- **运行环境**: SiYuan Note 插件环境

## 数据结构
核心数据存储在JSON文件：
- reminder.json - 任务提醒
- project.json - 项目数据（含分组、里程碑）
- statuses.json - 项目状态
- categories.json - 任务分类
- habit.json / habitGroup.json - 习惯追踪
- pomodoro_record.json - 番茄钟记录

## 数据管理器
- ProjectManager - 项目、分组、里程碑、看板状态
- StatusManager - 项目状态
- CategoryManager - 任务分类
- HabitGroupManager - 习惯分组
- PomodoroRecordManager - 番茄钟记录