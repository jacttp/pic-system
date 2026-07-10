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

export type HubFeatureKey = 'hub.kpi_cards' | 'hub.management_tray' | 'hub.quick_actions' | 'hub.notices_panel' | 'hub.activity_panel';
export type HubMainBlockKey = 'kpi_cards' | 'management_tray';
export type HubSidebarBlockKey = 'notices_panel' | 'activity_panel' | 'quick_actions';

export interface SystemFeatureFlag {
   FeatureKey: HubFeatureKey;
   FeatureName: string;
   Area: 'HUB' | string;
   IsEnabled: boolean;
   MinAccessLevel: number;
   RequiresDataScope: boolean;
   Description?: string | null;
   UpdatedAt?: string | null;
   UpdatedBy?: number | null;
}

export interface UserFeatureOverride {
   IdUser: number;
   FeatureKey: HubFeatureKey;
   IsEnabled: boolean;
   Reason?: string | null;
   UpdatedAt?: string | null;
   UpdatedBy?: number | null;
}

export interface HubConfigResponse {
   features: SystemFeatureFlag[];
   visibility: Record<HubFeatureKey, boolean>;
   scope: {
      id?: number;
      username?: string;
      role?: string;
      accessLevel: number;
      gerencia: string | null;
      jefatura: string | null;
   };
   fallback?: boolean;
}

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
