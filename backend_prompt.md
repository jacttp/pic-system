# Prompt: Creation of Endpoint `GET /clients/:id`

## Context
The frontend requires fetching the details of a specific client by their ID to support the "Edit Client" view when accessing via a direct URL (`/admin/clients/:id`) or when the client is not present in the current paginated list.

Currently, the frontend only has `GET /clients` (paginated list).

## Requirement
Create a new endpoint in the backend API (v2) to retrieve a single client by ID.

### Endpoint Specification

- **Method**: `GET`
- **Path**: `/api/v2/clients/:id`
- **Parameters**:
  - `id` (integer, required): The unique identifier of the client.

### Response Format

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "Id": 123,
    "clienteid": "CTE-1001",
    "Nombre": "Abarrotes La Esperanza",
    "Matriz": "Walmart",
    "Cadena": "Supercenter",
    "Canal": "Moderno",
    "Canalm": "Autoservicio",
    "Formato": "Supermercado",
    "Gerencia": "Norte",
    "Zona": "Zona 1",
    "Jefatura": "Jefatura A",
    "Ruta": "R001",
    "Umaf": "U001",
    "Calle_Numero": "Av. Principal 123",
    "Colonia": "Centro",
    "Ciudad": "Monterrey",
    "Estado": "Nuevo León",
    "Tipocli": "A",
    "Geopos": "25.6866, -100.3161"
    // ... include all other client fields
  }
}
```

**Not Found (404 Not Found):**
```json
{
  "success": false,
  "message": "Cliente no encontrado"
}
```

**Server Error (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "Error interno del servidor"
}
```

### Notes for Implementation
- Ensure proper authorization/authentication checks (e.g., Verify token).
- The response structure should match the single object format found in the `data` array of the existing `/clients` list endpoint.
