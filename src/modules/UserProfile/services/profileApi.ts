/* src/modules/UserProfile/services/profileApi.ts */
import api from '@/api/axios'
import type { UserProfile, Notification, PresenceStatus } from '../types/profile.types'

const V2 = import.meta.env.VITE_API_V2_PATH

export const profileApi = {
   async getProfile(): Promise<UserProfile> {
      const { data } = await api.get<{ success: boolean; data: UserProfile }>(`${V2}/profile`)
      return data.data
   },

   async updatePresenceStatus(status: PresenceStatus): Promise<boolean> {
      const { data } = await api.patch<{ success: boolean }>(`${V2}/profile/status`, { status })
      return data.success
   },

   async getNotifications(): Promise<Notification[]> {
      const { data } = await api.get<{ success: boolean; data: Notification[] }>(`${V2}/notifications`)
      return data.data
   },

   async markAsRead(notificationId: number): Promise<boolean> {
      const { data } = await api.patch<{ success: boolean }>(`${V2}/notifications/${notificationId}/read`)
      return data.success
   },

   async markAllAsRead(): Promise<boolean> {
      const { data } = await api.patch<{ success: boolean }>(`${V2}/notifications/read-all`)
      return data.success
   },

   async deleteNotification(notificationId: number): Promise<boolean> {
      const { data } = await api.delete<{ success: boolean }>(`${V2}/notifications/${notificationId}`)
      return data.success
   }
}
