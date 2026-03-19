/*
 * Copyright (c) 2024 by siyuan-plugin-task-note-management. All Rights Reserved.
 * @Author       : siyuan-plugin-task-note-management
 * @Date         : 2024
 * @FilePath     : /src/components/dialogs/QuickReminderDialog.tsx
 * @Description  : 快速创建任务对话框 - 极简表单支持智能日期解析
 */

import React, { useState, useCallback, useEffect } from 'react';
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
import { Calendar, Clock, Sparkles, Zap } from 'lucide-react';

// 优先级选项
const priorityOptions = [
  { value: 'high', label: 'highPriority', labelZh: '高', color: 'bg-red-500', icon: '🔴' },
  { value: 'medium', label: 'mediumPriority', labelZh: '中', color: 'bg-yellow-500', icon: '🟡' },
  { value: 'low', label: 'lowPriority', labelZh: '低', color: 'bg-blue-500', icon: '🔵' },
  { value: 'none', label: 'noPriority', labelZh: '无', color: 'bg-gray-400', icon: '⚪' },
] as const;

// 智能日期解析结果
interface ParsedDateTime {
  date: string;
  time?: string;
  hasTime: boolean;
}

// 提醒数据结构
interface QuickReminder {
  title: string;
  date: string;
  time?: string;
  priority?: 'high' | 'medium' | 'low' | 'none';
}

// i18n 函数类型定义
type I18nFunction = (key: string, params?: Record<string, string>) => string;

// 默认 i18n 函数
const defaultI18n: I18nFunction = (key: string, params?: Record<string, string>) => {
  const defaultTranslations: Record<string, string> = {
    'quickCreateTask': '快速创建任务',
    'quickCreateTaskDesc': '输入任务标题，支持智能日期识别',
    'taskTitle': '任务标题',
    'enterTaskTitle': '输入任务标题，如：明天下午3点开会',
    'taskDate': '日期',
    'taskTime': '时间',
    'priority': '优先级',
    'today': '今天',
    'tomorrow': '明天',
    'nextWeek': '下周',
    'smartDateRecognition': '智能识别',
    'recognizedDate': '识别到日期',
    'cancel': '取消',
    'create': '创建',
    'highPriority': '高',
    'mediumPriority': '中',
    'lowPriority': '低',
    'noPriority': '无',
    'titleRequired': '请输入任务标题',
    'dateRequired': '请选择日期',
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
interface QuickReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reminder: QuickReminder) => void;
  initialDate?: string;
  initialTime?: string;
  i18n?: I18nFunction;
  onDateParse?: (title: string) => ParsedDateTime | null;
}

export const QuickReminderDialog: React.FC<QuickReminderDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
  initialTime,
  i18n = defaultI18n,
  onDateParse,
}) => {
  // 表单状态
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate || getTodayDate());
  const [time, setTime] = useState(initialTime || '');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low' | 'none'>('none');
  const [parsedResult, setParsedResult] = useState<ParsedDateTime | null>(null);
  const [errors, setErrors] = useState<{ title?: string; date?: string }>({});

  // 获取今天日期
  function getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // 智能日期解析
  const parseSmartDate = useCallback((input: string): ParsedDateTime | null => {
    if (onDateParse) {
      return onDateParse(input);
    }

    // 内置简单解析逻辑
    const today = new Date();
    const result: ParsedDateTime = { date: getTodayDate(), hasTime: false };

    // 识别"今天"
    if (input.includes('今天') || input.includes('today')) {
      result.date = getTodayDate();
    }
    // 识别"明天"
    else if (input.includes('明天') || input.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      result.date = tomorrow.toISOString().split('T')[0];
    }
    // 识别"后天"
    else if (input.includes('后天') || input.includes('day after tomorrow')) {
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      result.date = dayAfter.toISOString().split('T')[0];
    }
    // 识别"下周"
    else if (input.includes('下周') || input.includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      result.date = nextWeek.toISOString().split('T')[0];
    }

    // 识别时间（简单模式：XX点XX分 或 XX:XX）
    const timeMatch = input.match(/(\d{1,2})[:\uff1a](\d{1,2})/) ||
                      input.match(/(\d{1,2})\s*[点\u65f6]\s*(\d{0,2})\s*分?/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        result.time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        result.hasTime = true;
      }
    }

    return result;
  }, [onDateParse]);

  // 处理标题变化
  const handleTitleChange = (value: string) => {
    setTitle(value);

    // 自动解析日期
    if (value.length > 2) {
      const parsed = parseSmartDate(value);
      if (parsed) {
        setParsedResult(parsed);
        setDate(parsed.date);
        if (parsed.time) {
          setTime(parsed.time);
        }
      }
    }

    // 清除错误
    if (errors.title && value.trim()) {
      setErrors(prev => ({ ...prev, title: undefined }));
    }
  };

  // 快速选择日期
  const handleQuickDateSelect = (type: 'today' | 'tomorrow' | 'nextWeek') => {
    const today = new Date();
    let newDate = getTodayDate();

    switch (type) {
      case 'today':
        newDate = getTodayDate();
        break;
      case 'tomorrow':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        newDate = tomorrow.toISOString().split('T')[0];
        break;
      case 'nextWeek':
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        newDate = nextWeek.toISOString().split('T')[0];
        break;
    }

    setDate(newDate);
    setParsedResult(null);
  };

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: { title?: string; date?: string } = {};

    if (!title.trim()) {
      newErrors.title = i18n('titleRequired');
    }

    if (!date) {
      newErrors.date = i18n('dateRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理保存
  const handleSave = () => {
    if (!validateForm()) return;

    const reminder: QuickReminder = {
      title: title.trim(),
      date,
      ...(time && { time }),
      ...(priority !== 'none' && { priority }),
    };

    onSave(reminder);
    handleClose();
  };

  // 处理关闭
  const handleClose = () => {
    setTitle('');
    setDate(initialDate || getTodayDate());
    setTime(initialTime || '');
    setPriority('none');
    setParsedResult(null);
    setErrors({});
    onClose();
  };

  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <DialogTitle className="text-lg font-semibold">{i18n('quickCreateTask')}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {i18n('quickCreateTaskDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* 任务标题 */}
          <div className="space-y-2">
            <Label htmlFor="quick-title" className="text-sm font-medium flex items-center gap-2">
              {i18n('taskTitle')}
              {parsedResult && (
                <Badge variant="secondary" className="text-xs font-normal">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {i18n('smartDateRecognition')}
                </Badge>
              )}
            </Label>
            <Input
              id="quick-title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={i18n('enterTaskTitle')}
              className={`h-11 ${errors.title ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          {/* 快速日期选择 */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickDateSelect('today')}
              className="flex-1 text-xs"
            >
              {i18n('today')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickDateSelect('tomorrow')}
              className="flex-1 text-xs"
            >
              {i18n('tomorrow')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickDateSelect('nextWeek')}
              className="flex-1 text-xs"
            >
              {i18n('nextWeek')}
            </Button>
          </div>

          {/* 日期和时间 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quick-date" className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {i18n('taskDate')}
              </Label>
              <Input
                id="quick-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setParsedResult(null);
                  if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
                }}
                className={errors.date ? 'border-red-500' : ''}
              />
              {errors.date && (
                <p className="text-xs text-red-500">{errors.date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-time" className="text-sm font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                {i18n('taskTime')}
              </Label>
              <Input
                id="quick-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* 优先级选择 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{i18n('priority')}</Label>
            <div className="flex gap-2">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                    priority === option.value
                      ? `bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20`
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  <span>{option.icon}</span>
                  <span>{i18n(option.label)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 识别结果提示 */}
          {parsedResult && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium">{i18n('recognizedDate')}</span>
              </div>
              <div className="mt-1 text-muted-foreground pl-6">
                {parsedResult.date}
                {parsedResult.hasTime && ` ${parsedResult.time}`}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30 gap-2">
          <Button variant="outline" onClick={handleClose} className="min-w-[80px]">
            {i18n('cancel')}
          </Button>
          <Button onClick={handleSave} className="min-w-[80px]">
            {i18n('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickReminderDialog;
