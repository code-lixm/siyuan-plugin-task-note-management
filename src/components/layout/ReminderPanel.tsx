import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSiYuanPlugin } from '@/bridge';
import { useReminderStore, Reminder } from '@/stores';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Trash2,
  ChevronDown,
  ChevronRight,
  Flag,
  Tag,
  Square,
  CheckSquare,
  Calendar,
  X,
} from 'lucide-react';
import { i18n } from '@/pluginInstance';
import { CategoryManager, Category } from '@/utils/categoryManager';

interface ReminderPanelProps {
  initialTab?: string;
}

type Priority = 'high' | 'medium' | 'low' | null;

// Priority configuration
const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  high: {
    label: i18n('highPriority') || '高优先级',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
  },
  medium: {
    label: i18n('mediumPriority') || '中优先级',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.1)',
  },
  low: {
    label: i18n('lowPriority') || '低优先级',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  none: {
    label: i18n('noPriority') || '无优先级',
    color: '#9ca3af',
    bgColor: 'transparent',
  },
};

export function ReminderPanel({ initialTab = 'today' }: ReminderPanelProps) {
  const plugin = useSiYuanPlugin();
  const categoryManager = useMemo(() => CategoryManager.getInstance(plugin), [plugin]);
  
  const {
    reminders,
    isLoading,
    loadReminders,
    addReminder,
    updateReminder,
    deleteReminder,
    toggleComplete,
    setReminderPriority,
    setReminderCategory,
    batchToggleComplete,
    batchSetPriority,
    batchSetCategory,
    batchSetDate,
    batchDelete,
  } = useReminderStore();
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  // Load reminders on mount and categories
  useEffect(() => {
    loadReminders();
    categoryManager.initialize().then(() => {
      setCategories(categoryManager.getCategories());
    });
  }, [loadReminders, categoryManager]);

  // Filter reminders based on active tab and search
  const filteredReminders = useMemo(() => {
    let filtered = reminders.filter((reminder) => {
      const matchesSearch = reminder.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      
      switch (activeTab) {
        case 'today':
          const today = new Date().toISOString().split('T')[0];
          return matchesSearch && (reminder.date === today || !reminder.completed);
        case 'upcoming':
          return matchesSearch && !reminder.completed;
        case 'completed':
          return matchesSearch && reminder.completed;
        default:
          return matchesSearch;
      }
    });

    // Build a map of parent to children for subtask handling
    const parentChildrenMap = new Map<string, Reminder[]>();
    filtered.forEach((r) => {
      if (r.parentId) {
        const children = parentChildrenMap.get(r.parentId) || [];
        children.push(r);
        parentChildrenMap.set(r.parentId, children);
      }
    });

    // Sort by priority first, then by date
    return filtered.sort((a, b) => {
      // Priority sort
      const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
      const priorityDiff = (priorityOrder[b.priority || 'none'] || 0) - (priorityOrder[a.priority || 'none'] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Date sort
      if (a.date && b.date) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return 0;
    });
  }, [reminders, activeTab, searchQuery]);

  // Get top-level reminders (no parent or parent not in filtered list)
  const topLevelReminders = useMemo(() => {
    const filteredIds = new Set(filteredReminders.map(r => r.id));
    return filteredReminders.filter(
      (r) => !r.parentId || !filteredIds.has(r.parentId)
    );
  }, [filteredReminders]);

  // Get children for a parent task
  const getChildren = useCallback((parentId: string) => {
    return filteredReminders.filter(r => r.parentId === parentId);
  }, [filteredReminders]);

  const handleCreateReminder = useCallback(() => {
    if (!newReminderTitle.trim()) return;
    
    addReminder({
      title: newReminderTitle,
      completed: false,
    });
    
    setNewReminderTitle('');
    setIsCreating(false);
  }, [newReminderTitle, addReminder]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateReminder();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewReminderTitle('');
    }
  }, [handleCreateReminder]);

  // Delete handlers
  const handleDeleteClick = useCallback((id: string) => {
    setTaskToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (taskToDelete) {
      deleteReminder(taskToDelete);
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  }, [taskToDelete, deleteReminder]);

  // Priority handlers
  const handleSetPriority = useCallback((id: string, priority: Priority) => {
    setReminderPriority(id, priority);
    updateReminder(id, { priority: priority || undefined });
  }, [setReminderPriority, updateReminder]);

  // Category handlers
  const handleSetCategory = useCallback((id: string, categoryId: string | null) => {
    setReminderCategory(id, categoryId);
    updateReminder(id, { categoryId: categoryId || undefined });
  }, [setReminderCategory, updateReminder]);

  // Expand/Collapse handlers
  const toggleExpand = useCallback((id: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Multi-select handlers
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
    setLastClickedId(id);
  }, []);

  const selectRange = useCallback((fromId: string, toId: string) => {
    const allIds = filteredReminders.map(r => r.id);
    const fromIndex = allIds.indexOf(fromId);
    const toIndex = allIds.indexOf(toId);
    
    if (fromIndex === -1 || toIndex === -1) return;
    
    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);
    
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      for (let i = startIndex; i <= endIndex; i++) {
        newSet.add(allIds[i]);
      }
      return newSet;
    });
  }, [filteredReminders]);

  const handleCardClick = useCallback((e: React.MouseEvent, id: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      if (!isMultiSelectMode) {
        setIsMultiSelectMode(true);
      }
      toggleSelection(id);
    } else if (e.shiftKey && isMultiSelectMode && lastClickedId) {
      e.preventDefault();
      e.stopPropagation();
      selectRange(lastClickedId, id);
    }
  }, [isMultiSelectMode, lastClickedId, toggleSelection, selectRange]);

  const exitMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedIds(new Set());
    setLastClickedId(null);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredReminders.map(r => r.id)));
  }, [filteredReminders]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Batch operation handlers
  const handleBatchComplete = useCallback((completed: boolean) => {
    batchToggleComplete(Array.from(selectedIds), completed);
    exitMultiSelectMode();
  }, [selectedIds, batchToggleComplete, exitMultiSelectMode]);

  const handleBatchSetPriority = useCallback((priority: Priority) => {
    batchSetPriority(Array.from(selectedIds), priority);
    exitMultiSelectMode();
  }, [selectedIds, batchSetPriority, exitMultiSelectMode]);

  const handleBatchSetCategory = useCallback((categoryId: string | null) => {
    batchSetCategory(Array.from(selectedIds), categoryId);
    exitMultiSelectMode();
  }, [selectedIds, batchSetCategory, exitMultiSelectMode]);

  const handleBatchSetDate = useCallback((date: string | null) => {
    batchSetDate(Array.from(selectedIds), date);
    exitMultiSelectMode();
  }, [selectedIds, batchSetDate, exitMultiSelectMode]);

  const handleBatchDelete = useCallback(() => {
    setBatchDeleteDialogOpen(true);
  }, []);

  const confirmBatchDelete = useCallback(() => {
    batchDelete(Array.from(selectedIds));
    setBatchDeleteDialogOpen(false);
    exitMultiSelectMode();
  }, [selectedIds, batchDelete, exitMultiSelectMode]);

  // Keyboard handler for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMultiSelectMode) {
        exitMultiSelectMode();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMultiSelectMode, exitMultiSelectMode]);

  // Task card component
  const TaskCard = useCallback(({ reminder, level = 0 }: { reminder: Reminder; level?: number }) => {
    const children = getChildren(reminder.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedTasks.has(reminder.id);
    const priority = reminder.priority || 'none';
    const priorityConfig = PRIORITY_CONFIG[priority];
    const category = reminder.categoryId ? categoryManager.getCategoryById(reminder.categoryId) : null;
    const isSelected = selectedIds.has(reminder.id);

    return (
      <div style={{ marginLeft: level * 20 }}>
        <Card
          className={`group relative transition-all hover:shadow-md ${
            reminder.completed ? 'opacity-50' : ''
          } ${isSelected ? 'ring-2 ring-primary' : ''}`}
          style={{
            borderLeft: `3px solid ${priorityConfig.color}`,
            backgroundColor: isSelected ? 'rgba(var(--primary-rgb), 0.1)' : priorityConfig.bgColor,
          }}
          onClick={(e) => handleCardClick(e, reminder.id)}
        >
          <CardContent className="p-3 flex items-center gap-3">
            {/* Multi-select checkbox (visible in multi-select mode) */}
            {isMultiSelectMode ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelection(reminder.id);
                }}
                className="flex-shrink-0"
              >
                {isSelected ? (
                  <CheckSquare className="h-5 w-5 text-primary" />
                ) : (
                  <Square className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            ) : (
              <>
                {/* Expand/Collapse button for subtasks */}
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpand(reminder.id)}
                    className="flex-shrink-0 p-1 hover:bg-accent rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ) : (
                  <div className="w-6" />
                )}

                {/* Complete checkbox */}
                <button
                  onClick={() => toggleComplete(reminder.id)}
                  className="flex-shrink-0"
                >
                  {reminder.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              </>
            )}

            {/* Priority indicator */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex-shrink-0 p-1 hover:bg-accent rounded"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Flag 
                    className="h-4 w-4" 
                    style={{ color: priorityConfig.color }}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>{i18n('setPriority') || '设置优先级'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSetPriority(reminder.id, 'high')}>
                  <Flag className="h-4 w-4 mr-2 text-red-500" />
                  {PRIORITY_CONFIG.high.label}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSetPriority(reminder.id, 'medium')}>
                  <Flag className="h-4 w-4 mr-2 text-orange-500" />
                  {PRIORITY_CONFIG.medium.label}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSetPriority(reminder.id, 'low')}>
                  <Flag className="h-4 w-4 mr-2 text-blue-500" />
                  {PRIORITY_CONFIG.low.label}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSetPriority(reminder.id, null)}>
                  <Flag className="h-4 w-4 mr-2 text-gray-400" />
                  {PRIORITY_CONFIG.none.label}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Task content */}
            <div className="flex-1 min-w-0">
              <p
                className={`font-medium truncate ${
                  reminder.completed ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {reminder.title}
              </p>
              
              {/* Category tag */}
              {category && (
                <div className="flex items-center gap-1 mt-1">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
                    style={{
                      backgroundColor: category.color + '20',
                      color: category.color,
                      border: `1px solid ${category.color}40`,
                    }}
                  >
                    {category.icon && <span>{category.icon}</span>}
                    {category.name}
                  </span>
                </div>
              )}
              
              {reminder.date && (
                <p className="text-xs text-muted-foreground mt-1">
                  {reminder.date}
                </p>
              )}
            </div>

            {/* Actions */}
            {!isMultiSelectMode && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Category dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Tag className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{i18n('setCategory') || '设置分类'}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {categories.map((cat) => (
                      <DropdownMenuItem
                        key={cat.id}
                        onClick={() => handleSetCategory(reminder.id, cat.id)}
                      >
                        <span
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.icon && <span className="mr-1">{cat.icon}</span>}
                        {cat.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleSetCategory(reminder.id, null)}>
                      {i18n('noCategory') || '无分类'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteClick(reminder.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Subtask count indicator */}
            {hasChildren && (
              <span className="text-xs text-muted-foreground ml-2">
                {children.length} {i18n('subtasks') || '子任务'}
              </span>
            )}
          </CardContent>
        </Card>

        {/* Render children if expanded */}
        {isExpanded && hasChildren && !isMultiSelectMode && (
          <div className="mt-2 space-y-2">
            {children.map((child) => (
              <TaskCard key={child.id} reminder={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }, [categories, expandedTasks, getChildren, handleDeleteClick, handleSetCategory, handleSetPriority, toggleComplete, toggleExpand, selectedIds, isMultiSelectMode, toggleSelection, handleCardClick]);

  // Get today's date string
  const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowString = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);

  return (
    <div className="siyuan-plugin-container h-full flex flex-col bg-background">
      {/* Header */}
      {!isMultiSelectMode ? (
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{i18n("dailyTasks")}</h2>
          <Button
            size="sm"
            onClick={() => setIsCreating(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            {i18n("newTask")}
          </Button>
        </div>
      ) : (
        /* Multi-select Toolbar */
        <div className="flex items-center justify-between p-4 border-b bg-primary/5">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {i18n('selectedNItems', { count: selectedIds.size.toString() }) || `已选择 ${selectedIds.size} 项`}
            </span>
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {i18n('selectAll') || '全选'}
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              {i18n('deselectAll') || '取消全选'}
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {/* Batch Complete */}
            <Button variant="outline" size="sm" onClick={() => handleBatchComplete(true)}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {i18n('complete') || '完成'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBatchComplete(false)}>
              <Circle className="h-4 w-4 mr-1" />
              {i18n('uncomplete') || '未完成'}
            </Button>

            {/* Batch Priority Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Flag className="h-4 w-4 mr-1" />
                  {i18n('priority') || '优先级'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{i18n('setPriority') || '设置优先级'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBatchSetPriority('high')}>
                  <Flag className="h-4 w-4 mr-2 text-red-500" />
                  {PRIORITY_CONFIG.high.label}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBatchSetPriority('medium')}>
                  <Flag className="h-4 w-4 mr-2 text-orange-500" />
                  {PRIORITY_CONFIG.medium.label}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBatchSetPriority('low')}>
                  <Flag className="h-4 w-4 mr-2 text-blue-500" />
                  {PRIORITY_CONFIG.low.label}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBatchSetPriority(null)}>
                  <Flag className="h-4 w-4 mr-2 text-gray-400" />
                  {PRIORITY_CONFIG.none.label}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Batch Date Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-1" />
                  {i18n('date') || '日期'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{i18n('setDate') || '设置日期'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBatchSetDate(todayString)}>
                  {i18n('today') || '今天'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBatchSetDate(tomorrowString)}>
                  {i18n('tomorrow') || '明天'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBatchSetDate(null)}>
                  {i18n('noDate') || '无日期'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Batch Category Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Tag className="h-4 w-4 mr-1" />
                  {i18n('category') || '分类'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{i18n('setCategory') || '设置分类'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {categories.map((cat) => (
                  <DropdownMenuItem
                    key={cat.id}
                    onClick={() => handleBatchSetCategory(cat.id)}
                  >
                    <span
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.icon && <span className="mr-1">{cat.icon}</span>}
                    {cat.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBatchSetCategory(null)}>
                  {i18n('noCategory') || '无分类'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Batch Delete */}
            <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              {i18n('delete') || '删除'}
            </Button>

            {/* Exit Multi-select */}
            <Button variant="ghost" size="icon" onClick={exitMultiSelectMode}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={i18n("searchTasks")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Create New Reminder Input */}
      {isCreating && (
        <div className="p-4 border-b bg-muted/50">
          <div className="flex gap-2">
            <Input
              autoFocus
              placeholder={i18n("enterReminderTitle")}
              value={newReminderTitle}
              onChange={(e) => setNewReminderTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button size="sm" onClick={handleCreateReminder}>
              {i18n("save")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsCreating(false);
                setNewReminderTitle('');
              }}
            >
              {i18n("cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
          <TabsTrigger value="today">{i18n("today")}</TabsTrigger>
          <TabsTrigger value="upcoming">{i18n("unfinished")}</TabsTrigger>
          <TabsTrigger value="completed">{i18n("completed")}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {i18n("loading")}
            </div>
          ) : topLevelReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Circle className="h-12 w-12 mb-2 opacity-20" />
              <p>{i18n("noReminders")}</p>
              <p className="text-sm">{i18n("clickNewToAddTask")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topLevelReminders.map((reminder) => (
                <TaskCard key={reminder.id} reminder={reminder} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n('confirmDelete') || '确认删除'}</AlertDialogTitle>
            <AlertDialogDescription>
              {i18n('deleteTaskConfirm') || '确定要删除这个任务吗？此操作无法撤销。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTaskToDelete(null)}>
              {i18n('cancel') || '取消'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {i18n('delete') || '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n('confirmBatchDelete') || '确认批量删除'}</AlertDialogTitle>
            <AlertDialogDescription>
              {i18n('batchDeleteConfirm', { count: selectedIds.size.toString() }) || 
                `确定要删除选中的 ${selectedIds.size} 个任务吗？此操作无法撤销。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBatchDeleteDialogOpen(false)}>
              {i18n('cancel') || '取消'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBatchDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {i18n('delete') || '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}