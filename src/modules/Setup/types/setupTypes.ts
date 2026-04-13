export interface SystemModule {

   ModuleId: number;
   ModuleKey: string;
   Label: string;
   Route: string;
   Icon: string;
   Description?: string;
   IconColor?: string;
   BgColor?: string;
   MinRoleLevel: number;
   IsActive: boolean;
   DisplayOrder: number;
   Category: 'Analítica' | 'Gestión' | 'Sistema' | 'Otro';
   DevStatus?: 'Finished' | 'Maintaining' | 'Development';
   Scope?: string;
}

export type DevStatus = 'Finished' | 'Maintaining' | 'Development';

//Mapeo para traducir roles de string a número (expandido a 4 niveles)

export const ROLE_LEVELS: Record<string, number> = {
   'Jefe': 1,
   'Gerente': 2,
   'Admin': 3,
   'SuperAdmin': 4,

   // Aliases (case insensitive)
   'jefe': 1,
   'gerente': 2,
   'admin': 3,
   'superadmin': 4,

   // Compatibilidad con roles antiguos / fallbacks
   'User': 1,
   'user': 1,
   'JefeGerentes': 2,
   'jefegerentes': 2,
};
