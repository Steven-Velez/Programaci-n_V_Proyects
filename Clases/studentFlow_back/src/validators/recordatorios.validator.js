import { HttpError } from "../utils/http-error.js";

const sortableFields = new Set(["id", "mensaje", "fechaHora", "canal", "leido"]);
const allowedChannels = new Set(["in_app", "email"]);

function parseBoolean(value, fieldName) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new HttpError(422, "VALIDATION_ERROR", `El campo '${fieldName}' debe ser true o false.`);
}

function validateRecordatorioId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new HttpError(422, "INVALID_ID", "El identificador de recordatorio no es válido.");
  }
  return id;
}

function validateTareaId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new HttpError(422, "VALIDATION_ERROR", "El campo 'tareaId' debe ser un entero mayor que cero.");
  }
  return id;
}

function validateMessage(value) {
  if (typeof value !== "string" || value.trim().length < 1 || value.trim().length > 255) {
    throw new HttpError(422, "VALIDATION_ERROR", "El mensaje debe tener entre 1 y 255 caracteres.");
  }
  return value.trim();
}

function validateDateTime(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) {
    throw new HttpError(422, "VALIDATION_ERROR", "La fecha debe usar el formato YYYY-MM-DDTHH:mm[:ss].");
  }

  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day ||
    parsed.getUTCHours() !== hour ||
    parsed.getUTCMinutes() !== minute ||
    parsed.getUTCSeconds() !== second
  ) {
    throw new HttpError(422, "VALIDATION_ERROR", "La fecha y hora no son válidas.");
  }

  return value.replace("T", " ");
}

function validateChannel(value) {
  if (!allowedChannels.has(value)) {
    throw new HttpError(422, "VALIDATION_ERROR", "El canal debe ser 'in_app' o 'email'.");
  }
  return value;
}

function validateFields(body, partial) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(422, "VALIDATION_ERROR", "El cuerpo de la solicitud debe ser un objeto JSON.");
  }

  const payload = {};
  if (!partial || body.tareaId !== undefined) payload.tareaId = validateTareaId(body.tareaId);
  if (!partial || body.mensaje !== undefined) payload.mensaje = validateMessage(body.mensaje);
  if (!partial || body.fechaHora !== undefined) payload.fechaHora = validateDateTime(body.fechaHora);
  if (!partial || body.canal !== undefined) payload.canal = validateChannel(body.canal);
  if (body.leido !== undefined) payload.leido = parseBoolean(body.leido, "leido");
  else if (!partial) payload.leido = false;

  if (partial && Object.keys(payload).length === 0) {
    throw new HttpError(422, "VALIDATION_ERROR", "No se enviaron campos válidos para actualizar.");
  }

  return payload;
}

export function validateRecordatorioIdParam(value) {
  return validateRecordatorioId(value);
}

export function validateRecordatorioListQuery(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (!Number.isInteger(page) || page < 1) {
    throw new HttpError(422, "VALIDATION_ERROR", "El parámetro 'page' debe ser un entero mayor o igual a 1.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new HttpError(422, "VALIDATION_ERROR", "El parámetro 'limit' debe ser un entero entre 1 y 100.");
  }

  let leido;
  if (query.leido !== undefined) leido = parseBoolean(query.leido, "leido");

  const sort = query.sort ?? "fechaHora";
  if (!sortableFields.has(sort)) {
    throw new HttpError(422, "VALIDATION_ERROR", "El parámetro 'sort' no es válido.");
  }
  const order = String(query.order ?? "asc").toLowerCase();
  if (order !== "asc" && order !== "desc") {
    throw new HttpError(422, "VALIDATION_ERROR", "El parámetro 'order' debe ser asc o desc.");
  }

  return {
    leido,
    search: typeof query.search === "string" ? query.search.trim() : "",
    page,
    limit,
    sort,
    order
  };
}

export function validateCreateRecordatorio(body) {
  return validateFields(body, false);
}

export function validatePatchRecordatorio(body) {
  return validateFields(body, true);
}
