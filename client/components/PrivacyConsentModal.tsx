import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, ScrollView, Platform } from 'react-native';
import { hasPrivacyConsent, setPrivacyConsent } from '@/utils/adService';

interface PrivacyConsentModalProps {
  /** 用户同意后回调 */
  onAccepted: () => void;
  /** 隐私政策页面路径 */
  privacyPolicyPath?: string;
}

/**
 * 隐私合规确认弹窗
 * 
 * 首次启动时展示，用户必须同意隐私政策才能继续使用 App
 * 符合国内应用商店上架要求
 */
export default function PrivacyConsentModal({
  onAccepted,
  privacyPolicyPath = '/privacy',
}: PrivacyConsentModalProps) {
  const [visible, setVisible] = useState(false);

  // 检查是否已同意隐私政策
  useEffect(() => {
    const checkConsent = async () => {
      const accepted = await hasPrivacyConsent();
      if (!accepted) {
        setVisible(true);
      }
    };
    checkConsent();
  }, []);

  // 用户同意
  const handleAccept = async () => {
    await setPrivacyConsent(true);
    setVisible(false);
    onAccepted();
  };

  // 用户拒绝（退出 App 或限制功能）
  const handleDecline = () => {
    // 国内应用商店要求：用户拒绝后可选择退出 App
    // 这里简化处理，直接退出
    if (Platform.OS === 'android') {
      // @ts-ignore
      if (typeof BackHandler !== 'undefined') {
        // @ts-ignore
        BackHandler.exitApp();
      }
    }
  };

  // 查看隐私政策
  const handleViewPolicy = () => {
    // 这里可以导航到隐私政策页面
    // 简化处理，暂时不实现导航
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>隐私政策提示</Text>
          
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.text}>
              欢迎使用智控音量！我们非常重视您的隐私保护。
            </Text>
            <Text style={styles.text}>
              在您开始使用本应用之前，请您仔细阅读并充分理解
              <Text style={styles.link} onPress={handleViewPolicy}>
                {'《隐私政策》'}
              </Text>
              。
            </Text>
            <Text style={styles.text}>
              本应用仅在您的设备本地存储音量预设数据，不会收集、上传或共享您的任何个人信息。
            </Text>
            <Text style={styles.text}>
              {'如您同意隐私政策，请点击"同意"开始使用。如您不同意，将无法使用本应用。'}
            </Text>
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDecline}
              activeOpacity={0.7}
            >
              <Text style={styles.declineText}>不同意</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptText}>同意</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1F1F',
    textAlign: 'center',
    marginBottom: 16,
  },
  content: {
    maxHeight: 300,
    marginBottom: 20,
  },
  text: {
    fontSize: 14,
    color: '#3C4043',
    lineHeight: 22,
    marginBottom: 12,
  },
  link: {
    color: '#1A73E8',
    fontWeight: '500',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F3F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5F6368',
  },
  acceptButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1A73E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
