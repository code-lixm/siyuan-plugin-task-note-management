import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Textarea } from '@/components/ui/textarea';
import { useHabitStore, Habit, HabitCheckInEmoji } from '@/stores/useHabitStore';
import { CheckCircle, Edit3 } from 'lucide-react';
import { i18n } from '@/pluginInstance';

interface HabitCheckInMenuProps {
  habit: Habit;
  children: React.ReactNode;
  onCheckIn?: () => void;
}

export function HabitCheckInMenu({ habit, children, onCheckIn }: HabitCheckInMenuProps) {
  const { checkIn } = useHabitStore();
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<HabitCheckInEmoji | null>(null);
  const [note, setNote] = useState('');
  const [checkInTime, setCheckInTime] = useState(
    new Date().toISOString().slice(0, 16)
  );

  const today = new Date().toISOString().split('T')[0];

  // 获取今天已打卡的 emoji
  const todayCheckIn = habit.checkIns?.[today];
  const checkedEmojis = new Set<string>();
  if (todayCheckIn?.entries) {
    todayCheckIn.entries.forEach((entry) => checkedEmojis.add(entry.emoji));
  } else if (todayCheckIn?.status) {
    todayCheckIn.status.forEach((emoji) => checkedEmojis.add(emoji));
  }

  const handleEmojiClick = (emojiConfig: HabitCheckInEmoji) => {
    if (emojiConfig.promptNote) {
      setSelectedEmoji(emojiConfig);
      setIsNoteDialogOpen(true);
    } else {
      // 直接打卡
      const now = new Date();
      const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);
      checkIn(habit.id, today, emojiConfig, undefined, timestamp);
      onCheckIn?.();
    }
  };

  const handleConfirmCheckIn = () => {
    if (!selectedEmoji) return;

    const timestamp = checkInTime.replace('T', ' ') + ':00';
    checkIn(habit.id, today, selectedEmoji, note || undefined, timestamp);
    setIsNoteDialogOpen(false);
    setNote('');
    setSelectedEmoji(null);
    onCheckIn?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {habit.checkInEmojis?.map((emojiConfig, index) => {
            // 如果设置了隐藏今天已打卡的选项，且该选项今天已打卡，则跳过
            if (habit.hideCheckedToday && checkedEmojis.has(emojiConfig.emoji)) {
              return null;
            }

            const isChecked = checkedEmojis.has(emojiConfig.emoji);

            return (
              <DropdownMenuItem
                key={index}
                onClick={() => handleEmojiClick(emojiConfig)}
                className="flex items-center gap-2"
              >
                <span className="text-lg">{emojiConfig.emoji || '✓'}</span>
                <span className="flex-1">{emojiConfig.meaning}</span>
                {isChecked && <CheckCircle className="h-4 w-4 text-green-500" />}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              // 打开编辑打卡选项的对话框
              // 这里可以通过事件或回调通知父组件
            }}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            {i18n('editCheckInOptions') || '编辑打卡选项'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 备注输入对话框 */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedEmoji?.emoji || '✓'}</span>
              {selectedEmoji?.meaning}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="checkInTime">{i18n('checkInTime') || '打卡时间'}</Label>
              <Input
                id="checkInTime"
                type="datetime-local"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">{i18n('checkInNote') || '备注（可选）'}</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={i18n('checkInNotePlaceholder') || '添加备注...'}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
              {i18n('cancel') || '取消'}
            </Button>
            <Button onClick={handleConfirmCheckIn}>
              {i18n('confirm') || '确认打卡'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
