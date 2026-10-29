import { pool } from "../config/database.js";

const sortableColumns = {
  id: "r.id_recordatorio",
  mensaje: "r.mensaje",
  fechaHora: "r.fecha_hora",
  canal: "r.canal",
  leido: "r.leido"
};

function mapRecordatorio(row) {
  return {
    id: row.id,
    tareaId: row.tareaId,
    tareaTitulo: row.tareaTitulo,
    materiaNombre: row.materiaNombre,
    mensaje: row.mensaje,
    fechaHora: row.fechaHora,
    canal: row.canal,
    leido: Boolean(row.leido),
    createdAt: row.createdAt
  };
}

const recordatorioSelect = `
  SELECT
    r.id_recordatorio AS id,
    r.id_tarea AS tareaId,
    t.titulo AS tareaTitulo,
    m.nombre AS materiaNombre,
    r.mensaje,
    r.fecha_hora AS fechaHora,
    r.canal,
    r.leido,
    r.created_at AS createdAt
  FROM recordatorio r
  JOIN tarea t ON t.id_tarea = r.id_tarea
  JOIN materia m ON m.id_materia = t.id_materia
`;

export async function findAllByUserId(userId, filters) {
  const conditions = ["m.id_usuario = ?"];
  const params = [userId];

  if (filters.leido !== undefined) {
    conditions.push("r.leido = ?");
    params.push(filters.leido ? 1 : 0);
  }
  if (filters.search) {
    conditions.push("(r.mensaje LIKE ? OR t.titulo LIKE ? OR m.nombre LIKE ?)");
    const search = `%${filters.search}%`;
    params.push(search, search, search);
  }

  const where = conditions.join(" AND ");
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM recordatorio r
     JOIN tarea t ON t.id_tarea = r.id_tarea
     JOIN materia m ON m.id_materia = t.id_materia
     WHERE ${where}`,
    params
  );
  const orderBy = `${sortableColumns[filters.sort]} ${filters.order.toUpperCase()}`;
  const offset = (filters.page - 1) * filters.limit;
  const [rows] = await pool.execute(
    `${recordatorioSelect}
     WHERE ${where}
     ORDER BY ${orderBy}, r.id_recordatorio ASC
     LIMIT ? OFFSET ?`,
    [...params, filters.limit, offset]
  );

  return { recordatorios: rows.map(mapRecordatorio), total: Number(countRows[0].total) };
}

export async function findByIdAndUserId(id, userId) {
  const [rows] = await pool.execute(
    `${recordatorioSelect}
     WHERE r.id_recordatorio = ? AND m.id_usuario = ?`,
    [id, userId]
  );
  return rows[0] ? mapRecordatorio(rows[0]) : null;
}

export async function findTasksByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT
       t.id_tarea AS tareaId,
       t.titulo AS tareaTitulo,
       m.id_materia AS materiaId,
       m.nombre AS materiaNombre
     FROM tarea t
     JOIN materia m ON m.id_materia = t.id_materia
     WHERE m.id_usuario = ?
     ORDER BY m.nombre ASC, t.titulo ASC, t.id_tarea ASC`,
    [userId]
  );
  return rows;
}

export async function taskBelongsToUser(tareaId, userId) {
  const [rows] = await pool.execute(
    `SELECT t.id_tarea
     FROM tarea t
     JOIN materia m ON m.id_materia = t.id_materia
     WHERE t.id_tarea = ? AND m.id_usuario = ?`,
    [tareaId, userId]
  );
  return rows.length > 0;
}

export async function createForUser(userId, recordatorio) {
  const [result] = await pool.execute(
    `INSERT INTO recordatorio (id_tarea, mensaje, fecha_hora, canal, leido)
     SELECT t.id_tarea, ?, ?, ?, ?
     FROM tarea t
     JOIN materia m ON m.id_materia = t.id_materia
     WHERE t.id_tarea = ? AND m.id_usuario = ?`,
    [
      recordatorio.mensaje,
      recordatorio.fechaHora,
      recordatorio.canal,
      recordatorio.leido ? 1 : 0,
      recordatorio.tareaId,
      userId
    ]
  );
  if (result.affectedRows === 0) return null;
  return findByIdAndUserId(result.insertId, userId);
}

export async function updateForUser(id, userId, changes) {
  const fields = [];
  const params = [];
  const columns = {
    tareaId: "id_tarea",
    mensaje: "mensaje",
    fechaHora: "fecha_hora",
    canal: "canal",
    leido: "leido"
  };
  for (const [field, column] of Object.entries(columns)) {
    if (changes[field] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(field === "leido" ? (changes[field] ? 1 : 0) : changes[field]);
    }
  }

  await pool.execute(
    `UPDATE recordatorio
     SET ${fields.join(", ")}
     WHERE id_recordatorio = ?
       AND EXISTS (
         SELECT 1
         FROM tarea t
         JOIN materia m ON m.id_materia = t.id_materia
         WHERE t.id_tarea = recordatorio.id_tarea AND m.id_usuario = ?
       )`,
    [...params, id, userId]
  );
  return findByIdAndUserId(id, userId);
}

export async function deleteForUser(id, userId) {
  const [result] = await pool.execute(
    `DELETE FROM recordatorio
     WHERE id_recordatorio = ?
       AND EXISTS (
         SELECT 1
         FROM tarea t
         JOIN materia m ON m.id_materia = t.id_materia
         WHERE t.id_tarea = recordatorio.id_tarea AND m.id_usuario = ?
       )`,
    [id, userId]
  );
  return result.affectedRows > 0;
}
