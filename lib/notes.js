import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".config", "om");
const NOTES_FILE = join(CONFIG_DIR, "notes.json");

function loadNotes() {
  if (!existsSync(NOTES_FILE)) return {};
  return JSON.parse(readFileSync(NOTES_FILE, "utf-8"));
}

function saveNotes(notes) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2) + "\n");
}

export function getNote(modelName) {
  return loadNotes()[modelName] || null;
}

export function setNote(modelName, text) {
  const notes = loadNotes();
  notes[modelName] = text;
  saveNotes(notes);
}

export function deleteNote(modelName) {
  const notes = loadNotes();
  delete notes[modelName];
  saveNotes(notes);
}

export function getAllNotes() {
  return loadNotes();
}
