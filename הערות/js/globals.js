// ===========================
//  Global State & Variables
// ===========================

// Firebase Manager Instance
let firebaseManager = null;

// Current owner ID
let currentOwner = 199238;

// All loaded notes
let allNotes = [];

// Current selected category filter
let currentCategory = 'all';

console.log("[GLOBALS] Global variables initialized");

// ===========================
//  Helper Functions
// ===========================

// Update stats in UI (with null checks)
function updateStats(notes) {
  console.log("[updateStats] Updating summary stats for", notes.length, "notes");

  // Update total count (if element exists)
  const totalEl = document.getElementById('totalNotes');
  if (totalEl) totalEl.textContent = notes.length;

  // Update score count (if element exists)
  const scoreEl = document.getElementById('scoreNotes');
  if (scoreEl) scoreEl.textContent = notes.filter(n => hasTargetType(n, 'score')).length;

  // Update topic count (if element exists)
  const topicEl = document.getElementById('topicNotes');
  if (topicEl) topicEl.textContent = notes.filter(n => hasTargetType(n, 'topic')).length;

  // Update word count (if element exists)
  const wordEl = document.getElementById('wordNotes');
  if (wordEl) wordEl.textContent = notes.filter(n => hasTargetType(n, 'word')).length;
}

// Check if note has specific target type
function hasTargetType(note, type) {
  return Array.isArray(note.targets) && note.targets.some((t) => t.type === type);
}

// Update bottom status counter
function updateBottomStatus(count) {
  const el = document.getElementById('totalNotesBottom');
  if (el) el.textContent = count;
}

// Generate unique note ID
function generateNoteId() {
  return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}