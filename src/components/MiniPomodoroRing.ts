/*
 * Copyright (c) 2024 by lixiaoming. All Rights Reserved.
 * @Author       : lixiaoming
 * @Date         : 2024-04-15
 * @FilePath     : /src/components/MiniPomodoroRing.ts
 * @Description  : 简化版圆环番茄钟 - 页面上的小圆环，点击显示进度，简化功能
 */

import { showMessage, Menu } from "siyuan";
import { PomodoroRecordManager } from "../utils/pomodoroRecord";
import { i18n } from "../pluginInstance";
import { resolveAudioPath, createAudio } from "../utils/audioUtils";
import { FocusEventManager } from "../utils/focusEventManager";

/**
 * 简化版圆环番茄钟
 * - 小圆环直接显示在页面上
 * - 点击启动/暂停
 * - 圆环进度可视化
 * - 声音提醒
 * - 自动记录
 */
export class MiniPomodoroRing {
    private static instance: MiniPomodoroRing | null = null;
    private static readonly LONG_PRESS_DURATION = 700;
    private static readonly LONG_PRESS_MOVE_THRESHOLD = 8;
    private static readonly DRAG_START_THRESHOLD = 6;
    
    // DOM元素
    private container: HTMLElement;
    private ringSvg: SVGElement;
    private progressCircle: SVGCircleElement;
    private holdProgressCircle: SVGCircleElement;
    private bgCircle: SVGCircleElement;
    private centerIcon: HTMLElement;
    private iconPlay: HTMLElement;
    private iconPause: HTMLElement;
    private iconClose: HTMLElement;
    private timeDisplay: HTMLElement;
    private statusTooltip: HTMLElement;
    
    // 状态
    private isRunning: boolean = false;
    private isPaused: boolean = false;
    private isWorkPhase: boolean = true;
    private timeLeft: number = 25 * 60;
    private totalTime: number = 25 * 60;
    private timerId: number | null = null;
    private completedPomodoros: number = 0;
    
    // 设置
    private workDuration: number = 25; // 工作时长（分钟）
    private breakDuration: number = 5; // 短休息时长（分钟）
    private soundEnabled: boolean = true;
    private autoStartBreak: boolean = false;
    
    // 音频
    private endSound: HTMLAudioElement | null = null;
    
    private workMusic: HTMLAudioElement | null = null;
    private breakMusic: HTMLAudioElement | null = null;
    // 记录
    private recordManager: PomodoroRecordManager;
    private focusEventManager: FocusEventManager;
    private activeFocusEventId: string = "";
    private currentTaskTitle: string = "";
    private currentTaskId: string = "";
    private currentTaskProjectName: string = "";
    
    // 拖拽
    private isDragging: boolean = false;
    private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
    private dragStartPoint: { x: number; y: number } | null = null;
    private didDrag: boolean = false;
    private longPressTimer: number | null = null;
    private holdNearCompleteTimer: number | null = null;
    private longPressTriggered: boolean = false;
    private pressStartPoint: { x: number; y: number } | null = null;
    private isHoldActive: boolean = false;
    private currentStatusText: string = "";
    
    // 位置（默认右下角）
    private position: { x: number; y: number } = { x: window.innerWidth - 70, y: window.innerHeight - 70 };
    
    // 插件实例
    private plugin: any;
    private readonly boundResizeHandler: () => void;
    private readonly boundClickHandler: (e: MouseEvent) => void;
    private readonly boundContextMenuHandler: (e: MouseEvent) => void;
    private readonly boundDragStartHandler: (e: MouseEvent) => void;
    private readonly boundDragMoveHandler: (e: MouseEvent) => void;
    private readonly boundDragEndHandler: () => void;
    private readonly boundPressStartHandler: (e: PointerEvent) => void;
    private readonly boundPressMoveHandler: (e: PointerEvent) => void;
    private readonly boundPressEndHandler: () => void;
    
    // 圆环尺寸
    private readonly RING_SIZE = 50;
    private readonly RING_RADIUS = 20;
    private readonly STROKE_WIDTH = 4;
    private readonly HOLD_RING_RADIUS = 13;
    
    /**
     * 获取单例实例
     */
    public static getInstance(plugin?: any): MiniPomodoroRing {
        if (!MiniPomodoroRing.instance) {
            MiniPomodoroRing.instance = new MiniPomodoroRing(plugin);
        }
        return MiniPomodoroRing.instance;
    }
    
    /**
     * 检查是否有活动的番茄钟
     */
    public static hasActiveInstance(): boolean {
        return MiniPomodoroRing.instance !== null && MiniPomodoroRing.instance.isRunning;
    }
    
    private constructor(plugin?: any) {
        this.plugin = plugin;
        this.recordManager = PomodoroRecordManager.getInstance(plugin);
        this.focusEventManager = FocusEventManager.getInstance(plugin);
        this.boundResizeHandler = this.handleResize.bind(this);
        this.boundClickHandler = this.handleClick.bind(this);
        this.boundContextMenuHandler = this.handleContextMenu.bind(this);
        this.boundDragStartHandler = this.handleDragStart.bind(this);
        this.boundDragMoveHandler = this.handleDragMove.bind(this);
        this.boundDragEndHandler = this.handleDragEnd.bind(this);
        this.boundPressStartHandler = this.handlePressStart.bind(this);
        this.boundPressMoveHandler = this.handlePressMove.bind(this);
        this.boundPressEndHandler = this.handlePressEnd.bind(this);
        
        // 加载保存的位置
        this.loadPosition();
        
        // 创建DOM
        this.createDOM();
        
        // 初始化音频
        this.initAudio();
        
        // 监听窗口大小变化
        window.addEventListener('resize', this.boundResizeHandler);
    }
    
    /**
     * 加载保存的位置
     */
    private loadPosition() {
        try {
            if (this.plugin) {
                const savedPos = this.plugin.loadData('miniPomodoroPosition.json');
                if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
                    this.position = savedPos;
                }
            }
        } catch (e) {
            // 忽略错误，使用默认位置
        }
    }
    
    /**
     * 保存位置
     */
    private savePosition() {
        try {
            if (this.plugin) {
                this.plugin.saveData('miniPomodoroPosition.json', this.position);
            }
        } catch (e) {
            // 忽略错误
        }
    }
    
    /**
     * 处理窗口大小变化
     */
    private handleResize() {
        // 确保圆环在可视范围内
        const maxX = window.innerWidth - this.RING_SIZE;
        const maxY = window.innerHeight - this.RING_SIZE;
        
        if (this.position.x > maxX) {
            this.position.x = maxX;
        }
        if (this.position.y > maxY) {
            this.position.y = maxY;
        }
        
        this.updatePosition();
    }
    
    /**
     * 创建DOM元素
     */
    private createDOM() {
        // 容器
        this.container = document.createElement('div');
        this.container.className = 'mini-pomodoro-ring';
        this.container.style.cssText = `
            position: fixed;
            width: ${this.RING_SIZE}px;
            height: ${this.RING_SIZE}px;
            z-index: 99999;
            cursor: pointer;
            user-select: none;
            transition: transform 0.1s ease;
        `;
        
        // SVG圆环
        const circumference = 2 * Math.PI * this.RING_RADIUS;
        
        this.ringSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.ringSvg.setAttribute('width', String(this.RING_SIZE));
        this.ringSvg.setAttribute('height', String(this.RING_SIZE));
        this.ringSvg.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            transform: rotate(-90deg);
        `;
        
        // 背景圆环
        this.bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.bgCircle.setAttribute('cx', String(this.RING_SIZE / 2));
        this.bgCircle.setAttribute('cy', String(this.RING_SIZE / 2));
        this.bgCircle.setAttribute('r', String(this.RING_RADIUS));
        this.bgCircle.setAttribute('fill', 'none');
        this.bgCircle.setAttribute('stroke', 'rgba(255, 255, 255, 0.2)');
        this.bgCircle.setAttribute('stroke-width', String(this.STROKE_WIDTH));
        
        // 进度圆环
        this.progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.progressCircle.setAttribute('cx', String(this.RING_SIZE / 2));
        this.progressCircle.setAttribute('cy', String(this.RING_SIZE / 2));
        this.progressCircle.setAttribute('r', String(this.RING_RADIUS));
        this.progressCircle.setAttribute('fill', 'none');
        this.progressCircle.setAttribute('stroke', '#FF6B6B');
        this.progressCircle.setAttribute('stroke-width', String(this.STROKE_WIDTH));
        this.progressCircle.setAttribute('stroke-dasharray', String(circumference));
        this.progressCircle.setAttribute('stroke-dashoffset', String(circumference));
        this.progressCircle.style.cssText = `
            transition: stroke-dashoffset 0.3s ease, stroke 0.3s ease;
        `;

        // 长按关闭反馈圆环
        this.holdProgressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.holdProgressCircle.setAttribute('cx', String(this.RING_SIZE / 2));
        this.holdProgressCircle.setAttribute('cy', String(this.RING_SIZE / 2));
        this.holdProgressCircle.setAttribute('r', String(this.HOLD_RING_RADIUS));
        this.holdProgressCircle.setAttribute('fill', 'none');
        this.holdProgressCircle.setAttribute('stroke', '#ef4444');
        this.holdProgressCircle.setAttribute('stroke-width', '3');
        this.holdProgressCircle.setAttribute('stroke-linecap', 'round');
        this.holdProgressCircle.setAttribute('stroke-dasharray', String(2 * Math.PI * this.HOLD_RING_RADIUS));
        this.holdProgressCircle.setAttribute('stroke-dashoffset', String(2 * Math.PI * this.HOLD_RING_RADIUS));
        this.holdProgressCircle.style.cssText = `
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
        `;
        
        this.ringSvg.appendChild(this.bgCircle);
        this.ringSvg.appendChild(this.progressCircle);
        this.ringSvg.appendChild(this.holdProgressCircle);
        
        // 中心图标
        this.centerIcon = document.createElement('div');
        this.centerIcon.className = 'mini-pomodoro-center-icon';
        this.centerIcon.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${this.RING_SIZE - this.STROKE_WIDTH * 2 - 4}px;
            height: ${this.RING_SIZE - this.STROKE_WIDTH * 2 - 4}px;
            background: var(--b3-theme-background, #fff);
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        `;

        this.iconPlay = document.createElement('span');
        this.iconPlay.className = 'mini-pomodoro-icon mini-pomodoro-icon--play';

        this.iconPause = document.createElement('span');
        this.iconPause.className = 'mini-pomodoro-icon mini-pomodoro-icon--pause';

        const pauseBarLeft = document.createElement('span');
        pauseBarLeft.className = 'mini-pomodoro-icon-bar';
        const pauseBarRight = document.createElement('span');
        pauseBarRight.className = 'mini-pomodoro-icon-bar';
        this.iconPause.appendChild(pauseBarLeft);
        this.iconPause.appendChild(pauseBarRight);

        this.iconClose = document.createElement('span');
        this.iconClose.className = 'mini-pomodoro-icon mini-pomodoro-icon--close';
        const closeBarLeft = document.createElement('span');
        closeBarLeft.className = 'mini-pomodoro-icon-close-bar mini-pomodoro-icon-close-bar--left';
        const closeBarRight = document.createElement('span');
        closeBarRight.className = 'mini-pomodoro-icon-close-bar mini-pomodoro-icon-close-bar--right';
        this.iconClose.appendChild(closeBarLeft);
        this.iconClose.appendChild(closeBarRight);

        this.centerIcon.appendChild(this.iconPlay);
        this.centerIcon.appendChild(this.iconPause);
        this.centerIcon.appendChild(this.iconClose);
        
        // 时间显示（悬浮时显示）
        this.timeDisplay = document.createElement('div');
        this.timeDisplay.className = 'mini-pomodoro-time';
        this.timeDisplay.textContent = '25:00';
        this.timeDisplay.style.cssText = `
            position: absolute;
            bottom: -24px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 11px;
            font-family: 'SF Mono', Monaco, monospace;
            color: var(--b3-theme-on-background);
            background: var(--b3-theme-surface);
            padding: 2px 6px;
            border-radius: 4px;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
        `;
        
        // 状态提示
        this.statusTooltip = document.createElement('div');
        this.statusTooltip.className = 'mini-pomodoro-status';
        this.statusTooltip.textContent = i18n('pomodoroClickToStart') || '点击开始';
        this.statusTooltip.style.cssText = `
            position: absolute;
            top: -28px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            color: var(--b3-theme-on-surface);
            background: var(--b3-theme-surface);
            padding: 2px 6px;
            border-radius: 4px;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
            white-space: pre-line;
            line-height: 1.35;
            max-width: 180px;
            text-align: center;
            z-index: 1;
        `;
        
        this.container.appendChild(this.ringSvg);
        this.container.appendChild(this.centerIcon);
        this.container.appendChild(this.timeDisplay);
        this.container.appendChild(this.statusTooltip);
        
        // 悬浮效果
        this.container.addEventListener('mouseenter', () => {
            this.timeDisplay.style.opacity = this.isRunning ? '1' : '0';
            this.statusTooltip.style.opacity = '1';
        });
        this.container.addEventListener('mouseleave', () => {
            this.timeDisplay.style.opacity = '0';
            this.statusTooltip.style.opacity = '0';
        });
        
        // 点击事件
        this.container.addEventListener('click', this.boundClickHandler);
        
        this.container.addEventListener('contextmenu', this.boundContextMenuHandler);

        // 长按关闭
        this.container.addEventListener('pointerdown', this.boundPressStartHandler);
        document.addEventListener('pointermove', this.boundPressMoveHandler);
        document.addEventListener('pointerup', this.boundPressEndHandler);
        document.addEventListener('pointercancel', this.boundPressEndHandler);
        
        // 拖拽
        this.container.addEventListener('mousedown', this.boundDragStartHandler);
        document.addEventListener('mousemove', this.boundDragMoveHandler);
        document.addEventListener('mouseup', this.boundDragEndHandler);
        
        // 设置位置
        this.updatePosition();
        
        // 添加到页面
        document.body.appendChild(this.container);
        
        // 初始化记录管理器
        this.recordManager.initialize().catch(e => {
            console.warn('初始化番茄钟记录失败:', e);
        });

        this.updateVisualState();
    }
    
    /**
     * 初始化音频
     */
    private async initAudio() {
        try {
            const settings = await this.plugin?.getPomodoroSettings?.();
            // 加载阶段结束音
            const endSoundPath = settings?.workEndSound || '/appearance/themes/daylight/assets/notification.mp3';
            const resolvedEndPath = await resolveAudioPath(endSoundPath);
            this.endSound = new Audio(resolvedEndPath);
            this.endSound.volume = settings?.workEndVolume ?? 0.8;
            this.endSound.preload = 'auto';

            // 加载工作背景音乐（循环播放）
            if (settings?.workSound) {
                this.workMusic = await createAudio(settings.workSound);
                if (this.workMusic) {
                    this.workMusic.loop = true;
                    this.workMusic.volume = settings?.workVolume ?? 0.5;
                    this.workMusic.preload = 'auto';
                }
            }
            // 加载休息背景音乐（循环播放）
            if (settings?.breakSound) {
                this.breakMusic = await createAudio(settings.breakSound);
                if (this.breakMusic) {
                    this.breakMusic.loop = true;
                    this.breakMusic.volume = settings?.breakVolume ?? 0.5;
                    this.breakMusic.preload = 'auto';
                }
            }

            this.workDuration = settings?.pomodoroWorkDuration || this.workDuration;
            this.breakDuration = settings?.pomodoroBreakDuration || this.breakDuration;
            this.autoStartBreak = settings?.pomodoroAutoMode === true;
            this.timeLeft = this.workDuration * 60;
            this.totalTime = this.timeLeft;
            this.updateDisplay();
        } catch (e) {
            console.warn('加载番茄钟提示音失败:', e);
        }
    }

    /**
     * 获取当前阶段的背景音乐
     */
    private get currentPhaseMusic(): HTMLAudioElement | null {
        return this.isWorkPhase ? this.workMusic : this.breakMusic;
    }

    /**
     * 停止所有背景音乐并重置播放位置
     */
    private stopAllMusic(): void {
        if (this.workMusic) {
            this.workMusic.pause();
            this.workMusic.currentTime = 0;
        }
        if (this.breakMusic) {
            this.breakMusic.pause();
            this.breakMusic.currentTime = 0;
        }
    }

    /**
     * 开始播放当前阶段的背景音乐（从开头循环）
     */
    private startPhaseMusic(): void {
        this.stopAllMusic();
        const music = this.currentPhaseMusic;
        if (music) {
            music.currentTime = 0;
            music.play().catch((e) => console.warn('播放番茄钟背景音乐失败:', e));
        }
    }

    /**
     * 暂停当前阶段的背景音乐（保留播放位置）
     */
    private pausePhaseMusic(): void {
        const music = this.currentPhaseMusic;
        if (music) {
            music.pause();
        }
    }

    /**
     * 恢复当前阶段的背景音乐
     */
    private resumePhaseMusic(): void {
        const music = this.currentPhaseMusic;
        if (music) {
            music.play().catch((e) => console.warn('恢复番茄钟背景音乐失败:', e));
        }
    }

    private async syncWithSettings() {
        try {
            const settings = await this.plugin?.getPomodoroSettings?.();
            if (!settings) {
                return;
            }
            this.workDuration = settings.pomodoroWorkDuration || this.workDuration;
            this.breakDuration = settings.pomodoroBreakDuration || this.breakDuration;
            this.autoStartBreak = settings.pomodoroAutoMode === true;
            if (!this.isRunning && !this.isPaused) {
                this.timeLeft = this.workDuration * 60;
                this.totalTime = this.timeLeft;
                this.updateDisplay();
            }
        } catch (e) {
            console.warn('同步番茄钟设置失败:', e);
        }
    }
    
    /**
     * 播放提示音
     */
    private async playSound() {
        if (!this.soundEnabled || !this.endSound) return;
        
        try {
            this.endSound.currentTime = 0;
            await this.endSound.play();
        } catch (e) {
            console.warn('播放提示音失败:', e);
        }
    }
    
    /**
     * 更新位置
     */
    private updatePosition() {
        this.container.style.left = `${this.position.x}px`;
        this.container.style.top = `${this.position.y}px`;
    }
    
    /**
     * 拖拽开始
     */
    private handleDragStart(e: MouseEvent) {
        if (e.button !== 0) return; // 只响应左键
        
        // 如果正在运行且点击的是中心，不开始拖拽
        const rect = this.container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.sqrt((e.clientX - centerX) ** 2 + (e.clientY - centerY) ** 2);
        
        if (distance < 15) {
            // 点击中心区域，不拖拽
            return;
        }

        // 仅记录潜在拖拽起点；真正拖拽在移动超过阈值后才开始，避免打断长按关闭
        this.dragStartPoint = { x: e.clientX, y: e.clientY };
        this.dragOffset.x = e.clientX - this.position.x;
        this.dragOffset.y = e.clientY - this.position.y;
        this.didDrag = false;
        e.preventDefault();
    }
    
    /**
     * 拖拽移动
     */
    private handleDragMove(e: MouseEvent) {
        if (!this.dragStartPoint && !this.isDragging) return;

        if (!this.isDragging && this.dragStartPoint) {
            const deltaX = e.clientX - this.dragStartPoint.x;
            const deltaY = e.clientY - this.dragStartPoint.y;
            const moved = Math.sqrt(deltaX ** 2 + deltaY ** 2);
            if (moved < MiniPomodoroRing.DRAG_START_THRESHOLD) {
                return;
            }

            this.isDragging = true;
            this.didDrag = true;
            this.cancelLongPress();
            this.container.style.cursor = 'grabbing';
        }
        if (!this.isDragging) return;
        
        const newX = e.clientX - this.dragOffset.x;
        const newY = e.clientY - this.dragOffset.y;
        
        // 限制在可视范围内
        const maxX = window.innerWidth - this.RING_SIZE;
        const maxY = window.innerHeight - this.RING_SIZE;
        
        this.position.x = Math.max(0, Math.min(maxX, newX));
        this.position.y = Math.max(0, Math.min(maxY, newY));
        
        this.updatePosition();
    }
    
    /**
     * 拖拽结束
     */
    private handleDragEnd() {
        this.dragStartPoint = null;
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.container.style.cursor = 'pointer';
        this.savePosition();
    }
    
    /**
     * 点击处理
     */
    private handleClick(e: MouseEvent) {
        if (this.isDragging) return;
        if (this.didDrag) {
            this.didDrag = false;
            return;
        }
        if (this.longPressTriggered) {
            this.longPressTriggered = false;
            return;
        }
        
        e.stopPropagation();
        
        if (!this.isRunning) {
            if (!this.isWorkPhase) {
                this.startBreakPhase();
                return;
            }
            this.start();
        } else if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    private handlePressStart(e: PointerEvent) {
        if (e.pointerType === 'mouse' && e.button !== 0) {
            return;
        }

        this.cancelLongPress();
        this.longPressTriggered = false;
        this.pressStartPoint = { x: e.clientX, y: e.clientY };
        this.startHoldFeedback();
        this.longPressTimer = window.setTimeout(() => {
            this.longPressTimer = null;
            this.longPressTriggered = true;
            this.handleLongPressClose();
        }, MiniPomodoroRing.LONG_PRESS_DURATION);
    }

    private handlePressMove(e: PointerEvent) {
        if (!this.pressStartPoint || this.longPressTimer === null) {
            return;
        }

        const deltaX = e.clientX - this.pressStartPoint.x;
        const deltaY = e.clientY - this.pressStartPoint.y;
        const moved = Math.sqrt(deltaX ** 2 + deltaY ** 2);
        if (moved >= MiniPomodoroRing.LONG_PRESS_MOVE_THRESHOLD) {
            this.cancelLongPress();
        }
    }

    private handlePressEnd() {
        this.cancelLongPress();
    }

    private cancelLongPress() {
        this.stopHoldFeedback();
        if (this.longPressTimer !== null) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        if (this.holdNearCompleteTimer !== null) {
            clearTimeout(this.holdNearCompleteTimer);
            this.holdNearCompleteTimer = null;
        }
        this.pressStartPoint = null;
    }

    private handleLongPressClose() {
        this.reset();
        showMessage(i18n('pomodoroReset') || '番茄钟已重置');
    }

    private startHoldFeedback() {
        this.isHoldActive = true;
        this.container.classList.add('holding');
        this.container.classList.remove('holding-near-complete');
        this.holdProgressCircle.style.transition = 'none';
        const circumference = 2 * Math.PI * this.HOLD_RING_RADIUS;
        this.holdProgressCircle.setAttribute('stroke-dasharray', String(circumference));
        this.holdProgressCircle.setAttribute('stroke-dashoffset', String(circumference));
        this.holdProgressCircle.style.opacity = '1';
        this.updateStatusTooltip(this.getHoldStatusText());
        this.holdNearCompleteTimer = window.setTimeout(() => {
            if (!this.isHoldActive) {
                return;
            }
            this.container.classList.add('holding-near-complete');
        }, Math.floor(MiniPomodoroRing.LONG_PRESS_DURATION * 0.78));

        requestAnimationFrame(() => {
            if (!this.isHoldActive) {
                return;
            }
            this.holdProgressCircle.style.transition = `stroke-dashoffset ${MiniPomodoroRing.LONG_PRESS_DURATION}ms linear, opacity 0.2s ease`;
            this.holdProgressCircle.setAttribute('stroke-dashoffset', '0');
        });
    }

    private stopHoldFeedback() {
        if (!this.isHoldActive && this.holdProgressCircle) {
            this.holdProgressCircle.style.opacity = '0';
            return;
        }

        this.isHoldActive = false;
        this.container.classList.remove('holding');
        this.container.classList.remove('holding-near-complete');
        if (this.holdProgressCircle) {
            const circumference = 2 * Math.PI * this.HOLD_RING_RADIUS;
            this.holdProgressCircle.style.transition = 'none';
            this.holdProgressCircle.setAttribute('stroke-dasharray', String(circumference));
            this.holdProgressCircle.setAttribute('stroke-dashoffset', String(circumference));
            this.holdProgressCircle.style.opacity = '0';
        }

        if (this.currentStatusText) {
            this.updateStatusTooltip(`${this.currentStatusText} · ${i18n('pomodoroLongPressCloseHint') || '长按关闭'}`);
        }
    }

    private getHoldStatusText() {
        return i18n('pomodoroHoldingToClose') || '继续按住即可关闭';
    }
    
    /**
     * 右键菜单
     */
    private handleContextMenu(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        
        const menu = new Menu('miniPomodoroMenu');

        if (this.isRunning || this.isPaused) {
            menu.addItem({
                label: i18n('resetPomodoro') || '重置',
                click: () => this.reset()
            });
        }

        menu.addItem({
            label: i18n('pomodoroSettings') || '番茄设置',
            click: () => {
                this.plugin?.openSettingPanel?.();
            }
        });
        
        // 关闭
        menu.addItem({
            label: i18n('closePomodoro') || '关闭',
            click: () => this.destroy()
        });
    }
    
    /**
     * 开始番茄钟
     */
    public async start(taskTitle?: string, taskId?: string) {
        if (this.isRunning) return;
        await this.syncWithSettings();
        
        this.currentTaskTitle = taskTitle || this.currentTaskTitle || '专注工作';
        this.currentTaskId = taskId || this.currentTaskId || '';
        
        this.isRunning = true;
        this.isPaused = false;
        this.isWorkPhase = true;
        this.timeLeft = this.workDuration * 60;
        this.totalTime = this.timeLeft;

        if (!this.currentTaskId) {
            const focusEvent = await this.focusEventManager.createFocusEvent({
                title: this.currentTaskTitle,
                plannedDuration: this.workDuration,
                source: "miniPomodoro"
            });
            this.activeFocusEventId = focusEvent.id;
            window.dispatchEvent(new CustomEvent('reminderUpdated'));
        } else {
            this.activeFocusEventId = "";
        }
        
        this.startTimer();
        this.startPhaseMusic();
        this.updateDisplay();
        this.updateStatusText(i18n('pomodoroRunning') || '工作中...');
        this.progressCircle.setAttribute('stroke', '#FF6B6B');
        this.updateVisualState();
        
        showMessage(i18n('pomodoroStarted') || '番茄钟已开始');
    }
    
    /**
     * 暂停
     */
    public pause() {
        if (!this.isRunning || this.isPaused) return;
        
        this.isPaused = true;
        this.stopTimer();
        this.pausePhaseMusic();
        
        this.updateStatusText(i18n('pomodoroPaused') || '已暂停');
        this.updateVisualState();
        
        showMessage(i18n('pomodoroPaused') || '番茄钟已暂停');
    }
    
    /**
     * 恢复
     */
    public resume() {
        if (!this.isPaused) return;
        
        this.isPaused = false;
        this.isRunning = true;
        this.startTimer();
        this.resumePhaseMusic();
        
        this.updateStatusText(this.isWorkPhase ? (i18n('pomodoroRunning') || '工作中...') : (i18n('pomodoroBreak') || '休息中...'));
        this.updateVisualState();
        
        showMessage(i18n('pomodoroResumed') || '番茄钟已恢复');
    }

    private startBreakPhase() {
        this.isRunning = true;
        this.isPaused = false;
        this.timeLeft = this.breakDuration * 60;
        this.totalTime = this.timeLeft;

        this.startTimer();
        this.startPhaseMusic();
        this.progressCircle.setAttribute('stroke', '#4CAF50');
        this.updateDisplay();
        this.updateStatusText(i18n('pomodoroBreak') || '休息中...');
        this.updateVisualState();

        showMessage(i18n('pomodoroBreak') || '休息中...');
    }
    
    /**
     * 重置
     */
    public reset() {
        const focusEventId = this.activeFocusEventId;
        this.activeFocusEventId = "";
        if (focusEventId) {
            this.focusEventManager.cancelFocusEvent(focusEventId)
                .then(() => window.dispatchEvent(new CustomEvent('reminderUpdated')))
                .catch((error) => console.warn('取消迷你番茄专注事件失败:', error));
        }

        this.stopTimer();
        this.stopAllMusic();
        
        this.isRunning = false;
        this.isPaused = false;
        this.isWorkPhase = true;
        this.timeLeft = this.workDuration * 60;
        this.totalTime = this.timeLeft;
        
        this.progressCircle.setAttribute('stroke', '#FF6B6B');
        this.updateDisplay();
        this.updateStatusText(i18n('pomodoroClickToStart') || '点击开始');
        this.updateVisualState();
        
        showMessage(i18n('pomodoroReset') || '番茄钟已重置');
    }
    
    /**
     * 停止计时器
     */
    private stopTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }
    
    /**
     * 启动计时器
     */
    private startTimer() {
        this.stopTimer();
        
        this.timerId = window.setInterval(() => {
            this.tick();
        }, 1000);
    }
    
    /**
     * 计时tick
     */
    private tick() {
        if (this.isPaused) return;
        
        this.timeLeft--;
        this.updateDisplay();
        
        if (this.timeLeft <= 0) {
            this.completePhase();
        }
    }
    
    /**
     * 完成当前阶段
     */
    private async completePhase() {
        this.stopTimer();

        this.stopAllMusic();
        await this.playSound();

        if (this.isWorkPhase) {
            // 工作阶段完成
            this.completedPomodoros++;

            // 记录工作时间
            const workMinutes = this.totalTime / 60;
            let eventId = this.currentTaskId;
            if (!this.currentTaskId && this.activeFocusEventId) {
                eventId = this.activeFocusEventId;
                await this.focusEventManager.completeFocusEvent(this.activeFocusEventId, true);
                this.activeFocusEventId = "";
            }
            await this.recordManager.recordWorkSession(
                workMinutes,
                eventId,
                this.currentTaskTitle,
                this.workDuration,
                true
            );

            // 派发更新事件
            window.dispatchEvent(new CustomEvent('reminderUpdated'));

            showMessage(i18n('pomodoroWorkComplete') || '工作完成，休息一下！', 3000);

            // 开始休息
            this.isWorkPhase = false;
            this.timeLeft = this.breakDuration * 60;
            this.totalTime = this.timeLeft;
            this.progressCircle.setAttribute('stroke', '#4CAF50');
            this.updateStatusText(i18n('pomodoroBreak') || '休息中...');

            if (this.autoStartBreak) {
                this.isRunning = true;
                this.startTimer();
                this.startPhaseMusic();
            } else {
                this.isRunning = false;
                this.isPaused = false;
                this.updateStatusText(i18n('clickToStartBreak') || '点击开始休息');
            }
        } else {
            // 休息阶段完成
            // 记录休息时间
            const breakMinutes = this.totalTime / 60;
            await this.recordManager.recordBreakSession(
                breakMinutes,
                this.currentTaskId,
                '',
                this.breakDuration,
                false,
                true
            );

            showMessage(i18n('pomodoroBreakComplete') || '休息结束，继续工作！', 3000);

            // 重置为工作状态
            this.isWorkPhase = true;
            this.timeLeft = this.workDuration * 60;
            this.totalTime = this.timeLeft;
            this.isRunning = false;
            this.isPaused = false;
            this.progressCircle.setAttribute('stroke', '#FF6B6B');
            this.updateStatusText(i18n('pomodoroClickToStart') || '点击开始');
        }

        this.updateVisualState();
        this.updateDisplay();
    }
    
    /**
     * 更新显示
     */
    private updateDisplay() {
        // 更新时间显示
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 更新圆环进度
        const circumference = 2 * Math.PI * this.RING_RADIUS;
        const progress = this.totalTime > 0 ? this.timeLeft / this.totalTime : 0;
        const dashOffset = circumference * (1 - progress);
        this.progressCircle.setAttribute('stroke-dashoffset', String(dashOffset));
        
        // 运行时显示时间
        if (this.isRunning && !this.isPaused) {
            this.timeDisplay.style.opacity = '1';
        }
    }
    
    /**
     * 更新状态文本
     */
    private updateStatusText(text: string) {
        this.currentStatusText = text;
        this.updateStatusTooltip(this.buildAttributionTooltipText(text));
    }

    private buildAttributionTooltipText(text: string): string {
        const closeHint = i18n('pomodoroLongPressCloseHint') || '长按重置';
        const lines = [text];

        if (this.currentTaskTitle) {
            lines.push(`任务：${this.currentTaskTitle}`);
        }

        if (this.currentTaskProjectName) {
            lines.push(`项目：${this.currentTaskProjectName}`);
        }

        lines.push(closeHint);
        return lines.join('\n');
    }

    private updateStatusTooltip(text: string) {
        this.statusTooltip.textContent = text;
    }

    private updateVisualState() {
        const isBreakPhase = !this.isWorkPhase;
        this.container.classList.toggle('running', this.isRunning && !this.isPaused);
        this.container.classList.toggle('paused', this.isPaused);
        this.container.classList.toggle('break', isBreakPhase);

        const iconState = this.isRunning && !this.isPaused ? 'pause' : 'play';
        this.centerIcon.dataset.state = iconState;
        this.centerIcon.setAttribute('aria-label', iconState === 'pause'
            ? (i18n('pomodoroPauseAction') || '点击暂停，长按关闭')
            : (i18n('pomodoroResumeAction') || '点击开始或恢复，长按关闭'));
    }
    
    /**
     * 设置任务信息
     */
    public setTask(title: string, id: string) {
        this.currentTaskTitle = title;
        this.currentTaskId = id;
        this.currentTaskProjectName = '';

        if (this.plugin && id) {
            this.plugin.loadReminderData(true)
                .then((reminderData: any) => {
                    const reminder = reminderData?.[id];
                    const projectId = reminder?.projectId || '';
                    if (!projectId) return;

                    return this.plugin.loadProjectData(true).then((projectData: any) => {
                        this.currentTaskProjectName = projectData?.[projectId]?.name || '';
                        if (this.currentStatusText) {
                            this.updateStatusTooltip(this.buildAttributionTooltipText(this.currentStatusText));
                        }
                    });
                })
                .catch((error: unknown) => {
                    console.warn('解析迷你番茄归属失败:', error);
                });
        }
        
        if (!this.isRunning) {
            this.updateStatusText(`${title.substring(0, 10)}${title.length > 10 ? '...' : ''}`);
        }
    }

    public async showAndStart(taskTitle?: string, taskId?: string) {
        this.show();
        if (taskTitle && taskId) {
            this.setTask(taskTitle, taskId);
        }

        if (!this.isRunning && !this.isPaused) {
            await this.start(taskTitle, taskId);
            return;
        }

        if (this.isPaused) {
            this.resume();
        }
    }
    
    /**
     * 获取当前状态
     */
    public getState() {
        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            isWorkPhase: this.isWorkPhase,
            timeLeft: this.timeLeft,
            totalTime: this.totalTime,
            workDuration: this.workDuration,
            breakDuration: this.breakDuration,
            completedPomodoros: this.completedPomodoros,
            currentTaskTitle: this.currentTaskTitle,
            currentTaskId: this.currentTaskId
        };
    }
    
    /**
     * 从外部暂停
     */
    public pauseFromExternal() {
        this.pause();
    }
    
    /**
     * 从外部恢复
     */
    public resumeFromExternal() {
        this.resume();
    }
    
    /**
     * 检查是否活动
     */
    public isActive(): boolean {
        return this.isRunning;
    }
    
    /**
     * 销毁
     */
    public destroy() {
        this.stopTimer();
        this.cancelLongPress();
        this.stopAllMusic();

        // 释放音频资源
        if (this.workMusic) {
            this.workMusic.src = '';
            this.workMusic = null;
        }
        if (this.breakMusic) {
            this.breakMusic.src = '';
            this.breakMusic = null;
        }
        if (this.endSound) {
            this.endSound.src = '';
            this.endSound = null;
        }

        // 如果正在运行，记录未完成的会话
        if (this.isRunning && this.isWorkPhase) {
            const elapsedMinutes = Math.floor((this.totalTime - this.timeLeft) / 60);
            const focusEventId = !this.currentTaskId ? this.activeFocusEventId : "";
            if (elapsedMinutes > 0) {
                const eventId = this.currentTaskId || focusEventId;
                if (focusEventId) {
                    this.focusEventManager.completeFocusEvent(focusEventId, false)
                        .then(() => window.dispatchEvent(new CustomEvent('reminderUpdated')))
                        .catch(e => console.warn('补记未完成专注事件失败:', e));
                    this.activeFocusEventId = "";
                }
                this.recordManager.recordWorkSession(
                    elapsedMinutes,
                    eventId,
                    this.currentTaskTitle,
                    this.workDuration,
                    false
                ).catch(e => console.warn('记录未完成番茄钟失败:', e));
            } else if (focusEventId) {
                this.focusEventManager.cancelFocusEvent(focusEventId)
                    .then(() => window.dispatchEvent(new CustomEvent('reminderUpdated')))
                    .catch(e => console.warn('取消未完成专注事件失败:', e));
                this.activeFocusEventId = "";
            }
        }

        // 移除DOM
        if (this.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }

        // 移除事件监听
        window.removeEventListener('resize', this.boundResizeHandler);
        this.container.removeEventListener('click', this.boundClickHandler);
        this.container.removeEventListener('contextmenu', this.boundContextMenuHandler);
        this.container.removeEventListener('pointerdown', this.boundPressStartHandler);
        this.container.removeEventListener('mousedown', this.boundDragStartHandler);
        document.removeEventListener('pointermove', this.boundPressMoveHandler);
        document.removeEventListener('pointerup', this.boundPressEndHandler);
        document.removeEventListener('pointercancel', this.boundPressEndHandler);
        document.removeEventListener('mousemove', this.boundDragMoveHandler);
        document.removeEventListener('mouseup', this.boundDragEndHandler);

        if (this.plugin?.miniPomodoroRing === this) {
            this.plugin.miniPomodoroRing = null;
        }

        MiniPomodoroRing.instance = null;
    }
    
    /**
     * 显示（如果已隐藏）
     */
    public show() {
        if (!this.container.parentElement) {
            document.body.appendChild(this.container);
        }
        this.container.style.display = 'block';
    }
    
    /**
     * 隐藏
     */
    public hide() {
        this.container.style.display = 'none';
    }
    
    /**
     * 检查是否可见
     */
    public isVisible(): boolean {
        return this.container.style.display !== 'none' && this.container.parentElement !== null;
    }
}
