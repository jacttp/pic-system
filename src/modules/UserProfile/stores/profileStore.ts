/* src/modules/UserProfile/stores/profileStore.ts */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { profileApi } from '../services/profileApi'
import type { UserProfile, Notification, PresenceStatus } from '../types/profile.types'

export const useProfileStore = defineStore('profile', () => {
   const profile = ref<UserProfile | null>(null)
   const notifications = ref<Notification[]>([])
   const isLoading = ref(false)
   const error = ref<string | null>(null)

   // Computed
   const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)
   const unreadNotifications = computed(() => notifications.value.filter(n => !n.read))

   // Agrupar notificaciones por tipo
   const groupedNotifications = computed(() => {
      const groups: Record<string, Notification[]> = {
         message: [],
         approval_request: [],
         approval_resolved: [],
         system: []
      }
      notifications.value.forEach(n => {
         const group = groups[n.type]
         if (group) {
            group.push(n)
         } else {
            groups.system!.push(n)
         }
      })
      return groups
   })

   // --- Acciones ---

   async function fetchProfile() {
      isLoading.value = true
      error.value = null
      try {
         profile.value = await profileApi.getProfile()
      } catch (e: any) {
         error.value = 'Error al cargar perfil'
         console.error(e)
      } finally {
         isLoading.value = false
      }
   }

   async function updatePresence(status: PresenceStatus) {
      try {
         const success = await profileApi.updatePresenceStatus(status)
         if (success && profile.value) {
            profile.value.presenceStatus = status
         }
         return success
      } catch (e: any) {
         error.value = 'Error al actualizar presencia'
         throw e
      }
   }

   async function fetchNotifications() {
      try {
         notifications.value = await profileApi.getNotifications()
      } catch (e: any) {
         console.error('Error al cargar notificaciones:', e)
      }
   }

   async function markNotificationRead(id: number) {
      try {
         const success = await profileApi.markAsRead(id)
         if (success) {
            const notif = notifications.value.find(n => n.id === id)
            if (notif) notif.read = true
         }
      } catch (e: any) {
         console.error('Error al marcar notificación:', e)
      }
   }

   async function markAllRead() {
      try {
         const success = await profileApi.markAllAsRead()
         if (success) {
            notifications.value.forEach(n => { n.read = true })
         }
      } catch (e: any) {
         console.error('Error al marcar todas:', e)
      }
   }

   async function deleteNotification(id: number) {
      try {
         const success = await profileApi.deleteNotification(id)
         if (success) {
            notifications.value = notifications.value.filter(n => n.id !== id)
         }
      } catch (e: any) {
         console.error('Error al eliminar notificación:', e)
      }
   }

   return {
      profile,
      notifications,
      isLoading,
      error,
      unreadCount,
      unreadNotifications,
      groupedNotifications,
      fetchProfile,
      updatePresence,
      fetchNotifications,
      markNotificationRead,
      markAllRead,
      deleteNotification
   }
})
