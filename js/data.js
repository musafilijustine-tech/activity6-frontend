import { CONFIG } from "./config.js";

const KEY = CONFIG.STORAGE_KEY;

// 8 made-up starting records. Added only once, when the storage key
// does NOT exist yet (see readAll below).
const SEED_RECORDS = [
  { id: 1, title: "Broken classroom light",
    category: "Electrical",
    description: "The light in Room B12 does not switch on.",
    status: "Pending" },
  { id: 2, title: "Leaking tap in hostel kitchen",
    category: "Plumbing",
    description: "The cold tap in the Hostel A kitchen drips all night and wastes water.",
    status: "In progress" },
  { id: 3, title: "Loose chair backrest",
    category: "Furniture",
    description: "A chair in Lecture Hall 2 has a loose backrest and is unsafe to sit on.",
    status: "Pending" },
  { id: 4, title: "Faulty power socket",
    category: "Electrical",
    description: "The socket beside the library reading desk sparks when a charger is plugged in.",
    status: "Completed" },
  { id: 5, title: "Blocked drain outside Lab 3",
    category: "Plumbing",
    description: "Water pools at the entrance of Computer Lab 3 whenever it rains.",
    status: "In progress" },
  { id: 6, title: "Damaged study desk drawer",
    category: "Furniture",
    description: "The bottom drawer of the study desk in the reading room is broken.",
    status: "Pending" },
  { id: 7, title: "Flickering corridor lights",
    category: "Electrical",
    description: "The corridor lights in the science block flicker constantly in the evening.",
    status: "In progress" },
  { id: 8, title: "Window latch will not close",
    category: "Furniture",
    description: "The window in Room C4 does not latch shut, so the room is cold at night.",
    status: "Completed" }
];

// ---------- private helpers ----------

function readAll() {
  const raw = localStorage.getItem(KEY);

  // Key missing => first ever visit => seed once.
  if (raw === null) {
    const seeded = SEED_RECORDS.map((r) => ({ ...r }));
    localStorage.setItem(KEY, JSON.stringify(seeded));
    return seeded;
  }

  // Key exists (possibly "[]" — an empty saved array must stay empty).
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupted data — reset to empty instead of crashing the app.
    localStorage.setItem(KEY, JSON.stringify([]));
    return [];
  }
}

function writeAll(records) {
  localStorage.setItem(KEY, JSON.stringify(records));
}

function nextId(records) {
  return records.reduce((max, r) => (r.id > max ? r.id : max), 0) + 1;
}

// ---------- public API (the Model) ----------

export const recordService = {
  async list() {
    return readAll();
  },

  async get(id) {
    const records = readAll();
    const found = records.find((r) => r.id === Number(id));
    if (!found) throw new Error(`Record ${id} was not found.`);
    return { ...found };                        // return a copy, not the stored object
  },

  async create(record) {
    const records = readAll();
    const newRecord = {
      id: nextId(records),
      title: record.title,
      category: record.category,
      description: record.description,
      status: record.status
    };
    records.push(newRecord);
    writeAll(records);
    return { ...newRecord };
  },

  async update(id, record) {
    const records = readAll();
    const index = records.findIndex((r) => r.id === Number(id));
    if (index === -1) throw new Error(`Record ${id} was not found.`);

    const updated = {
      id: records[index].id,                    // id never changes
      title: record.title,
      category: record.category,
      description: record.description,
      status: record.status
    };
    records[index] = updated;
    writeAll(records);
    return { ...updated };
  },

  async remove(id) {
    const records = readAll();
    const index = records.findIndex((r) => r.id === Number(id));
    if (index === -1) throw new Error(`Record ${id} was not found.`);

    records.splice(index, 1);
    writeAll(records);
    return { message: `Record ${id} was deleted.` };
  }
};