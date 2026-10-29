import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/database.js";
import {
  validateCreateRecordatorio,
  validatePatchRecordatorio,
  validateRecordatorioIdParam,
  validateRecordatorioListQuery
} from "../src/validators/recordatorios.validator.js";
import {
  createForUser,
  deleteForUser,
  findAllByUserId,
  findByIdAndUserId,
  findTasksByUserId,
  updateForUser
} from "../src/repositories/recordatorios.repositorio.js";

const validPayload = {
  tareaId: 12,
  mensaje: "Revisar los materiales antes de la entrega",
  fechaHora: "2026-08-21T18:30",
  canal: "in_app"
};

test("valida y normaliza los datos de creación", () => {
  assert.deepEqual(validateCreateRecordatorio(validPayload), {
    ...validPayload,
    fechaHora: "2026-08-21 18:30",
    leido: false
  });
  assert.deepEqual(validatePatchRecordatorio({ leido: "true" }), { leido: true });
  assert.equal(validateRecordatorioIdParam("15"), 15);
});

test("rechaza datos inválidos y filtros fuera de rango", () => {
  for (const payload of [
    { ...validPayload, tareaId: 0 },
    { ...validPayload, mensaje: " " },
    { ...validPayload, mensaje: "a".repeat(256) },
    { ...validPayload, fechaHora: "2026-02-30T18:30" },
    { ...validPayload, canal: "sms" }
  ]) {
    assert.throws(() => validateCreateRecordatorio(payload), { statusCode: 422 });
  }
  assert.throws(() => validateRecordatorioIdParam("abc"), { statusCode: 422 });
  assert.throws(() => validatePatchRecordatorio({}), { statusCode: 422 });
  assert.throws(() => validateRecordatorioListQuery({ limit: 101 }), { statusCode: 422 });
});

test("normaliza los filtros de listado", () => {
  assert.deepEqual(validateRecordatorioListQuery({
    leido: "false",
    search: "  parcial  ",
    page: "2",
    limit: "10",
    sort: "mensaje",
    order: "DESC"
  }), {
    leido: false,
    search: "parcial",
    page: 2,
    limit: 10,
    sort: "mensaje",
    order: "desc"
  });
});

test("las consultas de lectura unen relaciones y filtran por el usuario", async t => {
  const calls = [];
  t.mock.method(pool, "execute", async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("COUNT(*)")) return [[{ total: 0 }]];
    return [[]];
  });

  await findAllByUserId(7, {
    leido: false, search: "parcial", page: 2, limit: 10, sort: "mensaje", order: "desc"
  });
  await findByIdAndUserId(12, 7);
  await findTasksByUserId(7);

  assert.equal(calls.length, 4);
  for (const { sql, params } of calls) {
    assert.match(sql, /(?:JOIN|FROM) tarea/);
    assert.match(sql, /JOIN materia/);
    assert.match(sql, /m\.id_usuario = \?/);
    assert.ok(params.includes(7));
  }
  assert.match(calls[0].sql, /r\.leido = \?/);
  assert.match(calls[0].sql, /r\.mensaje LIKE \?.*t\.titulo LIKE \?.*m\.nombre LIKE/s);
});

test("las escrituras solo insertan, actualizan o eliminan recordatorio y respetan propiedad", async t => {
  const calls = [];
  t.mock.method(pool, "execute", async (sql, params) => {
    calls.push({ sql, params });
    if (sql.startsWith("INSERT")) return [{ affectedRows: 1, insertId: 21 }];
    if (sql.startsWith("DELETE")) return [{ affectedRows: 1 }];
    if (sql.startsWith("UPDATE")) return [{ affectedRows: 1 }];
    return [[{
      id: 21,
      tareaId: 12,
      tareaTitulo: "Entrega",
      materiaNombre: "Bases de Datos",
      mensaje: "Recordar",
      fechaHora: new Date("2026-08-21T18:30:00Z"),
      canal: "in_app",
      leido: 0,
      createdAt: new Date("2026-08-20T10:00:00Z")
    }]];
  });

  await createForUser(7, {
    tareaId: 12, mensaje: "Recordar", fechaHora: "2026-08-21 18:30", canal: "in_app", leido: false
  });
  await updateForUser(21, 7, { mensaje: "Actualizado", leido: true });
  await deleteForUser(21, 7);

  const writes = calls.filter(({ sql }) => /^(INSERT|UPDATE|DELETE)/.test(sql));
  assert.equal(writes.length, 3);
  for (const { sql } of writes) {
    assert.match(sql, /recordatorio/);
    assert.doesNotMatch(sql, /(?:UPDATE|INSERT INTO|DELETE FROM)\s+(?:tarea|materia)\b/i);
  }
  assert.match(writes[0].sql, /INSERT INTO recordatorio[\s\S]*SELECT[\s\S]*JOIN materia[\s\S]*m\.id_usuario = \?/);
  assert.match(writes[1].sql, /EXISTS[\s\S]*JOIN materia[\s\S]*m\.id_usuario = \?/);
  assert.match(writes[2].sql, /EXISTS[\s\S]*JOIN materia[\s\S]*m\.id_usuario = \?/);
});
