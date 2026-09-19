export const NOTIFICATION_ICONS: Record<string, string> = {
  new_order: '🛒',
  order_confirmed: '✅',
  order_preparing: '📦',
  order_shipping: '🚚',
  order_delivered: '📬',
  order_completed: '🎉',
  order_cancelled: '✕',
  new_review: '⭐',
  new_message: '💬',
  payment_confirmed: '💳',
  manual_payment_submitted: '📱',
  ad_activated: '📣',
  subscription_expiring_7d: '⏳',
  subscription_expiring_3d: '⏳',
  subscription_expiring_1d: '⏳',
  subscription_expiring_0d: '⚠️',
  subscription_expired: '⚠️',
}

export function notificationIcon(type: string): string {
  return NOTIFICATION_ICONS[type] ?? '🔔'
}
