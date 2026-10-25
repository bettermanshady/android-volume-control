# 智控音量 (Android Volume Control)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> A lightweight open-source Android volume preset tool built with React Native / Expo. Save and apply system media volume presets, plus a notification-bar volume control. No data collection — everything stays on your device.

一个轻量、开源的 Android 系统媒体音量控制工具，用于快速保存和应用音量预设，并在通知栏提供便捷的 ± 音量控件。数据完全保存在本地，不收集任何个人信息。

## 功能特性

- **预设音量**：内置「安静 / 正常 / 响亮」三档预设，一键应用到系统媒体音量。
- **自定义预设**：自由新增、编辑、删除属于自己的音量预设（百分比）。
- **按档位加减**：滑块与按钮按本机媒体音量的**真实档位**步进，杜绝“百分比映射不稳定”。
- **深色模式**：支持浅色 / 深色 / 跟随系统，一键切换。
- **通知栏控件**：在通知栏常驻音量调节卡片，可快速 ± 调整媒体音量。
- **测试提示音**：应用预设时可播放提示音试听实际音量大小。
- **可选广告**：默认关闭，通过统一开关开启（见下文「广告」）。

## 技术栈

- **React Native / Expo 54**（Expo Router、expo-av、react-native-volume-manager 等）
- **Android 原生（Kotlin）**：自建原生模块 `VolumeControl` 与通知栏控件 `VolumeNotification`
- **本地存储**：AsyncStorage（音量预设、主题、开关状态）

## 目录结构

```text
client/
├── app/                    # Expo Router 路由配置
├── screens/volume-presets/ # 主页面（音量预设 + 滑块 + 通知栏联动）
├── screens/settings/       # 设置页（主题、通知开关、隐私）
├── screens/privacy/        # 隐私政策页
├── components/             # 复用组件（Screen / AdBanner / PrivacyConsentModal 等）
├── config/features.ts      # 全局功能开关（含广告开关）
├── utils/
│   ├── volumeEngine.ts     # 统一音量引擎（百分比⇄档位换算、写后回读）
│   ├── volumeNotification.ts # 通知栏控件 JS 桥接
│   └── adService.ts        # 广告服务层（WebView 方案）
├── contexts/               # React Context（主题 / 通知）
└── android/                # 原生 Android 工程（Kotlin 模块）
```

## 音量档位说明

系统媒体音量是**整数档位**（不是连续的 0-100）。本应用以系统实际档位为唯一基准：

- 百分比到档位使用**四舍五入**换算：`index = round(percent / 100 * max)`。
- 每次设置后都会**回读系统档位**并反算百分比，保证界面显示的数字永远等于真实档位。
- 不同设备的档位数不同（通常 15 档），因此**每档对应的百分比也因设备而异**，无法做到精确 1% 的连续调节。
- 主界面会显示“本机媒体音量共 N 档，每档约 X%”，帮助理解这一系统限制。

## 已知限制

- 系统媒体音量是整数档位，**无法做到 1% 连续调节**，每档跨度由设备决定。
- 仅支持 Android：通知栏控件与音量档位模块为 Android 原生实现，iOS 未适配。
- 通知栏常驻控件需要 Android 13+ 的通知权限。

## 本地运行与构建

```bash
# 1. 安装 pnpm（若未安装）
npm install -g pnpm

# 2. 安装依赖（仓库根目录，monorepo）
pnpm install

# 3. 启动客户端（Expo）
cd client && npx expo start

# 4. 构建 Android APK
cd client
npm install -g eas-cli
eas login
eas build -p android
```

> 通知栏控件与音量档位控制是原生 Kotlin 实现（`VolumeControl` / `VolumeNotification`），必须在 development build 或正式 APK 中运行，Expo Go 里无法使用。

## 配置

### 广告（默认关闭）

广告功能通过统一开关控制，默认**关闭**。

- 关闭状态下：**不初始化广告 SDK、不请求广告接口、不渲染任何广告位**，广告代码与依赖完整保留但不会执行。
- 开启方式：编辑 `client/config/features.ts`，将

```ts
export const ADS_ENABLED = false;
```

改为

```ts
export const ADS_ENABLED = true;
```

之后在 `client/utils/adService.ts` 中把测试广告位 ID 替换为你的正式广告位 ID，并（如需真实广告）将占位 HTML 替换为对应广告平台的 SDK 接入即可。

> 当前广告实现为 WebView 占位方案，未内联任何真实广告 SDK；仅作展示位预留。

### 纠错与二次分发

本项目以 MIT 协议开源，可自由 fork、修改、再分发。请保留 LICENSE 中的版权信息。

## 隐私说明

- 本应用**不收集、不存储、不上传任何个人信息**。
- 所有数据（音量预设、主题、开关状态）仅保存在**设备本地**（AsyncStorage），卸载即清除。
- 广告功能**默认关闭**；即便开启，涉及的也仅为广告 SDK 网络请求，与你的个人数据无关，且你可以随时在配置中关闭。

## 贡献

欢迎提 Issue 和 PR。提交前请确保：不引入真实广告位 ID / 密钥 / 签名文件；改动原生模块时在真机上验证。

## 许可证

本项目基于 [MIT License](./LICENSE) 开源。

Copyright (c) 2026 mxshady

## 免责声明

- 本软件按“现状”提供，作者不对适销性、特定用途适用性及任何直接 / 间接损失承担任何责任。
- 不同 Android 设备与系统的媒体音量行为可能存在差异，效果以实际设备为准。
- 本项目与任何广告平台、操作系统厂商均无关联，也不对任何第三方服务负责。