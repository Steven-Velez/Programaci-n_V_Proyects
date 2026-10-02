# Endpoint GET de eventos por materia

## Objetivo

Agregar el endpoint `GET /api/v1/materias/:id/eventos` al backend de `clases/studentFlow_back` para consultar los eventos de una materia que pertenece al usuario de la solicitud.

- `id`: identificador de materia recibido en `request.params.id`.
- `userId`: identificador del usuario obtenido de `request.user.id`.
- Respuesta: HTTP 200 con `{ "success": true, "data": [...] }`.
- Si la consulta no encuentra coincidencias, `data` será `[]`. Esto incluye materias sin eventos, inexistentes o pertenecientes a otro usuario.

Se modifican cuatro archivos. Los fragmentos siguientes se adicionan al código existente; no reemplazan las funciones actuales.

El repositorio de este backend se llama `materias.repositorio.js`. Para el `SELECT` se toma como referencia el estilo de `findByIdAndUserId` de `studentFlow_back/src/repositories/materias.repository.js`: campos explícitos, alias en camelCase y parámetros mediante `?`.

## 1. `src/routes/materias.routes.js`

**Funciones a adicionar o modificar:** ninguna función propia. Se modifica la importación del controlador y el registro de rutas.

Adicionar `listEventosByMateria` a la importación existente:

//```js
import {
  listMaterias,
  getMaterias,
  createMateria,
  listTareasByMateria,
  listEventosByMateria
} from "../controllers/materias.controller.js";