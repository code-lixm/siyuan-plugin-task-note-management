/*
 * Copyright (c) 2024 by OpenCode. All Rights Reserved.
 * @Author       : OpenCode
 * @Date         : 2026-03-19
 * @FilePath     : /src/components/views/EisenhowerMatrixView.tsx
 * @Description  : Eisenhower Matrix (四象限) Task Management View
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSiYuanPlugin } from '@/bridge';
import { useReminderStore, Reminder } from '@/stores';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  MoreHorizontal,
  CheckCircle2,
  Circle,
  Trash2,
  Edit3,
  Flag,
  Calendar,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  GripVertical,
  Filter,
  Settings,
  Zap,
  Clock,
  Users,
  XCircle,
} from 'lucide-react';
import { i18n } from '@/pluginInstance';
import { CategoryManager, Category } from '@/utils/categoryManager';

// Quadrant Types
type QuadrantKey = 'important-urgent' | 'important-not-urgent' | 'not-important-urgent' | 'not-important-not-urgent';

interface QuadrantConfig {
  key: QuadrantKey;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  actionText: string;
}

interface MatrixTask extends Reminder {
  quadrant: QuadrantKey;
  isUrgent: boolean;
  isImportant: boolean;
}

// Priority configuration
const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  high: {
    label: i18n('highPriority') || '高优先级',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    icon: <ArrowUpCircle className="h-4 w-4" />,
  },
  medium: {
    label: i18n('mediumPriority') || '中优先级',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    icon: <ArrowRightCircle className="h-4 w-4" />,
  },
  low: {
    label: i18n('lowPriority') || '低优先级',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    icon: <ArrowDownCircle className="h-4 w-4" />,
  },
  none: {
    label: i18n('noPriority') || '无优先级',
    color: '#9ca3af',
    bgColor: 'transparent',
    icon: <Circle className="h-4 w-4" />,
  },
};

// Quadrant configurations
const QUADRANT_CONFIGS: QuadrantConfig[] = [
  {
    key: 'important-urgent',
    title: i18n('quadrantImportantUrgent') || '重要且紧急',
    subtitle: 'Do First',
    description: i18n('quadrantImportantUrgentDesc') || '立即执行，优先级最高',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    icon: <Zap className="h-5 w-5" />,
    actionText: i18n('doFirst') || '立即做',
  },
  {
    key: 'important-not-urgent',
    title: i18n('quadrantImportantNotUrgent') || '重要不紧急',
    subtitle: 'Schedule',
    description: i18n('quadrantImportantNotUrgentDesc') || '计划安排，稳步进行',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.05)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    icon: <Calendar className="h-5 w-5" />,
    actionText: i18n('schedule') || '计划做',
  },
  {
    key: 'not-important-urgent',
    title: i18n('quadrantNotImportantUrgent') || '不重要紧急',
    subtitle: 'Delegate',
    description: i18n('quadrantNotImportantUrgentDesc') || '尽量委托他人处理',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.05)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    icon: <Users className="h-5 w-5" />,
    actionText: i18n('delegate') || '委托做',
  },
  {
    key: 'not-important-not-urgent',
    title: i18n('quadrantNotImportantNotUrgent') || '不重要不紧急',
    subtitle: 'Eliminate',
    description: i18n('quadrantNotImportantNotUrgentDesc') || '考虑是否值得做',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.05)',
    borderColor: 'rgba(107, 114, 128, 0.3)',
    icon: <XCircle className="h-5 w-5" />,
    actionText: i18n('eliminate') || '少做',
  },
];

interface EisenhowerMatrixViewProps {
  initialQuadrant?: QuadrantKey;
}

export function EisenhowerMatrixView({ initialQuadrant }: EisenhowerMatrixViewProps) {
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
  } = useReminderStore();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [draggedTask, setDraggedTask] = useState<MatrixTask | null>(null);
  const [dragOverQuadrant, setDragOverQuadrant] = useState<QuadrantKey | null>(null);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantKey>('important-urgent');
  const [editingTask, setEditingTask] = useState<MatrixTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  
  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low' | null>('medium');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<'high' | 'medium' | 'low' | null>('medium');
  
  // Settings
  const [importanceThreshold, setImportanceThreshold] = useState<'high' | 'medium' | 'low'>('medium');
  const [urgencyDays, setUrgencyDays] = useState(3);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadReminders();
    categoryManager.initialize().then(() => {
      setCategories(categoryManager.getCategories());
    });
  }, [loadReminders, categoryManager]);

  // Smart categorization algorithm
  const categorizeTask = useCallback((task: Reminder): { quadrant: QuadrantKey; isUrgent: boolean; isImportant: boolean } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Determine importance based on priority
    const importanceOrder = { none: 0, low: 1, medium: 2, high: 3 };
    const thresholdValue = importanceOrder[importanceThreshold];
    const taskValue = importanceOrder[task.priority || 'none'];
    const isImportant = taskValue >= thresholdValue;
    
    // Determine urgency based on deadline
    let isUrgent = false;
    if (task.date) {
      const taskDate = new Date(task.date);
      taskDate.setHours(0, 0, 0, 0);
      
      // If task is overdue, it's urgent
      if (!task.completed && taskDate < today) {
        isUrgent = true;
      } else {
        // Check if within urgency days
        const urgencyDate = new Date();
        urgencyDate.setDate(today.getDate() + urgencyDays);
        urgencyDate.setHours(23, 59, 59, 999);
        isUrgent = taskDate >= today && taskDate <= urgencyDate;
      }
    }
    
    // Determine quadrant
    let quadrant: QuadrantKey;
    if (isImportant && isUrgent) {
      quadrant = 'important-urgent';
    } else if (isImportant && !isUrgent) {
      quadrant = 'important-not-urgent';
    } else if (!isImportant && isUrgent) {
      quadrant = 'not-important-urgent';
    } else {
      quadrant = 'not-important-not-urgent';
    }
    
    return { quadrant, isUrgent, isImportant };
  }, [importanceThreshold, urgencyDays]);

  // Process reminders into matrix tasks
  const matrixTasks = useMemo(() => {
    return reminders.map(task => {
      const { quadrant, isUrgent, isImportant } = categorizeTask(task);
      return {
        ...task,
        quadrant,
        isUrgent,
        isImportant,
      };
    });
  }, [reminders, categorizeTask]);

  // Group tasks by quadrant
  const tasksByQuadrant = useMemo(() => {
    const grouped: Record<QuadrantKey, MatrixTask[]> = {
      'important-urgent': [],
      'important-not-urgent': [],
      'not-important-urgent': [],
      'not-important-not-urgent': [],
    };
    
    matrixTasks.forEach(task => {
      if (!task.completed) {
        grouped[task.quadrant].push(task);
      }
    });
    
    // Sort tasks by priority within each quadrant
    (Object.keys(grouped) as QuadrantKey[]).forEach(key => {
      grouped[key].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
        return (priorityOrder[b.priority || 'none'] || 0) - (priorityOrder[a.priority || 'none'] || 0);
      });
    });
    
    return grouped;
  }, [matrixTasks]);

  // Smart quadrant recommendation for new tasks
  const recommendQuadrant = useCallback((title: string, priority?: string, date?: string): QuadrantKey => {
    const tempTask: Reminder = {
      id: 'temp',
      title,
      priority: priority as any,
      date,
      completed: false,
      createdAt: '',
      updatedAt: '',
    };
    const { quadrant } = categorizeTask(tempTask);
    return quadrant;
  }, [categorizeTask]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: MatrixTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e: React.DragEvent, quadrantKey: QuadrantKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverQuadrant(quadrantKey);
  };

  const handleDragLeave = () => {
    setDragOverQuadrant(null);
  };

  const handleDrop = (e: React.DragEvent, targetQuadrant: QuadrantKey) => {
    e.preventDefault();
    setDragOverQuadrant(null);
    
    if (!draggedTask) return;
    
    // Calculate new priority/urgency based on target quadrant
    let newPriority = draggedTask.priority;
    let newDate = draggedTask.date;
    
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    switch (targetQuadrant) {
      case 'important-urgent':
        newPriority = 'high';
        newDate = today;
        break;
      case 'important-not-urgent':
        newPriority = 'high';
        newDate = newDate || futureDate.toISOString().split('T')[0];
        break;
      case 'not-important-urgent':
        newPriority = 'low';
        newDate = today;
        break;
      case 'not-important-not-urgent':
        newPriority = 'low';
        newDate = futureDate.toISOString().split('T')[0];
        break;
    }
    
    updateReminder(draggedTask.id, {
      priority: newPriority,
      date: newDate,
    });
    
    setDraggedTask(null);
  };

  // Create task handlers
  const handleOpenCreateDialog = (quadrantKey: QuadrantKey) => {
    setSelectedQuadrant(quadrantKey);
    
    // Set smart defaults based on quadrant
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    switch (quadrantKey) {
      case 'important-urgent':
        setNewTaskPriority('high');
        setNewTaskDate(today);
        break;
      case 'important-not-urgent':
        setNewTaskPriority('high');
        setNewTaskDate(futureDate.toISOString().split('T')[0]);
        break;
      case 'not-important-urgent':
        setNewTaskPriority('low');
        setNewTaskDate(today);
        break;
      case 'not-important-not-urgent':
        setNewTaskPriority('low');
        setNewTaskDate(futureDate.toISOString().split('T')[0]);
        break;
    }
    
    setNewTaskTitle('');
    setIsCreateDialogOpen(true);
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    
    addReminder({
      title: newTaskTitle,
      priority: newTaskPriority || undefined,
      date: newTaskDate || undefined,
      completed: false,
    });
    
    setNewTaskTitle('');
    setIsCreateDialogOpen(false);
  };

  // Edit task handlers
  const handleOpenEditDialog = (task: MatrixTask) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskPriority(task.priority || null);
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = () => {
    if (!editingTask || !editTaskTitle.trim()) return;
    
    updateReminder(editingTask.id, {
      title: editTaskTitle,
      priority: editTaskPriority || undefined,
    });
    
    setEditingTask(null);
    setIsEditDialogOpen(false);
  };

  // Delete task handlers
  const handleDeleteClick = (taskId: string) => {
    setTaskToDelete(taskId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      deleteReminder(taskToDelete);
      setTaskToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  // Priority change handler
  const handlePriorityChange = (taskId: string, priority: 'high' | 'medium' | 'low' | null) => {
    setReminderPriority(taskId, priority);
    updateReminder(taskId, { priority: priority || undefined });
  };

  // Task Card Component
  const TaskCard = ({ task }: { task: MatrixTask }) => {
    const priority = task.priority || 'none';
    const priorityConfig = PRIORITY_CONFIG[priority];
    const category = task.categoryId ? categoryManager.getCategoryById(task.categoryId) : null;

    return (
      <Card
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        className="group cursor-move transition-all hover:shadow-md border-l-4"
        style={{
          borderLeftColor: priorityConfig.color,
          backgroundColor: priorityConfig.bgColor,
        }}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            {/* Drag handle */}
            <div className="mt-0.5 text-muted-foreground">
              <GripVertical className="h-4 w-4" />
            </div>
            
            {/* Complete checkbox */}
            <button
              onClick={() => toggleComplete(task.id)}
              className="mt-0.5 flex-shrink-0"
            >
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
              )}
            </button>

            {/* Task content */}
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </p>
              
              {/* Meta info */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {/* Priority badge */}
                <Badge
                  variant="outline"
                  className="text-xs px-1.5 py-0"
                  style={{ borderColor: priorityConfig.color, color: priorityConfig.color }}
                >
                  {priorityConfig.icon}
                </Badge>
                
                {/* Category */}
                {category && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: category.color + '20',
                      color: category.color,
                    }}
                  >
                    {category.icon} {category.name}
                  </span>
                )}
                
                {/* Date */}
                {task.date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {task.date}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Flag className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{i18n('setPriority') || '设置优先级'}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handlePriorityChange(task.id, 'high')}>
                    <Flag className="h-4 w-4 mr-2 text-red-500" />
                    {PRIORITY_CONFIG.high.label}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePriorityChange(task.id, 'medium')}>
                    <Flag className="h-4 w-4 mr-2 text-orange-500" />
                    {PRIORITY_CONFIG.medium.label}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePriorityChange(task.id, 'low')}>
                    <Flag className="h-4 w-4 mr-2 text-blue-500" />
                    {PRIORITY_CONFIG.low.label}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePriorityChange(task.id, null)}>
                    <Flag className="h-4 w-4 mr-2 text-gray-400" />
                    {PRIORITY_CONFIG.none.label}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleOpenEditDialog(task)}
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => handleDeleteClick(task.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Quadrant Component
  const QuadrantCard = ({ config }: { config: QuadrantConfig }) => {
    const tasks = tasksByQuadrant[config.key];
    const isDragOver = dragOverQuadrant === config.key;
    
    return (
      <Card
        className={`flex flex-col h-full transition-all duration-200 ${isDragOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
        style={{
          backgroundColor: config.bgColor,
          borderColor: isDragOver ? config.color : config.borderColor,
        }}
        onDragOver={(e) => handleDragOver(e, config.key)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, config.key)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: config.color + '20', color: config.color }}
              >
                {config.icon}
              </div>
              <div>
                <CardTitle className="text-base font-semibold">{config.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{config.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {tasks.length}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleOpenCreateDialog(config.key)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto pt-0">
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">{i18n('noTasksInQuadrant') || '暂无任务'}</p>
                <p className="text-xs mt-1">{i18n('dragTasksHere') || '拖拽任务到此处'}</p>
              </div>
            ) : (
              tasks.map(task => <TaskCard key={task.id} task={task} />)
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="siyuan-plugin-container h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">{i18n('eisenhowerMatrix') || '四象限任务管理'}</h2>
          <p className="text-sm text-muted-foreground">
            {i18n('eisenhowerMatrixDesc') || '基于重要性和紧急性对任务进行分类'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="h-4 w-4 mr-1" />
            {i18n('settings') || '设置'}
          </Button>
          <Button
            size="sm"
            onClick={() => handleOpenCreateDialog('important-urgent')}
          >
            <Plus className="h-4 w-4 mr-1" />
            {i18n('newTask') || '新建任务'}
          </Button>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="flex-1 p-4 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {i18n('loading') || '加载中...'}
          </div>
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full min-h-[500px]">
            {QUADRANT_CONFIGS.map(config => (
              <QuadrantCard key={config.key} config={config} />
            ))}
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{i18n('newTask') || '新建任务'}</DialogTitle>
            <DialogDescription>
              {i18n('createTaskInQuadrant') || '在'} 
              {QUADRANT_CONFIGS.find(q => q.key === selectedQuadrant)?.title}
              {i18n('createTaskInQuadrantSuffix') || '创建任务'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">{i18n('taskTitle') || '任务标题'}</label>
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder={i18n('enterTaskTitle') || '输入任务标题'}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{i18n('priority') || '优先级'}</label>
                <select
                  className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                  value={newTaskPriority || 'none'}
                  onChange={(e) => setNewTaskPriority(e.target.value === 'none' ? null : e.target.value as any)}
                >
                  <option value="high">{PRIORITY_CONFIG.high.label}</option>
                  <option value="medium">{PRIORITY_CONFIG.medium.label}</option>
                  <option value="low">{PRIORITY_CONFIG.low.label}</option>
                  <option value="none">{PRIORITY_CONFIG.none.label}</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">{i18n('dueDate') || '截止日期'}</label>
                <Input
                  type="date"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                />
              </div>
            </div>
            
            {/* Smart recommendation */}
            {newTaskTitle && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {i18n('recommendedQuadrant') || '推荐象限'}: 
                  <span className="font-medium text-foreground ml-1">
                    {QUADRANT_CONFIGS.find(q => q.key === recommendQuadrant(newTaskTitle, newTaskPriority || undefined, newTaskDate || undefined))?.title}
                  </span>
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {i18n('cancel') || '取消'}
            </Button>
            <Button onClick={handleCreateTask}>
              {i18n('create') || '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{i18n('editTask') || '编辑任务'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">{i18n('taskTitle') || '任务标题'}</label>
              <Input
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                placeholder={i18n('enterTaskTitle') || '输入任务标题'}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">{i18n('priority') || '优先级'}</label>
              <select
                className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                value={editTaskPriority || 'none'}
                onChange={(e) => setEditTaskPriority(e.target.value === 'none' ? null : e.target.value as any)}
              >
                <option value="high">{PRIORITY_CONFIG.high.label}</option>
                <option value="medium">{PRIORITY_CONFIG.medium.label}</option>
                <option value="low">{PRIORITY_CONFIG.low.label}</option>
                <option value="none">{PRIORITY_CONFIG.none.label}</option>
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {i18n('cancel') || '取消'}
            </Button>
            <Button onClick={handleUpdateTask}>
              {i18n('save') || '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{i18n('matrixSettings') || '四象限设置'}</DialogTitle>
            <DialogDescription>
              {i18n('matrixSettingsDesc') || '配置任务分类规则'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">{i18n('importanceThreshold') || '重要性阈值'}</label>
              <select
                className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                value={importanceThreshold}
                onChange={(e) => setImportanceThreshold(e.target.value as any)}
              >
                <option value="high">{i18n('highPriorityOnly') || '仅高优先级'}</option>
                <option value="medium">{i18n('mediumPriorityAndAbove') || '中优先级及以上'}</option>
                <option value="low">{i18n('lowPriorityAndAbove') || '低优先级及以上'}</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {i18n('importanceThresholdDesc') || '高于此优先级的任务被视为重要'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium">{i18n('urgencyDays') || '紧急天数'}</label>
              <Input
                type="number"
                min={1}
                max={30}
                value={urgencyDays}
                onChange={(e) => setUrgencyDays(parseInt(e.target.value) || 3)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {i18n('urgencyDaysDesc') || '截止日期在此天数内的任务被视为紧急'}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsSettingsOpen(false)}>
              {i18n('close') || '关闭'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
    </div>
  );
}

export default EisenhowerMatrixView;
