import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useHabitStore, Habit } from '@/stores/useHabitStore';
import { Flame, Calendar, Target, TrendingUp, Award, Activity } from 'lucide-react';
import { i18n } from '@/pluginInstance';

interface HabitStatsDialogProps {
  habit: Habit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HabitStatsDialog({ habit, open, onOpenChange }: HabitStatsDialogProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { calculateStreak, getCheckInDays, getCheckInRate, getBestStreak, isCompletedOnDate } = useHabitStore();

  // 统计数据
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const totalCheckIns = Object.keys(habit.checkIns || {}).length;
    const checkInDays = getCheckInDays(habit);
    const currentStreak = calculateStreak(habit);
    const bestStreak = getBestStreak(habit);
    const rate7 = getCheckInRate(habit, 7);
    const rate30 = getCheckInRate(habit, 30);
    const rate365 = getCheckInRate(habit, 365);

    return {
      totalCheckIns,
      checkInDays,
      currentStreak,
      bestStreak,
      rate7,
      rate30,
      rate365,
    };
  }, [habit, calculateStreak, getCheckInDays, getCheckInRate, getBestStreak]);

  // 计算月度打卡热力图数据
  const monthData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    const weeks: { date: number; dateStr: string; isCompleted: boolean }[][] = [];
    let currentWeek: { date: number; dateStr: string; isCompleted: boolean }[] = [];

    // 填充月初空白
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: 0, dateStr: '', isCompleted: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isCompleted = isCompletedOnDate(habit, dateStr);
      currentWeek.push({ date: day, dateStr, isCompleted });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // 填充月末空白
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: 0, dateStr: '', isCompleted: false });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [currentMonth, habit, isCompletedOnDate]);

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {habit.title} - {i18n('habitStats') || '习惯统计'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">{i18n('overview') || '概览'}</TabsTrigger>
            <TabsTrigger value="calendar">{i18n('calendar') || '日历'}</TabsTrigger>
          </TabsList>

          {/* 概览 */}
          <TabsContent value="overview" className="space-y-6">
            {/* 核心统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <span className="text-sm text-muted-foreground">{i18n('currentStreak') || '当前连续'}</span>
                </div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.currentStreak}
                </div>
                <div className="text-xs text-muted-foreground">{i18n('days') || '天'}</div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-5 w-5 text-blue-500" />
                  <span className="text-sm text-muted-foreground">{i18n('bestStreak') || '最佳记录'}</span>
                </div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.bestStreak}
                </div>
                <div className="text-xs text-muted-foreground">{i18n('days') || '天'}</div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">{i18n('totalCheckIns') || '总打卡'}</span>
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.checkInDays}
                </div>
                <div className="text-xs text-muted-foreground">{i18n('days') || '天'}</div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  <span className="text-sm text-muted-foreground">{i18n('checkInRate') || '完成率'}</span>
                </div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.rate30}%
                </div>
                <div className="text-xs text-muted-foreground">{i18n('last30Days') || '近30天'}</div>
              </div>
            </div>

            {/* 打卡率趋势 */}
            <div className="bg-card border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {i18n('checkInRateTrend') || '打卡率趋势'}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-accent/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats.rate7}%</div>
                  <div className="text-sm text-muted-foreground">{i18n('last7Days') || '近7天'}</div>
                </div>
                <div className="text-center p-4 bg-accent/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats.rate30}%</div>
                  <div className="text-sm text-muted-foreground">{i18n('last30Days') || '近30天'}</div>
                </div>
                <div className="text-center p-4 bg-accent/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats.rate365}%</div>
                  <div className="text-sm text-muted-foreground">{i18n('last365Days') || '近一年'}</div>
                </div>
              </div>
            </div>

            {/* Emoji 统计 */}
            {habit.checkInEmojis && habit.checkInEmojis.length > 0 && (
              <div className="bg-card border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">{i18n('emojiStats') || '打卡类型分布'}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {habit.checkInEmojis.map((emoji, index) => {
                    const count = Object.values(habit.checkIns || {}).reduce((acc, checkIn) => {
                      return (
                        acc +
                        (checkIn.entries || []).filter((e) => e.emoji === emoji.emoji).length +
                        (checkIn.status || []).filter((s) => s === emoji.emoji).length
                      );
                    }, 0);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg"
                      >
                        <span className="text-2xl">{emoji.emoji || '✓'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{emoji.meaning}</div>
                          <div className="text-sm text-muted-foreground">{count} 次</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* 日历视图 */}
          <TabsContent value="calendar" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {currentMonth.getFullYear()}年{monthNames[currentMonth.getMonth()]}
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                  ←
                </Button>
                <Button variant="outline" size="sm" onClick={handleToday}>
                  {i18n('today') || '今天'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextMonth}>
                  →
                </Button>
              </div>
            </div>

            {/* 热力图 */}
            <div className="border rounded-lg p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekdayNames.map((day) => (
                  <div key={day} className="text-center text-sm text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {monthData.map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-7 gap-1">
                    {week.map((day, dayIndex) => (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`aspect-square rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                          day.date === 0
                            ? 'invisible'
                            : day.isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-accent/50 text-muted-foreground hover:bg-accent'
                        }`}
                        title={day.dateStr}
                      >
                        {day.date > 0 && day.date}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* 图例 */}
            <div className="flex items-center gap-6 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span>{i18n('completed') || '已完成'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-accent/50" />
                <span>{i18n('notCompleted') || '未完成'}</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
