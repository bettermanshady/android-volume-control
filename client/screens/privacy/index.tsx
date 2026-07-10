import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';

const PRIMARY = '#1A73E8';

const sections = [
  {
    title: '一、数据收集说明',
    icon: 'database' as const,
    content:
      '本应用仅在您的设备本地存储音量预设数据（预设名称和音量值）。我们不会收集、上传或共享您的任何个人数据。所有数据均保存在您的设备中，不会传输到任何远程服务器。',
  },
  {
    title: '二、权限使用说明',
    icon: 'shield-halved' as const,
    content:
      '本应用需要以下系统权限才能正常运行：\n\n• 音量控制权限：用于读取和设置系统音量，这是本应用的核心功能。\n• 音频播放权限：用于播放测试提示音，帮助您验证音量设置是否合适。\n• 存储权限：用于在本地保存您的音量预设数据，确保重启应用后预设不会丢失。',
  },
  {
    title: '三、第三方 SDK 说明',
    icon: 'cubes' as const,
    content:
      '当前版本不包含任何第三方 SDK。\n\n未来版本可能会集成广告 SDK（如穿山甲、优量汇等）以支持免费运营。届时我们将更新本隐私政策，明确说明所使用的第三方 SDK 及其数据收集行为。',
  },
  {
    title: '四、信息安全',
    icon: 'lock' as const,
    content:
      '由于所有数据均存储在您的设备本地，不存在网络传输环节，因此不存在数据在传输过程中被截获的风险。我们建议您妥善保管设备解锁密码，防止他人未经授权访问您的设备。',
  },
  {
    title: '五、隐私政策更新',
    icon: 'rotate' as const,
    content:
      '我们可能会不时更新本隐私政策。如有重大变更，我们将在应用内通过通知或弹窗的方式提醒您。建议您定期查阅本页面以了解最新的隐私保护措施。',
  },
];

export default function PrivacyScreen() {
  const router = useSafeRouter();

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <FontAwesome6 name="arrow-left" size={18} color="#1F1F1F" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <FontAwesome6 name="shield-halved" size={20} color={PRIMARY} />
          </View>
          <View>
            <Text style={styles.headerTitle}>隐私政策</Text>
            <Text style={styles.headerSubtitle}>最后更新：2025年1月</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <Text style={styles.introText}>
            智控音量尊重并保护您的隐私。本隐私政策说明了我们在您使用本应用时如何处理您的个人信息。使用本应用即表示您同意本隐私政策的全部内容。
          </Text>
        </View>

        {sections.map((section, index) => (
          <View key={index} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <FontAwesome6 name={section.icon} size={16} color={PRIMARY} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>联系我们</Text>
          <Text style={styles.contactText}>
            如果您对本隐私政策有任何疑问或建议，欢迎通过应用商店的评论区与我们联系。
          </Text>
        </View>

        <Text style={styles.footerText}>智控音量 v1.0.0</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F3F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(26, 115, 232, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#5F6368',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  introCard: {
    backgroundColor: 'rgba(26, 115, 232, 0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  introText: {
    fontSize: 14,
    color: '#3C4043',
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(26, 115, 232, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1F1F',
    flex: 1,
  },
  sectionContent: {
    fontSize: 14,
    color: '#5F6368',
    lineHeight: 22,
    paddingLeft: 42,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 4,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1F1F',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#5F6368',
    lineHeight: 22,
  },
  footerText: {
    fontSize: 12,
    color: '#9AA0A6',
    textAlign: 'center',
  },
});
