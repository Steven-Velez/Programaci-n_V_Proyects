import { pool } from "../config/database.js";

const sortableFields = {
    id: "m.id_materia",
    nombre: "m.nombre",
    codigo: "m.codigo",
    creditos: "m.creditos",
    color: "m.color",
    activa: "m.activa",
    createdAt: "m.created_at",
};

/** @param {string} sort Campo permitido. @param {string} order Dirección. @returns {string} Fragmento SQL seguro para ordenar. */
function normalizeSort(sort, order) {
    const column = sortableFields[sort] || sortableFields.nombre
    const direction = String(order).toLowerCase() === "desc" ? "DESC" : "ASC"

    return `${column} ${direction}`
}

/** @param {Object} row Fila de la base de datos. @returns {Object} Materia en formato de API. */
function mapMateria(row) {
    return {

        id: row.id,
        usuarioId: row.usuarioId,
        nombre: row.nombre,
        codigo: row.codigo,
        creditos: row.creditos,
        color: row.color,
        activa: Boolean(row.activa),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,

    };

}
/** @param {number} userId Usuario propietario. @param {Object} filters Filtros y paginación. @returns {Promise<{materias: Object[], total: number}>} Materias y total. */
export async function findAllByUserId(userId, filters = {}) {
    const conditions = ["m.id_usuario = ?"];
    const params = [userId];

    if (typeof filters.activa === "boolean") {
        conditions.push("m.activa = ?");
        params.push(filters.activa ? 1 : 0);
    }

    if (filters.search) {
        conditions.push("(m.nombre LIKE ? OR m.codigo LIKE ?)");
        params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total
     FROM materia m
     WHERE ${conditions.join(" AND ")}`,
        params
    );
    const orderBy = normalizeSort(filters.sort, filters.order);
    const limit = filters.limit;
    const offset = (filters.page - 1) * limit;

    const [rows] = await pool.execute(
        `SELECT
       m.id_materia AS id,
       m.id_usuario AS usuarioId,
       m.nombre,
       m.codigo,
       m.color,
       m.creditos,
       m.activa,
       m.created_at AS createdAt,
       m.updated_at AS updatedAt
     FROM materia m
     WHERE ${conditions.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    return {
        materias: rows.map(mapMateria),
        total: countRows[0].total
    };
}
/** @param {number} id Identificador de materia. @param {number} userId Usuario propietario. @returns {Promise<Object|null>} Materia o null. */
export async function findByIdAndUserId(id, userId) {
    const [rows] = await pool.execute(
        `SELECT
       m.id_materia AS id,
       m.id_usuario AS usuarioId,
       m.nombre,
       m.codigo,
       m.color,
       m.creditos,
       m.activa,
       m.created_at AS createdAt,
       m.updated_at AS updatedAt
     FROM materia m
     WHERE m.id_materia = ? AND m.id_usuario = ?`,
        [id, userId]
    );

    return rows[0] ? mapMateria(rows[0]) : null;
}
/** @param {number} userId Usuario propietario. @param {Object} materia Datos de materia. @returns {Promise<Object>} Materia creada. */
export async function createMateria(userId, materia) {
    const [result] = await pool.execute(
        `INSERT INTO materia (id_usuario, nombre, codigo, color, creditos, activa)
     VALUES (?, ?, ?, ?, ?, ?)`,
        [
            userId,
            materia.nombre,
            materia.codigo,
            materia.color,
            materia.creditos,
            materia.activa ? 1 : 0,
        ]
    );

    return findByIdAndUserId(result.insertId, userId);
}

/** @param {number} id Identificador de materia. @param {number} userId Usuario propietario. @param {Object} materia Datos completos. @returns {Promise<Object>} Materia actualizada. */
export async function updateMateria(id, userId, materia) {
    await pool.execute(
        `UPDATE materia
     SET nombre = ?, codigo = ?, color = ?, creditos = ?, activa = ?
     WHERE id_materia = ? AND id_usuario = ?`,
        [
            materia.nombre,
            materia.codigo,
            materia.color,
            materia.creditos,
            materia.activa ? 1 : 0,
            id,
            userId,
        ]
    );

    return findByIdAndUserId(id, userId);
}

/** @param {number} id Identificador de materia. @param {number} userId Usuario propietario. @param {Object} partialMateria Campos modificados. @returns {Promise<Object>} Materia actualizada. */
export async function patchMateria(id, userId, partialMateria) {
    const fields = [];
    const params = [];

    if (partialMateria.nombre !== undefined) {
        fields.push("nombre = ?");
        params.push(partialMateria.nombre);
    }

    if (partialMateria.codigo !== undefined) {
        fields.push("codigo = ?");
        params.push(partialMateria.codigo);
    }

    if (partialMateria.color !== undefined) {
        fields.push("color = ?");
        params.push(partialMateria.color);
    }

    if (partialMateria.creditos !== undefined) {
        fields.push("creditos = ?");
        params.push(partialMateria.creditos);
    }

    if (partialMateria.activa !== undefined) {
        fields.push("activa = ?");
        params.push(partialMateria.activa ? 1 : 0);
    }

    params.push(id, userId);

    await pool.execute(
        `UPDATE materia
     SET ${fields.join(", ")}
     WHERE id_materia = ? AND id_usuario = ?`,
        params
    );

    return findByIdAndUserId(id, userId);
}

/** @param {number} id Identificador de materia. @param {number} userId Usuario propietario. @returns {Promise<boolean>} Indica si se eliminó. */
export async function deleteMateria(id, userId) {
    const [result] = await pool.execute(
        "DELETE FROM materia WHERE id_materia = ? AND id_usuario = ?",
        [id, userId]
    );

    return result.affectedRows > 0;
}

/**
 * Obtiene las tareas de una materia y confirma la propiedad mediante el usuario.
 * @param {number} materiaId Identificador de la materia.
 * @param {number} userId Identificador del usuario propietario.
 * @returns {Promise<Object[]>} Filas de tareas ordenadas por fecha de creación.
 */
export async function findTareasByMateriaId(materiaId, userId) {
    const [rows] = await pool.execute(
        `SELECT t.*
     FROM tarea t
     INNER JOIN materia m ON m.id_materia = t.id_materia
     WHERE t.id_materia = ? AND m.id_usuario = ?
     ORDER BY t.created_at DESC`,
        [materiaId, userId]
    );

    return rows;
}

/** @param {number} userId Usuario propietario. @param {string} codigo Código a comprobar. @param {number} [excludeId] Materia excluida. @returns {Promise<boolean>} Indica si existe duplicado. */
export async function existsByCode(userId, codigo, excludeId) {
    const params = [userId, codigo];
    let sql = "SELECT 1 FROM materia WHERE id_usuario = ? AND codigo = ?";

    if (excludeId) {
        sql += " AND id_materia <> ?";
        params.push(excludeId);
    }

    sql += " LIMIT 1";

    const [rows] = await pool.execute(sql, params);
    return rows.length > 0;
}

/** @param {number} userId Usuario propietario. @param {string} nombre Nombre a comprobar. @param {number} [excludeId] Materia excluida. @returns {Promise<boolean>} Indica si existe duplicado. */
export async function existsByName(userId, nombre, excludeId) {
    const params = [userId, nombre];
    let sql = "SELECT 1 FROM materia WHERE id_usuario = ? AND nombre = ?";

    if (excludeId) {
        sql += " AND id_materia <> ?";
        params.push(excludeId);
    }

    sql += " LIMIT 1";

    const [rows] = await pool.execute(sql, params);
    return rows.length > 0;
}