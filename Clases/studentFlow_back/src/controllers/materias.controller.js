import * as materiasService from "../services/materias.service.js";
import { sendNoContent, sendSuccess } from "../utils/api-response.js";

import {
  validateCreateMateria,
  validateMateriaId,
  validateMateriaListQuery,
  validatePatchMateria
} from "../validators/materias.validator.js";

/** @returns {Promise<import("express").Response>} Lista paginada de materias. */
export async function listMaterias(request, response, next) {
  try {
    const filters = validateMateriaListQuery(request.query);
    const result = await materiasService.listMaterias(request.user.id, filters);
    return sendSuccess(response, result.data, 200, result.meta);
  } catch (error) {
    return next(error);
  }
}

/** @returns {Promise<import("express").Response>} Materia solicitada. */
export async function getMateria(request, response, next) {
  try {
    const id = validateMateriaId(request.params.id);
    const materia = await materiasService.getMateriaById(id, request.user.id);
    return sendSuccess(response, materia);

  } catch (error) {
    return next(error);
  }
}
/** @returns {Promise<import("express").Response>} Materia creada. */
export async function createMateria(request, response, next) {
  try {
    const payload = validateCreateMateria(request.body);
    const materia = await materiasService.createMateria(request.user.id, payload);
    return sendSuccess(response, materia, 201);
  } catch (error) {
    return next(error);
  }
}

/** @returns {Promise<import("express").Response>} Materia reemplazada. */
export async function replaceMateria(request, response, next) {
  try {
    const id = validateMateriaId(request.params.id);
    const payload = validateCreateMateria(request.body);
    const materia = await materiasService.replaceMateria(id, request.user.id, payload);
    return sendSuccess(response, materia);
  } catch (error) {
    return next(error);
  }
}

/** @returns {Promise<import("express").Response>} Materia actualizada. */
export async function updateMateria(request, response, next) {
  try {
    const id = validateMateriaId(request.params.id);
    const payload = validatePatchMateria(request.body);
    const materia = await materiasService.updateMateria(id, request.user.id, payload);
    return sendSuccess(response, materia);
  } catch (error) {
    return next(error);
  }
}

/** @returns {Promise<import("express").Response>} Respuesta sin contenido. */
export async function deleteMateria(request, response, next) {
  try {
    const id = validateMateriaId(request.params.id);
    await materiasService.removeMateria(id, request.user.id);
    return sendNoContent(response);
  } catch (error) {
    return next(error);
  }
}

/**
 * Devuelve las tareas de una materia perteneciente al usuario autenticado.
 * @param {import("express").Request} request Solicitud con `params.id` y `user.id`.
 * @param {import("express").Response} response Respuesta HTTP.
 * @param {import("express").NextFunction} next Middleware de errores.
 * @returns {Promise<import("express").Response>} Respuesta con las tareas.
 */
export async function listTareasByMateria(request, response, next) {
  try {
    const id = validateMateriaId(request.params.id);
    const tareas = await materiasService.listTareasByMateria(id, request.user.id);
    return sendSuccess(response, tareas);
  } catch (error) {
    return next(error);
  }
}