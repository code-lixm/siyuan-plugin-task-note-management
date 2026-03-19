import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useHabitStore, Habit, HabitCheckInEmoji } from '@/stores/useHabitStore';
import { HabitGroupManager } from '@/utils/habitGroupManager';
import { X, Plus, Trash2 } from 'lucide-react';
import { i18n } from '@/pluginInstance';

interface HabitEditDialogProps {
  habit: Habit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (habit: Habit) => void;
}

const WEEKDAYS = [
  { value: 0, label: '周日' },
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
];

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const PRIORITY_OPTIONS = [
  { value: 'none', label: '无优先级', color: 'gray' },
  { value: 'low', label: '低优先级', color: 'blue' },
  { value: 'medium', label: '中优先级', color: 'yellow' },
  { value: 'high', label: '高优先级', color: 'red' },
];

const DEFAULT_EMOJIS: HabitCheckInEmoji[] = [
  { emoji: '', meaning: '完成', promptNote: false, countsAsSuccess: true },
  { emoji: '❌', meaning: '未完成', promptNote: false, countsAsSuccess: false },
  { emoji: '⭕️', meaning: '部分完成', promptNote: false, countsAsSuccess: true },
];

export function HabitEditDialog({ habit, open, onOpenChange, onSave }: HabitEditDialogProps) {
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

  // 初始化表单数据
  useEffect(() => {
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
  }, [habit, open]);

  const handleSave = () => {
    if (!title.trim()) {
      alert(i18n('habitTitleRequired') || '请输入习惯名称');
      return;
    }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {habit ? i18n('editHabitTitle') || '编辑习惯' : i18n('newHabitTitle') || '新建习惯'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">{i18n('basicInfo') || '基本信息'}</TabsTrigger>
            <TabsTrigger value="frequency">{i18n('frequency') || '频率'}</TabsTrigger>
            <TabsTrigger value="emojis">{i18n('checkInOptions') || '打卡选项'}</TabsTrigger>
            <TabsTrigger value="reminders">{i18n('reminders') || '提醒'}</TabsTrigger>
          </TabsList>

          {/* 基本信息 */}
          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{i18n('habitTitle') || '习惯名称'} *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={i18n('habitTitlePlaceholder') || '输入习惯名称'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target">{i18n('targetCount') || '目标次数'}</Label>
                <Input
                  id="target"
                  type="number"
                  min={1}
                  value={target}
                  onChange={(e) => setTarget(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">{i18n('priority') || '优先级'}</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full bg-${opt.color}-500`}
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
                <Label htmlFor="startDate">{i18n('startDate') || '开始日期'}</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">{i18n('endDate') || '结束日期（可选）'}</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">{i18n('group') || '分组'}</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder={i18n('selectGroup') || '选择分组'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{i18n('noGroup') || '无分组'}</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* 频率设置 */}
          <TabsContent value="frequency" className="space-y-4">
            <div className="space-y-2">
              <Label>{i18n('frequencyType') || '频率类型'}</Label>
              <Select value={frequencyType} onValueChange={(v) => setFrequencyType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{i18n('freqDaily') || '每天'}</SelectItem>
                  <SelectItem value="weekly">{i18n('freqWeekly') || '每周'}</SelectItem>
                  <SelectItem value="monthly">{i18n('freqMonthly') || '每月'}</SelectItem>
                  <SelectItem value="yearly">{i18n('freqYearly') || '每年'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval">{i18n('interval') || '间隔（每X天/周/月/年）'}</Label>
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
                <Label>{i18n('weekdays') || '选择星期'}</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => (
                    <label
                      key={day.value}
                      className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-accent"
                    >
                      <Checkbox
                        checked={selectedWeekdays.includes(day.value)}
                        onCheckedChange={() => toggleWeekday(day.value)}
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {frequencyType === 'monthly' && (
              <div className="space-y-2">
                <Label>{i18n('monthDays') || '选择日期'}</Label>
                <div className="grid grid-cols-7 gap-1">
                  {MONTH_DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleMonthDay(day)}
                      className={`p-2 text-sm rounded ${
                        selectedMonthDays.includes(day)
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
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
          <TabsContent value="emojis" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{i18n('checkInEmojis') || '打卡选项'}</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddEmoji}>
                  <Plus className="h-4 w-4 mr-1" />
                  {i18n('add') || '添加'}
                </Button>
              </div>
              <div className="space-y-2">
                {checkInEmojis.map((emoji, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <Input
                      value={emoji.emoji}
                      onChange={(e) => handleUpdateEmoji(index, 'emoji', e.target.value)}
                      placeholder="Emoji"
                      className="w-20"
                    />
                    <Input
                      value={emoji.meaning}
                      onChange={(e) => handleUpdateEmoji(index, 'meaning', e.target.value)}
                      placeholder={i18n('meaning') || '含义'}
                      className="flex-1"
                    />
                    <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={emoji.promptNote || false}
                        onChange={(e) => handleUpdateEmoji(index, 'promptNote', e.target.checked)}
                      />
                      {i18n('promptNote') || '备注'}
                    </label>
                    <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={emoji.countsAsSuccess !== false}
                        onChange={(e) => handleUpdateEmoji(index, 'countsAsSuccess', e.target.checked)}
                      />
                      {i18n('countsAsSuccess') || '成功'}
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
          <TabsContent value="reminders" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{i18n('reminderTimes') || '提醒时间'}</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddReminderTime}>
                  <Plus className="h-4 w-4 mr-1" />
                  {i18n('add') || '添加'}
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
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {i18n('cancel') || '取消'}
          </Button>
          <Button onClick={handleSave}>{i18n('save') || '保存'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
