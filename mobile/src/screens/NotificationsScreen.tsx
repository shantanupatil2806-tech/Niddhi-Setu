import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../api/client';
import { NotificationItem } from '../types';

export const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await apiService.getNotifications();
      setNotifications(res.items);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const getNotificationIcon = (type: string, priority: string) => {
    switch (type) {
      case 'maturity':
        return {
          name: 'calendar',
          color: priority === 'urgent' ? '#e11d48' : '#d97706',
          bg: priority === 'urgent' ? '#ffe4e6' : '#fef3c7',
        };
      case 'clarification':
        return { name: 'alert-circle', color: '#ea580c', bg: '#ffedd5' };
      case 'release':
        return { name: 'lock-open', color: '#0d9488', bg: '#f0fdfa' };
      case 'verification':
        return { name: 'checkmark-circle', color: '#16a34a', bg: '#dcfce7' };
      default:
        return { name: 'notifications', color: '#0284c7', bg: '#e0f2fe' };
    }
  };

  const displayedNotifications = unreadOnly
    ? notifications.filter((n) => !n.read)
    : notifications;

  return (
    <View style={styles.container}>
      {/* Header Info Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.title}>Regulatory Alerts</Text>
          <Text style={styles.subtitle}>
            Direct notifications from AICTE scrutiny desk & maturity monitors
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.unreadToggle, unreadOnly && styles.unreadToggleActive]}
          onPress={() => setUnreadOnly(!unreadOnly)}
        >
          <Text style={[styles.unreadToggleText, unreadOnly && styles.unreadToggleTextActive]}>
            {unreadOnly ? 'Showing Unread' : 'Filter Unread'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={styles.centerText}>Syncing notification feed...</Text>
        </View>
      ) : displayedNotifications.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="checkmark-done-circle-outline" size={54} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptyDesc}>No active alerts or regulatory notices pending.</Text>
        </View>
      ) : (
        <FlatList
          data={displayedNotifications}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0d9488']} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const iconConfig = getNotificationIcon(item.type, item.priority);
            return (
              <TouchableOpacity
                style={[styles.card, !item.read && styles.unreadCard]}
                onPress={() => {
                  if (item.fdrId) {
                    navigation.navigate('FDRs', { highlightId: item.fdrId });
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: iconConfig.bg }]}>
                  <Ionicons name={iconConfig.name as any} size={20} color={iconConfig.color} />
                </View>

                <View style={styles.contentBox}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.itemTitle, !item.read && styles.unreadTitle]}>
                      {item.title}
                    </Text>
                    {!item.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.itemMessage}>{item.message}</Text>
                  <Text style={styles.itemTime}>
                    {new Date(item.timestamp).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    maxWidth: 240,
  },
  unreadToggle: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  unreadToggleActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  unreadToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  unreadToggleTextActive: {
    color: '#ffffff',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  centerText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  unreadCard: {
    borderColor: '#ccfbf1',
    backgroundColor: '#fdffff',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentBox: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  unreadTitle: {
    color: '#0f172a',
    fontWeight: '800',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#0d9488',
    marginLeft: 6,
  },
  itemMessage: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  itemTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 6,
    fontWeight: '500',
  },
});
