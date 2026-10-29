import * as recordatoriosRepository from "../repositories/recordatorios.repositorio.js";
import { HttpError } from "../utils/http-error.js";

export async function listRecordatorios(userId, filters) {
  const { recordatorios, total } = await recordatoriosRepository.findAllByUserId(userId, filters);
  return {
    data: recordatorios,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.ceil(total / filters.limit)
    }
  };
}

export function listTasks(userId) {
  return recordatoriosRepository.findTasksByUserId(userId);
}

export async function getRecordatorio(id, userId) {
  const recordatorio = await recordatoriosRepository.findByIdAndUserId(id, userId);
  if (!recordatorio) {
    throw new HttpError(404, "RECORDATORIO_NOT_FOUND", "El recordatorio no fue encontrado.");
  }
  return recordatorio;
}

export async function createRecordatorio(userId, recordatorio) {
  const created = await recordatoriosRepository.createForUser(userId, recordatorio);
  if (!created) throw taskNotFound();
  return created;
}

export async function updateRecordatorio(id, userId, changes) {
  await getRecordatorio(id, userId);
  if (changes.tareaId !== undefined && !(await recordatoriosRepository.taskBelongsToUser(changes.tareaId, userId))) {
    throw taskNotFound();
  }
  const updated = await recordatoriosRepository.updateForUser(id, userId, changes);
  if (!updated) {
    throw new HttpError(404, "RECORDATORIO_NOT_FOUND", "El recordatorio no fue encontrado.");
  }
  return updated;
}

export async function removeRecordatorio(id, userId) {
  await getRecordatorio(id, userId);
  await recordatoriosRepository.deleteForUser(id, userId);
}

function taskNotFound() {
  return new HttpError(404, "TAREA_NOT_FOUND", "La tarea no existe o no pertenece al usuario actual.");
}
