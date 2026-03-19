/*
 * Copyright (c) 2024 by siyuan-plugin-task-note-management. All Rights Reserved.
 * @Author       : siyuan-plugin-task-note-management
 * @Date         : 2024
 * @FilePath     : /src/components/dialogs/BlockBindingDialog.tsx
 * @Description  : 块绑定对话框组件 - 支持绑定现有块、新建文档、新建标题
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Link2,
  FileText,
  Heading,
  Search,
  AlertCircle,
  Check,
  FilePlus,
  FolderPlus,
} from 'lucide-react';
import { i18n } from '@/pluginInstance';

// API 函数类型
interface BlockInfo {
  id: string;
  type: string;
  subtype?: string;
  content: string;
  hpath?: string;
  box?: string;
  root_id?: string;
}

interface SearchResult {
  id: string;
  content: string;
  type: string;
  subtype?: string;
  hpath?: string;
  box?: string;
}

interface BlockBindingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBind: (blockId: string) => void;
  plugin?: any;
  options?: {
    defaultBlockId?: string;
    title?: string;
    defaultTab?: 'bind' | 'document' | 'heading';
    defaultParentId?: string;
    defaultProjectId?: string;
    defaultCustomGroupId?: string | null;
    reminder?: any;
    defaultTitle?: string;
    forMilestone?: boolean;
    forGroup?: boolean;
  };
}

// 默认 i18n 函数
const defaultI18n = (key: string, params?: Record<string, string>): string => {
  const defaultTranslations: Record<string, string> = {
    'bindBlock': '绑定块',
    'newDocument': '新建文档',
    'newHeading': '新建标题',
    'blockId': '块ID',
    'inputBlockIdOrSearch': '输入块ID或搜索',
    'searchIncludesHeadings': '搜索包含标题',
    'currentSelection': '当前选择：',
    'documentTitle': '文档标题',
    'inputDocumentTitle': '请输入文档标题',
    'savePathRelativeToNotebook': '保存路径（相对于笔记本）',
    'inputOrSearchPathDesc': '输入或搜索路径，例如 /项目/子页',
    'useParentBlockDocPath': '使用父块文档路径',
    'useDefaultPath': '使用默认路径',
    'documentContentOptional': '文档内容（可选）',
    'inputDocumentContent': '请输入文档内容',
    'headingContent': '标题内容',
    'inputHeadingContent': '请输入标题内容',
    'parentBlock': '父块',
    'insertedHeadingLevel': '插入的标题层级',
    'insertPosition': '插入位置',
    'insertAtBeginning': '插入到最前',
    'insertAtEnd': '插入到最后',
    'headingContentOptional': '标题下内容（可选）',
    'inputHeadingSubContent': '请输入标题下内容',
    'cancel': '取消',
    'confirm': '确定',
    'noMatchResult': '未找到匹配结果',
    'searchFailed': '搜索失败',
    'blockNotExistError': '块不存在',
    'pleaseInputBlockId': '请输入块ID',
    'pleaseInputDocumentTitle': '请输入文档标题',
    'pleaseInputHeadingContent': '请输入标题内容',
    'pleaseInputParentBlockId': '请输入父块ID',
    'parentBlockNotExist': '父块不存在',
    'cannotDetermineTargetNotebook': '无法确定目标笔记本',
    'createHeadingFailed': '创建标题失败',
    'unknownTabType': '未知的标签页类型',
    'search': '搜索',
    'selectNotebook': '选择笔记本',
    'noNotebook': '无笔记本',
  };

  let text = defaultTranslations[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`\${${k}}`, v);
    });
  }
  return text;
};

export function BlockBindingDialog({
  open,
  onOpenChange,
  onBind,
  plugin,
  options = {},
}: BlockBindingDialogProps) {
  const t = i18n || defaultI18n;
  const [activeTab, setActiveTab] = useState<'bind' | 'document' | 'heading'>(
    options.defaultTab || 'bind'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notebooks, setNotebooks] = useState<any[]>([]);

  // 绑定块标签页状态
  const [bindBlockId, setBindBlockId] = useState(options.defaultBlockId || '');
  const [bindIncludeHeadings, setBindIncludeHeadings] = useState(false);
  const [bindSearchResults, setBindSearchResults] = useState<SearchResult[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<BlockInfo | null>(null);
  const bindSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 新建文档标签页状态
  const [docTitle, setDocTitle] = useState(options.reminder?.title || options.defaultTitle || '');
  const [docContent, setDocContent] = useState(options.reminder?.note || '');
  const [docPath, setDocPath] = useState('/');
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>('');
  const [pathSearchResults, setPathSearchResults] = useState<any[]>([]);

  // 新建标题标签页状态
  const [headingContent, setHeadingContent] = useState(
    options.reminder?.title || options.defaultTitle || ''
  );
  const [headingSubContent, setHeadingSubContent] = useState(options.reminder?.note || '');
  const [headingParentId, setHeadingParentId] = useState('');
  const [headingIncludeHeadings, setHeadingIncludeHeadings] = useState(false);
  const [headingLevel, setHeadingLevel] = useState(3);
  const [headingPosition, setHeadingPosition] = useState<'prepend' | 'append'>('append');
  const [headingSearchResults, setHeadingSearchResults] = useState<SearchResult[]>([]);
  const [selectedParentBlock, setSelectedParentBlock] = useState<BlockInfo | null>(null);
  const headingSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 加载笔记本列表
  useEffect(() => {
    if (!open) return;

    const loadNotebooks = async () => {
      try {
        const { lsNotebooks } = await import('@/api');
        const result = await lsNotebooks();
        if (result?.notebooks) {
          setNotebooks(result.notebooks);
          // 如果有默认笔记本，选中它
          if (plugin) {
            const settings = await plugin.loadSettings?.();
            if (settings?.newDocNotebook) {
              setSelectedNotebookId(settings.newDocNotebook);
            } else if (result.notebooks.length > 0) {
              setSelectedNotebookId(result.notebooks[0].id);
            }
          }
        }
      } catch (err) {
        console.error('加载笔记本失败:', err);
      }
    };

    loadNotebooks();
  }, [open, plugin]);

  // 初始化默认值
  useEffect(() => {
    if (!open) return;

    // 如果有默认块ID，显示预览
    if (options.defaultBlockId) {
      loadBlockInfo(options.defaultBlockId);
    }

    // 尝试自动填充父块ID（标题标签页）
    const initHeadingDefaults = async () => {
      try {
        let autoFillId: string | null = null;

        // 检查里程碑绑定
        const milestoneId = options.reminder?.milestoneId || options.reminder?.milestone;
        if (milestoneId && options.defaultProjectId) {
          try {
            const { ProjectManager } = await import('@/utils/projectManager');
            const projectManager = ProjectManager.getInstance(plugin);
            const milestone = await projectManager.getMilestoneById(
              options.defaultProjectId,
              milestoneId
            );
            if (milestone?.blockId) {
              autoFillId = milestone.blockId;
            }
          } catch (err) {
            console.warn('解析里程碑绑定失败:', err);
          }
        }

        // 检查父任务绑定
        if (!autoFillId && options.defaultParentId) {
          const { getBlockByID } = await import('@/api');
          const block = await getBlockByID(options.defaultParentId);
          if (block) {
            autoFillId = options.defaultParentId;
          }
        }

        // 检查项目/分组绑定
        if (!autoFillId && options.defaultProjectId) {
          try {
            const { ProjectManager } = await import('@/utils/projectManager');
            const projectManager = ProjectManager.getInstance(plugin);
            await projectManager.initialize();

            if (options.defaultCustomGroupId) {
              const groups = await projectManager.getProjectCustomGroups(options.defaultProjectId);
              const group = groups.find((g: any) => g.id === options.defaultCustomGroupId);
              if (group?.blockId) {
                autoFillId = group.blockId;
              }
            }

            if (!autoFillId) {
              const project = projectManager.getProjectById(options.defaultProjectId);
              if (project?.blockId) {
                autoFillId = project.blockId;
              }
            }
          } catch (err) {
            console.warn('解析项目绑定失败:', err);
          }
        }

        if (autoFillId) {
          setHeadingParentId(autoFillId);
          loadParentBlockInfo(autoFillId);
        }
      } catch (error) {
        console.error('初始化标题默认值失败:', error);
      }
    };

    initHeadingDefaults();
  }, [open, options]);

  // 加载块信息
  const loadBlockInfo = async (blockId: string) => {
    try {
      const { getBlockByID } = await import('@/api');
      const block = await getBlockByID(blockId);
      if (block) {
        setSelectedBlock(block);
      }
    } catch (err) {
      console.error('加载块信息失败:', err);
    }
  };

  const loadParentBlockInfo = async (blockId: string) => {
    try {
      const { getBlockByID } = await import('@/api');
      const block = await getBlockByID(blockId);
      if (block) {
        setSelectedParentBlock(block);
        // 自动调整标题层级
        if (block.type === 'h' && block.subtype) {
          const parentLevel = parseInt(block.subtype.replace('h', ''));
          const newLevel = Math.min(parentLevel + 1, 6);
          setHeadingLevel(newLevel);
        }
      }
    } catch (err) {
      console.error('加载父块信息失败:', err);
    }
  };

  // 搜索块
  const searchBlocks = async (
    query: string,
    includeHeadings: boolean
  ): Promise<SearchResult[]> => {
    if (!query.trim()) return [];

    try {
      const { sql } = await import('@/api');
      const keywords = query.trim().split(/\s+/).filter((k) => k.length > 0);
      if (keywords.length === 0) return [];

      const likeConditions = keywords
        .map((keyword) => `content LIKE '%${keyword.replace(/'/g, "''")}%'`)
        .join(' AND ');

      let sqlQuery: string;
      if (includeHeadings) {
        sqlQuery = `SELECT * FROM blocks WHERE (type = 'd' OR type = 'h') AND ${likeConditions} LIMIT 20`;
      } else {
        sqlQuery = `SELECT * FROM blocks WHERE type = 'd' AND ${likeConditions} LIMIT 20`;
      }

      const results = await sql(sqlQuery);
      return results || [];
    } catch (err) {
      console.error('搜索块失败:', err);
      return [];
    }
  };

  // 绑定块搜索
  const handleBindSearch = useCallback(
    async (query: string) => {
      // 尝试从输入中提取块ID
      const extractedId = extractBlockId(query);
      if (extractedId) {
        setBindBlockId(extractedId);
        loadBlockInfo(extractedId);
        setBindSearchResults([]);
        return;
      }

      if (!query.trim()) {
        setBindSearchResults([]);
        return;
      }

      if (bindSearchTimeoutRef.current) {
        clearTimeout(bindSearchTimeoutRef.current);
      }

      bindSearchTimeoutRef.current = setTimeout(async () => {
        const results = await searchBlocks(query, bindIncludeHeadings);
        setBindSearchResults(results);
      }, 300);
    },
    [bindIncludeHeadings]
  );

  // 标题父块搜索
  const handleHeadingSearch = useCallback(
    async (query: string) => {
      const extractedId = extractBlockId(query);
      if (extractedId) {
        setHeadingParentId(extractedId);
        loadParentBlockInfo(extractedId);
        setHeadingSearchResults([]);
        return;
      }

      if (!query.trim()) {
        setHeadingSearchResults([]);
        return;
      }

      if (headingSearchTimeoutRef.current) {
        clearTimeout(headingSearchTimeoutRef.current);
      }

      headingSearchTimeoutRef.current = setTimeout(async () => {
        const results = await searchBlocks(query, headingIncludeHeadings);
        setHeadingSearchResults(results);
      }, 300);
    },
    [headingIncludeHeadings]
  );

  // 提取块ID
  const extractBlockId = (input: string): string | null => {
    if (!input) return null;
    const query = input.trim();

    // 直接是块ID
    if (/^\d{14}-[a-z0-9]{7}$/.test(query)) {
      return query;
    }

    // 思源块引用 ((id 'alias')) 或 ((id))
    const refMatch = query.match(/\(\((\d{14}-[a-z0-9]{7})/);
    if (refMatch) {
      return refMatch[1];
    }

    // 思源块链接 [text](siyuan://blocks/id) 或 siyuan://blocks/id
    const linkMatch = query.match(/siyuan:\/\/blocks\/(\d{14}-[a-z0-9]{7})/);
    if (linkMatch) {
      return linkMatch[1];
    }

    return null;
  };

  // 路径搜索
  const handlePathSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPathSearchResults([]);
      return;
    }

    try {
      const { searchDocs } = await import('@/api');
      const results = await searchDocs(query, false);

      const mapped = (results || []).map((doc: any) => ({
        ...doc,
        hPathRel: doc.hPath || doc.hpath || '',
        hPathFull: doc.hPath || doc.hpath || '',
      }));

      setPathSearchResults(mapped);
    } catch (err) {
      console.error('路径搜索失败:', err);
    }
  }, []);

  // 确认处理
  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      let blockId: string;

      switch (activeTab) {
        case 'bind':
          blockId = await handleBindConfirm();
          break;
        case 'document':
          blockId = await handleDocumentConfirm();
          break;
        case 'heading':
          blockId = await handleHeadingConfirm();
          break;
        default:
          throw new Error(t('unknownTabType'));
      }

      if (blockId) {
        onBind(blockId);
        onOpenChange(false);
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // 处理绑定块确认
  const handleBindConfirm = async (): Promise<string> => {
    const blockId = bindBlockId.trim();

    if (!blockId) {
      throw new Error(t('pleaseInputBlockId'));
    }

    // 验证块是否存在
    const { getBlockByID } = await import('@/api');
    const block = await getBlockByID(blockId);
    if (!block) {
      throw new Error(t('blockNotExistError'));
    }

    return blockId;
  };

  // 处理新建文档确认
  const handleDocumentConfirm = async (): Promise<string> => {
    const title = docTitle.trim();

    if (!title) {
      throw new Error(t('pleaseInputDocumentTitle'));
    }

    if (!selectedNotebookId) {
      throw new Error(t('cannotDetermineTargetNotebook'));
    }

    const { createDocWithMd, renderSprig } = await import('@/api');

    // 渲染路径模板
    const toRender = docPath.endsWith('/') ? docPath + title : docPath + '/' + title;
    let finalPath = toRender;

    try {
      const rendered = await renderSprig(toRender);
      if (typeof rendered === 'string' && rendered.trim()) {
        finalPath = rendered;
      }
    } catch (err) {
      console.warn('renderSprig 渲染路径失败:', err);
    }

    // 确保路径以 / 开头
    if (!finalPath.startsWith('/')) {
      finalPath = '/' + finalPath;
    }

    const result = await createDocWithMd(selectedNotebookId, finalPath, docContent);
    return result;
  };

  // 处理新建标题确认
  const handleHeadingConfirm = async (): Promise<string> => {
    const content = headingContent.trim();

    if (!content) {
      throw new Error(t('pleaseInputHeadingContent'));
    }

    const parentId = headingParentId.trim();

    if (!parentId) {
      throw new Error(t('pleaseInputParentBlockId'));
    }

    // 验证父块是否存在
    const { getBlockByID, prependBlock, appendBlock, insertBlock } = await import('@/api');
    const parentBlock = await getBlockByID(parentId);
    if (!parentBlock) {
      throw new Error(t('parentBlockNotExist'));
    }

    // 创建标题
    const hashes = '#'.repeat(headingLevel);
    let markdownContent = `${hashes} ${content}`;
    if (headingSubContent) {
      markdownContent += `\n${headingSubContent}`;
    }

    let response: any;

    if (headingPosition === 'prepend') {
      response = await prependBlock('markdown', markdownContent, parentId);
    } else {
      response = await appendBlock('markdown', markdownContent, parentId);
    }

    if (response && response[0]?.doOperations?.[0]?.id) {
      return response[0].doOperations[0].id;
    }

    throw new Error(t('createHeadingFailed'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            {options.title || t('bindBlock')}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bind" className="gap-1">
              <Link2 className="w-4 h-4" />
              {t('bindBlock')}
            </TabsTrigger>
            <TabsTrigger value="heading" className="gap-1">
              <Heading className="w-4 h-4" />
              {t('newHeading')}
            </TabsTrigger>
            <TabsTrigger value="document" className="gap-1">
              <FileText className="w-4 h-4" />
              {t('newDocument')}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full pr-4">
              {/* 绑定块标签页 */}
              <TabsContent value="bind" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bindBlockInput">{t('blockId')}</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="bindIncludeHeadings"
                        checked={bindIncludeHeadings}
                        onCheckedChange={(checked) => setBindIncludeHeadings(checked as boolean)}
                      />
                      <Label htmlFor="bindIncludeHeadings" className="text-sm cursor-pointer">
                        {t('searchIncludesHeadings')}
                      </Label>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="bindBlockInput"
                      value={bindBlockId}
                      onChange={(e) => {
                        setBindBlockId(e.target.value);
                        handleBindSearch(e.target.value);
                      }}
                      placeholder={t('inputBlockIdOrSearch')}
                      className="pl-9"
                    />
                  </div>

                  {/* 搜索结果 */}
                  {bindSearchResults.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      {bindSearchResults.map((result) => (
                        <div
                          key={result.id}
                          onClick={() => {
                            setBindBlockId(result.id);
                            loadBlockInfo(result.id);
                            setBindSearchResults([]);
                          }}
                          className="p-3 border-b last:border-b-0 cursor-pointer hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {result.type === 'h' ? result.subtype?.toUpperCase() : '📄'}
                            </Badge>
                            <span className="flex-1 truncate">{result.content}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {result.hpath || result.box}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 选中块预览 */}
                  {selectedBlock && (
                    <div className="bg-secondary/50 rounded-lg p-3 border">
                      <div className="text-xs text-muted-foreground mb-1">
                        {t('currentSelection')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">
                          {selectedBlock.type === 'h'
                            ? selectedBlock.subtype?.toUpperCase()
                            : '📄'}
                        </Badge>
                        <span className="flex-1 truncate font-medium">
                          {selectedBlock.content}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {selectedBlock.hpath || selectedBlock.box}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* 新建标题标签页 */}
              <TabsContent value="heading" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="headingContent">{t('headingContent')}</Label>
                  <Input
                    id="headingContent"
                    value={headingContent}
                    onChange={(e) => setHeadingContent(e.target.value)}
                    placeholder={t('inputHeadingContent')}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="headingParent">{t('parentBlock')}</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="headingIncludeHeadings"
                        checked={headingIncludeHeadings}
                        onCheckedChange={(checked) =>
                          setHeadingIncludeHeadings(checked as boolean)
                        }
                      />
                      <Label
                        htmlFor="headingIncludeHeadings"
                        className="text-sm cursor-pointer"
                      >
                        {t('searchIncludesHeadings')}
                      </Label>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="headingParent"
                      value={headingParentId}
                      onChange={(e) => {
                        setHeadingParentId(e.target.value);
                        handleHeadingSearch(e.target.value);
                      }}
                      placeholder={t('inputBlockIdOrSearch')}
                      className="pl-9"
                    />
                  </div>

                  {/* 搜索结果 */}
                  {headingSearchResults.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      {headingSearchResults.map((result) => (
                        <div
                          key={result.id}
                          onClick={() => {
                            setHeadingParentId(result.id);
                            loadParentBlockInfo(result.id);
                            setHeadingSearchResults([]);
                          }}
                          className="p-3 border-b last:border-b-0 cursor-pointer hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {result.type === 'h' ? result.subtype?.toUpperCase() : '📄'}
                            </Badge>
                            <span className="flex-1 truncate">{result.content}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {result.hpath || result.box}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 选中父块预览 */}
                  {selectedParentBlock && (
                    <div className="bg-secondary/50 rounded-lg p-3 border">
                      <div className="text-xs text-muted-foreground mb-1">
                        {t('currentSelection')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">
                          {selectedParentBlock.type === 'h'
                            ? selectedParentBlock.subtype?.toUpperCase()
                            : '📄'}
                        </Badge>
                        <span className="flex-1 truncate font-medium">
                          {selectedParentBlock.content}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('insertedHeadingLevel')}</Label>
                    <Select
                      value={String(headingLevel)}
                      onValueChange={(v) => setHeadingLevel(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((level) => (
                          <SelectItem key={level} value={String(level)}>
                            H{level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('insertPosition')}</Label>
                    <Select
                      value={headingPosition}
                      onValueChange={(v) => setHeadingPosition(v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prepend">{t('insertAtBeginning')}</SelectItem>
                        <SelectItem value="append">{t('insertAtEnd')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headingSubContent">{t('headingContentOptional')}</Label>
                  <Textarea
                    id="headingSubContent"
                    value={headingSubContent}
                    onChange={(e) => setHeadingSubContent(e.target.value)}
                    placeholder={t('inputHeadingSubContent')}
                    rows={4}
                  />
                </div>
              </TabsContent>

              {/* 新建文档标签页 */}
              <TabsContent value="document" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="docTitle">{t('documentTitle')}</Label>
                  <Input
                    id="docTitle"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder={t('inputDocumentTitle')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('selectNotebook')}</Label>
                  <Select value={selectedNotebookId} onValueChange={setSelectedNotebookId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {notebooks.length === 0 && (
                        <SelectItem value="" disabled>
                          {t('noNotebook')}
                        </SelectItem>
                      )}
                      {notebooks.map((nb) => (
                        <SelectItem key={nb.id} value={nb.id}>
                          {nb.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="docPath">{t('savePathRelativeToNotebook')}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="docPath"
                      value={docPath}
                      onChange={(e) => {
                        setDocPath(e.target.value);
                        handlePathSearch(e.target.value);
                      }}
                      placeholder={t('inputOrSearchPathDesc')}
                      className="pl-9"
                    />
                  </div>

                  {/* 路径搜索结果 */}
                  {pathSearchResults.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      {pathSearchResults.map((doc: any, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setDocPath(doc.hPathFull || '/');
                            setPathSearchResults([]);
                          }}
                          className="p-3 border-b last:border-b-0 cursor-pointer hover:bg-accent transition-colors"
                        >
                          <div className="font-medium truncate">{doc.title || doc.hPathFull}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {doc.hPathFull}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="docContent">{t('documentContentOptional')}</Label>
                  <Textarea
                    id="docContent"
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder={t('inputDocumentContent')}
                    rows={4}
                  />
                </div>
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Separator className="my-4" />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={loading} className="gap-1">
            <Check className="w-4 h-4" />
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BlockBindingDialog;
