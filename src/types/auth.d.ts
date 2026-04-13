/* src/types/auth.d.ts */

export type UserRole = 'SuperAdmin' | 'Admin' | 'Gerente' | 'Jefe'

export interface User {
   id: number;
   username: string;
   role: UserRole;
   jefatura: string;
   Gerencia: string;
   accessLevel: number;
   serverUser?: string | null;
}

export interface LoginResponse {
   success: boolean;
   data: {
      token: string;
      user: User;
   };
   message?: string;
}