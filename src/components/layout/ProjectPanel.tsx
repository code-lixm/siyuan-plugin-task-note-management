import React, { useState, useCallback, useEffect } from 'react';
import { useProjectStore, type Project, type Milestone as MilestoneType } from '@/stores/useProjectStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Folder,
  Edit3,
  Trash2,
  GripVertical,
  Kanban,
  CheckCircle2,
  Circle,
  Flag,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Milestone,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { i18n } from '@/pluginInstance';

// 任务统计接口
interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
}

// 排序类型
type SortField = 'name' | 'createdAt' | 'updatedAt' | 'progress';
type SortOrder = 'asc' | 'desc';

export function ProjectPanel() {
  const {
    projects,
    isLoading,
    error,
    addProject,
    updateProject,
    deleteProject,
    loadProjects,
    selectedProjectId,
    selectProject,
    addMilestone,
    updateMilestone,
    deleteMilestone,
  } = useProjectStore();

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // 本地状态
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#3b82f6');
  
  // 编辑对话框状态
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  
  // 删除确认对话框状态
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  
  // 看板跳转确认状态
  const [kanbanProject, setKanbanProject] = useState<Project | null>(null);
  
  // 排序状态
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // 拖拽排序状态
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  
  // 展开的里程碑项目
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
  // 里程碑编辑状态
  const [editingMilestone, setEditingMilestone] = useState<{ projectId: string; milestone: MilestoneType } | null>(null);
  const [newMilestoneProjectId, setNewMilestoneProjectId] = useState<string | null>(null);
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');

  // 模拟任务统计数据（实际应从任务 store 获取）
  const getProjectStats = useCallback((_projectId: string): TaskStats => {
    // TODO: 从任务 store 获取实际统计数据
    return {
      total: Math.floor(Math.random() * 20) + 5,
      completed: Math.floor(Math.random() * 10),
      inProgress: Math.floor(Math.random() * 5),
      todo: Math.floor(Math.random() * 8),
    };
  }, []);

  // 计算项目进度
  const getProjectProgress = useCallback((stats: TaskStats): number => {
    if (stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  }, []);

  // 排序项目
  const getSortedProjects = useCallback((): Project[] => {
    const sorted = [...projects];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'progress':
          const progressA = getProjectProgress(getProjectStats(a.id));
          const progressB = getProjectProgress(getProjectStats(b.id));
          comparison = progressA - progressB;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [projects, sortField, sortOrder, getProjectProgress, getProjectStats]);

  // 创建项目
  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    addProject({
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined,
      color: newProjectColor,
    });
    setNewProjectName('');
    setNewProjectDescription('');
    setNewProjectColor('#3b82f6');
    setIsCreating(false);
  };

  // 打开编辑对话框
  const openEditDialog = (project: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingProject(project);
    setEditName(project.name);
    setEditDescription(project.description || '');
    setEditColor(project.color || '#3b82f6');
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingProject || !editName.trim()) return;
    updateProject(editingProject.id, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      color: editColor,
    });
    setEditingProject(null);
  };

  // 打开删除确认对话框
  const openDeleteDialog = (project: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletingProject(project);
  };

  // 确认删除
  const handleConfirmDelete = () => {
    if (!deletingProject) return;
    deleteProject(deletingProject.id);
    setDeletingProject(null);
  };

  // 打开看板视图
  const openKanbanView = (project: Project) => {
    selectProject(project.id);
    setKanbanProject(project);
    // TODO: 实际跳转到看板视图
    console.log('Open kanban view for project:', project.id);
  };

  // 切换排序
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 拖拽开始
  const handleDragStart = (projectId: string) => {
    setDraggedProjectId(projectId);
  };

  // 拖拽结束
  const handleDragEnd = () => {
    if (draggedProjectId && dragOverProjectId && draggedProjectId !== dragOverProjectId) {
      // TODO: 实现拖拽排序逻辑
      console.log('Reorder:', draggedProjectId, '->', dragOverProjectId);
    }
    setDraggedProjectId(null);
    setDragOverProjectId(null);
  };

  // 拖拽悬停
  const handleDragOver = (projectId: string) => {
    if (draggedProjectId && draggedProjectId !== projectId) {
      setDragOverProjectId(projectId);
    }
  };

  // 切换项目展开状态
  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  // 添加里程碑
  const handleAddMilestone = (projectId: string) => {
    setNewMilestoneProjectId(projectId);
    setMilestoneName('');
    setMilestoneDate('');
  };

  // 保存新里程碑
  const handleSaveMilestone = () => {
    if (!newMilestoneProjectId || !milestoneName.trim()) return;
    addMilestone(newMilestoneProjectId, {
      name: milestoneName.trim(),
      dueDate: milestoneDate || undefined,
      completed: false,
    });
    setNewMilestoneProjectId(null);
    setMilestoneName('');
    setMilestoneDate('');
  };

  // 编辑里程碑
  const openEditMilestone = (projectId: string, milestone: MilestoneType) => {
    setEditingMilestone({ projectId, milestone });
    setMilestoneName(milestone.name);
    setMilestoneDate(milestone.dueDate || '');
  };

  // 保存里程碑编辑
  const handleSaveMilestoneEdit = () => {
    if (!editingMilestone || !milestoneName.trim()) return;
    updateMilestone(editingMilestone.projectId, editingMilestone.milestone.id, {
      name: milestoneName.trim(),
      dueDate: milestoneDate || undefined,
    });
    setEditingMilestone(null);
    setMilestoneName('');
    setMilestoneDate('');
  };

  // 删除里程碑
  const handleDeleteMilestone = (projectId: string, milestoneId: string) => {
    deleteMilestone(projectId, milestoneId);
  };

  // 切换里程碑完成状态
  const toggleMilestoneComplete = (projectId: string, milestone: MilestoneType) => {
    updateMilestone(projectId, milestone.id, {
      completed: !milestone.completed,
    });
  };

  const sortedProjects = getSortedProjects();

  return (
    <div className="siyuan-plugin-container h-full flex flex-col bg-background">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">{i18n("projects")}</h2>
        <div className="flex items-center gap-2">
          {/* 排序下拉菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="h-4 w-4 mr-1" />
                {i18n("sort")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{i18n("sortBy")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toggleSort('name')}>
                {i18n("name")}
                {sortField === 'name' && (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort('createdAt')}>
                {i18n("createTime")}
                {sortField === 'createdAt' && (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort('updatedAt')}>
                {i18n("updateTime")}
                {sortField === 'updatedAt' && (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort('progress')}>
                {i18n("progress")}
                {sortField === 'progress' && (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {i18n("newProject")}
          </Button>
        </div>
      </div>

      {/* 创建项目表单 */}
      {isCreating && (
        <div className="p-4 border-b space-y-3">
          <div>
            <Label className="text-sm">{i18n("projectName")}</Label>
            <Input
              autoFocus
              placeholder={i18n("enterProjectName")}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div>
            <Label className="text-sm">{i18n("description")}</Label>
            <Textarea
              placeholder={i18n("enterDescription")}
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label className="text-sm">{i18n("color")}</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={newProjectColor}
                onChange={(e) => setNewProjectColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">{newProjectColor}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsCreating(false)}>
              {i18n("cancel")}
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={!newProjectName.trim()}>
              {i18n("save")}
            </Button>
          </div>
        </div>
      )}

      {/* 项目列表 */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading && (
          <div className="text-center text-sm text-muted-foreground mb-3">{i18n("loading") || 'Loading...'}</div>
        )}
        {error && (
          <div className="text-center text-sm text-destructive mb-3">{error}</div>
        )}
        <div className="space-y-2">
          {sortedProjects.map((project) => {
            const stats = getProjectStats(project.id);
            const progress = getProjectProgress(stats);
            const isExpanded = expandedProjects.has(project.id);
            const milestones = project.milestones || [];
            
            return (
              <ContextMenu key={project.id}>
                <ContextMenuTrigger>
                  <Card
                    className={`cursor-pointer transition-all ${
                      selectedProjectId === project.id ? 'border-primary ring-1 ring-primary' : 'hover:bg-accent/50'
                    } ${draggedProjectId === project.id ? 'opacity-50' : ''} ${
                      dragOverProjectId === project.id ? 'border-dashed border-primary' : ''
                    }`}
                    onClick={() => openKanbanView(project)}
                    draggable
                    onDragStart={() => handleDragStart(project.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={() => handleDragOver(project.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {/* 拖拽手柄 */}
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                            style={{ backgroundColor: project.color || '#3b82f6' }}
                          />
                        </div>
                        
                        {/* 项目信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium truncate">{project.name}</h3>
                             <div className="flex items-center gap-1">
                               {/* 任务统计徽章 */}
                               <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">
                                 {stats.total}
                               </span>
                              
                              {/* 展开/折叠里程碑按钮 */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProjectExpand(project.id);
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          
                          {/* 进度条 */}
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>{i18n("progress")}</span>
                              <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                          </div>
                          
                          {/* 任务统计详情 */}
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              {stats.completed}
                            </span>
                            <span className="flex items-center gap-1 text-blue-600">
                              <Kanban className="h-3 w-3" />
                              {stats.inProgress}
                            </span>
                            <span className="flex items-center gap-1 text-gray-500">
                              <Circle className="h-3 w-3" />
                              {stats.todo}
                            </span>
                            {milestones.length > 0 && (
                              <span className="flex items-center gap-1 text-amber-600">
                                <Milestone className="h-3 w-3" />
                                {milestones.filter(m => m.completed).length}/{milestones.length}
                              </span>
                            )}
                          </div>
                          
                          {/* 里程碑列表（展开时） */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium flex items-center gap-1">
                                  <Flag className="h-3.5 w-3.5" />
                                  {i18n("milestones")}
                                </h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddMilestone(project.id);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  {i18n("add")}
                                </Button>
                              </div>
                              
                              {milestones.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                  {i18n("noMilestones")}
                                </p>
                              ) : (
                                <div className="space-y-1">
                                  {milestones.map((milestone) => (
                                    <div
                                      key={milestone.id}
                                      className="flex items-center gap-2 p-2 rounded bg-accent/30 hover:bg-accent/50 group"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5"
                                        onClick={() => toggleMilestoneComplete(project.id, milestone)}
                                      >
                                        {milestone.completed ? (
                                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <Circle className="h-4 w-4 text-muted-foreground" />
                                        )}
                                      </Button>
                                      <span className={`flex-1 text-sm ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}>
                                        {milestone.name}
                                      </span>
                                      {milestone.dueDate && (
                                        <span className="text-xs text-muted-foreground">
                                          {milestone.dueDate}
                                        </span>
                                      )}
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5"
                                          onClick={() => openEditMilestone(project.id, milestone)}
                                        >
                                          <Edit3 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 text-destructive"
                                          onClick={() => handleDeleteMilestone(project.id, milestone.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ContextMenuTrigger>
                
                {/* 右键菜单 */}
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => openKanbanView(project)}>
                    <Kanban className="h-4 w-4 mr-2" />
                    {i18n("openKanban")}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={(e) => openEditDialog(project, e)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    {i18n("edit")}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem 
                    onClick={(e) => openDeleteDialog(project, e)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {i18n("delete")}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
          
          {projects.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{i18n("noProjects")}</p>
              <p className="text-sm">{i18n("createProjectToOrganize")}</p>
            </div>
          )}
        </div>
      </div>

      {/* 编辑项目对话框 */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{i18n("editProject")}</DialogTitle>
            <DialogDescription>{i18n("editProjectDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">{i18n("projectName")}</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={i18n("enterProjectName")}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">{i18n("description")}</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={i18n("enterDescription")}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-color">{i18n("color")}</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  id="edit-color"
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{editColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>
              {i18n("cancel")}
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editName.trim()}>
              {i18n("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{i18n("confirmDelete")}</DialogTitle>
            <DialogDescription>
              {deletingProject && i18n("confirmDeleteProject").replace('${name}', deletingProject.name)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingProject(null)}>
              {i18n("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {i18n("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 看板跳转占位符提示 */}
      <Dialog open={!!kanbanProject} onOpenChange={() => setKanbanProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{i18n("openKanban")}</DialogTitle>
            <DialogDescription>
              {kanbanProject && i18n("openKanbanDescription").replace('${name}', kanbanProject.name)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {i18n("kanbanPlaceholderInfo")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKanbanProject(null)}>
              {i18n("close")}
            </Button>
            <Button onClick={() => setKanbanProject(null)}>
              {i18n("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加里程碑对话框 */}
      <Dialog open={!!newMilestoneProjectId} onOpenChange={() => setNewMilestoneProjectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{i18n("addMilestone")}</DialogTitle>
            <DialogDescription>{i18n("addMilestoneDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="milestone-name">{i18n("milestoneName")}</Label>
              <Input
                id="milestone-name"
                value={milestoneName}
                onChange={(e) => setMilestoneName(e.target.value)}
                placeholder={i18n("enterMilestoneName")}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="milestone-date">{i18n("dueDate")}</Label>
              <Input
                id="milestone-date"
                type="date"
                value={milestoneDate}
                onChange={(e) => setMilestoneDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMilestoneProjectId(null)}>
              {i18n("cancel")}
            </Button>
            <Button onClick={handleSaveMilestone} disabled={!milestoneName.trim()}>
              {i18n("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑里程碑对话框 */}
      <Dialog open={!!editingMilestone} onOpenChange={() => setEditingMilestone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{i18n("editMilestone")}</DialogTitle>
            <DialogDescription>{i18n("editMilestoneDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-milestone-name">{i18n("milestoneName")}</Label>
              <Input
                id="edit-milestone-name"
                value={milestoneName}
                onChange={(e) => setMilestoneName(e.target.value)}
                placeholder={i18n("enterMilestoneName")}
              />
            </div>
            <div>
              <Label htmlFor="edit-milestone-date">{i18n("dueDate")}</Label>
              <Input
                id="edit-milestone-date"
                type="date"
                value={milestoneDate}
                onChange={(e) => setMilestoneDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMilestone(null)}>
              {i18n("cancel")}
            </Button>
            <Button onClick={handleSaveMilestoneEdit} disabled={!milestoneName.trim()}>
              {i18n("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
