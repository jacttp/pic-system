# Backend Requirements for Setup Module

To support the dynamic configuration management in the Frontend, the following API endpoints are required.

## Database Schema Updates
**Table**: `SysModulesIC`
- [New Column] `DevStatus` (VARCHAR/ENUM): Values 'Finished', 'Maintaining', 'Development'. Default 'Development'.

## Endpoints

### 1. Update Module Configuration
- **Method**: `PUT` or `PATCH`
- **URL**: `/api/system/modules/:id`
- **Body**:
  ```json
  {
    "Label": "string",
    "Category": "string",
    "MinRoleLevel": int,
    "IsActive": boolean,
    "DevStatus": "Finished" | "Maintaining" | "Development",
    "Scope": "string" | null
  }
  ```
- **Response**: Updated Module Object or `{ success: true }`.
- **Security**: Admin Only (Level 3).

### 2. Get Modules (Update)
- **Method**: `GET`
- **URL**: `/api/system/modules`
- **Update**: Ensure the response includes the new `DevStatus` column.
