export const SETTINGS_FILE = "reminder-settings.json";
export const PROJECT_DATA_FILE = "project.json";
export const CATEGORIES_DATA_FILE = "categories.json";
export const REMINDER_DATA_FILE = "reminder.json";
export const NOTIFY_DATA_FILE = "notify.json";
export const POMODORO_RECORD_DATA_FILE = "pomodoro_record.json";
export const STATUSES_DATA_FILE = "statuses.json";
export const HOLIDAY_DATA_FILE = "holiday.json";

export interface AudioFileItem {
    path: string;
    removed?: boolean;
    replaces?: string; // 记录此项替换了哪个原始路径（用于保持排序）
}

// 默认设置
export const DEFAULT_SETTINGS = {
    // 任务笔记设置
    autoDetectDateTime: false, // 新增：是否自动识别日期时间
    removeDateAfterDetection: 'all', // 从bool改为option：'none' | 'date' | 'all'
    newDocNotebook: '', // 新增：新建文档的笔记本ID
    newDocPath: '/{{now | date "2006/200601"}}/', // 新增：新建文档的路径模板，支持sprig语法
    groupDefaultHeadingLevel: 1, // 新增：新建标题分组的默认层级（1-6），默认为1级标题
    milestoneDefaultHeadingLevel: 2, // 新增：新建标题里程碑的默认层级（1-6），默认为2级标题
    defaultHeadingLevel: 3, // 新增：新建标题的默认层级（1-6），默认为3级标题
    defaultHeadingPosition: 'prepend', // 新增：新建标题的默认位置（'prepend' | 'append'），默认为最前
    enableOutlinePrefix: true, // 是否在大纲中为绑定标题添加任务状态前缀

    // 控制侧边栏显示
    showAdvancedFeatures: false, // 是否显示高级功能入口（四象限/习惯侧栏/高级设置分组）
    enableReminderDock: true, // 侧边栏：提醒（任务管理）
    enableProjectDock: true, // 侧边栏：项目管理
    enableCalendarDock: true, // 侧边栏：日历视图
    // 停靠栏徽章显示控制
    enableDockBadge: true, // 是否在停靠栏显示数字徽章
    // 单独控制每个侧栏是否显示徽章（优先级高于 enableDockBadge）
    enableReminderDockBadge: true,
    enableProjectDockBadge: true,

    // 日历配置
    calendarAutoOpen: true, // 新增：是否默认打开日历视图
    calendarShowCategoryAndProject: true, // 新增：是否显示分类图标和项目信息
    calendarColorBy: 'priority',
    calendarViewMode: 'timeGridWeek',
    dayStartTime: '08:00', // 日历视图一天的起始时间
    todayStartTime: '03:00', // 日常任务/习惯的一天起始时间
    calendarShowLunar: (window as any).siyuan?.config?.lang === 'zh_CN' ? true : false, // 日历显示农历
    calendarShowHoliday: true, // 是否显示节假日
    calendarShowPomodoro: true, // 是否显示番茄专注时间
    calendarHolidayIcsUrl: 'https://www.shuyz.com/githubfiles/china-holiday-calender/master/holidayCal.ics?token=cb429c2a-81a6-4c26-8f35-4f4bf0c84b2c&compStart=*&compEnd=*', // 节假日ICS URL
    calendarMultiDaysCount: 3, // 多天视图默认显示天数
    weekStartDay: 1, // 新增：周视图的一周开始日 (0=周日, 1=周一，默认周一)
    // 日历摘要设置
    showPomodoroInSummary: true,
    // 任务管理侧栏排序配置
    sortMethod: "priority",
    sortOrder: "desc",
    // 四象限设置
    eisenhowerImportanceThreshold: 'medium',
    eisenhowerUrgencyDays: 3,
    // 项目排序配置
    projectSortOrder: [],
    projectSortMode: 'custom',
    // 项目面板筛选与排序
    projectPanelSort: 'priority',
    projectPanelSortOrder: 'desc',
    projectPanelShowOnlyDoing: false,
    projectPanelSelectedCategories: [] as string[],
    reminderPanelSelectedCategories: [] as string[],
    // 日历上传：ICS云端同步配置
    icsSyncInterval: 'daily', // 'manual' | '15min' | 'hourly' | '4hour' | '12hour' | 'daily' | 'dailyAt'
    icsDailySyncTime: '08:00', // 每天同步时间点（当 syncInterval 为 'dailyAt' 时使用），格式 HH:MM
    icsCloudUrl: '',
    icsLastSyncAt: '', // 上一次上传时间
    icsSyncEnabled: false, // 是否启用ICS云端同步
    icsFileName: '', // ICS文件名，默认为空时自动生成
    icsSilentUpload: false, // 是否静默上传ICS文件，不显示成功提示
    icsTaskFilter: 'all', // 'all' | 'completed' | 'uncompleted' - 任务筛选
    // ICS 同步方式配置
    icsSyncMethod: 'siyuan', // 'siyuan' | 's3' | 'webdav' - 同步方式
    // WebDAV 配置
    webdavUrl: '',
    webdavUsername: '',
    webdavPassword: '',
    // S3 配置
    s3UseSiyuanConfig: false, // 是否使用思源的S3配置
    s3Bucket: '',
    s3Endpoint: '',
    s3Region: 'auto', // S3 区域，默认为 auto
    s3AccessKeyId: '',
    s3AccessKeySecret: '',
    s3StoragePath: '/calendar/', // S3存储路径，例如: /calendar/
    s3ForcePathStyle: false, // S3 Addressing风格，true为Path-style，false为Virtual hosted style（默认）
    s3TlsVerify: true, // S3 TLS证书验证，true为启用验证（默认），false为禁用验证
    s3CustomDomain: '', // S3 自定义域名，用于生成外链
    calendarDefaultNotebookId: '', // 日历默认笔记本ID
    settingsVersion: 2, // 设置结构版本（用于迁移）
    // 数据迁移标记
    datatransfer: {
        bindblockAddAttr: false, // 是否已迁移绑定块的 custom-bind-reminders 属性
        termTypeTransfer: false, // 是否已迁移 termType -> kanbanStatus 的转换
        audioFileTransfer: false, // 是否已迁移音频文件列表
    },


    // 番茄钟
    dailyFocusGoal: 6,
    workVolume: 0.5,
    breakVolume: 0.5,
    longBreakVolume: 0.5,
    workEndVolume: 0.5,
    breakEndVolume: 0.5,
    randomRestVolume: 0.5,
    randomRestEndVolume: 0.5,
    pomodoroWorkDuration: 45,
    pomodoroDurationPresets: [5, 10, 15, 25],
    pomodoroBreakDuration: 10,
    pomodoroLongBreakDuration: 30,
    pomodoroLongBreakInterval: 4,
    pomodoroAutoMode: false,
    pomodoroSystemNotification: true, // 新增：番茄结束后系统弹窗
    pomodoroEndPopupWindow: true, // 新增：番茄钟结束弹窗提醒，默认关闭
    pomodoroDockPosition: 'top', // 新增：番茄钟吸附位置 'right' | 'left' | 'top'
    reminderSystemNotification: true, // 新增：事件到期提醒系统弹窗
    showInternalNotification: false, // 新增：是否显示内部通知框
    dailyNotificationTime: '08:00', // 新增：每日通知时间，默认08:00
    dailyNotificationEnabled: false, // 新增：是否启用每日统一通知
    randomRestEnabled: false,
    randomRestMinInterval: 3,
    randomRestMaxInterval: 5,
    randomRestBreakDuration: 10,
    randomRestSystemNotification: true, // 新增：随机微休息系统通知
    randomRestPopupWindow: true, // 新增：随机微休息弹窗提醒，默认关闭
    // 每个声音设置项各自的音频文件列表 { settingKey: [{path: url, removed: false}, ...] }
    audioFileLists: {
        notificationSound: [{ path: '/plugins/siyuan-plugin-task-daily/audios/notify.mp3' }],
        pomodoroWorkSound: [
            { path: '/plugins/siyuan-plugin-task-daily/audios/background_music.mp3' },
            { path: 'https://cdn.jsdelivr.net/gh/remvze/moodist@main/public/sounds/nature/campfire.mp3' },
            { path: 'https://cdn.jsdelivr.net/gh/remvze/moodist@main/public/sounds/nature/river.mp3' },
            { path: 'https://cdn.jsdelivr.net/gh/remvze/moodist@main/public/sounds/animals/crickets.mp3' },
            { path: 'https://cdn.jsdelivr.net/gh/remvze/moodist@main/public/sounds/animals/birds.mp3' },
            { path: 'https://cdn.jsdelivr.net/gh/remvze/moodist@main/public/sounds/places/library.mp3' },
            { path: 'https://cdn.jsdelivr.net/gh/remvze/moodist@main/public/sounds/places/office.mp3' }

        ],
        pomodoroBreakSound: [
            { path: '/plugins/siyuan-plugin-task-daily/audios/relax_background.mp3' },
            { path: 'https://cdn.jsdelivr.net/gh/remvze/moodist@main/public/sounds/nature/droplets.mp3' }
        ],
        pomodoroLongBreakSound: [
            { path: '/plugins/siyuan-plugin-task-daily/audios/relax_background.mp3' },
            { path: 'https://cdn.jsdelivr.net/gh/remvze/moodist@main/public/sounds/nature/droplets.mp3' }
        ],
        pomodoroWorkEndSound: [{ path: '/plugins/siyuan-plugin-task-daily/audios/work_end.mp3' }],
        pomodoroBreakEndSound: [{ path: '/plugins/siyuan-plugin-task-daily/audios/end_music.mp3' }],
        randomRestSounds: [{ path: '/plugins/siyuan-plugin-task-daily/audios/random_start.mp3' }],
        randomRestEndSound: [{ path: '/plugins/siyuan-plugin-task-daily/audios/random_end.mp3' }],
    } as Record<string, AudioFileItem[]>,
    // 每个声音设置项当前的选中项 { settingKey: url }
    audioSelected: {
        notificationSound: '/plugins/siyuan-plugin-task-daily/audios/notify.mp3',
        pomodoroWorkSound: '/plugins/siyuan-plugin-task-daily/audios/background_music.mp3',
        pomodoroBreakSound: '/plugins/siyuan-plugin-task-daily/audios/relax_background.mp3',
        pomodoroLongBreakSound: '/plugins/siyuan-plugin-task-daily/audios/relax_background.mp3',
        pomodoroWorkEndSound: '/plugins/siyuan-plugin-task-daily/audios/work_end.mp3',
        pomodoroBreakEndSound: '/plugins/siyuan-plugin-task-daily/audios/end_music.mp3',
        randomRestSounds: '/plugins/siyuan-plugin-task-daily/audios/random_start.mp3',
        randomRestEndSound: '/plugins/siyuan-plugin-task-daily/audios/random_end.mp3',
    } as Record<string, string>,
};
