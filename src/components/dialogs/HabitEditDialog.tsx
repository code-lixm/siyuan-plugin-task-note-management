/*
 * Copyright (c) 2024 by siyuan-plugin-task-note-management. All Rights Reserved.
 * @Author       : siyuan-plugin-task-note-management
 * @Date         : 2024
 * @FilePath     : /src/components/dialogs/HabitEditDialog.tsx
 * @Description  : 习惯编辑对话框组件 - 支持创建和编辑习惯
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHabitStore, Habit, HabitCheckInEmoji } from '@/stores/useHabitStore';
import { X, Plus, Trash2, Save, Calendar, Repeat, Bell, Sparkles } from 'lucide-react';
import { i18n } from '@/pluginInstance';

const WEEKDAYS = [
  { value: 0, label: '周日', labelEn: 'Sun' },
  { value: 1, label: '周一', labelEn: 'Mon' },
  { value: 2, label: '周二', labelEn: 'Tue' },
  { value: 3, label: '周三', labelEn: 'Wed' },
  { value: 4, label: '周四', labelEn: 'Thu' },
  { value: 5, label: '周五', labelEn: 'Fri' },
  { value: 6, label: '周六', labelEn: 'Sat' },
];

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const PRIORITY_OPTIONS = [
  { value: 'none', label: '无优先级', labelEn: 'None', color: 'gray' },
  { value: 'low', label: '低优先级', labelEn: 'Low', color: 'blue' },
  { value: 'medium', label: '中优先级', labelEn: 'Medium', color: 'yellow' },
  { value: 'high', label: '高优先级', labelEn: 'High', color: 'red' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: '每天', labelEn: 'Daily' },
  { value: 'weekly', label: '每周', labelEn: 'Weekly' },
  { value: 'monthly', label: '每月', labelEn: 'Monthly' },
  { value: 'yearly', label: '每年', labelEn: 'Yearly' },
];

const DEFAULT_EMOJIS: HabitCheckInEmoji[] = [
  { emoji: '✅', meaning: '完成', promptNote: false, countsAsSuccess: true },
  { emoji: '❌', meaning: '未完成', promptNote: false, countsAsSuccess: false },
  { emoji: '⭕️', meaning: '部分完成', promptNote: false, countsAsSuccess: true },
];

// 默认 i18n 函数
const defaultI18n = (key: string): string => {
  const defaultTranslations: Record<string, string> = {
    'editHabitTitle': '编辑习惯',
    'newHabitTitle': '新建习惯',
    'basicInfo': '基本信息',
    'frequency': '频率',
    'checkInOptions': '打卡选项',
    'reminders': '提醒',
    'habitTitle': '习惯名称',
    'habitTitlePlaceholder': '输入习惯名称',
    'habitTitleRequired': '请输入习惯名称',
    'targetCount': '目标次数',
    'priority': '优先级',
    'startDate': '开始日期',
    'endDate': '结束日期（可选）',
    'group': '分组',
    'noGroup': '无分组',
    'selectGroup': '选择分组',
    'frequencyType': '频率类型',
    'freqDaily': '每天',
    'freqWeekly': '每周',
    'freqMonthly': '每月',
    'freqYearly': '每年',
    'interval': '间隔（每X天/周/月/年）',
    'weekdays': '选择星期',
    'monthDays': '选择日期',
    'checkInEmojis': '打卡选项',
    'add': '添加',
    'meaning': '含义',
    'promptNote': '备注',
    'countsAsSuccess': '成功',
    'reminderTimes': '提醒时间',
    'cancel': '取消',
    'save': '保存',
    'preview': '预览',
  };
  return defaultTranslations[key] || key;
};

interface HabitEditDialogProps {
  habit: Habit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (habit: Habit) => void;
}

export function HabitEditDialog({ habit, open, onOpenChange, onSave }: HabitEditDialogProps) {
  const t = i18n || defaultI18n;
  const { addHabit, updateHabit, groups } = useHabitStore();
  const [activeTab, setActiveTab] = useState('basic');

  // 表单状态
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState(1);
  const [frequencyType, setFrequencyType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [interval, setInterval] = useState(1);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [selectedMonthDays, setSelectedMonthDays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [groupId, setGroupId] = useState('none');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low' | 'none'>('none');
  const [checkInEmojis, setCheckInEmojis] = useState<HabitCheckInEmoji[]>(DEFAULT_EMOJIS);
  const [reminderTimes, setReminderTimes] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 初始化表单数据
  useEffect(() => {
    if (open) {
      if (habit) {
        setTitle(habit.title);
        setTarget(habit.target || 1);
        setFrequencyType(habit.frequency?.type || 'daily');
        setInterval(habit.frequency?.interval || 1);
        setSelectedWeekdays(habit.frequency?.weekdays || []);
        setSelectedMonthDays(habit.frequency?.monthDays || []);
        setStartDate(habit.startDate);
        setEndDate(habit.endDate || '');
        setGroupId(habit.groupId || 'none');
        setPriority(habit.priority || 'none');
        setCheckInEmojis(habit.checkInEmojis || DEFAULT_EMOJIS);
        setReminderTimes(
          (habit.reminderTimes || []).map((t) => (typeof t === 'string' ? t : t.time))
        );
      } else {
        // 重置为默认值
        setTitle('');
        setTarget(1);
        setFrequencyType('daily');
        setInterval(1);
        setSelectedWeekdays([]);
        setSelectedMonthDays([]);
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setGroupId('none');
        setPriority('none');
        setCheckInEmojis(DEFAULT_EMOJIS);
        setReminderTimes([]);
      }
      setErrors({});
      setActiveTab('basic');
    }
  }, [habit, open]);

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = t('habitTitleRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const frequency = {
      type: frequencyType,
      ...(interval > 1 && { interval }),
      ...(frequencyType === 'weekly' && selectedWeekdays.length > 0 && { weekdays: selectedWeekdays }),
      ...(frequencyType === 'monthly' && selectedMonthDays.length > 0 && { monthDays: selectedMonthDays }),
    };

    const habitData = {
      title: title.trim(),
      target,
      frequency,
      startDate,
      endDate: endDate || undefined,
      groupId: groupId === 'none' ? undefined : groupId,
      priority,
      checkInEmojis,
      reminderTimes: reminderTimes.length > 0 ? reminderTimes : undefined,
    };

    if (habit) {
      updateHabit(habit.id, habitData);
      onSave?.({ ...habit, ...habitData });
    } else {
      const newHabit = addHabit(habitData as any);
      onSave?.(newHabit);
    }

    onOpenChange(false);
  };

  const handleAddEmoji = () => {
    setCheckInEmojis([...checkInEmojis, { emoji: '', meaning: '', promptNote: false, countsAsSuccess: true }]);
  };

  const handleRemoveEmoji = (index: number) => {
    setCheckInEmojis(checkInEmojis.filter((_, i) => i !== index));
  };

  const handleUpdateEmoji = (index: number, field: keyof HabitCheckInEmoji, value: any) => {
    const updated = [...checkInEmojis];
    updated[index] = { ...updated[index], [field]: value };
    setCheckInEmojis(updated);
  };

  const handleAddReminderTime = () => {
    setReminderTimes([...reminderTimes, '08:00']);
  };

  const handleRemoveReminderTime = (index: number) => {
    setReminderTimes(reminderTimes.filter((_, i) => i !== index));
  };

  const handleUpdateReminderTime = (index: number, value: string) => {
    const updated = [...reminderTimes];
    updated[index] = value;
    setReminderTimes(updated);
  };

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const toggleMonthDay = (day: number) => {
    setSelectedMonthDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  // 获取优先级配置
  const getPriorityConfig = (p: string) => PRIORITY_OPTIONS.find((opt) => opt.value === p) || PRIORITY_OPTIONS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {habit ? t('editHabitTitle') : t('newHabitTitle')}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="gap-1">
              <Calendar className="w-4 h-4" />
              {t('basicInfo')}
            </TabsTrigger>
            <TabsTrigger value="frequency" className="gap-1">
              <Repeat className="w-4 h-4" />
              {t('frequency')}
            </TabsTrigger>
            <TabsTrigger value="emojis" className="gap-1">
              <Sparkles className="w-4 h-4" />
              {t('checkInOptions')}
            </TabsTrigger>
            <TabsTrigger value="reminders" className="gap-1">
              <Bell className="w-4 h-4" />
              {t('reminders')}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full pr-4">
              {/* 基本信息 */}
              <TabsContent value="basic" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className={errors.title ? 'text-destructive' : ''}>
                    {t('habitTitle')} *
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title) {
                        setErrors((prev) => ({ ...prev, title: '' }));
                      }
                    }}
                    placeholder={t('habitTitlePlaceholder')}
                    className={errors.title ? 'border-destructive' : ''}
                  />
                  {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target">{t('targetCount')}</Label>
                    <Input
                      id="target"
                      type="number"
                      min={1}
                      value={target}
                      onChange={(e) => setTarget(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">{t('priority')}</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                      <SelectTrigger>
                        <SelectValue>
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor:
                                  priority === 'high'
                                    ? '#ef4444'
                                    : priority === 'medium'
                                    ? '#eab308'
                                    : priority === 'low'
                                    ? '#3b82f6'
                                    : '#9ca3af',
                              }}
                            />
                            {getPriorityConfig(priority).label}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    opt.value === 'high'
                                      ? '#ef4444'
                                      : opt.value === 'medium'
                                      ? '#eab308'
                                      : opt.value === 'low'
                                      ? '#3b82f6'
                                      : '#9ca3af',
                                }}
                              />
                              {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">{t('startDate')}</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">{t('endDate')}</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group">{t('group')}</Label>
                  <Select value={groupId} onValueChange={setGroupId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectGroup')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('noGroup')}</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 预览 */}
                {title && (
                  <div className="bg-secondary/50 rounded-lg p-4 border">
                    <Label className="text-xs text-muted-foreground mb-2 block">{t('preview')}</Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-normal text-base">
                        {title}
                      </Badge>
                      {priority !== 'none' && (
                        <Badge
                          className="text-white"
                          style={{
                            backgroundColor:
                              priority === 'high'
                                ? '#ef4444'
                                : priority === 'medium'
                                ? '#eab308'
                                : '#3b82f6',
                          }}
                        >
                          {getPriorityConfig(priority).label}
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        <Target className="w-3 h-3 mr-1" />
                        {target}/天
                      </Badge>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* 频率设置 */}
              <TabsContent value="frequency" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label>{t('frequencyType')}</Label>
                  <Select value={frequencyType} onValueChange={(v) => setFrequencyType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interval">{t('interval')}</Label>
                  <Input
                    id="interval"
                    type="number"
                    min={1}
                    value={interval}
                    onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                  />
                </div>

                {frequencyType === 'weekly' && (
                  <div className="space-y-2">
                    <Label>{t('weekdays')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day.value}
                          onClick={() => toggleWeekday(day.value)}
                          className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                            selectedWeekdays.includes(day.value)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-accent border-border'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {frequencyType === 'monthly' && (
                  <div className="space-y-2">
                    <Label>{t('monthDays')}</Label>
                    <div className="grid grid-cols-7 gap-1">
                      {MONTH_DAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleMonthDay(day)}
                          className={`p-2 text-sm rounded transition-all ${
                            selectedMonthDays.includes(day)
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-accent border border-border'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* 打卡选项 */}
              <TabsContent value="emojis" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t('checkInEmojis')}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddEmoji}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t('add')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {checkInEmojis.map((emoji, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg border">
                        <Input
                          value={emoji.emoji}
                          onChange={(e) => handleUpdateEmoji(index, 'emoji', e.target.value)}
                          placeholder="Emoji"
                          className="w-20"
                        />
                        <Input
                          value={emoji.meaning}
                          onChange={(e) => handleUpdateEmoji(index, 'meaning', e.target.value)}
                          placeholder={t('meaning')}
                          className="flex-1"
                        />
                        <label className="flex items-center gap-1 text-sm whitespace-nowrap cursor-pointer">
                          <Checkbox
                            checked={emoji.promptNote || false}
                            onCheckedChange={(checked) =>
                              handleUpdateEmoji(index, 'promptNote', checked)
                            }
                          />
                          <span>{t('promptNote')}</span>
                        </label>
                        <label className="flex items-center gap-1 text-sm whitespace-nowrap cursor-pointer">
                          <Checkbox
                            checked={emoji.countsAsSuccess !== false}
                            onCheckedChange={(checked) =>
                              handleUpdateEmoji(index, 'countsAsSuccess', checked)
                            }
                          />
                          <span>{t('countsAsSuccess')}</span>
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEmoji(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* 提醒设置 */}
              <TabsContent value="reminders" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t('reminderTimes')}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddReminderTime}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t('add')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {reminderTimes.map((time, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={time}
                          onChange={(e) => handleUpdateReminderTime(index, e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveReminderTime(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {reminderTimes.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        暂无提醒时间，点击添加按钮创建
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>

        <Separator className="my-4" />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()} className="gap-1">
            <Save className="w-4 h-4" />
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Target icon component
function Target({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export default HabitEditDialog;
