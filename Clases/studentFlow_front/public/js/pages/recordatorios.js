import {
  actualizarRecordatorio,
  crearRecordatorio,
  eliminarRecordatorio,
  listarRecordatorios,
  listarTareasParaRecordatorio,
  obtenerRecordatorio,
  reemplazarRecordatorio
} from "../api/recordatorios.js";

const operationNames = {
  list: ["Listado de recordatorios", "Consulta los recordatorios propios con búsqueda, filtros y paginación."],
  get: ["Consultar recordatorio", "Ingresa un ID o selecciona Consultar en una fila del listado."],
  create: ["Crear recordatorio", "Elige una de tus tareas y completa la información del recordatorio."],
  replace: ["Reemplazar recordatorio", "Envía la representación completa del recordatorio seleccionado."],
  patch: ["Actualizar campos del recordatorio", "Selecciona los campos que quieres actualizar."],
  delete: ["Eliminar recordatorio", "Ingresa un ID o selecciona Eliminar en una fila del listado."]
};

const elements = {
  status: document.querySelector("#status"),
  tableBody: document.querySelector("#recordatorios"),
  pagination: document.querySelector("#pagination"),
  result: document.querySelector("#result"),
  operationHelp: document.querySelector("#operation-help"),
  editorTitle: document.querySelector("#editor-title"),
  submit: document.querySelector("#submit-operation"),
  idField: document.querySelector("#id-field"),
  id: document.querySelector("#recordatorio-id"),
  task: document.querySelector("#task-id"),
  message: document.querySelector("#message"),
  dateTime: document.querySelector("#date-time"),
  channel: document.querySelector("#channel"),
  read: document.querySelector("#read"),
  patchFields: document.querySelector("#patch-fields"),
  search: document.querySelector("#search"),
  filterRead: document.querySelector("#filter-read"),
  pageLimit: document.querySelector("#page-limit"),
  previous: document.querySelector("#previous-page"),
  next: document.querySelector("#next-page")
};

let operation = "list";
let currentPage = 1;
let totalPages = 1;

function setStatus(message, type = "") {
  elements.status.textContent = message;
  elements.status.dataset.type = type;
}

function showResult(value) {
  elements.result.textContent = JSON.stringify(value, null, 2);
}

function recordatorioBody(partial = false) {
  const body = {
    tareaId: Number(elements.task.value),
    mensaje: elements.message.value,
    fechaHora: elements.dateTime.value,
    canal: elements.channel.value,
    leido: elements.read.checked
  };
  if (!partial) return body;

  const selectedFields = new Set(
    [...elements.patchFields.querySelectorAll("[data-field]:checked")].map(input => input.dataset.field)
  );
  return Object.fromEntries(Object.entries(body).filter(([field]) => selectedFields.has(field)));
}

function formatDateTime(value) {
  if (!value) return "";
  return String(value).replace(" ", "T").slice(0, 16);
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value == null ? "" : String(value);
  row.append(cell);
  return cell;
}

function addRowAction(row, label, action, id, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = `row-action${danger ? " danger" : " secondary"}`;
  button.addEventListener("click", () => action(id));
  row.lastElementChild.append(button);
}

async function loadList() {
  setStatus("Consultando recordatorios...");
  const filters = {
    search: elements.search.value,
    leido: elements.filterRead.value,
    page: currentPage,
    limit: Number(elements.pageLimit.value),
    sort: "fechaHora",
    order: "asc"
  };
  try {
    const response = await listarRecordatorios(filters);
    elements.tableBody.replaceChildren();
    for (const recordatorio of response.data) {
      const row = document.createElement("tr");
      addCell(row, recordatorio.id);
      addCell(row, recordatorio.tareaTitulo);
      addCell(row, recordatorio.materiaNombre);
      addCell(row, recordatorio.mensaje);
      addCell(row, formatDateTime(recordatorio.fechaHora).replace("T", " "));
      addCell(row, recordatorio.canal);
      addCell(row, recordatorio.leido ? "Leído" : "No leído");
      const actions = document.createElement("td");
      row.append(actions);
      addRowAction(row, "Consultar", selectRecordatorio, recordatorio.id);
      addRowAction(row, "Editar", id => selectRecordatorio(id, "patch"), recordatorio.id);
      addRowAction(row, "Eliminar", deleteFromRow, recordatorio.id, true);
      elements.tableBody.append(row);
    }
    totalPages = Math.max(response.meta.pages, 1);
    elements.pagination.textContent =
      `Mostrando ${response.data.length} de ${response.meta.total} recordatorios. Página ${response.meta.page} de ${totalPages}.`;
    elements.previous.disabled = currentPage <= 1;
    elements.next.disabled = currentPage >= totalPages;
    setStatus("Recordatorios consultados correctamente.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadTasks() {
  try {
    const response = await listarTareasParaRecordatorio();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecciona una tarea";
    elements.task.replaceChildren(placeholder);
    for (const task of response.data) {
      const option = document.createElement("option");
      option.value = task.tareaId;
      option.textContent = `${task.tareaTitulo} · ${task.materiaNombre}`;
      elements.task.append(option);
    }
  } catch (error) {
    setStatus(`No fue posible consultar tus tareas: ${error.message}`, "error");
  }
}

function setOperation(nextOperation) {
  operation = nextOperation;
  const [title, help] = operationNames[operation];
  elements.editorTitle.textContent = title;
  elements.operationHelp.textContent = help;
  elements.submit.textContent = {
    get: "Consultar recordatorio",
    create: "Crear recordatorio",
    replace: "Reemplazar recordatorio",
    patch: "Actualizar campos",
    delete: "Eliminar recordatorio"
  }[operation] ?? "Actualizar listado";
  elements.idField.hidden = !["get", "replace", "patch", "delete"].includes(operation);
  elements.patchFields.hidden = operation !== "patch";
  document.querySelector("#recordatorio-form").hidden = operation === "list";
  const writesFields = ["create", "replace", "patch"].includes(operation);
  elements.task.required = writesFields && operation !== "patch";
  elements.message.required = writesFields && operation !== "patch";
  elements.dateTime.required = writesFields && operation !== "patch";
  elements.channel.required = writesFields && operation !== "patch";
  elements.id.required = ["get", "replace", "patch", "delete"].includes(operation);
  if (operation === "create") clearForm(false);
  if (operation === "list") loadList();
}

function clearForm(clearId = true) {
  if (clearId) elements.id.value = "";
  elements.task.value = "";
  elements.message.value = "";
  elements.dateTime.value = "";
  elements.channel.value = "in_app";
  elements.read.checked = false;
  elements.patchFields.querySelectorAll("[data-field]").forEach(input => { input.checked = true; });
}

async function selectRecordatorio(id, nextOperation = "get") {
  setOperation(nextOperation);
  elements.id.value = id;
  try {
    const response = await obtenerRecordatorio(id);
    const recordatorio = response.data;
    elements.task.value = recordatorio.tareaId;
    elements.message.value = recordatorio.mensaje;
    elements.dateTime.value = formatDateTime(recordatorio.fechaHora);
    elements.channel.value = recordatorio.canal;
    elements.read.checked = recordatorio.leido;
    showResult(response);
    setStatus("Recordatorio consultado correctamente.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function deleteFromRow(id) {
  if (!window.confirm(`¿Eliminar el recordatorio ${id}? Esta acción no se puede deshacer.`)) return;
  try {
    await eliminarRecordatorio(id);
    showResult({ success: true, message: "Recordatorio eliminado." });
    setStatus("Recordatorio eliminado.", "success");
    await loadList();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

document.querySelectorAll("[data-operation]").forEach(button => {
  button.addEventListener("click", () => setOperation(button.dataset.operation));
});

document.querySelector("#filters-form").addEventListener("submit", event => {
  event.preventDefault();
  currentPage = 1;
  loadList();
});

elements.previous.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    loadList();
  }
});
elements.next.addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage += 1;
    loadList();
  }
});

document.querySelector("#recordatorio-form").addEventListener("submit", async event => {
  event.preventDefault();
  const id = elements.id.value;
  try {
    if (operation === "get") {
      const response = await obtenerRecordatorio(id);
      const recordatorio = response.data;
      elements.task.value = recordatorio.tareaId;
      elements.message.value = recordatorio.mensaje;
      elements.dateTime.value = formatDateTime(recordatorio.fechaHora);
      elements.channel.value = recordatorio.canal;
      elements.read.checked = recordatorio.leido;
      showResult(response);
      setStatus("Recordatorio consultado correctamente.", "success");
      return;
    }
    if (operation === "delete") {
      if (!window.confirm(`¿Eliminar el recordatorio ${id}? Esta acción no se puede deshacer.`)) return;
      await eliminarRecordatorio(id);
      showResult({ success: true, message: "Recordatorio eliminado." });
      setStatus("Recordatorio eliminado.", "success");
      await loadList();
      return;
    }

    const body = recordatorioBody(operation === "patch");
    const response = operation === "create"
      ? await crearRecordatorio(body)
      : operation === "replace"
        ? await reemplazarRecordatorio(id, body)
        : await actualizarRecordatorio(id, body);
    showResult(response);
    if (operation === "create") elements.id.value = response.data.id;
    setStatus("Operación completada correctamente.", "success");
    await loadList();
  } catch (error) {
    setStatus(error.message, "error");
    showResult({ success: false, error: { status: error.status, code: error.code, message: error.message } });
  }
});

document.querySelector("#clear-form").addEventListener("click", () => clearForm());

await loadTasks();
await loadList();
