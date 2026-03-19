/*
 * Copyright (c) 2024 by siyuan-plugin-task-note-management. All Rights Reserved.
 * @Author       : siyuan-plugin-task-note-management
 * @Date         : 2024
 * @FilePath     : /src/components/dialogs/BatchReminderDialog.tsx
 * @Description  : 批量操作对话框 - 支持批量设置日期、优先级、分类、项目
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Tag,
  AlertCircle,
  FolderKanban,
  Layers,
  CheckSquare,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// 优先级选项
const priorityOptions = [
  { value: 'high', label: 'highPriority', labelZh: '高', color: '#ef4444', bgColor: 'bg-red-500', icon: '🔴' },
  { value: 'medium', label: 'mediumPriority', labelZh: '中', color: '#eab308', bgColor: 'bg-yellow-500', icon: '🟡' },
  { value: 'low', label: 'lowPriority', labelZh: '低', color: '#3b82f6', bgColor: 'bg-blue-500', icon: '🔵' },
  { value: 'none', label: 'noPriority', labelZh: '无', color: '#9ca3af', bgColor: 'bg-gray-400', icon: '⚪' },
] as const;

// 分类数据结构
interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

// 项目数据结构
interface Project {
  id: string;
  name: string;
  color?: string;
}

// 任务数据结构
interface Task {
  id: string;
  title: string;
  date?: string;
  time?: string;
  priority?: string;
  categoryId?: string;
  projectId?: string;
  completed?: boolean;
}

// 批量设置选项
interface BatchSettings {
  date?: string;
  time?: string;
  priority?: string;
  categoryId?: string;
  projectId?: string;
  status?: string;
}

// i18n 函数类型定义
type I18nFunction = (key: string, params?: Record<string, string>) => string;

// 默认 i18n 函数
const defaultI18n: I18nFunction = (key: string, params?: Record<string, string>) => {
  const defaultTranslations: Record<string, string> = {
    'batchOperations': '批量操作',
    'batchOperationsDesc': '批量设置选中的 ${count} 个任务',
    'selectedTasks': '已选择 ${count} 个任务',
    'batchSettings': '批量设置',
    'batchSetDate': '设置日期',
    'batchSetPriority': '设置优先级',
    'batchSetCategory': '设置分类',
    'batchSetProject': '设置项目',
    'batchSetStatus': '设置状态',
    'applyToAll': '应用到全部',
    'date': '日期',
    'time': '时间',
    'priority': '优先级',
    'category': '分类',
    'project': '项目',
    'status': '状态',
    'noChange': '不更改',
    'noCategory': '无分类',
    'noProject': '无项目',
    'noPriority': '无优先级',
    'cancel': '取消',
    'confirm': '确认',
    'highPriority': '高优先级',
    'mediumPriority': '中优先级',
    'lowPriority': '低优先级',
    'taskList': '任务列表',
    'expand': '展开',
    'collapse': '收起',
    'smartDateRecognition': '智能日期识别',
    'selectAll': '全选',
    'deselectAll': '取消全选',
    'noTasksSelected': '未选择任务',
  };

  let text = defaultTranslations[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`\${${k}}`, v);
    });
  }
  return text;
};

// 组件属性接口
interface BatchReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onBatchUpdate: (taskIds: string[], settings: BatchSettings) => void;
  categories?: Category[];
  projects?: Project[];
  statuses?: { id: string; name: string; color?: string }[];
  i18n?: I18nFunction;
  initialSettings?: BatchSettings;
}

export const BatchReminderDialog: React.FC<BatchReminderDialogProps> = ({
  isOpen,
  onClose,
  tasks,
  onBatchUpdate,
  categories = [],
  projects = [],
  statuses = [],
  i18n = defaultI18n,
  initialSettings,
}) => {
  // 选中的任务ID列表
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(tasks.map(t => t.id));

  // 批量设置状态
  const [settings, setSettings] = useState<BatchSettings>(initialSettings || {});

  // 展开/收起设置面板
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['date', 'priority']));

  // 是否显示任务列表
  const [showTaskList, setShowTaskList] = useState(false);

  // 更新选中任务列表当tasks变化时
  useEffect(() => {
    setSelectedTaskIds(tasks.map(t => t.id));
  }, [tasks]);

  // 切换设置面板展开状态
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // 更新设置
  const updateSetting = <K extends keyof BatchSettings>(key: K, value: BatchSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value === 'none' ? undefined : value,
    }));
  };

  // 切换任务选中状态
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      } else {
        return [...prev, taskId];
      }
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedTaskIds.length === tasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(tasks.map(t => t.id));
    }
  };

  // 处理确认
  const handleConfirm = () => {
    if (selectedTaskIds.length === 0) return;

    // 过滤掉未设置的值
    const validSettings: BatchSettings = {};
    if (settings.date) validSettings.date = settings.date;
    if (settings.time) validSettings.time = settings.time;
    if (settings.priority && settings.priority !== 'none') validSettings.priority = settings.priority;
    if (settings.categoryId && settings.categoryId !== 'none') validSettings.categoryId = settings.categoryId;
    if (settings.projectId && settings.projectId !== 'none') validSettings.projectId = settings.projectId;
    if (settings.status && settings.status !== 'none') validSettings.status = settings.status;

    onBatchUpdate(selectedTaskIds, validSettings);
    handleClose();
  };

  // 处理关闭
  const handleClose = () => {
    setSettings(initialSettings || {});
    setExpandedSections(new Set(['date', 'priority']));
    setShowTaskList(false);
    onClose();
  };

  // 获取优先级显示
  const getPriorityDisplay = (priorityValue?: string) => {
    const option = priorityOptions.find(p => p.value === priorityValue);
    if (!option) return i18n('noPriority');
    return (
      <span className="flex items-center gap-1.5">
        <span>{option.icon}</span>
        <span>{i18n(option.label)}</span>
      </span>
    );
  };

  // 获取分类显示
  const getCategoryDisplay = (categoryId?: string) => {
    if (!categoryId || categoryId === 'none') return i18n('noCategory');
    const category = categories.find(c => c.id === categoryId);
    if (!category) return i18n('noCategory');
    return (
      <span className="flex items-center gap-1.5">
        {category.icon && <span>{category.icon}</span>}
        <span>{category.name}</span>
      </span>
    );
  };

  // 获取项目显示
  const getProjectDisplay = (projectId?: string) => {
    if (!projectId || projectId === 'none') return i18n('noProject');
    const project = projects.find(p => p.id === projectId);
    if (!project) return i18n('noProject');
    return (
      <span className="flex items-center gap-1.5">
        <FolderKanban className="w-3.5 h-3.5" />
        <span>{project.name}</span>
      </span>
    );
  };

  // 设置面板项组件
  const SettingSection = ({
    title,
    icon: Icon,
    sectionKey,
    children,
    isSet
  }: {
    title: string;
    icon: React.ElementType;
    sectionKey: string;
    children: React.ReactNode;
    isSet?: boolean;
  }) => (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{title}</span>
          {isSet && (
            <Badge variant="secondary" className="text-xs">
              已设置
            </Badge>
          )}
        </div>
        {expandedSections.has(sectionKey) ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {expandedSections.has(sectionKey) && (
        <div className="px-4 py-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <DialogTitle className="text-lg font-semibold">{i18n('batchOperations')}</DialogTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              {i18n('selectedTasks', { count: String(selectedTaskIds.length) })}
            </Badge>
          </div>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {i18n('batchOperationsDesc', { count: String(selectedTaskIds.length) })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* 日期设置 */}
          <SettingSection
            title={i18n('batchSetDate')}
            icon={Calendar}
            sectionKey="date"
            isSet={!!settings.date || !!settings.time}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{i18n('date')}</Label>
                <Input
                  type="date"
                  value={settings.date || ''}
                  onChange={(e) => updateSetting('date', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{i18n('time')}</Label>
                <Input
                  type="time"
                  value={settings.time || ''}
                  onChange={(e) => updateSetting('time', e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </SettingSection>

          {/* 优先级设置 */}
          <SettingSection
            title={i18n('batchSetPriority')}
            icon={AlertCircle}
            sectionKey="priority"
            isSet={!!settings.priority && settings.priority !== 'none'}
          >
            <div className="grid grid-cols-4 gap-2">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateSetting('priority', option.value)}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-md text-xs font-medium transition-all duration-200 ${
                    settings.priority === option.value
                      ? `${option.bgColor} text-white shadow-sm`
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  <span className="text-lg">{option.icon}</span>
                  <span>{i18n(option.label)}</span>
                </button>
              ))}
            </div>
          </SettingSection>

          {/* 分类设置 */}
          <SettingSection
            title={i18n('batchSetCategory')}
            icon={Tag}
            sectionKey="category"
            isSet={!!settings.categoryId && settings.categoryId !== 'none'}
          >
            <Select
              value={settings.categoryId || 'none'}
              onValueChange={(value) => updateSetting('categoryId', value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={i18n('selectCategory')}>
                  {getCategoryDisplay(settings.categoryId)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{i18n('noCategory')}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <span className="flex items-center gap-2">
                      {category.icon && <span>{category.icon}</span>}
                      <span>{category.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingSection>

          {/* 项目设置 */}
          <SettingSection
            title={i18n('batchSetProject')}
            icon={FolderKanban}
            sectionKey="project"
            isSet={!!settings.projectId && settings.projectId !== 'none'}
          >
            <Select
              value={settings.projectId || 'none'}
              onValueChange={(value) => updateSetting('projectId', value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={i18n('selectProject')}>
                  {getProjectDisplay(settings.projectId)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{i18n('noProject')}</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <span className="flex items-center gap-2">
                      {project.color && (
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                      )}
                      <span>{project.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingSection>

          {/* 状态设置（如果有） */}
          {statuses.length > 0 && (
            <SettingSection
              title={i18n('batchSetStatus')}
              icon={CheckSquare}
              sectionKey="status"
              isSet={!!settings.status && settings.status !== 'none'}
            >
              <Select
                value={settings.status || 'none'}
                onValueChange={(value) => updateSetting('status', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={i18n('selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{i18n('noChange')}</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <span className="flex items-center gap-2">
                        {status.color && (
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                        )}
                        <span>{status.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingSection>
          )}

          {/* 任务列表折叠面板 */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTaskList(!showTaskList)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">{i18n('taskList')}</span>
                <Badge variant="secondary" className="text-xs">
                  {selectedTaskIds.length}/{tasks.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectAll();
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  {selectedTaskIds.length === tasks.length ? i18n('deselectAll') : i18n('selectAll')}
                </button>
                {showTaskList ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
            {showTaskList && (
              <div className="max-h-[200px] overflow-y-auto">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      checked={selectedTaskIds.includes(task.id)}
                      onCheckedChange={() => toggleTaskSelection(task.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{task.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        {task.date && <span>{task.date}</span>}
                        {task.priority && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {priorityOptions.find(p => p.value === task.priority)?.icon}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4 gap-2">
          <Button variant="outline" onClick={handleClose} className="min-w-[80px]">
            {i18n('cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedTaskIds.length === 0}
            className="min-w-[80px]"
          >
            {i18n('confirm')} ({selectedTaskIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchReminderDialog;
