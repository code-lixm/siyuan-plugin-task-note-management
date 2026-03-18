# 分类标签背景添加透明度修复

## 需求描述
用户反馈分类标签颜色太深，需要将背景颜色添加 50% 透明度（即 0.5 alpha 值），使颜色变浅。

## 当前状态
- `categoryManager.ts` 中的 `getCategoryLabelStyle()` 函数使用 `hsl()` 生成背景色
- 需要将 `hsl()` 改为 `hsla()` 并添加 `0.5` 透明度

## 修改文件
- `src/utils/categoryManager.ts`

## 修改内容
将 `getCategoryLabelStyle` 方法中的：
1. `backgroundColor: 'hsl(210, 10%, 85%)'` → `backgroundColor: 'hsla(210, 10%, 85%, 0.5)'`
2. `borderColor: 'hsl(210, 10%, 70%)'` → `borderColor: 'hsla(210, 10%, 70%, 0.5)'`
3. 模板字符串 `hsl(${hue}, ${saturation}%, ${lightness}%)` → `hsla(${hue}, ${saturation}%, ${lightness}%, 0.5)`
4. 模板字符串 `hsl(${hue}, ${saturation}%, ${borderLightness}%)` → `hsla(${hue}, ${saturation}%, ${borderLightness}%, 0.5)`

## 验收标准
- [x] `getCategoryLabelStyle` 方法返回的颜色包含 0.5 透明度
- [x] 构建通过
- [x] 分类标签显示为半透明浅色背景
