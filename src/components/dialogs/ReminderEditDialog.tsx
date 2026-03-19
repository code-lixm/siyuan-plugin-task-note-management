/*
 * Copyright (c) 2024 by siyuan-plugin-task-note-management. All Rights Reserved.
 * @Author       : siyuan-plugin-task-note-management
 * @Date         : 2024
 * @FilePath     : /src/components/dialogs/ReminderEditDialog.tsx
 * @Description  : 任务编辑对话框组件 - 支持创建和编辑任务
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Tag, AlertCircle, Repeat, AlignLeft, CheckCircle2 } from 'lucide-react';

// 优先级选项
const priorityOptions = [
  { value: 'high', label: 'highPriority', labelEn: 'High', color: 'bg-red-500', icon: '🔴' },
  { value: 'medium', label: 'mediumPriority', labelEn: 'Medium', color: 'bg-yellow-500', icon: '🟡' },
  { value: 'low', label: 'lowPriority', labelEn: 'Low', color: 'bg-green-500', icon: '🟢' },
  { value: 'none', label: 'noPriority', labelEn: 'None', color: 'bg-gray-400', icon: '⚪' },
] as const;

// 重复规则选项
const repeatOptions = [
  { value: 'none', label: 'noRepeat', labelEn: 'No Repeat' },
  { value: 'daily', label: 'daily', labelEn: 'Daily' },
  { value: 'weekly', label: 'weekly', labelEn: 'Weekly' },
  { value: 'monthly', label: 'monthly', labelEn: 'Monthly' },
  { value: 'yearly', label: 'yearly', labelEn: 'Yearly' },
] as const;

// i18n 函数类型定义
type I18nFunction = (key: string, params?: Record<string, string>) => string;

// 提醒数据结构
interface Reminder {
  id?: string;
  title: string;
  date?: string;
  time?: string;
  endDate?: string;
  endTime?: string;
  priority?: 'high' | 'medium' | 'low' | 'none';
  categoryId?: string;
  note?: string;
  completed?: boolean;
  createdAt?: string;
  repeat?: {
    enabled: boolean;
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    interval?: number;
    endType?: 'never' | 'date' | 'count';
    endDate?: string;
    count?: number;
  };
}

// 分类数据结构
interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

// 组件属性接口
interface ReminderEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: Reminder | null;
  onSave: (updatedReminder: Partial<Reminder>) => void;
  categories?: Category[];
  i18n?: I18nFunction;
  isCreating?: boolean;
}

// 默认 i18n 函数
const defaultI18n: I18nFunction = (key: string, params?: Record<string, string>) => {
  const defaultTranslations: Record<string, string> = {
    'editTask': '编辑任务',
    'createTask': '创建任务',
    'taskTitle': '任务标题',
    'enterTaskTitle': '请输入任务标题',
    'taskDate': '任务日期',
    'taskTime': '任务时间',
    'endDate': '结束日期',
    'endTime': '结束时间',
    'priority': '优先级',
    'category': '分类',
    'selectCategory': '选择分类',
    'noCategory': '无分类',
    'repeat': '重复',
    'noRepeat': '不重复',
    'note': '备注',
    'enterNote': '输入备注...',
    'cancel': '取消',
    'save': '保存',
    'highPriority': '高',
    'mediumPriority': '中',
    'lowPriority': '低',
    'noPriority': '无',
    'daily': '每天',
    'weekly': '每周',
    'monthly': '每月',
    'yearly': '每年',
    'allDay': '全天',
    'timeRange': '时间段',
    'required': '必填',
    'titleRequired': '请输入任务标题',
    'invalidDate': '日期格式不正确',
  };
  
  let text = defaultTranslations[key] || key;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      text = text.replace(`\${${key}}`, value);
    });
  }
  return text;
};

export const ReminderEditDialog: React.FC<ReminderEditDialogProps> = ({
  isOpen,
  onClose,
  reminder,
  onSave,
  categories = [],
  i18n = defaultI18n,
  isCreating = false,
}) => {
  // 表单状态
  const [formData, setFormData] = useState<Reminder>({
    title: '',
    date: '',
    time: '',
    endDate: '',
    endTime: '',
    priority: 'none',
    categoryId: '',
    note: '',
    repeat: {
      enabled: false,
      type: 'daily',
    },
  });

  // 验证错误状态
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // 时间段模式
  const [isTimeRange, setIsTimeRange] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (reminder) {
        setFormData({
          title: reminder.title || '',
          date: reminder.date || '',
          time: reminder.time || '',
          endDate: reminder.endDate || '',
          endTime: reminder.endTime || '',
          priority: reminder.priority || 'none',
          categoryId: reminder.categoryId || '',
          note: reminder.note || '',
          repeat: reminder.repeat || { enabled: false, type: 'daily' },
        });
        setIsTimeRange(!!reminder.endDate);
      } else {
        // 创建新任务 - 使用今天的日期作为默认值
        const today = new Date().toISOString().split('T')[0];
        setFormData({
          title: '',
          date: today,
          time: '',
          endDate: '',
          endTime: '',
          priority: 'none',
          categoryId: '',
          note: '',
          repeat: { enabled: false, type: 'daily' },
        });
        setIsTimeRange(false);
      }
      setErrors({});
    }
  }, [isOpen, reminder]);

  // 表单验证
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = i18n('titleRequired');
    }

    if (formData.date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) {
      newErrors.date = i18n('invalidDate');
    }

    if (isTimeRange && formData.endDate && formData.date) {
      if (new Date(formData.endDate) < new Date(formData.date)) {
        newErrors.endDate = i18n('endDateCannotBeEarlier');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isTimeRange, i18n]);

  // 保存处理
  const handleSave = useCallback(() => {
    if (!validateForm()) {
      return;
    }

    const updatedReminder: Partial<Reminder> = {
      title: formData.title.trim(),
      date: formData.date || undefined,
      time: formData.time || undefined,
      priority: formData.priority,
      categoryId: formData.categoryId || undefined,
      note: formData.note.trim() || undefined,
    };

    if (isTimeRange) {
      updatedReminder.endDate = formData.endDate || undefined;
      updatedReminder.endTime = formData.endTime || undefined;
    }

    if (formData.repeat?.enabled) {
      updatedReminder.repeat = formData.repeat;
    }

    onSave(updatedReminder);
    onClose();
  }, [formData, isTimeRange, validateForm, onSave, onClose]);

  // 表单字段更新
  const updateField = useCallback(<K extends keyof Reminder>(
    field: K,
    value: Reminder[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  // 获取优先级配置
  const getPriorityConfig = (priority: string) => {
    return priorityOptions.find(p => p.value === priority) || priorityOptions[3];
  };

  const priorityConfig = getPriorityConfig(formData.priority || 'none');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isCreating ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-primary" />
                {i18n('createTask')}
              </>
            ) : (
              <>
                <AlignLeft className="w-5 h-5 text-primary" />
                {i18n('editTask')}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isCreating ? i18n('createTaskDesc') || '填写任务详情以创建新任务' : i18n('editTaskDesc') || '修改任务信息并保存'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 任务标题 */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-1 text-sm font-medium">
              {i18n('taskTitle')}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder={i18n('enterTaskTitle')}
              className={errors.title ? 'border-destructive' : ''}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title}
              </p>
            )}
          </div>

          {/* 时间段切换 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="timeRange"
              checked={isTimeRange}
              onCheckedChange={(checked) => setIsTimeRange(checked as boolean)}
            />
            <Label htmlFor="timeRange" className="text-sm cursor-pointer">
              {i18n('timeRange') || '设置时间段'}
            </Label>
          </div>

          {/* 日期时间 */}
          <div className={`grid gap-4 ${isTimeRange ? 'grid-cols-2' : 'grid-cols-2'}`}>
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-1 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {i18n('taskDate')}
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => updateField('date', e.target.value)}
                className={errors.date ? 'border-destructive' : ''}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-1 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                {i18n('taskTime')}
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => updateField('time', e.target.value)}
              />
            </div>

            {isTimeRange && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="flex items-center gap-1 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {i18n('endDate')}
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => updateField('endDate', e.target.value)}
                    className={errors.endDate ? 'border-destructive' : ''}
                  />
                  {errors.endDate && (
                    <p className="text-xs text-destructive">{errors.endDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime" className="flex items-center gap-1 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {i18n('endTime')}
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => updateField('endTime', e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* 优先级和分类 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 优先级 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-sm">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                {i18n('priority')}
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => updateField('priority', value as Reminder['priority'])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${priorityConfig.color}`} />
                      {i18n(priorityConfig.label)}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${option.color}`} />
                        <span>{i18n(option.label)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 分类 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-sm">
                <Tag className="w-4 h-4 text-muted-foreground" />
                {i18n('category')}
              </Label>
              <Select
                value={formData.categoryId || 'none'}
                onValueChange={(value) => updateField('categoryId', value === 'none' ? '' : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={i18n('selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{i18n('noCategory')}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        {category.icon && <span>{category.icon}</span>}
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 重复规则 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="repeat"
                checked={formData.repeat?.enabled}
                onCheckedChange={(checked) => 
                  updateField('repeat', { 
                    ...formData.repeat, 
                    enabled: checked as boolean,
                    type: formData.repeat?.type || 'daily'
                  })
                }
              />
              <Label htmlFor="repeat" className="flex items-center gap-1 text-sm cursor-pointer">
                <Repeat className="w-4 h-4 text-muted-foreground" />
                {i18n('repeat')}
              </Label>
            </div>

            {formData.repeat?.enabled && (
              <Select
                value={formData.repeat.type}
                onValueChange={(value) => 
                  updateField('repeat', { 
                    ...formData.repeat, 
                    type: value as Reminder['repeat']['type']
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {repeatOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {i18n(option.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator />

          {/* 备注 */}
          <div className="space-y-2">
            <Label htmlFor="note" className="flex items-center gap-1 text-sm">
              <AlignLeft className="w-4 h-4 text-muted-foreground" />
              {i18n('note')}
            </Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => updateField('note', e.target.value)}
              placeholder={i18n('enterNote')}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* 预览 */}
          {formData.title && (
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">{i18n('preview') || '预览'}</p>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="outline" className="font-normal">
                  {formData.title}
                </Badge>
                {formData.date && (
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formData.date}
                    {formData.time && ` ${formData.time}`}
                  </Badge>
                )}
                {formData.priority && formData.priority !== 'none' && (
                  <Badge 
                    className={`text-xs text-white ${priorityConfig.color}`}
                  >
                    {priorityConfig.icon} {i18n(priorityConfig.label)}
                  </Badge>
                )}
                {formData.categoryId && categories.find(c => c.id === formData.categoryId) && (
                  <Badge variant="outline" className="text-xs">
                    {categories.find(c => c.id === formData.categoryId)?.icon} {' '}
                    {categories.find(c => c.id === formData.categoryId)?.name}
                  </Badge>
                )}
                {formData.repeat?.enabled && (
                  <Badge variant="outline" className="text-xs">
                    <Repeat className="w-3 h-3 mr-1" />
                    {i18n(repeatOptions.find(r => r.value === formData.repeat?.type)?.label || 'repeat')}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {i18n('cancel')}
          </Button>
          <Button onClick={handleSave} className="gap-1">
            <CheckCircle2 className="w-4 h-4" />
            {i18n('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderEditDialog;
