/*
 * Copyright (c) 2024 by siyuan-plugin-task-note-management. All Rights Reserved.
 * @Author       : siyuan-plugin-task-note-management
 * @Date         : 2024
 * @FilePath     : /src/components/dialogs/CategoryManageDialog.tsx
 * @Description  : 分类管理对话框组件 - 支持添加/编辑/删除分类
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import { CategoryManager, Category } from '@/utils/categoryManager';
import { GripVertical, Plus, Trash2, Edit2, RefreshCw, Folder } from 'lucide-react';
import { i18n } from '@/pluginInstance';

// 预设颜色选项
const PRESET_COLORS = [
  '#e74c3c', // 红色
  '#e67e22', // 橙色
  '#f1c40f', // 黄色
  '#27ae60', // 绿色
  '#3498db', // 蓝色
  '#9b59b6', // 紫色
  '#1abc9c', // 青色
  '#34495e', // 深蓝灰
  '#95a5a6', // 灰色
  '#e91e63', // 粉色
  '#00bcd4', // 天蓝
  '#ff5722', // 深橙
];

// 预设图标选项
const PRESET_ICONS = ['📁', '📂', '🎯', '📖', '☘️', '💼', '🎨', '🎵', '🏠', '📚', '💡', '⭐'];

interface CategoryManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
  plugin?: any;
}

// 默认 i18n 函数
const defaultI18n = (key: string, params?: Record<string, string>): string => {
  const defaultTranslations: Record<string, string> = {
    'categoryManagement': '分类管理',
    'addCategory': '添加分类',
    'editCategory': '编辑分类',
    'deleteCategory': '删除分类',
    'categoryName': '分类名称',
    'categoryColor': '分类颜色',
    'categoryIcon': '分类图标',
    'resetToDefault': '重置为默认',
    'save': '保存',
    'cancel': '取消',
    'confirm': '确认',
    'confirmDeleteCategory': '确定要删除分类 "${name}" 吗？',
    'confirmResetCategories': '确定要重置为默认分类吗？所有自定义分类将被删除。',
    'categoryDeleted': '分类已删除',
    'categorySaved': '分类已保存',
    'categoriesReset': '已重置为默认分类',
    'dragToSort': '拖拽排序',
    'newCategory': '新分类',
    'work': '工作',
    'study': '学习',
    'life': '生活',
    'preview': '预览',
  };

  let text = defaultTranslations[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`\${${k}}`, v);
    });
  }
  return text;
};

export function CategoryManageDialog({
  open,
  onOpenChange,
  onUpdated,
  plugin,
}: CategoryManageDialogProps) {
  const t = i18n || defaultI18n;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState<{
    name: string;
    color: string;
    icon: string;
  }>({
    name: '',
    color: '#3498db',
    icon: '📁',
  });

  // 加载分类数据
  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const categoryManager = CategoryManager.getInstance(plugin);
      const data = await categoryManager.loadCategories();
      setCategories(data);
    } catch (error) {
      console.error('加载分类失败:', error);
    } finally {
      setLoading(false);
    }
  }, [plugin]);

  // 初始化时加载
  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open, loadCategories]);

  // 打开添加对话框
  const handleAddClick = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      color: '#3498db',
      icon: '📁',
    });
    setIsEditDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      color: category.color,
      icon: category.icon || '📁',
    });
    setIsEditDialogOpen(true);
  };

  // 保存分类
  const handleSaveCategory = async () => {
    if (!formData.name.trim()) return;

    try {
      const categoryManager = CategoryManager.getInstance(plugin);

      if (editingCategory) {
        await categoryManager.updateCategory(editingCategory.id, {
          name: formData.name.trim(),
          color: formData.color,
          icon: formData.icon,
        });
      } else {
        await categoryManager.addCategory({
          name: formData.name.trim(),
          color: formData.color,
          icon: formData.icon,
        });
      }

      setIsEditDialogOpen(false);
      await loadCategories();
      onUpdated?.();
    } catch (error) {
      console.error('保存分类失败:', error);
    }
  };

  // 删除分类
  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      const categoryManager = CategoryManager.getInstance(plugin);
      await categoryManager.deleteCategory(categoryToDelete.id);
      await loadCategories();
      onUpdated?.();
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error('删除分类失败:', error);
    }
  };

  // 重置为默认
  const handleResetClick = () => {
    setResetConfirmOpen(true);
  };

  const confirmReset = async () => {
    try {
      const categoryManager = CategoryManager.getInstance(plugin);
      await categoryManager.resetToDefault();
      await loadCategories();
      onUpdated?.();
      setResetConfirmOpen(false);
    } catch (error) {
      console.error('重置分类失败:', error);
    }
  };

  // 获取分类标签样式
  const getCategoryStyle = (category: Category) => {
    const categoryManager = CategoryManager.getInstance(plugin);
    return categoryManager.getCategoryLabelStyle(category);
  };

  // 拖拽排序
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = Number(e.dataTransfer.getData('text/plain'));

    if (sourceIndex === targetIndex) return;

    const newCategories = [...categories];
    const [removed] = newCategories.splice(sourceIndex, 1);
    newCategories.splice(targetIndex, 0, removed);

    setCategories(newCategories);

    try {
      const categoryManager = CategoryManager.getInstance(plugin);
      await categoryManager.reorderCategories(newCategories);
      onUpdated?.();
    } catch (error) {
      console.error('重新排序失败:', error);
      await loadCategories();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5" />
              {t('categoryManagement')}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 my-4 pr-4">
            <div className="space-y-2">
              {categories.map((category, index) => {
                const style = getCategoryStyle(category);
                return (
                  <div
                    key={category.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg border border-border/50 hover:border-primary/50 transition-colors cursor-move group"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100" />

                    <div
                      className="flex items-center gap-2 flex-1"
                      style={{
                        backgroundColor: style.backgroundColor,
                        borderColor: style.borderColor,
                        color: style.textColor,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        borderWidth: '1px',
                      }}
                    >
                      <span className="text-lg">{category.icon}</span>
                      <span className="font-medium">{category.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditClick(category)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(category)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <Separator />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleResetClick} className="gap-1">
              <RefreshCw className="w-4 h-4" />
              {t('resetToDefault')}
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleAddClick} className="gap-1">
              <Plus className="w-4 h-4" />
              {t('addCategory')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑/添加分类对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t('editCategory') : t('addCategory')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 分类名称 */}
            <div className="space-y-2">
              <Label htmlFor="categoryName">{t('categoryName')}</Label>
              <Input
                id="categoryName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('newCategory')}
              />
            </div>

            {/* 分类图标 */}
            <div className="space-y-2">
              <Label>{t('categoryIcon')}</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl transition-all ${
                      formData.icon === icon
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* 分类颜色 */}
            <div className="space-y-2">
              <Label>{t('categoryColor')}</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="h-10 w-full mt-2"
              />
            </div>

            {/* 预览 */}
            <div className="space-y-2">
              <Label>{t('preview')}</Label>
              <div
                className="p-3 rounded-lg border inline-flex items-center gap-2"
                style={{
                  backgroundColor: getCategoryStyle({
                    id: 'preview',
                    name: formData.name || t('newCategory'),
                    color: formData.color,
                    icon: formData.icon,
                  }).backgroundColor,
                  borderColor: formData.color,
                  color: '#000000',
                }}
              >
                <span className="text-xl">{formData.icon}</span>
                <span className="font-medium">
                  {formData.name || t('newCategory')}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveCategory} disabled={!formData.name.trim()}>
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteCategory')}</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryToDelete &&
                t('confirmDeleteCategory', { name: categoryToDelete.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
              {t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重置确认对话框 */}
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('resetToDefault')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmResetCategories')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset} className="bg-destructive">
              {t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default CategoryManageDialog;
