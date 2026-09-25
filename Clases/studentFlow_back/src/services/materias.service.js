import * as materiasRepository from "../repositories/materias.repositorio.js";
import { HttpError } from "../utils/http-error.js";

/** @param {number} userId Usuario propietario. @param {Object} filters Filtros de consulta. @returns {Promise<Object>} Materias y metadatos. */
export async function listMaterias(userId, filters) {
    const { materias, total } = await materiasRepository.findAllByUserId(userId, filters);

    return {
        data: materias,
        meta: {
            page: filters.page,
            limit: filters.limit,
            total,
            pages: Math.ceil(total / filters.limit)
        }
    };
}

/** @param {number} id Materia solicitada. @param {number} userId Usuario propietario. @returns {Promise<Object>} Materia encontrada. @throws {HttpError} 404 si no existe. */
export async function getMateriaById(id, userId) {
    const materia = await materiasRepository.findByIdAndUserId(id, userId);
    if (!materia) {
        throw new HttpError(404, "MATERIA_NOT_FOUND", "la materia no fue encontrada");
    }

    return materia;
}
/** @param {number} userId Usuario propietario. @param {Object} materia Datos validados. @returns {Promise<Object>} Materia creada. */
export async function createMateria(userId, materia) {
    await ensureUniqueFields(userId, materia);
    return materiasRepository.createMateria(userId, materia);
}



/** @param {number} id Materia a reemplazar. @param {number} userId Usuario propietario. @param {Object} materia Datos completos. @returns {Promise<Object>} Materia actualizada. */
export async function replaceMateria(id, userId, materia) {
    await getMateriaById(id, userId);
    await ensureUniqueFields(userId, materia, id);
    return materiasRepository.updateMateria(id, userId, materia);
}

/** @param {number} id Materia a actualizar. @param {number} userId Usuario propietario. @param {Object} partialMateria Campos modificados. @returns {Promise<Object>} Materia actualizada. */
export async function updateMateria(id, userId, partialMateria) {
    await getMateriaById(id, userId);
    await ensureUniqueFields(userId, partialMateria, id);
    return materiasRepository.patchMateria(id, userId, partialMateria);
}

/** @param {number} id Materia a eliminar. @param {number} userId Usuario propietario. @returns {Promise<void>} No devuelve contenido. */
export async function removeMateria(id, userId) {
    await getMateriaById(id, userId);
    await materiasRepository.deleteMateria(id, userId);
}

/**
 * Busca las tareas asociadas a una materia del usuario indicado.
 * @param {number} id Identificador de la materia.
 * @param {number} userId Identificador del usuario propietario.
 * @returns {Promise<Object[]>} Tareas asociadas a la materia.
 * @throws {HttpError} 404 si la materia no pertenece al usuario.
 */
export async function listTareasByMateria(id, userId) {
    await getMateriaById(id, userId);
    return materiasRepository.findTareasByMateriaId(id, userId);
}

/** @param {number} userId Usuario propietario. @param {Object} materia Datos a comprobar. @param {number} [excludeId] Materia que se excluye. @returns {Promise<void>} Finaliza si los campos son únicos. @throws {HttpError} 409 si hay duplicados. */
async function ensureUniqueFields(userId, materia, excludeId) {
    if (materia.codigo) {
        const duplicatedCode = await materiasRepository.existsByCode(
            userId,
            materia.codigo,
            excludeId
        );

        if (duplicatedCode) {
            throw new HttpError(409, "DUPLICATE_CODE", "Ya existe una materia con ese código.");
        }
    }

    if (materia.nombre) {
        const duplicatedName = await materiasRepository.existsByName(
            userId,
            materia.nombre,
            excludeId
        );

        if (duplicatedName) {
            throw new HttpError(409, "DUPLICATE_NAME", "Ya existe una materia con ese nombre.");
        }
    }
}