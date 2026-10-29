import test from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../public/js/api/http.js";
import { consultarEstado } from "../public/js/api/health.js";
import {
  listarMaterias, obtenerMateria, crearMateria,
  reemplazarMateria, actualizarMateria, eliminarMateria
} from "../public/js/api/materias.js";
import {
  listarRecordatorios, listarTareasParaRecordatorio, obtenerRecordatorio,
  crearRecordatorio, reemplazarRecordatorio, actualizarRecordatorio, eliminarRecordatorio
} from "../public/js/api/recordatorios.js";
import { materiaEjemplo, reemplazoEjemplo, cambiosEjemplo } from "../public/js/examples/datos.js";

test("los siete endpoints envían método, ruta y cuerpo correctos", async t => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, ...options });
    return options.method === "DELETE"
      ? new Response(null, { status: 204 })
      : Response.json({ success: true, data: { id: 7 } });
  });
  await consultarEstado();
  await listarMaterias();
  await obtenerMateria(7);
  await crearMateria(materiaEjemplo);
  await reemplazarMateria(7, reemplazoEjemplo);
  await actualizarMateria(7, cambiosEjemplo);
  assert.equal(await eliminarMateria(7), null);

  assert.deepEqual(calls.map(({ url, method }) => [method, url]), [
    ["GET", "/api/v1/health"], ["GET", "/api/v1/materias"],
    ["GET", "/api/v1/materias/7"], ["POST", "/api/v1/materias"],
    ["PUT", "/api/v1/materias/7"], ["PATCH", "/api/v1/materias/7"],
    ["DELETE", "/api/v1/materias/7"]
  ]);
  for (const [index, payload] of [[3, materiaEjemplo], [4, reemplazoEjemplo], [5, cambiosEjemplo]]) {
    assert.deepEqual(JSON.parse(calls[index].body), payload);
    assert.equal(calls[index].headers["Content-Type"], "application/json");
  }
  assert.equal(calls[0].body, undefined);
});

test("los endpoints de recordatorios envían método, ruta y datos correctos", async t => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, ...options });
    return options.method === "DELETE"
      ? new Response(null, { status: 204 })
      : Response.json({ success: true, data: [] });
  });
  const payload = {
    tareaId: 12, mensaje: "Recordar entrega", fechaHora: "2026-08-21T18:30",
    canal: "in_app", leido: false
  };
  await listarRecordatorios({ leido: false, page: 2, limit: 10 });
  await listarTareasParaRecordatorio();
  await obtenerRecordatorio(21);
  await crearRecordatorio(payload);
  await reemplazarRecordatorio(21, payload);
  await actualizarRecordatorio(21, { leido: true });
  assert.equal(await eliminarRecordatorio(21), null);

  assert.deepEqual(calls.map(({ url, method }) => [method, url]), [
    ["GET", "/api/v1/recordatorios?leido=false&page=2&limit=10"],
    ["GET", "/api/v1/recordatorios/tareas"],
    ["GET", "/api/v1/recordatorios/21"],
    ["POST", "/api/v1/recordatorios"],
    ["PUT", "/api/v1/recordatorios/21"],
    ["PATCH", "/api/v1/recordatorios/21"],
    ["DELETE", "/api/v1/recordatorios/21"]
  ]);
  assert.deepEqual(JSON.parse(calls[3].body), payload);
  assert.deepEqual(JSON.parse(calls[4].body), payload);
  assert.deepEqual(JSON.parse(calls[5].body), { leido: true });
});

test("los IDs de recordatorios inválidos no envían solicitudes", t => {
  const fetchMock = t.mock.method(globalThis, "fetch", () => { throw new Error("No debería llamarse"); });
  for (const id of [0, -1, "abc", "", "1/2", 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => obtenerRecordatorio(id), TypeError);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("los filtros conservan activa=false y caracteres especiales; la respuesta conserva meta", async t => {
  const payload = { success: true, data: [], meta: { page: 2, limit: 5, total: 6, pages: 2 } };
  t.mock.method(globalThis, "fetch", async url => {
    const query = new URL(url, "http://localhost").searchParams;
    assert.equal(query.get("activa"), "false");
    assert.equal(query.get("search"), "Programación & Diseño");
    assert.equal(query.get("page"), "2");
    assert.equal(query.get("limit"), "5");
    assert.equal(query.get("sort"), "nombre");
    assert.equal(query.get("order"), "desc");
    assert.equal(query.has("omitido"), false);
    return Response.json(payload);
  });
  assert.deepEqual(await listarMaterias({
    activa: false, search: "Programación & Diseño", page: 2, limit: 5,
    sort: "nombre", order: "desc", omitido: undefined
  }), payload);
});

test("errores del API conservan estado, código y mensaje", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    success: false, error: { code: "DUPLICATE_CODE", message: "Ya existe una materia con ese código." }
  }, { status: 409 }));
  await assert.rejects(crearMateria(materiaEjemplo), error => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
    assert.equal(error.code, "DUPLICATE_CODE");
    assert.equal(error.message, "Ya existe una materia con ese código.");
    return true;
  });
});

test("una caída de red produce un error comprensible", async t => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("fetch failed"); });
  await assert.rejects(consultarEstado(), { name: "ApiError", code: "NETWORK_ERROR", status: 0 });
});

test("una respuesta HTML inesperada no se trata como JSON válido", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response("<html>Error</html>", { status: 502 }));
  await assert.rejects(consultarEstado(), { code: "INVALID_RESPONSE", status: 502 });
});

test("IDs inválidos no envían solicitudes", t => {
  const fetchMock = t.mock.method(globalThis, "fetch", () => { throw new Error("No debería llamarse"); });
  for (const id of [0, -1, "abc", "", "1/2", 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => obtenerMateria(id), TypeError);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});
