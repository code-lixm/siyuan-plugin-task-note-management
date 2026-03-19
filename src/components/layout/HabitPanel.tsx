import React, { useState, useEffect, useMemo } from 'react';
import { useHabitStore, Habit, HabitGroup } from '@/stores/useHabitStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Check, 
  Flame, 
  MoreHorizontal, 
  ChevronDown, 
  ChevronRight,
  Calendar,
  BarChart3,
  Settings,
  RefreshCw,
  Filter,
  Tags,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { HabitEditDialog } from './HabitEditDialog';
import { HabitStatsDialog } from './HabitStatsDialog';
import { HabitGroupManageDialog } from './HabitGroupManageDialog';
import { HabitCheckInMenu } from './HabitCheckInMenu';
import { HabitContextMenu } from './HabitContextMenu';
import { HabitGroupManager } from '@/utils/habitGroupManager';
import { i18n } from '@/pluginInstance';
import { cn } from '@/lib/utils';

// 获取频率文本
const getFrequencyText = (habit: Habit): string => {
  const { frequency } = habit;
  if (!frequency) return i18n('freqDaily') || '每天';

  switch (frequency.type) {
    case 'daily':
      return frequency.interval 
        ? `${i18n('every') || '每'} ${frequency.interval} ${i18n('days') || '天'}`
        : i18n('freqDaily') || '每天';
    case 'weekly':
      if (frequency.weekdays && frequency.weekdays.length > 0) {
        const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
        return `${i18n('weekly') || '每周'} ${frequency.weekdays.map(d => dayNames[d]).join(',')}`;
      }
      return frequency.interval
        ? `${i18n('every') || '每'} ${frequency.interval} ${i18n('weeks') || '周'}`
        : i18n('freqWeekly') || '每周';
    case 'monthly':
      if (frequency.monthDays && frequency.monthDays.length > 0) {
        return `${i18n('monthly') || '每月'} ${frequency.monthDays.join(',')} ${i18n('day') || '日'}`;
      }
      return frequency.interval
        ? `${i18n('every') || '每'} ${frequency.interval} ${i18n('months') || '月'}`
        : i18n('freqMonthly') || '每月';
    case 'yearly':
      return frequency.interval
        ? `${i18n('every') || '每'} ${frequency.interval} ${i18n('years') || '年'}`
        : i18n('freqYearly') || '每年';
    default:
      return i18n('freqDaily') || '每天';
  }
};

// 获取优先级图标
const getPriorityIcon = (priority?: string) => {
  switch (priority) {
    case 'high': return '🔴';
    case 'medium': return '🟡';
    case 'low': return '🔵';
    default: return '⚪';
  }
};

// 获取优先级文本
const getPriorityText = (priority?: string) => {
  switch (priority) {
    case 'high': return i18n('highPriority') || '高';
    case 'medium': return i18n('mediumPriority') || '中';
    case 'low': return i18n('lowPriority') || '低';
    default: return i18n('noPriority') || '无';
  }
};

export function HabitPanel() {
  const {
    habits,
    groups,
    selectedDate,
    currentTab,
    selectedGroups,
    sortKey,
    sortOrder,
    collapsedGroups,
    setHabits,
    setGroups,
    setCurrentTab,
    setSelectedGroups,
    setSortKey,
    setSortOrder,
    toggleGroupCollapse,
    isCompletedOnDate,
    calculateStreak,
    getCheckInDays,
    getFilteredHabits,
    getHabitsByGroup,
    checkIn,
    deleteHabit,
  } = useHabitStore();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGroupManageOpen, setIsGroupManageOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [viewingStatsHabit, setViewingStatsHabit] = useState<Habit | null>(null);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const groupManager = HabitGroupManager.getInstance();

  // 初始化数据
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        await groupManager.initialize();
        setGroups(groupManager.getAllGroups());
        // 这里应该从插件加载实际数据
        // 暂时使用空数组
        setHabits([]);
      } catch (error) {
        console.error('Failed to initialize habit panel:', error);
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [setGroups, setHabits]);

  // 获取筛选后的习惯
  const filteredHabits = useMemo(() => getFilteredHabits(), [getFilteredHabits, habits, currentTab, selectedGroups]);

  // 按分组获取习惯
  const habitsByGroup = useMemo(() => getHabitsByGroup(), [getHabitsByGroup, filteredHabits]);

  // 获取已完成的今日习惯
  const todayCompletedHabits = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return habits.filter((h) => isCompletedOnDate(h, today));
  }, [habits, isCompletedOnDate]);

  // 处理新建习惯
  const handleNewHabit = () => {
    setEditingHabit(null);
    setIsEditDialogOpen(true);
  };

  // 处理编辑习惯
  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setIsEditDialogOpen(true);
  };

  // 处理查看统计
  const handleViewStats = (habit: Habit) => {
    setViewingStatsHabit(habit);
    setIsStatsDialogOpen(true);
  };

  // 处理删除习惯
  const handleDeleteHabit = (habitId: string) => {
    deleteHabit(habitId);
  };

  // 处理快速打卡（使用第一个 emoji）
  const handleQuickCheckIn = (habit: Habit) => {
    const today = new Date().toISOString().split('T')[0];
    const emojiConfig = habit.checkInEmojis?.[0] || { emoji: '', meaning: '完成', countsAsSuccess: true };
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    checkIn(habit.id, today, emojiConfig, undefined, now);
  };

  // 处理分组筛选变化
  const handleGroupFilterChange = (groupId: string) => {
    if (groupId === 'all') {
      setSelectedGroups(['all']);
    } else {
      const newGroups = selectedGroups.filter((g) => g !== 'all');
      if (newGroups.includes(groupId)) {
        setSelectedGroups(newGroups.filter((g) => g !== groupId));
      } else {
        setSelectedGroups([...newGroups, groupId]);
      }
    }
  };

  // 排序习惯
  const sortHabits = (habits: Habit[]): Habit[] => {
    const priorityValue = (p?: string) => {
      switch (p) {
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 0;
      }
    };

    return [...habits].sort((a, b) => {
      if (sortKey === 'priority') {
        const pa = priorityValue(a.priority);
        const pb = priorityValue(b.priority);
        if (pa !== pb) {
          return sortOrder === 'desc' ? pb - pa : pa - pb;
        }
      }
      // 按标题排序
      const titleCompare = (a.title || '').localeCompare(b.title || '', 'zh-CN');
      return sortOrder === 'desc' ? -titleCompare : titleCompare;
    });
  };

  // 渲染习惯卡片
  const renderHabitCard = (habit: Habit, isCompletedSection = false) => {
    const today = new Date().toISOString().split('T')[0];
    const isCompleted = isCompletedOnDate(habit, today);
    const streak = calculateStreak(habit);
    const checkInDays = getCheckInDays(habit);
    const todayCheckIn = habit.checkIns?.[today];
    
    // 获取今日已打卡的 emoji
    const todayEmojis: string[] = [];
    if (todayCheckIn?.entries) {
      todayCheckIn.entries.forEach((entry) => {
        if (entry.emoji) todayEmojis.push(entry.emoji);
      });
    } else if (todayCheckIn?.status) {
      todayEmojis.push(...todayCheckIn.status);
    }

    const currentCount = todayEmojis.length;
    const targetCount = habit.target || 1;
    const progress = Math.min(100, (currentCount / targetCount) * 100);

    return (
      <HabitContextMenu
        key={habit.id}
        habit={habit}
        onEdit={() => handleEditHabit(habit)}
        onDelete={() => handleDeleteHabit(habit.id)}
        onViewStats={() => handleViewStats(habit)}
      >
        <Card
          className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            isCompleted ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'hover:bg-accent/50'
          )}
          style={{ opacity: isCompletedSection ? 0.7 : 1 }}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* 快速打卡按钮 */}
              <HabitCheckInMenu habit={habit} onCheckIn={() => {}}>
                <button
                  className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : 'border-2 border-muted hover:border-primary'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isCompleted) {
                      handleQuickCheckIn(habit);
                    }
                  }}
                >
                  {isCompleted && <Check className="h-4 w-4" />}
                </button>
              </HabitCheckInMenu>

              <div className="flex-1 min-w-0">
                {/* 标题行 */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{getPriorityIcon(habit.priority)}</span>
                  <h3 className={cn(
                    'font-semibold truncate',
                    isCompleted && 'line-through text-muted-foreground'
                  )}>
                    {habit.title}
                  </h3>
                  {habit.blockId && (
                    <span className="text-xs text-primary">🔗</span>
                  )}
                </div>

                {/* 频率和进度 */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span>{getFrequencyText(habit)}</span>
                  {targetCount > 1 && (
                    <span className="text-xs bg-accent px-2 py-0.5 rounded">
                      {currentCount}/{targetCount}
                    </span>
                  )}
                </div>

                {/* 进度条 */}
                {targetCount > 1 && (
                  <div className="w-full h-1.5 bg-accent rounded-full mb-2 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                {/* 底部信息 */}
                <div className="flex items-center gap-3 text-xs">
                  {/* 坚持天数 */}
                  <div className="flex items-center gap-1 text-orange-500">
                    <Flame className="h-3 w-3" />
                    <span>{checkInDays} {i18n('days') || '天'}</span>
                  </div>

                  {/* 连续打卡 */}
                  {streak > 0 && (
                    <div className="flex items-center gap-1 text-primary">
                      <span>🔥</span>
                      <span>{streak} {i18n('streak') || '连击'}</span>
                    </div>
                  )}

                  {/* 今日打卡状态 */}
                  {todayEmojis.length > 0 && (
                    <div className="flex items-center gap-1">
                      {todayEmojis.map((emoji, idx) => (
                        <span key={idx} className="text-sm">{emoji || '✓'}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </HabitContextMenu>
    );
  };

  // 渲染分组
  const renderGroup = (groupId: string, groupHabits: Habit[]) => {
    const group = groups.find((g) => g.id === groupId);
    const groupName = group ? group.name : i18n('noGroup') || '无分组';
    const isCollapsed = collapsedGroups.has(groupId);
    const sortedHabits = sortHabits(groupHabits);

    return (
      <div key={groupId} className="space-y-2">
        {/* 分组头部 */}
        <button
          className="flex items-center gap-2 w-full p-2 hover:bg-accent/50 rounded-lg transition-colors"
          onClick={() => toggleGroupCollapse(groupId)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-semibold">{groupName}</span>
          <Badge variant="secondary" className="text-xs">
            {groupHabits.length}
          </Badge>
        </button>

        {/* 分组内容 */}
        {!isCollapsed && (
          <div className="space-y-2 pl-6">
            {sortedHabits.map((habit) => renderHabitCard(habit))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="siyuan-plugin-container h-full flex flex-col bg-background">
      {/* 头部工具栏 */}
      <div className="flex flex-col gap-2 p-4 border-b">
        {/* 标题和操作按钮 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{i18n('habits') || '习惯'}</h2>
            <p className="text-sm text-muted-foreground">{selectedDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsGroupManageOpen(true)}>
              <Tags className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleNewHabit}>
              <Plus className="h-4 w-4 mr-1" />
              {i18n('newHabit') || '新建'}
            </Button>
          </div>
        </div>

        {/* 筛选和排序 */}
        <div className="flex items-center gap-2">
          <Select value={currentTab} onValueChange={setCurrentTab}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{i18n('todayPending') || '今日待办'}</SelectItem>
              <SelectItem value="tomorrow">{i18n('tomorrow') || '明天'}</SelectItem>
              <SelectItem value="todayCompleted">{i18n('todayCompleted') || '今日已完成'}</SelectItem>
              <SelectItem value="yesterdayCompleted">{i18n('yesterdayCompleted') || '昨日已完成'}</SelectItem>
              <SelectItem value="all">{i18n('all') || '全部'}</SelectItem>
            </SelectContent>
          </Select>

          {/* 分组筛选 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                {selectedGroups.includes('all') || selectedGroups.length === 0
                  ? i18n('allGroups') || '全部分组'
                  : `${selectedGroups.length} ${i18n('groups') || '个分组'}`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleGroupFilterChange('all')}>
                <span className={selectedGroups.includes('all') ? 'font-bold' : ''}>
                  {i18n('allGroups') || '全部分组'}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleGroupFilterChange('none')}>
                <span className={selectedGroups.includes('none') ? 'font-bold' : ''}>
                  {i18n('noGroup') || '无分组'}
                </span>
              </DropdownMenuItem>
              {groups.map((group) => (
                <DropdownMenuItem
                  key={group.id}
                  onClick={() => handleGroupFilterChange(group.id)}
                >
                  <span className={selectedGroups.includes(group.id) ? 'font-bold' : ''}>
                    {group.name}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 排序 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSortKey('priority'); setSortOrder('desc'); }}>
                {i18n('sortByPriorityDesc') || '优先级降序'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortKey('priority'); setSortOrder('asc'); }}>
                {i18n('sortByPriorityAsc') || '优先级升序'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortKey('title'); setSortOrder('asc'); }}>
                {i18n('sortByTitleAsc') || '名称升序'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortKey('title'); setSortOrder('desc'); }}>
                {i18n('sortByTitleDesc') || '名称降序'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 习惯列表 */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {habitsByGroup.size === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="mb-2">{i18n('noHabits') || '暂无习惯'}</p>
              <p className="text-sm">{i18n('addHabitToTrack') || '添加习惯开始追踪'}</p>
              <Button className="mt-4" onClick={handleNewHabit}>
                <Plus className="h-4 w-4 mr-1" />
                {i18n('newHabit') || '新建习惯'}
              </Button>
            </div>
          ) : (
            <>
              {/* 渲染各分组 */}
              {Array.from(habitsByGroup.entries()).map(([groupId, groupHabits]) =>
                renderGroup(groupId, groupHabits)
              )}

              {/* 今日已完成区域 */}
              {currentTab === 'today' && todayCompletedHabits.length > 0 && (
                <div className="pt-4 border-t mt-4">
                  <button
                    className="flex items-center gap-2 w-full p-2 hover:bg-accent/50 rounded-lg transition-colors mb-2"
                    onClick={() => toggleGroupCollapse('completed')}
                  >
                    {collapsedGroups.has('completed') ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-muted-foreground">
                      {i18n('todayCompleted') || '今日已完成'}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {todayCompletedHabits.length}
                    </Badge>
                  </button>
                  {!collapsedGroups.has('completed') && (
                    <div className="space-y-2 pl-6">
                      {todayCompletedHabits.map((habit) => renderHabitCard(habit, true))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 编辑对话框 */}
      <HabitEditDialog
        habit={editingHabit}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      {/* 统计对话框 */}
      {viewingStatsHabit && (
        <HabitStatsDialog
          habit={viewingStatsHabit}
          open={isStatsDialogOpen}
          onOpenChange={setIsStatsDialogOpen}
        />
      )}

      {/* 分组管理对话框 */}
      <HabitGroupManageDialog
        open={isGroupManageOpen}
        onOpenChange={setIsGroupManageOpen}
      />
    </div>
  );
}
