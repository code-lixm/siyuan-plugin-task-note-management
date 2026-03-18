import React, { useState } from 'react';
import { useHabitStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Check, Flame } from 'lucide-react';

export function HabitPanel() {
  const { habits, selectedDate, checkIn, uncheck, setSelectedDate } = useHabitStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');

  const handleCheckIn = (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (habit?.checkIns[selectedDate]) {
      uncheck(habitId, selectedDate);
    } else {
      checkIn(habitId, selectedDate);
    }
  };

  return (
    <div className="siyuan-plugin-container h-full flex flex-col bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">习惯打卡</h2>
          <p className="text-sm text-muted-foreground">{selectedDate}</p>
        </div>
        <Button size="sm" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          新建
        </Button>
      </div>

      {isCreating && (
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <Input
              autoFocus
              placeholder="习惯名称"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
            />
            <Button size="sm">保存</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {habits.map((habit) => {
            const isChecked = !!habit.checkIns[selectedDate];
            return (
              <Card
                key={habit.id}
                className={`cursor-pointer transition-colors ${
                  isChecked ? 'bg-primary/10' : 'hover:bg-accent/50'
                }`}
                onClick={() => handleCheckIn(habit.id)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center ${
                      isChecked ? 'bg-primary text-primary-foreground' : 'border-2 border-muted'
                    }`}
                  >
                    {isChecked && <Check className="h-4 w-4" />}
                  </div>
                  <span className="flex-1 font-medium">{habit.name}</span>
                  {isChecked && <Flame className="h-4 w-4 text-orange-500" />}
                </CardContent>
              </Card>
            );
          })}
          {habits.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>暂无习惯</p>
              <p className="text-sm">添加习惯开始追踪</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
