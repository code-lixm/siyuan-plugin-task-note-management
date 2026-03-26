import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { confirm, showMessage } from 'siyuan';
import { i18n } from '../pluginInstance';
import { CategoryManager } from '../utils/categoryManager';
import { ProjectManager } from '../utils/projectManager';
import './FilterManagement.css';

type DateFilterType =
    | 'all'
    | 'none'
    | 'yesterday'
    | 'today'
    | 'tomorrow'
    | 'this_week'
    | 'next_7_days'
    | 'future'
    | 'past_7_days'
    | 'custom_range'
    | 'future_x_days'
    | 'yearly_date_range';

interface DateFilter {
    type: DateFilterType;
    startDate?: string;
    endDate?: string;
    futureDays?: number;
    yearlyStartMonth?: number;
    yearlyStartDay?: number;
    yearlyEndMonth?: number;
    yearlyEndDay?: number;
}

interface FilterConfig {
    id: string;
    name: string;
    isBuiltIn: boolean;
    dateFilters: DateFilter[];
    statusFilter: 'all' | 'completed' | 'uncompleted';
    projectFilters: string[];
    categoryFilters: string[];
    priorityFilters: string[];
}

interface FilterManagementProps {
    plugin: any;
    onFilterApplied: (filter: FilterConfig | null) => void | Promise<void>;
}

function SvgUse({ icon }: { icon: string }) {
    return <use href={icon} xlinkHref={icon} />;
}

function maxDayOfMonth(month: number): number {
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12) return 31;
    return daysInMonth[month - 1];
}

function builtInFilters(): FilterConfig[] {
    return [
        {
            id: 'builtin_today',
            name: i18n('todayReminders') || '今日任务',
            isBuiltIn: true,
            dateFilters: [{ type: 'today' }],
            statusFilter: 'all',
            projectFilters: ['all'],
            categoryFilters: ['all'],
            priorityFilters: ['all'],
        },
        {
            id: 'builtin_tomorrow',
            name: i18n('tomorrowReminders') || '明日任务',
            isBuiltIn: true,
            dateFilters: [{ type: 'tomorrow' }],
            statusFilter: 'all',
            projectFilters: ['all'],
            categoryFilters: ['all'],
            priorityFilters: ['all'],
        },
        {
            id: 'builtin_future7',
            name: i18n('future7Reminders') || '未来七天',
            isBuiltIn: true,
            dateFilters: [{ type: 'next_7_days' }],
            statusFilter: 'all',
            projectFilters: ['all'],
            categoryFilters: ['all'],
            priorityFilters: ['all'],
        },
        {
            id: 'builtin_thisWeek',
            name: i18n('thisWeekReminders') || '本周任务',
            isBuiltIn: true,
            dateFilters: [{ type: 'this_week' }],
            statusFilter: 'all',
            projectFilters: ['all'],
            categoryFilters: ['all'],
            priorityFilters: ['all'],
        },
        {
            id: 'builtin_futureAll',
            name: i18n('futureReminders') || '未来任务',
            isBuiltIn: true,
            dateFilters: [{ type: 'future' }],
            statusFilter: 'all',
            projectFilters: ['all'],
            categoryFilters: ['all'],
            priorityFilters: ['all'],
        },
        {
            id: 'builtin_overdue',
            name: i18n('overdueReminders') || '过期任务',
            isBuiltIn: true,
            dateFilters: [{ type: 'past_7_days' }],
            statusFilter: 'all',
            projectFilters: ['all'],
            categoryFilters: ['all'],
            priorityFilters: ['all'],
        },
        {
            id: 'builtin_all',
            name: i18n('past7Reminders') || '过去七天',
            isBuiltIn: true,
            dateFilters: [{ type: 'past_7_days' }],
            statusFilter: 'all',
            projectFilters: ['all'],
            categoryFilters: ['all'],
            priorityFilters: ['all'],
        },
        {
            id: 'builtin_allUncompleted',
            name: i18n('allUncompletedReminders'),
            isBuiltIn: true,
            dateFilters: [],
            statusFilter: 'uncompleted',
            projectFilters: ['all'],
            categoryFilters: ['all'],
            priorityFilters: ['all'],
        },
        {
            id: 'builtin_noDate',
            name: i18n('noDateReminders'),
            isBuiltIn: true,
            dateFilters: [{ type: 'none' }],
            statusFilter: 'all',
            projectFilters: ['all'],
            categoryFilters: ['all'],
            priorityFilters: ['all'],
        },
        {
            id: 'builtin_todayCompleted',
            name: i18n('todayCompletedReminders'),
            isBuiltIn: true,
            dateFilters: [{ type: 'today' }],
            statusFilter: 'completed',
            projectFilters: ['all'],
            categoryFilters: ['all'],
            priorityFilters: ['all'],
        },
        {
            id: 'builtin_yesterdayCompleted',
            name: i18n('yesterdayCompletedReminders'),
            isBuiltIn: true,
            dateFilters: [{ type: 'yesterday' }],
            statusFilter: 'completed',
            projectFilters: ['all'],
            categoryFilters: ['all'],
            priorityFilters: ['all'],
        },
        {
            id: 'builtin_completed',
            name: i18n('completedReminders'),
            isBuiltIn: true,
            dateFilters: [],
            statusFilter: 'completed',
            projectFilters: ['all'],
            categoryFilters: ['all'],
            priorityFilters: ['all'],
        },
    ];
}

function toggleSelection(current: string[], value: string, allValue = 'all'): string[] {
    if (value === allValue) return [allValue];
    if (current.includes(value)) return current.filter((item) => item !== value);
    return [...current.filter((item) => item !== allValue), value];
}

export default function FilterManagement({ plugin, onFilterApplied }: FilterManagementProps) {
    const [filters, setFilters] = useState<FilterConfig[]>([]);
    const [selectedFilter, setSelectedFilter] = useState<FilterConfig | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [hiddenBuiltInFilters, setHiddenBuiltInFilters] = useState<string[]>([]);

    const [categories, setCategories] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    const [filterName, setFilterName] = useState('');
    const [selectedDateFilters, setSelectedDateFilters] = useState<DateFilterType[]>([]);
    const [customRangeStart, setCustomRangeStart] = useState('');
    const [customRangeEnd, setCustomRangeEnd] = useState('');
    const [futureDays, setFutureDays] = useState(14);
    const [yearlyStartMonth, setYearlyStartMonth] = useState(1);
    const [yearlyStartDay, setYearlyStartDay] = useState(1);
    const [yearlyEndMonth, setYearlyEndMonth] = useState(12);
    const [yearlyEndDay, setYearlyEndDay] = useState(31);
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'uncompleted'>('all');
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);

    const [draggedFilterId, setDraggedFilterId] = useState<string | null>(null);
    const [dragTargetId, setDragTargetId] = useState<string | null>(null);
    const [dragPosition, setDragPosition] = useState<'above' | 'below' | null>(null);

    const resetDragState = useCallback(() => {
        setDraggedFilterId(null);
        setDragTargetId(null);
        setDragPosition(null);
    }, []);

    const clampYearlyDays = useCallback(() => {
        setYearlyStartMonth((value) => Math.max(1, Math.min(12, value)));
        setYearlyEndMonth((value) => Math.max(1, Math.min(12, value)));
        setYearlyStartDay((value) => Math.max(1, Math.min(maxDayOfMonth(yearlyStartMonth), value)));
        setYearlyEndDay((value) => Math.max(1, Math.min(maxDayOfMonth(yearlyEndMonth), value)));
    }, [yearlyStartMonth, yearlyEndMonth]);

    const saveFilters = useCallback(
        async (nextFilters: FilterConfig[], nextHiddenBuiltIn: string[]) => {
            const settings = (await plugin.loadData('settings.json')) || {};
            settings.customFilters = nextFilters.filter((item) => !item.isBuiltIn);
            settings.filterOrder = nextFilters.map((item) => item.id);
            settings.hiddenBuiltInFilters = nextHiddenBuiltIn;
            await plugin.saveData('settings.json', settings);
            await onFilterApplied(null);
        },
        [onFilterApplied, plugin],
    );

    const loadFilters = useCallback(async () => {
        const settings = await plugin.loadData('settings.json');
        const customFilters: FilterConfig[] = settings?.customFilters || [];
        const filterOrder: string[] = settings?.filterOrder || [];
        const hidden = settings?.hiddenBuiltInFilters || [];
        setHiddenBuiltInFilters(hidden);

        const allFilters = [...builtInFilters().filter((item) => !hidden.includes(item.id)), ...customFilters];

        if (filterOrder && filterOrder.length > 0) {
            const filterMap = new Map(allFilters.map((item) => [item.id, item]));
            const orderedFilters: FilterConfig[] = [];

            for (const id of filterOrder) {
                if (filterMap.has(id)) {
                    orderedFilters.push(filterMap.get(id)!);
                    filterMap.delete(id);
                }
            }

            for (const filter of filterMap.values()) {
                orderedFilters.push(filter);
            }

            setFilters(orderedFilters);
            return;
        }

        setFilters(allFilters);
    }, [plugin]);

    useEffect(() => {
        let disposed = false;

        const initialize = async () => {
            const categoryManager = CategoryManager.getInstance(plugin);
            const projectManager = ProjectManager.getInstance(plugin);
            await categoryManager.initialize();
            await projectManager.initialize();

            if (disposed) return;

            setCategories(categoryManager.getCategories());

            const groupedProjects = projectManager.getProjectsGroupedByStatus();
            const allProjects: any[] = [];
            Object.keys(groupedProjects).forEach((statusKey) => {
                const statusProjects = groupedProjects[statusKey] || [];
                const nonArchivedProjects = statusProjects.filter((project: any) => {
                    const projectStatus = projectManager.getProjectById(project.id)?.status || 'doing';
                    return projectStatus !== 'archived';
                });

                nonArchivedProjects.sort((a: any, b: any) => {
                    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1, none: 0 };
                    const priorityA = priorityOrder[a.priority || 'none'] || 0;
                    const priorityB = priorityOrder[b.priority || 'none'] || 0;
                    if (priorityA !== priorityB) return priorityB - priorityA;

                    const sortA = a.sort || 0;
                    const sortB = b.sort || 0;
                    if (sortA !== sortB) return sortA - sortB;

                    const dateA = a.startDate || a.createdTime || '';
                    const dateB = b.startDate || b.createdTime || '';
                    return dateA.localeCompare(dateB);
                });

                allProjects.push(...nonArchivedProjects);
            });

            setProjects(allProjects);
            await loadFilters();
        };

        initialize();

        return () => {
            disposed = true;
        };
    }, [loadFilters, plugin]);

    const selectFilter = useCallback((filter: FilterConfig) => {
        setSelectedFilter(filter);
        setIsEditing(true);

        setFilterName(filter.name);
        setSelectedDateFilters(filter.dateFilters.map((item) => item.type));
        setStatusFilter(filter.statusFilter);
        setSelectedProjects([...filter.projectFilters]);
        setSelectedCategories([...filter.categoryFilters]);
        setSelectedPriorities([...filter.priorityFilters]);

        const customRange = filter.dateFilters.find((item) => item.type === 'custom_range');
        if (customRange) {
            setCustomRangeStart(customRange.startDate || '');
            setCustomRangeEnd(customRange.endDate || '');
        } else {
            setCustomRangeStart('');
            setCustomRangeEnd('');
        }

        const futureXDays = filter.dateFilters.find((item) => item.type === 'future_x_days');
        setFutureDays(futureXDays?.futureDays || 14);

        const yearlyRange = filter.dateFilters.find((item) => item.type === 'yearly_date_range');
        if (yearlyRange) {
            setYearlyStartMonth(yearlyRange.yearlyStartMonth || 1);
            setYearlyStartDay(yearlyRange.yearlyStartDay || 1);
            setYearlyEndMonth(yearlyRange.yearlyEndMonth || 12);
            setYearlyEndDay(yearlyRange.yearlyEndDay || 31);
        } else {
            setYearlyStartMonth(1);
            setYearlyStartDay(1);
            setYearlyEndMonth(12);
            setYearlyEndDay(31);
        }
    }, []);

    const startNewFilter = useCallback(() => {
        setSelectedFilter(null);
        setIsEditing(true);
        setFilterName('');
        setSelectedDateFilters(['all']);
        setCustomRangeStart('');
        setCustomRangeEnd('');
        setFutureDays(14);
        setYearlyStartMonth(1);
        setYearlyStartDay(1);
        setYearlyEndMonth(12);
        setYearlyEndDay(31);
        setStatusFilter('all');
        setSelectedProjects(['all']);
        setSelectedCategories(['all']);
        setSelectedPriorities(['all']);
    }, []);

    const saveFilter = useCallback(async () => {
        if (!filterName.trim()) {
            showMessage(i18n('pleaseEnterFilterName'));
            return;
        }

        const dateFilters: DateFilter[] = selectedDateFilters.map((type) => {
            if (type === 'custom_range') {
                return { type, startDate: customRangeStart, endDate: customRangeEnd };
            }
            if (type === 'future_x_days') {
                return { type, futureDays };
            }
            if (type === 'yearly_date_range') {
                return {
                    type,
                    yearlyStartMonth,
                    yearlyStartDay,
                    yearlyEndMonth,
                    yearlyEndDay,
                };
            }
            return { type };
        });

        const nextFilter: FilterConfig = {
            id: selectedFilter?.id || `custom_${Date.now()}`,
            name: filterName,
            isBuiltIn: false,
            dateFilters,
            statusFilter,
            projectFilters: selectedProjects,
            categoryFilters: selectedCategories,
            priorityFilters: selectedPriorities,
        };

        let nextFilters = [...filters];
        if (selectedFilter) {
            const index = nextFilters.findIndex((item) => item.id === selectedFilter.id);
            if (index !== -1) nextFilters[index] = nextFilter;
        } else {
            nextFilters = [...nextFilters, nextFilter];
        }

        setFilters(nextFilters);
        await saveFilters(nextFilters, hiddenBuiltInFilters);
        showMessage(i18n('filterSaved'));
        setIsEditing(false);
        setSelectedFilter(null);
    }, [
        customRangeEnd,
        customRangeStart,
        filterName,
        filters,
        futureDays,
        hiddenBuiltInFilters,
        saveFilters,
        selectedCategories,
        selectedDateFilters,
        selectedFilter,
        selectedPriorities,
        selectedProjects,
        statusFilter,
        yearlyEndDay,
        yearlyEndMonth,
        yearlyStartDay,
        yearlyStartMonth,
    ]);

    const deleteFilter = useCallback(
        async (filter: FilterConfig) => {
            await confirm(
                i18n('deleteFilter') || '删除过滤器',
                i18n('confirmDeleteFilter')?.replace('${name}', filter.name) || `确定要删除过滤器"${filter.name}"吗？`,
                async () => {
                    const nextHidden = filter.isBuiltIn
                        ? [...hiddenBuiltInFilters, filter.id]
                        : hiddenBuiltInFilters;
                    const nextFilters = filters.filter((item) => item.id !== filter.id);

                    setHiddenBuiltInFilters(nextHidden);
                    setFilters(nextFilters);

                    await saveFilters(nextFilters, nextHidden);
                    showMessage(i18n('filterDeleted'));

                    if (selectedFilter?.id === filter.id) {
                        setSelectedFilter(null);
                        setIsEditing(false);
                    }
                },
            );
        },
        [filters, hiddenBuiltInFilters, saveFilters, selectedFilter?.id],
    );

    const handleDrop = useCallback(
        async (e: React.DragEvent<HTMLDivElement>, targetFilter: FilterConfig) => {
            e.preventDefault();
            if (!draggedFilterId || draggedFilterId === targetFilter.id) {
                resetDragState();
                return;
            }

            const fromIndex = filters.findIndex((item) => item.id === draggedFilterId);
            if (fromIndex < 0) {
                resetDragState();
                return;
            }

            const nextFilters = [...filters];
            const [movedItem] = nextFilters.splice(fromIndex, 1);
            let toIndex = nextFilters.findIndex((item) => item.id === targetFilter.id);
            if (dragPosition === 'below') toIndex++;

            nextFilters.splice(toIndex, 0, movedItem);
            setFilters(nextFilters);
            await saveFilters(nextFilters, hiddenBuiltInFilters);
            resetDragState();
        },
        [dragPosition, draggedFilterId, filters, hiddenBuiltInFilters, resetDragState, saveFilters],
    );

    const dateFilterOptions = useMemo(
        () => [
            { key: 'all' as const, label: i18n('allDates') },
            { key: 'none' as const, label: i18n('noDate') },
            { key: 'yesterday' as const, label: i18n('yesterday') },
            { key: 'today' as const, label: i18n('today') },
            { key: 'tomorrow' as const, label: i18n('tomorrow') },
            { key: 'this_week' as const, label: i18n('thisWeek') },
            { key: 'next_7_days' as const, label: i18n('next7Days') },
            { key: 'future' as const, label: i18n('future') },
            { key: 'past_7_days' as const, label: i18n('past7Days') },
            { key: 'future_x_days' as const, label: i18n('futureXDays') },
            { key: 'yearly_date_range' as const, label: i18n('yearlyDateRange') },
            { key: 'custom_range' as const, label: i18n('customRange') },
        ],
        [],
    );

    return (
        <div className="filter-management">
            <div className="filter-list">
                <div className="filter-list-header">
                    <h3>{i18n('filterManagement')}</h3>
                    <button className="b3-button b3-button--primary" onClick={startNewFilter}>
                        <svg className="b3-button__icon"><SvgUse icon="#iconAdd" /></svg>
                        {i18n('newFilter')}
                    </button>
                </div>

                <div className="filter-list-content">
                    {filters.map((filter) => {
                        const isSelected = selectedFilter?.id === filter.id;
                        const isDragAbove = dragTargetId === filter.id && dragPosition === 'above';
                        const isDragBelow = dragTargetId === filter.id && dragPosition === 'below';

                        return (
                            <div
                                key={filter.id}
                                className={`filter-item ${isSelected ? 'selected' : ''} ${isDragAbove ? 'drag-over-above' : ''} ${isDragBelow ? 'drag-over-below' : ''}`}
                                draggable
                                onDragStart={(e) => {
                                    setDraggedFilterId(filter.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('text/plain', filter.id);
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    if (!draggedFilterId || draggedFilterId === filter.id) return;
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    const midY = rect.top + rect.height / 2;
                                    setDragTargetId(filter.id);
                                    setDragPosition(e.clientY < midY ? 'above' : 'below');
                                }}
                                onDragLeave={resetDragState}
                                onDrop={(e) => handleDrop(e, filter)}
                                onClick={() => selectFilter(filter)}
                            >
                                <div className="filter-item-main">
                                    <div className="filter-item-name">
                                        <span className="drag-handle" style={{ cursor: 'move', opacity: 0.3, marginRight: 4 }}>⋮⋮</span>
                                        {filter.name}
                                        {filter.isBuiltIn && <span className="filter-badge">{i18n('builtInFilter')}</span>}
                                    </div>
                                </div>
                                <div className="filter-item-actions">
                                    <button
                                        className="b3-button b3-button--outline"
                                        title={i18n('deleteFilter')}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void deleteFilter(filter);
                                        }}
                                    >
                                        <svg className="b3-button__icon"><SvgUse icon="#iconTrashcan" /></svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="filter-editor">
                {isEditing ? (
                    <>
                        <div className="filter-editor-header-input">
                            <div className="b3-form__group" style={{ marginBottom: 0 }}>
                                <label className="b3-form__label" htmlFor="filter-name-input">{i18n('filterName')}</label>
                                <input
                                    id="filter-name-input"
                                    type="text"
                                    className="b3-text-field"
                                    value={filterName}
                                    onChange={(e) => setFilterName(e.target.value)}
                                    placeholder={i18n('pleaseEnterFilterName')}
                                />
                            </div>
                        </div>

                        <div className="filter-editor-content">
                            <div className="b3-form__group">
                                <span className="b3-form__label">{i18n('dateFilters')}</span>
                                <div className="filter-options">
                                    {dateFilterOptions.map((option) => (
                                        <div
                                            key={option.key}
                                            className={`filter-option ${selectedDateFilters.includes(option.key) ? 'selected' : ''}`}
                                            onClick={() => {
                                                if (option.key === 'all') {
                                                    setSelectedDateFilters(['all']);
                                                } else {
                                                    setSelectedDateFilters((current) => toggleSelection(current, option.key));
                                                }
                                            }}
                                        >
                                            {option.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedDateFilters.includes('custom_range') && (
                                <div className="b3-form__group">
                                    <label className="b3-form__label" htmlFor="custom-range-start">{i18n('dateRange')}</label>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input id="custom-range-start" type="date" className="b3-text-field" value={customRangeStart} onChange={(e) => setCustomRangeStart(e.target.value)} style={{ flex: 1 }} />
                                        <span>-</span>
                                        <input type="date" className="b3-text-field" value={customRangeEnd} onChange={(e) => setCustomRangeEnd(e.target.value)} style={{ flex: 1 }} />
                                    </div>
                                </div>
                            )}

                            {selectedDateFilters.includes('future_x_days') && (
                                <div className="b3-form__group">
                                    <label className="b3-form__label" htmlFor="future-days-input">{i18n('futureXDaysConfig')}</label>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input
                                            id="future-days-input"
                                            type="number"
                                            className="b3-text-field"
                                            min={1}
                                            max={365}
                                            value={futureDays}
                                            onChange={(e) => setFutureDays(Number(e.target.value || 14))}
                                            style={{ width: 80 }}
                                        />
                                        <span>{i18n('days')}</span>
                                    </div>
                                </div>
                            )}

                            {selectedDateFilters.includes('yearly_date_range') && (
                                <div className="b3-form__group">
                                    <label className="b3-form__label">{i18n('yearlyDateRangeConfig')}</label>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                            <input type="number" className="b3-text-field" min={1} max={12} value={yearlyStartMonth} onChange={(e) => setYearlyStartMonth(Number(e.target.value || 1))} onBlur={clampYearlyDays} style={{ width: 60 }} />
                                            <span>{i18n('month')}</span>
                                            <input type="number" className="b3-text-field" min={1} max={maxDayOfMonth(yearlyStartMonth)} value={yearlyStartDay} onChange={(e) => setYearlyStartDay(Number(e.target.value || 1))} onBlur={clampYearlyDays} style={{ width: 60 }} />
                                            <span>{i18n('day')}</span>
                                        </div>
                                        <span>-</span>
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                            <input type="number" className="b3-text-field" min={1} max={12} value={yearlyEndMonth} onChange={(e) => setYearlyEndMonth(Number(e.target.value || 1))} onBlur={clampYearlyDays} style={{ width: 60 }} />
                                            <span>{i18n('month')}</span>
                                            <input type="number" className="b3-text-field" min={1} max={maxDayOfMonth(yearlyEndMonth)} value={yearlyEndDay} onChange={(e) => setYearlyEndDay(Number(e.target.value || 1))} onBlur={clampYearlyDays} style={{ width: 60 }} />
                                            <span>{i18n('day')}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="b3-form__group">
                                <span className="b3-form__label">{i18n('statusFilters')}</span>
                                <div className="filter-options">
                                    {(['all', 'completed', 'uncompleted'] as const).map((value) => (
                                        <div key={value} className={`filter-option ${statusFilter === value ? 'selected' : ''}`} onClick={() => setStatusFilter(value)}>
                                            {value === 'all' ? i18n('all') : value === 'completed' ? i18n('completed') : i18n('uncompleted')}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="b3-form__group">
                                <span className="b3-form__label">{i18n('projectFilters')}</span>
                                <div className="filter-options">
                                    <div className={`filter-option ${selectedProjects.includes('all') ? 'selected' : ''}`} onClick={() => setSelectedProjects(['all'])}>{i18n('allProjects')}</div>
                                    <div className={`filter-option ${selectedProjects.includes('none') ? 'selected' : ''}`} onClick={() => setSelectedProjects((current) => toggleSelection(current, 'none'))}>{i18n('noProject')}</div>
                                    {projects.map((project) => (
                                        <div key={project.id} className={`filter-option ${selectedProjects.includes(project.id) ? 'selected' : ''}`} onClick={() => setSelectedProjects((current) => toggleSelection(current, project.id))}>
                                            {project.icon || ''} {project.name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="b3-form__group">
                                <span className="b3-form__label">{i18n('categoryFilters')}</span>
                                <div className="filter-options">
                                    <div className={`filter-option ${selectedCategories.includes('all') ? 'selected' : ''}`} onClick={() => setSelectedCategories(['all'])}>{i18n('allCategories')}</div>
                                    <div className={`filter-option ${selectedCategories.includes('none') ? 'selected' : ''}`} onClick={() => setSelectedCategories((current) => toggleSelection(current, 'none'))}>{i18n('noCategory')}</div>
                                    {categories.map((category) => (
                                        <div key={category.id} className={`filter-option ${selectedCategories.includes(category.id) ? 'selected' : ''}`} onClick={() => setSelectedCategories((current) => toggleSelection(current, category.id))}>
                                            <span style={{ background: category.color, color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 12 }}>
                                                {category.icon || ''} {category.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="b3-form__group">
                                <span className="b3-form__label">{i18n('priorityFilters')}</span>
                                <div className="filter-options">
                                    {[
                                        { key: 'all', label: i18n('allPriorities') },
                                        { key: 'high', label: `🔴 ${i18n('highPriority')}` },
                                        { key: 'medium', label: `🟡 ${i18n('mediumPriority')}` },
                                        { key: 'low', label: `🔵 ${i18n('lowPriority')}` },
                                        { key: 'none', label: `⚪ ${i18n('noPriority')}` },
                                    ].map((item) => (
                                        <div key={item.key} className={`filter-option ${selectedPriorities.includes(item.key) ? 'selected' : ''}`} onClick={() => setSelectedPriorities(item.key === 'all' ? ['all'] : toggleSelection(selectedPriorities, item.key))}>
                                            {item.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="filter-editor-actions">
                            <button className="b3-button b3-button--cancel" onClick={() => setIsEditing(false)}>{i18n('cancel')}</button>
                            <button className="b3-button b3-button--primary" onClick={() => void saveFilter()}>{i18n('save')}</button>
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <svg className="empty-icon"><SvgUse icon="#iconFilter" /></svg>
                        <p>{i18n('selectFilterToEdit')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
