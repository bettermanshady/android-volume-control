import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { AD_CONFIG, generateBannerAdHtml } from '@/utils/adService';
import { useAppTheme } from '@/contexts/ThemeContext';

interface AdBannerProps {
  /** 广告位 ID，默认使用配置中的测试 ID */
  adUnitId?: string;
  /** 广告高度，默认 60 */
  height?: number;
  /** 是否显示，默认 true */
  visible?: boolean;
  /** 广告加载成功回调 */
  onAdLoad?: () => void;
  /** 广告加载失败回调 */
  onAdError?: (error: string) => void;
}

/**
 * 广告横幅组件 - WebView 实现
 * 
 * 特性：
 * - 使用 WebView 嵌入广告（Expo 兼容）
 * - 加载失败时优雅降级，显示占位符
 * - 支持广告刷新
 * - 不影响 App 核心功能
 */
export default function AdBanner({
  adUnitId = AD_CONFIG.BANNER_AD_UNIT_ID,
  height = 60,
  visible = true,
  onAdLoad,
  onAdError,
}: AdBannerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const webViewRef = useRef<any>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  // 广告加载成功回调
  const handleAdLoaded = () => {
    setLoading(false);
    setError(false);
    onAdLoad?.();
  };

  // 广告加载失败回调
  const handleAdError = () => {
    setLoading(false);
    setError(true);
    onAdError?.('WebView load error');
  };

  // WebView 消息处理
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'adLoaded') {
        handleAdLoaded();
      }
    } catch {
      // Parse error
    }
  };

  // 自动刷新广告
  useEffect(() => {
    if (AD_CONFIG.REFRESH_INTERVAL > 0 && visible && !error) {
      refreshTimerRef.current = setInterval(() => {
        if (webViewRef.current) {
          webViewRef.current.reload();
          setLoading(true);
        }
      }, AD_CONFIG.REFRESH_INTERVAL);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [visible, error]);

  // 不显示时返回 null
  if (!visible) {
    return null;
  }

  // 加载失败时显示降级占位符
  if (error) {
    return (
      <View style={[styles.container, { height }, styles.fallbackContainer]}>
        <Text style={styles.fallbackText}>广告加载失败</Text>
      </View>
    );
  }

  const htmlContent = generateBannerAdHtml(adUnitId);

  return (
    <View style={[styles.container, { height }]}>
      {/* 加载指示器 */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.textMuted} />
        </View>
      )}

      {/* WebView 广告 */}
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webView}
        onMessage={handleMessage}
        onError={handleAdError}
        javaScriptEnabled={true}
        domStorageEnabled={false}
        thirdPartyCookiesEnabled={false}
        allowsInlineMediaPlayback={false}
        mediaPlaybackRequiresUserAction={true}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        // 禁用用户交互
        pointerEvents="none"
      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    container: {
      width: '100%',
      backgroundColor: colors.adBg,
      borderTopWidth: 1,
      borderTopColor: colors.adBorder,
      overflow: 'hidden',
    },
    webView: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.adBg,
      zIndex: 1,
    },
    fallbackContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackText: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: '500',
    },
  });
