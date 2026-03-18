import React, { useState, useEffect, useCallback } from 'react';
import { useSiYuanPlugin } from '@/bridge';
import { useReminderStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, CheckCircle2, Circle } from 'lucide-react';
import { i18n } from '@/pluginInstance';

interface ReminderPanelProps {
  initialTab?: string;
}

export function ReminderPanel({ initialTab = 'today' }: ReminderPanelProps) {
  const plugin = useSiYuanPlugin();
  const {
    reminders,
    isLoading,
    loadReminders,
    addReminder,
    toggleComplete,
  } = useReminderStore();
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState('');

  // Load reminders on mount
  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Filter reminders based on active tab and search
  const filteredReminders = reminders.filter((reminder) => {
    const matchesSearch = reminder.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    
    switch (activeTab) {
      case 'today':
        // Filter for today's reminders
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

  return (
    <div className="siyuan-plugin-container h-full flex flex-col bg-background">
      {/* Header */}
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
          ) : filteredReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Circle className="h-12 w-12 mb-2 opacity-20" />
              <p>{i18n("noReminders")}</p>
              <p className="text-sm">{i18n("clickNewToAddTask")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReminders.map((reminder) => (
                <Card
                  key={reminder.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <CardContent className="p-3 flex items-center gap-3">
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
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate ${
                          reminder.completed ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        {reminder.title}
                      </p>
                      {reminder.date && (
                        <p className="text-xs text-muted-foreground">
                          {reminder.date}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
