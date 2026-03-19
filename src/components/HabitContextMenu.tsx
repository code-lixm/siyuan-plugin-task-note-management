import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useHabitStore, Habit } from '@/stores/useHabitStore';
import { HabitStatsDialog } from './HabitStatsDialog';
import { HabitEditDialog } from './HabitEditDialog';
import { 
  Edit3, 
  Trash2, 
  BarChart3, 
  Calendar, 
  ExternalLink,
  CheckCircle 
} from 'lucide-react';
import { i18n } from '@/pluginInstance';

interface HabitContextMenuProps {
  habit: Habit;
  children: React.ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  onViewStats?: () => void;
}

export function HabitContextMenu({ 
  habit, 
  children, 
  onDelete, 
  onEdit,
  onViewStats 
}: HabitContextMenuProps) {
  const { deleteHabit } = useHabitStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleDelete = () => {
    deleteHabit(habit.id);
    onDelete?.();
    setIsDeleteDialogOpen(false);
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
    onEdit?.();
  };

  const handleViewStats = () => {
    setIsStatsDialogOpen(true);
    onViewStats?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* 打卡选项 */}
          <DropdownMenuItem onClick={handleViewStats}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {i18n('checkIn') || '打卡'}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* 查看统计 */}
          <DropdownMenuItem onClick={handleViewStats}>
            <BarChart3 className="h-4 w-4 mr-2" />
            {i18n('viewStats') || '查看统计'}
          </DropdownMenuItem>

          {/* 打卡日历 */}
          <DropdownMenuItem onClick={() => {}}>
            <Calendar className="h-4 w-4 mr-2" />
            {i18n('checkInCalendar') || '打卡日历'}
          </DropdownMenuItem>

          {/* 打开绑定块 */}
          {habit.blockId && (
            <DropdownMenuItem onClick={() => {
              // 打开块
              window.open(`siyuan://blocks/${habit.blockId}`, '_blank');
            }}>
              <ExternalLink className="h-4 w-4 mr-2" />
              {i18n('openBoundBlock') || '打开关联块'}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* 编辑 */}
          <DropdownMenuItem onClick={handleEdit}>
            <Edit3 className="h-4 w-4 mr-2" />
            {i18n('edit') || '编辑'}
          </DropdownMenuItem>

          {/* 删除 */}
          <DropdownMenuItem 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {i18n('delete') || '删除'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 删除确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n('confirmDeleteHabit') || '确认删除习惯'}</AlertDialogTitle>
            <AlertDialogDescription>
              {i18n('deleteHabitConfirm', { title: habit.title }) || 
                `确定要删除习惯"${habit.title}"吗？此操作不可撤销，所有打卡记录将被删除。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              {i18n('cancel') || '取消'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {i18n('delete') || '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑对话框 */}
      <HabitEditDialog
        habit={habit}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      {/* 统计对话框 */}
      <HabitStatsDialog
        habit={habit}
        open={isStatsDialogOpen}
        onOpenChange={setIsStatsDialogOpen}
      />
    </>
  );
}
