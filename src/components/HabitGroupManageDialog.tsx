import React, { useState, useEffect } from 'react';
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
import { useHabitStore, HabitGroup } from '@/stores/useHabitStore';
import { HabitGroupManager } from '@/utils/habitGroupManager';
import { Plus, Trash2, Edit2, GripVertical } from 'lucide-react';
import { i18n } from '@/pluginInstance';
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

interface HabitGroupManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HabitGroupManageDialog({ open, onOpenChange }: HabitGroupManageDialogProps) {
  const { groups, setGroups } = useHabitStore();
  const [editingGroup, setEditingGroup] = useState<HabitGroup | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<HabitGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState('');

  const groupManager = HabitGroupManager.getInstance();

  useEffect(() => {
    const loadGroups = async () => {
      await groupManager.initialize();
      setGroups(groupManager.getAllGroups());
    };
    if (open) {
      loadGroups();
    }
  }, [open, setGroups]);

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    
    try {
      await groupManager.addGroup({ name: newGroupName.trim() });
      setNewGroupName('');
      setGroups(groupManager.getAllGroups());
    } catch (error) {
      console.error('Failed to add group:', error);
    }
  };

  const handleEditGroup = (group: HabitGroup) => {
    setEditingGroup(group);
    setIsEditDialogOpen(true);
  };

  const handleUpdateGroup = async (newName: string) => {
    if (!editingGroup || !newName.trim()) return;

    try {
      await groupManager.updateGroup(editingGroup.id, { name: newName.trim() });
      setGroups(groupManager.getAllGroups());
      setIsEditDialogOpen(false);
      setEditingGroup(null);
    } catch (error) {
      console.error('Failed to update group:', error);
    }
  };

  const handleDeleteClick = (group: HabitGroup) => {
    setGroupToDelete(group);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;

    try {
      await groupManager.deleteGroup(groupToDelete.id);
      setGroups(groupManager.getAllGroups());
      setIsDeleteDialogOpen(false);
      setGroupToDelete(null);
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{i18n('groupManagement') || '分组管理'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 添加新分组 */}
            <div className="flex gap-2">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={i18n('newGroupPlaceholder') || '输入新分组名称'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddGroup();
                  }
                }}
              />
              <Button onClick={handleAddGroup} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* 分组列表 */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {groups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {i18n('noGroups') || '暂无分组'}
                </div>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg group hover:bg-accent"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <span className="flex-1 font-medium">{group.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditGroup(group)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteClick(group)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{i18n('editGroup') || '编辑分组'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">{i18n('groupName') || '分组名称'}</Label>
              <Input
                id="groupName"
                defaultValue={editingGroup?.name || ''}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateGroup((e.target as HTMLInputElement).value);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {i18n('cancel') || '取消'}
            </Button>
            <Button onClick={() => {
              const input = document.getElementById('groupName') as HTMLInputElement;
              handleUpdateGroup(input?.value || '');
            }}>
              {i18n('save') || '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n('confirmDelete') || '确认删除'}</AlertDialogTitle>
            <AlertDialogDescription>
              {i18n('deleteGroupConfirm', { name: groupToDelete?.name }) || 
                `确定要删除分组"${groupToDelete?.name}"吗？该分组下的习惯将变为无分组。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGroupToDelete(null)}>
              {i18n('cancel') || '取消'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              {i18n('delete') || '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
