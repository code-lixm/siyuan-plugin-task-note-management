import React, { useState } from 'react';
import { useProjectStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Folder, MoreVertical } from 'lucide-react';

export function ProjectPanel() {
  const { projects, addProject, selectedProjectId, selectProject } = useProjectStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    addProject({ name: newProjectName });
    setNewProjectName('');
    setIsCreating(false);
  };

  return (
    <div className="siyuan-plugin-container h-full flex flex-col bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">项目</h2>
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
              placeholder="项目名称"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button size="sm" onClick={handleCreate}>保存</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {projects.map((project) => (
            <Card
              key={project.id}
              className={`cursor-pointer transition-colors ${
                selectedProjectId === project.id ? 'border-primary' : 'hover:bg-accent/50'
              }`}
              onClick={() => selectProject(project.id)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <Folder className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 font-medium">{project.name}</span>
              </CardContent>
            </Card>
          ))}
          {projects.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>暂无项目</p>
              <p className="text-sm">创建项目来组织您的任务</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
