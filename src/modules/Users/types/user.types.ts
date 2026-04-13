/* src/modules/Users/types/user.types.ts */

export type UserRole = 'SuperAdmin' | 'Admin' | 'Gerente' | 'Jefe'
export type UserStatus = 'active' | 'inactive' | 'blocked'

export interface UserFull {
   IdUser: number
   Usuario: string
   TipoUser: UserRole
   jefatura: string
   Gerencia: string
   AccessLevel: number
   ServerUser: string | null
   Status: UserStatus
   LastActivity: string | null    // ISO date string
   CreatedAt: string
   nombre?: string
   no_emp?: string
}

export interface UserCreatePayload {
   username: string
   password: string
   role: UserRole
   jefatura: string
   gerencia: string
   serverUser?: string
   accessLevel?: number
   nombre: string
   no_emp: string
}

export interface UserUpdatePayload {
   role?: UserRole
   jefatura?: string
   gerencia?: string
   status?: UserStatus
   serverUser?: string
   accessLevel?: number
   nombre?: string
   no_emp?: string
}

export interface MessagePayload {
   targetType: 'user' | 'zone' | 'broadcast'
   targetValue?: string | number
   content: string
}

// Mapeo visual de roles para UI
export const ROLE_OPTIONS: { value: UserRole; label: string; level: number }[] = [
   { value: 'Jefe', label: 'Jefe', level: 1 },
   { value: 'Gerente', label: 'Gerente', level: 2 },
   { value: 'Admin', label: 'Administrador', level: 3 },
   { value: 'SuperAdmin', label: 'Super Administrador', level: 4 }
]
