# Elegant Clock

Elegant Clock 是一个面向 Windows 与 Linux 的透明桌面时钟软件，提供日期显示、倒计时、正计时、番茄钟和日历式提醒功能。

## 功能

- 透明/不透明显示切换
- 当前时间与日期显示
- 按小时/分钟/秒设置倒计时
- 倒计时到指定日期时间
- 正计时/秒表：开始、暂停、重置
- 番茄钟：专注、短休息、长休息与长休间隔配置
- 提醒：按指定日期时间添加提醒，支持标题、备注、本地保存和系统通知
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

Linux 目标产物：`.deb`、`.rpm`、`.pkg.tar.zst`。GitHub Actions 还会把 `.deb` 复制为 `.dpkg` 资产别名。

每个 Release 会额外上传 `SHA256SUMS.txt`，用于校验所有安装包资产。

## 发布安装包

推送版本标签即可触发 GitHub Actions 构建并上传 Release Assets：

```bash
git tag v0.2.0
git push origin v0.2.0
```

也可以在 GitHub Actions 页面手动运行 `Release Installers`，输入目标标签。

## 规划

详见 `docs/PLAN.md`。

## 许可证

本项目使用 GPL-3.0-only 许可证，详见 `LICENSE`。
