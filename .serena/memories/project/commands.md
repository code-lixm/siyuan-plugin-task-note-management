# 项目命令

## 开发命令
```bash
# 开发模式（自动复制到SiYuan插件目录）
npm run dev

# 生产构建
npm run build

# 构建+安装到SiYuan
npm run make-install

# 创建开发软链接到SiYuan
npm run make-link

# Windows创建软链接
npm run make-link-win

# 更新版本
npm run update-version
```

## 项目结构
```
src/
├── index.ts           # 插件入口 (~5400行)
├── api.ts             # SiYuan API封装
├── components/        # UI组件
├── utils/             # 工具和管理器
├── libs/              # 共享库
├── types/             # TypeScript类型
└── styles/            # SCSS样式

i18n/                  # 本地化
├── en_US.json
└── zh_CN.json
```

## 重要注意事项
- **不要在代码中使用 localStorage**
- **不要直接修改 custom-* 属性** - 使用SiYuan API方法
- **代码必须保持单文件bundle** - inlineDynamicImports: true
- **所有用户界面字符串需要双语支持**