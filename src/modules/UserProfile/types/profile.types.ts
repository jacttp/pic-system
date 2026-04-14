/* src/modules/UserProfile/types/profile.types.ts */
import type { UserRole } from '@/modules/Users/types/user.types'

export type PresenceStatus = 'online' | 'busy' | 'offline'

export interface UserProfile {
   id: number
   username: string
   serverUser: string | null
   role: UserRole
   jefatura: string
   accessLevel: number
   Gerencia: string         // read-only, viene de GerenciasUsuarios
   nombre: string
   no_emp: string
   presenceStatus: PresenceStatus
   lastActivity: string | null
}

export type NotificationType = 'message' | 'approval_request' | 'approval_resolved' | 'system'

export interface Notification {
   id: number
   type: NotificationType
   title: string
   body: string
   read: boolean
   createdAt: string
   sourceModule?: string    // 'Users', 'Approvals', 'Promotions', etc.
   actionUrl?: string       // ruta interna a la que navegar al hacer clic
}

// Configuración visual de presencia para UI
export const PRESENCE_OPTIONS: { value: PresenceStatus; label: string; color: string; icon: string }[] = [
   { value: 'online', label: 'En Línea', color: 'emerald', icon: 'fa-solid fa-circle' },
   { value: 'busy', label: 'Ocupado', color: 'amber', icon: 'fa-solid fa-circle' },
   { value: 'offline', label: 'Desconectado', color: 'slate', icon: 'fa-regular fa-circle' }
]
