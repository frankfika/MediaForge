# UI Style Guide

参照:Vercel AI Chatbot 的克制、JetBrains New UI 的信息密度与秩序、Linear 的精确、Arc 的柔和。

## 原则

1. **内容即界面**:没有装饰性元素。每个像素要么是内容,要么是控制。
2. **一个主角**:每屏只有一个主操作(深色实心按钮);其余用 outline/ghost。
3. **AI 工作可见**:等待必有状态行("正在抓取…"),工具结果是一等组件,不是纯文本。
4. **零配置感**:不暴露 temperature、模型名等旋钮。风格选择器是唯一全局设置。
5. **快**:交互反馈 <100ms;动画 150–200ms,仅表达因果(出现/移动),不炫技。

## Tokens(`app/globals.css`)

| Token    | Light               | Dark                | 用途                   |
| -------- | ------------------- | ------------------- | ---------------------- |
| `bg`     | oklch(.99 0 0)      | oklch(.16 .005 260) | 页面                   |
| `card`   | oklch(1 0 0)        | oklch(.20 .006 260) | 卡片/输入              |
| `fg`     | oklch(.20 .005 260) | oklch(.96 0 0)      | 正文/主按钮底          |
| `muted`  | oklch(.55 .01 260)  | oklch(.68 .01 260)  | 次要文字               |
| `line`   | oklch(.92 .003 260) | oklch(.28 .008 260) | 边框/hover 底          |
| `accent` | oklch(.58 .2 268)   | oklch(.72 .15 268)  | 焦点环、链接、输入聚焦 |

- OKLCH:亮度可预测,明暗模式只改 L/C。**只有一个强调色**,且极少使用。
- 暗色跟随系统(`prefers-color-scheme`)。
- 圆角:卡片 14px(`--radius-card`),按钮 8px,输入框 12px,聊天输入 16px,Chip 全圆。
- 阴影:仅聊天输入框 `shadow-sm`;其余靠 1px `line` 边框分层。

## 排版

系统字体栈(含 PingFang SC / Noto Sans SC),零字体加载成本。
标题 `text-2xl/3xl font-semibold tracking-tight`;正文 `text-sm leading-relaxed`;元信息 `text-xs text-muted`。

## 布局

单列居中 `max-w-3xl`;顶栏 48px,毛玻璃 `bg-bg/80 backdrop-blur`;对话输入框吸底、渐变遮罩;移动端同构。

## 组件约定(shadcn 风格)

`cva` 定义变体 + `cn` 合并类名;组件无业务逻辑。按钮三变体:`primary`(深色实心)/`outline`/`ghost`;尺寸 `sm`(32)/`md`(36)/`icon`(36)。按下 `scale-[0.98]`。

## 微交互

- 消息/卡片出现:`opacity 0→1, y 6→0`
- 复制:图标切 ✓ + 文案"已复制",1.5s 复位
- 加载:小号 `Loader2` 旋转 + 一行动作描述
- `prefers-reduced-motion`:全局禁用动画

## 无障碍

焦点环 2px accent;图标按钮必带 `aria-label`;Chip 用 `aria-pressed`;对比度 ≥ 4.5:1(muted 用于次要信息,非关键操作);IME 组字不触发提交。

## Don't

渐变背景、插画、多强调色、模态弹窗确认(用行内撤销)、toast 刷屏、把 AI 结果塞进纯文本气泡。
