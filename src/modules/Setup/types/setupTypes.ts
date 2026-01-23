export interface SystemModule {

   ModuleId: number;
   ModuleKey: string;
   Label: string;
   Route: string;
   Icon: string;
   Description?: string;
   MinRoleLevel: number;
   IsActive: boolean;
   DisplayOrder: number;
   Category: 'Analítica' | 'Gestión' | 'Sistema' | 'Otro';
   DevStatus?: 'Finished' | 'Maintaining' | 'Development';
}

export type DevStatus = 'Finished' | 'Maintaining' | 'Development';

//Mapeo para traducir tus roles de string a número

export const ROLE_LEVELS: Record<string, number> = {

   'User': 1,
   'General': 2,
   'Admin': 3,


   //Alias
   'user': 1,
   'general': 2,
   'admin': 3,

};

