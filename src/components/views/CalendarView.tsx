/*
 * Copyright (c) 2024 by frostime. All Rights Reserved.
 * @Author       : frostime
 * @Date         : 2024-03-19
 * @FilePath     : /src/components/views/CalendarView.tsx
 * @Description  : Calendar view using FullCalendar React
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import type { EventClickArg, EventDropArg } from '@fullcalendar/core';
import type { EventInput } from '@fullcalendar/core';

import { useSiYuanPlugin } from '@/bridge';
import { useReminderStore, Reminder } from '@/stores';
import { useProjectStore } from '@/stores';
import { CategoryManager, Category } from '@/utils/categoryManager';
import { i18n } from '@/pluginInstance';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Filter, Plus, Clock, CheckCircle2, Circle } from 'lucide-react';

// Extended reminder type with time for calendar events
interface CalendarReminder extends Reminder {
  startTime?: string;
  endTime?: string;
}

// Calendar event type
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    reminder: CalendarReminder;
    category?: Category;
    projectName?: string;
  };
}

// Filter state
interface CalendarFilters {
  categoryId: string | 'all';
  projectId: string | 'all';
  showCompleted: boolean;
}

export function CalendarView() {
  const plugin = useSiYuanPlugin();
  const categoryManager = useMemo(() => CategoryManager.getInstance(plugin), [plugin]);
  
  const { reminders, setPlugin, loadReminders, updateReminder, addReminder } = useReminderStore();
  const { projects, loadProjects } = useProjectStore();
  
  // Local state
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<CalendarFilters>({
    categoryId: 'all',
    projectId: 'all',
    showCompleted: true,
  });
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<CalendarReminder | null>(null);
  
  // Form state for create/edit
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formProjectId, setFormProjectId] = useState<string>('');

  // Load data on mount
  useEffect(() => {
    setPlugin(plugin as any);
    loadReminders();
    loadProjects();
    categoryManager.initialize().then(() => {
      setCategories(categoryManager.getCategories());
    });
  }, [plugin, setPlugin, loadReminders, loadProjects, categoryManager]);

  // Convert reminders to calendar events
  const calendarEvents: EventInput[] = useMemo(() => {
    return reminders
      .filter((reminder) => {
        // Filter by completion status
        if (!filters.showCompleted && reminder.completed) {
          return false;
        }
        // Filter by category
        if (filters.categoryId !== 'all' && reminder.categoryId !== filters.categoryId) {
          return false;
        }
        // Filter by project
        if (filters.projectId !== 'all' && reminder.projectId !== filters.projectId) {
          return false;
        }
        return true;
      })
      .map((reminder): CalendarEvent => {
        const category = reminder.categoryId 
          ? categoryManager.getCategoryById(reminder.categoryId) 
          : undefined;
        const project = reminder.projectId 
          ? projects.find(p => p.id === reminder.projectId) 
          : undefined;
        
        // Build start date/time
        let startDate = reminder.date || new Date().toISOString().split('T')[0];
        if (reminder.time) {
          startDate = `${startDate}T${reminder.time}`;
        }
        
        // Calculate end time (default 1 hour duration if time is set)
        let endDate: string | undefined;
        if (reminder.time) {
          const start = new Date(startDate);
          const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
          endDate = end.toISOString();
        }
        
        // Get colors based on priority or category
        let backgroundColor = category?.color || '#3b82f6';
        let borderColor = backgroundColor;
        
        // Adjust color based on priority
        if (reminder.priority === 'high') {
          backgroundColor = '#ef4444';
          borderColor = '#dc2626';
        } else if (reminder.priority === 'medium') {
          backgroundColor = '#f97316';
          borderColor = '#ea580c';
        } else if (reminder.priority === 'low') {
          backgroundColor = '#3b82f6';
          borderColor = '#2563eb';
        }
        
        // Reduce opacity for completed tasks
        if (reminder.completed) {
          backgroundColor = backgroundColor + '80'; // 50% opacity
        }
        
        return {
          id: reminder.id,
          title: reminder.title,
          start: startDate,
          end: endDate,
          allDay: !reminder.time,
          backgroundColor,
          borderColor,
          textColor: '#ffffff',
          extendedProps: {
            reminder: reminder as CalendarReminder,
            category,
            projectName: project?.name,
          },
        };
      });
  }, [reminders, filters, categoryManager, projects]);

  // Handle date click (create new task)
  const handleDateClick = useCallback((arg: DateClickArg) => {
    const dateStr = arg.dateStr;
    setFormDate(dateStr);
    setFormTitle('');
    setFormTime('');
    setFormCategoryId('');
    setFormProjectId('');
    setIsCreateDialogOpen(true);
  }, []);

  // Handle event click (edit task)
  const handleEventClick = useCallback((arg: EventClickArg) => {
    const reminder = arg.event.extendedProps.reminder as CalendarReminder;
    setSelectedReminder(reminder);
    setFormTitle(reminder.title);
    setFormDate(reminder.date || '');
    setFormTime(reminder.time || '');
    setFormCategoryId(reminder.categoryId || '');
    setFormProjectId(reminder.projectId || '');
    setIsEditDialogOpen(true);
  }, []);

  // Handle event drop (drag to new date)
  const handleEventDrop = useCallback((arg: EventDropArg) => {
    const reminderId = arg.event.id;
    const newDate = arg.event.startStr.split('T')[0];
    const newTime = arg.event.startStr.includes('T') 
      ? arg.event.startStr.split('T')[1].substring(0, 5) 
      : undefined;
    
    updateReminder(reminderId, {
      date: newDate,
      time: newTime,
    });
  }, [updateReminder]);

  // Handle event resize (change duration)
  const handleEventResize = useCallback((arg: any) => {
    // Store the new end time in the reminder
    const reminderId = arg.event.id;
    const endTime = arg.event.end 
      ? arg.event.end.toISOString().split('T')[1].substring(0, 5)
      : undefined;
    
    // Note: We don't have a dedicated endTime field in Reminder,
    // but we could store it in a custom field if needed
    console.log('Event resized:', reminderId, 'end time:', endTime);
  }, []);

  // Create new reminder
  const handleCreateReminder = useCallback(() => {
    if (!formTitle.trim()) return;
    
    addReminder({
      title: formTitle,
      date: formDate,
      time: formTime || undefined,
      categoryId: formCategoryId || undefined,
      projectId: formProjectId || undefined,
      completed: false,
    });
    
    setIsCreateDialogOpen(false);
  }, [formTitle, formDate, formTime, formCategoryId, formProjectId, addReminder]);

  // Update existing reminder
  const handleUpdateReminder = useCallback(() => {
    if (!selectedReminder || !formTitle.trim()) return;
    
    updateReminder(selectedReminder.id, {
      title: formTitle,
      date: formDate,
      time: formTime || undefined,
      categoryId: formCategoryId || undefined,
      projectId: formProjectId || undefined,
    });
    
    setIsEditDialogOpen(false);
    setSelectedReminder(null);
  }, [selectedReminder, formTitle, formDate, formTime, formCategoryId, formProjectId, updateReminder]);

  // Toggle task completion
  const handleToggleComplete = useCallback(() => {
    if (!selectedReminder) return;
    
    updateReminder(selectedReminder.id, {
      completed: !selectedReminder.completed,
    });
    
    // Update local state
    setSelectedReminder({
      ...selectedReminder,
      completed: !selectedReminder.completed,
    });
  }, [selectedReminder, updateReminder]);

  return (
    <div className="siyuan-plugin-container h-full flex flex-col bg-background">
      {/* Header with filters */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h2 className="text-lg font-semibold">{i18n('calendar')}</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Category filter */}
          <Select
            value={filters.categoryId}
            onValueChange={(value) => 
              setFilters(prev => ({ ...prev, categoryId: value }))
            }
          >
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={i18n('category') || '分类'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{i18n('allCategories') || '全部分类'}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Project filter */}
          <Select
            value={filters.projectId}
            onValueChange={(value) => 
              setFilters(prev => ({ ...prev, projectId: value }))
            }
          >
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={i18n('project') || '项目'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{i18n('allProjects') || '全部项目'}</SelectItem>
              {projects.map((proj) => (
                <SelectItem key={proj.id} value={proj.id}>
                  {proj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Show completed toggle */}
          <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
            <Checkbox
              id="show-completed"
              checked={filters.showCompleted}
              onCheckedChange={(checked) => 
                setFilters(prev => ({ ...prev, showCompleted: checked as boolean }))
              }
            />
            <Label htmlFor="show-completed" className="text-sm cursor-pointer">
              {i18n('showCompleted') || '显示已完成'}
            </Label>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-4 overflow-hidden">
        <Card className="h-full">
          <CardContent className="p-0 h-full">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
              }}
              views={{
                dayGridMonth: {
                  titleFormat: { year: 'numeric', month: 'long' },
                },
                timeGridWeek: {
                  titleFormat: { year: 'numeric', month: 'short', day: 'numeric' },
                },
                timeGridDay: {
                  titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
                },
                listMonth: {
                  titleFormat: { year: 'numeric', month: 'long' },
                },
              }}
              events={calendarEvents}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              editable={true}
              droppable={true}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              height="100%"
              locale={i18n('locale') || 'zh-cn'}
              buttonText={{
                today: i18n('today') || '今天',
                month: i18n('month') || '月',
                week: i18n('week') || '周',
                day: i18n('day') || '日',
                list: i18n('list') || '列表',
              }}
              eventContent={(eventInfo) => {
                const reminder = eventInfo.event.extendedProps.reminder as CalendarReminder;
                const category = eventInfo.event.extendedProps.category as Category | undefined;
                
                return (
                  <div className="flex items-center gap-1 px-1 py-0.5 overflow-hidden">
                    {reminder.completed ? (
                      <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <Circle className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span className="truncate text-xs">{eventInfo.event.title}</span>
                    {category && (
                      <span 
                        className="w-2 h-2 rounded-full flex-shrink-0 ml-auto"
                        style={{ backgroundColor: category.color }}
                      />
                    )}
                  </div>
                );
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {i18n('createTask') || '创建任务'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">{i18n('taskTitle') || '任务标题'}</Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={i18n('enterTaskTitle') || '输入任务标题'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">{i18n('date') || '日期'}</Label>
                <Input
                  id="date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">{i18n('time') || '时间'}</Label>
                <Input
                  id="time"
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">{i18n('category') || '分类'}</Label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder={i18n('selectCategory') || '选择分类'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{i18n('noCategory') || '无分类'}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project">{i18n('project') || '项目'}</Label>
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={i18n('selectProject') || '选择项目'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{i18n('noProject') || '无项目'}</SelectItem>
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {i18n('cancel') || '取消'}
            </Button>
            <Button onClick={handleCreateReminder} disabled={!formTitle.trim()}>
              {i18n('create') || '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {i18n('editTask') || '编辑任务'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">{i18n('taskTitle') || '任务标题'}</Label>
              <Input
                id="edit-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={i18n('enterTaskTitle') || '输入任务标题'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-date">{i18n('date') || '日期'}</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-time">{i18n('time') || '时间'}</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category">{i18n('category') || '分类'}</Label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder={i18n('selectCategory') || '选择分类'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{i18n('noCategory') || '无分类'}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-project">{i18n('project') || '项目'}</Label>
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={i18n('selectProject') || '选择项目'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{i18n('noProject') || '无项目'}</SelectItem>
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedReminder && (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                <Checkbox
                  id="edit-completed"
                  checked={selectedReminder.completed}
                  onCheckedChange={handleToggleComplete}
                />
                <Label htmlFor="edit-completed" className="cursor-pointer">
                  {selectedReminder.completed 
                    ? (i18n('markAsIncomplete') || '标记为未完成')
                    : (i18n('markAsComplete') || '标记为已完成')
                  }
                </Label>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {i18n('cancel') || '取消'}
            </Button>
            <Button onClick={handleUpdateReminder} disabled={!formTitle.trim()}>
              {i18n('save') || '保存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CalendarView;
