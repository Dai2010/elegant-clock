# Elegant Clock 开发规划

## 产品目标

Elegant Clock 是面向 Windows 与 Linux 的桌面时钟软件，重点是轻量、美观、可透明显示，并提供日常计时工具。

## 核心功能

- 当前时间：大字号显示系统本地时间，包含秒。
- 日期显示：显示星期、年月日。
- 透明显示：用户可切换透明/不透明窗口效果。
- 倒计时：支持按小时/分钟/秒设置，也支持倒计时到指定日期时间。
- 正计时：提供开始、暂停、重置的秒表功能。
- 窗口体验：无边框窗口、最小化、关闭、最大化/还原、可选置顶。

## 技术路线

- 桌面框架：Electron，覆盖 Windows 与主流 Linux 桌面环境。
- 前端实现：原生 HTML/CSS/JavaScript，降低依赖复杂度。
- 本地设置：使用 `localStorage` 保存透明显示和置顶偏好。
- 安全边界：开启 `contextIsolation`，通过 `preload` 暴露最小 IPC API。
- 构建工具：`electron-builder` 生成 Windows 与 Linux 安装包。

## 打包交付

- Windows：`.exe` NSIS 安装器、`.msi` 安装器。
- Linux：`.deb` Debian 安装包、`.dpkg` Debian 包别名、`.rpm` RPM 安装包、`.pkg.tar.zst` Arch Linux pacman 安装包。
- 发布方式：推送 `v*` 标签或手动运行 GitHub Actions 后，自动上传到 GitHub Release Assets。

## 里程碑

1. v0.1.0：实现基础时钟、日期、透明切换、倒计时、正计时与 Release 打包。
2. v0.2.0：增加主题色、字体大小、窗口大小位置记忆。
3. v0.3.0：增加铃声提醒、多倒计时预设、托盘菜单。
4. v1.0.0：完善跨平台测试、签名、自动更新与稳定文档。

## 风险与限制

- Linux 透明窗口效果依赖桌面环境与合成器，部分发行版可能显示为半透明或不透明。
- Windows 安装包未配置代码签名时，系统可能提示未知发布者。
- `.dpkg` 不是 Debian 官方常用扩展名，本项目会额外复制一份 `.deb` 内容作为 `.dpkg` 资产以满足发布资产命名需求。
- Arch Linux 用户可使用 `sudo pacman -U Elegant-Clock-*-Arch-x64.pkg.tar.zst` 安装 Release 中的 pacman 包。
