/*
 * Copyright (c) 2024 by Task Note Management Plugin. All Rights Reserved.
 * @Author       : Task Note Management Plugin
 * @Date         : 2026-03-19
 * @FilePath     : /src/components/shared/ReminderContextMenu.tsx
 * @Description  : Context menu component for reminder items with priority, category, and date settings
 */

import * as React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ReminderItem } from "@/types/reminder";
import { i18n } from "@/pluginInstance";

// Extended Reminder interface to include additional properties used in the panel
interface Reminder extends ReminderItem {
  blockId?: string;
  docId?: string;
  projectId?: string;
  categoryId?: string;
  priority?: "high" | "medium" | "low" | "none";
  parentId?: string;
  endDate?: string;
  endTime?: string;
  isRepeatInstance?: boolean;
  originalId?: string;
  isSubscribed?: boolean;
  isAvailableToday?: boolean;
  availableStartDate?: string;
  dailyDessertCompleted?: string[];
  dailyDessertIgnored?: string[];
  repeat?: {
    enabled?: boolean;
    type?: string;
    instanceModifications?: {
      [date: string]: {
        priority?: string;
        categoryId?: string;
        date?: string | null;
        endDate?: string;
      };
    };
  };
}

interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface ReminderContextMenuProps {
  children: React.ReactNode;
  reminder: Reminder;
  categories: Category[];
  onEdit: () => void;
  onDelete: () => void;
  onSetPriority: (priority: "high" | "medium" | "low" | "none") => void;
  onSetCategory: (categoryId: string | null) => void;
  onCreateSubtask: () => void;
  onDuplicate: () => void;
  onBindBlock: () => void;
  onSetDate?: (date: string | null) => void;
  onStartPomodoro?: () => void;
  onViewPomodoros?: () => void;
  onCopyBlockRef?: () => void;
  onOpenProjectKanban?: () => void;
  disabled?: boolean;
}

const priorityOptions = [
  { key: "high", label: i18n("high"), icon: "🔴" },
  { key: "medium", label: i18n("medium"), icon: "🟡" },
  { key: "low", label: i18n("low"), icon: "🔵" },
  { key: "none", label: i18n("none"), icon: "⚫" },
] as const;

const quickDateOptions = [
  { key: "today", label: i18n("today"), offset: 0 },
  { key: "tomorrow", label: i18n("tomorrow"), offset: 1 },
  { key: "dayAfterTomorrow", label: i18n("dayAfterTomorrow") || "后天", offset: 2 },
  { key: "nextWeek", label: i18n("nextWeek") || "下周", offset: 7 },
] as const;

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRelativeDateString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

export function ReminderContextMenu({
  children,
  reminder,
  categories,
  onEdit,
  onDelete,
  onSetPriority,
  onSetCategory,
  onCreateSubtask,
  onDuplicate,
  onBindBlock,
  onSetDate,
  onStartPomodoro,
  onViewPomodoros,
  onCopyBlockRef,
  onOpenProjectKanban,
  disabled = false,
}: ReminderContextMenuProps) {
  const currentPriority = reminder.priority || "none";
  const currentCategoryId = reminder.categoryId;
  const isSubscribed = reminder.isSubscribed;
  const isRepeatInstance = reminder.isRepeatInstance;
  const hasBlock = !!reminder.blockId;
  const hasProject = !!reminder.projectId;

  const handleDateSelect = (dateKey: string) => {
    if (!onSetDate) return;
    
    switch (dateKey) {
      case "today":
        onSetDate(getRelativeDateString(0));
        break;
      case "tomorrow":
        onSetDate(getRelativeDateString(1));
        break;
      case "dayAfterTomorrow":
        onSetDate(getRelativeDateString(2));
        break;
      case "nextWeek":
        onSetDate(getRelativeDateString(7));
        break;
      case "clear":
        onSetDate(null);
        break;
      default:
        break;
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={disabled}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56" align="start">
        {/* Edit */}
        <ContextMenuItem onClick={onEdit} disabled={isSubscribed}>
          <span className="mr-2">📝</span>
          {i18n("edit")}
        </ContextMenuItem>

        {/* Copy Block Reference */}
        {hasBlock && onCopyBlockRef && (
          <ContextMenuItem onClick={onCopyBlockRef} disabled={isSubscribed}>
            <span className="mr-2">📋</span>
            {i18n("copyBlockRef") || "复制块引用"}
          </ContextMenuItem>
        )}

        {/* Bind to Block */}
        {!hasBlock && (
          <ContextMenuSub>
            <ContextMenuSubTrigger disabled={isSubscribed}>
              <span className="mr-2">🔗</span>
              {i18n("bindToBlock") || "绑定到块"}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              <ContextMenuItem onClick={onBindBlock}>
                <span className="mr-2">🔗</span>
                {i18n("bindToBlock") || "绑定到块"}
              </ContextMenuItem>
              <ContextMenuItem onClick={onBindBlock}>
                <span className="mr-2">📑</span>
                {i18n("newHeading") || "新建标题"}
              </ContextMenuItem>
              <ContextMenuItem onClick={onBindBlock}>
                <span className="mr-2">📄</span>
                {i18n("newDocument") || "新建文档"}
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator />

        {/* Create Subtask */}
        <ContextMenuItem onClick={onCreateSubtask} disabled={isSubscribed}>
          <span className="mr-2">➕</span>
          {i18n("createSubtask") || "创建子任务"}
        </ContextMenuItem>

        {/* Duplicate */}
        <ContextMenuItem onClick={onDuplicate} disabled={isSubscribed}>
          <span className="mr-2">📄</span>
          {i18n("duplicate") || "复制"}
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Set Priority */}
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={isSubscribed}>
            <span className="mr-2">🎯</span>
            {i18n("setPriority")}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40">
            {priorityOptions.map((option) => (
              <ContextMenuItem
                key={option.key}
                onClick={() => onSetPriority(option.key)}
                className={currentPriority === option.key ? "bg-accent" : ""}
              >
                <span className="mr-2">{option.icon}</span>
                <span className="flex-1">{option.label}</span>
                {currentPriority === option.key && (
                  <span className="ml-2 text-xs text-muted-foreground">✓</span>
                )}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Set Category */}
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={isSubscribed}>
            <span className="mr-2">🏷️</span>
            {i18n("setCategory") || "设置分类"}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {/* No Category Option */}
            <ContextMenuItem
              onClick={() => onSetCategory(null)}
              className={!currentCategoryId ? "bg-accent" : ""}
            >
              <span className="mr-2">❌</span>
              <span className="flex-1">{i18n("noCategory")}</span>
              {!currentCategoryId && (
                <span className="ml-2 text-xs text-muted-foreground">✓</span>
              )}
            </ContextMenuItem>

            <ContextMenuSeparator />

            {/* Category List */}
            {categories.map((category) => (
              <ContextMenuItem
                key={category.id}
                onClick={() => onSetCategory(category.id)}
                className={currentCategoryId === category.id ? "bg-accent" : ""}
              >
                <span className="mr-2">{category.icon || "📁"}</span>
                <span className="flex-1">{category.name}</span>
                {currentCategoryId === category.id && (
                  <span className="ml-2 text-xs text-muted-foreground">✓</span>
                )}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Set Date */}
        {onSetDate && (
          <ContextMenuSub>
            <ContextMenuSubTrigger disabled={isSubscribed}>
              <span className="mr-2">📅</span>
              {i18n("setDate") || "设置日期"}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40">
              {quickDateOptions.map((option) => (
                <ContextMenuItem
                  key={option.key}
                  onClick={() => handleDateSelect(option.key)}
                >
                  <span className="mr-2">📅</span>
                  {option.label}
                </ContextMenuItem>
              ))}
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => handleDateSelect("clear")}>
                <span className="mr-2">❌</span>
                {i18n("clearDate") || "清除日期"}
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator />

        {/* Project Kanban */}
        {hasProject && onOpenProjectKanban && (
          <ContextMenuItem onClick={onOpenProjectKanban}>
            <span className="mr-2">📊</span>
            {i18n("openProjectKanban") || "打开项目看板"}
          </ContextMenuItem>
        )}

        {/* Pomodoro */}
        {onStartPomodoro && (
          <ContextMenuItem onClick={onStartPomodoro} disabled={isSubscribed}>
            <span className="mr-2">🍅</span>
            {i18n("startPomodoro") || "开始番茄钟"}
          </ContextMenuItem>
        )}

        {onViewPomodoros && (
          <ContextMenuItem onClick={onViewPomodoros}>
            <span className="mr-2">📊</span>
            {i18n("viewPomodoros") || "查看番茄钟"}
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {/* Delete */}
        <ContextMenuItem
          onClick={onDelete}
          disabled={isSubscribed}
          className="text-destructive focus:text-destructive"
        >
          <span className="mr-2">🗑️</span>
          {i18n("delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export type { Reminder, Category, ReminderContextMenuProps };
export default ReminderContextMenu;
