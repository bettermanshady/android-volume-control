/**
 * 广告服务层 - 芒果联盟聚合广告
 *
 * 当前使用 WebView 方式嵌入广告（Expo 兼容方案）
 * 后续可替换为原生 SDK（需 EAS Build + Config Plugin）
 *
 * 替换正式 ID 时，只需修改下方 BANNER_AD_UNIT_ID 即可
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// 广告位配置（测试 ID，后续替换为正式 ID）
// ============================================================
export const AD_CONFIG = {
  /** 横幅广告位 ID（芒果联盟） */
  BANNER_AD_UNIT_ID: 'test_banner_mango_001',
  /** 广告平台标识 */
  PLATFORM: 'mango',
  /** 广告刷新间隔（毫秒），0 表示不自动刷新 */
  REFRESH_INTERVAL: 30000,
};

// ============================================================
// 隐私合规 - 用户同意状态管理
// ============================================================
const PRIVACY_CONSENT_KEY = 'privacy_consent_accepted';

export async function hasPrivacyConsent(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(PRIVACY_CONSENT_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setPrivacyConsent(accepted: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(PRIVACY_CONSENT_KEY, accepted ? 'true' : 'false');
  } catch {
    // Storage error
  }
}

// ============================================================
// 广告 HTML 内容生成（WebView 渲染用）
// ============================================================

/**
 * 生成横幅广告的 HTML 内容
 * 测试阶段显示占位广告（灰色背景 + "广告位"文字），正式阶段替换为芒果联盟 JS SDK 调用
 */
export function generateBannerAdHtml(adUnitId: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #E8EAED;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .ad-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .ad-badge {
      position: absolute;
      top: 4px;
      right: 8px;
      font-size: 10px;
      color: #9AA0A6;
      background: rgba(0,0,0,0.06);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .ad-text {
      font-size: 14px;
      font-weight: 500;
      color: #9AA0A6;
      letter-spacing: 2px;
    }
  </style>
</head>
<body>
  <div class="ad-container">
    <span class="ad-badge">广告</span>
    <span class="ad-text">广告位</span>
  </div>
  <script>
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'adLoaded', adUnitId: '${adUnitId}' })
    );
  </script>
</body>
</html>
  `.trim();
}

/**
 * 生成芒果联盟正式广告 HTML（替换测试 ID 后使用）
 * 需要芒果联盟提供的 JS SDK 地址和广告位配置
 */
export function generateMangoSDKHtml(adUnitId: string): string {
  // 后续替换为芒果联盟正式 SDK 接入代码
  // 示例结构：
  // return `
  //   <script src="https://xxx.mangoad.com/sdk.js"></script>
  //   <script>
  //     MangoAd.init({ appId: 'YOUR_APP_ID' });
  //     MangoAd.showBanner({ adUnitId: '${adUnitId}', container: '#ad-container' });
  //   </script>
  // `;
  return generateBannerAdHtml(adUnitId);
}
