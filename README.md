# Elegant Clock

Elegant Clock 是一个面向 Windows 与 Linux 的可自定义桌面时钟软件，提供日期显示、透明显示、倒计时、正计时、番茄钟和日历式提醒功能。

## 功能

- 默认只显示时钟，其他设置和工具可按需展开
- 透明/不透明显示切换，可调整透明度
- 字体、时钟字号、字体颜色与背景颜色自定义
- 当前时间与日期显示
- 按小时/分钟/秒设置倒计时
- 倒计时到指定日期时间
- 正计时/秒表：开始、暂停、重置
- 番茄钟：专注、短休息、长休息与长休间隔配置
- 提醒：按指定日期时间添加提醒，支持标题、备注、本地保存和系统通知
- 铃声：默认内置 `ringtone_default.mp3`，也可自行选择本地音频作为闹钟铃声
- 无边框窗口：最小化、最大化/还原、关闭、可选置顶

## 开发运行

```bash
npm install
npm start
```

## 本地打包

```bash
npm run dist:win
npm run dist:linux
npm run package:arch
```

Windows 目标产物：`.exe`、`.msi`。

Linux 目标产物：`.deb`、`.dpkg`、`.rpm`、`.pkg.tar.zst`。

每个 Release 会额外上传 `SHA256SUMS.txt`，用于校验所有安装包资产。

## 规划

详见 `docs/PLAN.md`。

## 许可证

本项目使用 GPL-3.0-only 许可证，详见 `LICENSE`。
