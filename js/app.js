import { recordService } from "./data.js";

// ---------------- DOM references ----------------
const form          = document.getElementById("record-form");
const formTitle     = document.getElementById("form-title");
const titleInput    = document.getElementById("title");
const categoryInput = document.getElementById("category");
const descInput     = document.getElementById("description");
const statusInput   = document.getElementById("status");
const submitBtn     = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

const searchInput = document.getElementById("search");
const filterInput = document.getElementById("filter-status");
const recordsBody = document.getElementById("records-body");
const emptyState  = document.getElementById("empty-state");
const countEl     = document.getElementById("record-count");
const messageEl   = document.getElementById("message");

const viewDialog    = document.getElementById("view-dialog");
const viewContent   = document.getElementById("view-content");
const deleteDialog  = document.getElementById("delete-dialog");
const deleteText    = document.getElementById("delete-text");

// ---------------- State ----------------
let editingId       = null;   // null = "add" mode, number = "edit" mode
let pendingDeleteId = null;

// ---------------- Validation ----------------
const VALID_STATUSES   = ["Pending", "In progress", "Completed"];
const VALID_CATEGORIES = ["Electrical", "Plumbing", "Furniture"];

function validate(values) {
  const errors = [];
  const title       = values.title.trim();
  const category    = values.category.trim();
  const description = values.description.trim();
  const status      = values.status.trim();

  if (title.length < 3 || title.length > 80)
    errors.push("Title must be between 3 and 80 characters.");
  if (category.length < 2 || category.length > 40)
    errors.push("Category must be between 2 and 40 characters.");
  else if (!VALID_CATEGORIES.includes(category))
    errors.push("Choose a category from the list.");
  if (description.length < 5 || description.length > 300)
    errors.push("Description must be between 5 and 300 characters.");
  if (!VALID_STATUSES.includes(status))
    errors.push("Choose a valid status.");

  return errors;
}

// ---------------- Messages ----------------
let messageTimer = null;
function showMessage(text, type = "info") {
  messageEl.textContent = text;
  messageEl.className = `message message--${type}`;
  if (messageTimer) clearTimeout(messageTimer);
  if (type === "success") {                   // errors stay visible until replaced
    messageTimer = setTimeout(() => {
      messageEl.textContent = "";
      messageEl.className = "message";
    }, 4000);
  }
}

// ---------------- Rendering (view side of MVC) ----------------
function statusClass(status) {
  if (status === "Pending")     return "pending";
  if (status === "In progress") return "progress";
  return "completed";
}

function makeButton(label, className, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

function buildRow(record) {
  const tr = document.createElement("tr");

  // ID (display only — never editable)
  const idCell = document.createElement("td");
  idCell.textContent = String(record.id);
  tr.appendChild(idCell);

  // Title
  const titleCell = document.createElement("td");
  titleCell.textContent = record.title;
  tr.appendChild(titleCell);

  // Category
  const catCell = document.createElement("td");
  catCell.textContent = record.category;
  tr.appendChild(catCell);

  // Status badge
  const statusCell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `badge badge--${statusClass(record.status)}`;
  badge.textContent = record.status;
  statusCell.appendChild(badge);
  tr.appendChild(statusCell);

  // Actions
  const actionsCell = document.createElement("td");
  const wrap = document.createElement("div");
  wrap.className = "actions";
  wrap.append(
    makeButton("View",   "btn btn-small btn-ghost",     () => openView(record.id)),
    makeButton("Edit",   "btn btn-small btn-secondary", () => startEdit(record.id)),
    makeButton("Delete", "btn btn-small btn-danger",    () => askDelete(record.id, record.title))
  );
  actionsCell.appendChild(wrap);
  tr.appendChild(actionsCell);

  return tr;
}

async function refresh() {
  const all     = await recordService.list();
  const search  = searchInput.value.trim().toLowerCase();
  const filter  = filterInput.value;

  const visible = all
    .filter((r) => !search || r.title.toLowerCase().includes(search))
    .filter((r) => !filter || r.status === filter)
    .sort((a, b) => b.id - a.id);            // newest first

  recordsBody.replaceChildren();
  if (visible.length === 0) {
    emptyState.hidden = false;
    emptyState.textContent = all.length === 0
      ? "No records yet. Add your first request using the form above."
      : "No records match your search or filter.";
  } else {
    emptyState.hidden = true;
    const frag = document.createDocumentFragment();
    visible.forEach((r) => frag.appendChild(buildRow(r)));
    recordsBody.appendChild(frag);
  }

  countEl.textContent =
    `Showing ${visible.length} of ${all.length} record${all.length === 1 ? "" : "s"}.`;
}

// ---------------- View dialog ----------------
function addViewItem(label, value) {
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = String(value);
  viewContent.append(dt, dd);
}

async function openView(id) {
  try {
    const r = await recordService.get(id);
    viewContent.replaceChildren();
    addViewItem("ID", r.id);
    addViewItem("Title", r.title);
    addViewItem("Category", r.category);
    addViewItem("Description", r.description);
    addViewItem("Status", r.status);
    viewDialog.showModal();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

// ---------------- Edit flow ----------------
async function startEdit(id) {
  try {
    const r = await recordService.get(id);
    editingId        = r.id;
    titleInput.value = r.title;
    categoryInput.value = r.category;
    descInput.value  = r.description;
    statusInput.value = r.status;

    formTitle.textContent = `Edit record #${r.id}`;
    submitBtn.textContent = "Save changes";
    cancelEditBtn.hidden  = false;

    document.getElementById("manage").scrollIntoView({ behavior: "smooth" });
    titleInput.focus();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

function resetForm() {
  editingId = null;
  form.reset();                       // category back to "", status back to "Pending"
  formTitle.textContent  = "Add a new request";
  submitBtn.textContent  = "Add record";
  cancelEditBtn.hidden   = true;
}

// ---------------- Delete flow ----------------
function askDelete(id, title) {
  pendingDeleteId = id;
  deleteText.textContent = `Delete "${title}"? This cannot be undone.`;
  deleteDialog.returnValue = "";      // guard against a stale "confirm" from a previous open
  deleteDialog.showModal();
}

deleteDialog.addEventListener("close", async () => {
  const id = pendingDeleteId;
  pendingDeleteId = null;
  if (deleteDialog.returnValue !== "confirm" || id === null) return;  // Cancel or Esc

  try {
    const result = await recordService.remove(id);
    if (editingId === id) resetForm();          // don't edit a record that no longer exists
    await refresh();
    showMessage(result.message, "success");
  } catch (error) {
    showMessage(error.message, "error");
  }
});

// ---------------- Add / Update on submit ----------------
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const raw = {
    title:       titleInput.value,
    category:    categoryInput.value,
    description: descInput.value,
    status:      statusInput.value
  };

  const errors = validate(raw);
  if (errors.length) {
    showMessage(errors[0], "error");
    return;
  }

  // Trim BEFORE saving — the brief requires this.
  const clean = {
    title:       raw.title.trim(),
    category:    raw.category.trim(),
    description: raw.description.trim(),
    status:      raw.status.trim()
  };

  try {
    if (editingId === null) {
      const created = await recordService.create(clean);
      showMessage(`Record #${created.id} was added.`, "success");
    } else {
      const updated = await recordService.update(editingId, clean);
      showMessage(`Record #${updated.id} was updated.`, "success");
    }
    resetForm();
    await refresh();
  } catch (error) {
    showMessage(error.message, "error");
  }
});

// ---------------- Search, filter, cancel ----------------
searchInput.addEventListener("input", refresh);
filterInput.addEventListener("change", refresh);

cancelEditBtn.addEventListener("click", () => {
  resetForm();
  showMessage("Edit cancelled.", "info");
});

// ---------------- Start ----------------
refresh().catch((error) => showMessage(error.message, "error"));