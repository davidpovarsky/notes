// ===========================
//  מצב תצוגה (כרטיסיות / טורים)
// ===========================
let currentView = 'list'; // התחלתי במצב רשימה כדי שיתאים לעיצוב החדש
let currentLayoutMode = 'split'; // התחלתי במצב split

console.log("[INIT] Script loaded. currentView='list', currentLayoutMode='split'");

// פונקציה קטנה לעדכון הסטטוס התחתון החדש
function updateBottomStatus(count) {
    const el = document.getElementById('totalNotesBottom');
    if(el) el.textContent = count;
}

function updateLayoutVisibility() {
  console.log("[updateLayoutVisibility] Updating layout. currentView=", currentView, " mode=", currentLayoutMode);

  const app = document.getElementById('app');
  const textPanel = document.getElementById('textPanel');
  const noteFormPanel = document.getElementById('noteFormPanel');
  const notesListPanel = document.getElementById('notesListPanel');
  const rightPanel = document.getElementById('rightPanel');

  // בעיצוב החדש, אנחנו תמיד במבנה דמוי split, אבל ה-JS עדיין מנהל את ה-classes
  app.classList.remove('mode-tabs');
  app.classList.add('mode-split');

  // איפוס כל הפאנלים
  textPanel.classList.remove('active');
  noteFormPanel.classList.remove('active');
  
  // ה-rightPanel תמיד צריך להיות active כדי שהרשימה תוצג בצד
  rightPanel.classList.add('active');
  notesListPanel.classList.add('active');


  if (currentView === 'text') {
      console.log("[updateLayoutVisibility] Showing TEXT panel (Main Area)");
      textPanel.classList.add('active');
  } else if (currentView === 'note') {
      console.log("[updateLayoutVisibility] Showing NOTE FORM panel (Main Area)");
      noteFormPanel.classList.add('active');
  } else if (currentView === 'list') {
      console.log("[updateLayoutVisibility] Showing LIST view (Sidebar only on mobile, both on desktop)");
      // במצב רשימה, אם אנחנו במובייל, ה-CSS יסתיר את הטופס/טקסט ויציג רק את הרשימה
  }


  document.querySelectorAll('.top-bar .btn.tab').forEach(btn => btn.classList.remove('active'));

  if (currentView === 'text') {
    document.getElementById('textViewBtn').classList.add('active');
  } else if (currentView === 'note') {
    document.getElementById('noteViewBtn').classList.add('active');
  } else if (currentView === 'list') {
    document.getElementById('listViewBtn').classList.add('active');
  }

  const modeToggleBtn = document.getElementById('modeToggleBtn');
  modeToggleBtn.querySelector('.mode-label').textContent =
    'מצב: ' + (currentLayoutMode === 'tabs' ? 'כרטיסיות' : 'טורים');

  console.log("[updateLayoutVisibility] Layout update complete.");
}

document.getElementById('textViewBtn').addEventListener('click', () => {
  console.log("[EVENT] Click → text view");
  currentView = 'text';
  updateLayoutVisibility();
});

document.getElementById('noteViewBtn').addEventListener('click', () => {
  console.log("[EVENT] Click → note view");
  currentView = 'note';
  updateLayoutVisibility();
});

document.getElementById('listViewBtn').addEventListener('click', () => {
  console.log("[EVENT] Click → list view");
  currentView = 'list';
  updateLayoutVisibility();
});

document.getElementById('modeToggleBtn').addEventListener('click', () => {
  // כפתור זה הוסתר, אבל הלוגיקה נשמרת למקרה הצורך
  currentLayoutMode = currentLayoutMode === 'tabs' ? 'split' : 'tabs';
  console.log("[EVENT] Toggle mode →", currentLayoutMode);
  updateLayoutVisibility();
});

// ===========================
//  Global State
// ===========================
let firebaseManager = null;
let currentOwner = 199238;
let allNotes = [];
let currentCategory = 'all';
let pendingTargets = [];

function showStatus(message, type = 'success') {
  console.log(`[STATUS] ${type.toUpperCase()}:`, message);
  const statusEl = document.getElementById('connectionStatus');
  if (!statusEl) return;
  statusEl.textContent = message;
  // statusEl.className = `status ${type}`; // בוטל כדי לא לשבור את העיצוב הנקי
  statusEl.style.color = type === 'error' ? 'red' : 'var(--ios-accent)';
  statusEl.style.opacity = '1';

  if (type === 'success') {
    setTimeout(() => statusEl.style.opacity = '0.5', 4000);
  }
}

// ===========================
//  Targets (score / word / topic)
// ===========================
function resetTargets() {
  console.log("[resetTargets] Clearing all pending targets");
  pendingTargets = [];
  updateTargetsInfo();
}

function addTarget(type, value) {
  console.log("[addTarget] Adding target:", { type, value });
  if (!type || !value) return;
  pendingTargets.push({ type, value });
  updateTargetsInfo();
}

function updateTargetsInfo() {
  const el = document.getElementById('targetsInfo');
  if (!el) return;

  if (pendingTargets.length === 0) {
    el.textContent = ''; // ניקוי טקסט ברירת המחדל למראה נקי
    console.log("[updateTargetsInfo] No targets selected.");
    return;
  }

  const parts = pendingTargets.map(t => `${t.type}: ${t.value}`);
  el.textContent = 'יעדים: ' + parts.join(' | ');
  console.log("[updateTargetsInfo] Current targets:", pendingTargets);
}

function addScoreTargetFromForm() {
  const refVal = document.getElementById('ref').value.trim();
  console.log("[addScoreTargetFromForm] ref=", refVal);
  if (!refVal) {
    showStatus('אין ref להוספה', 'error');
    return;
  }
  addTarget('score', refVal);
  document.getElementById('ref').value = ''; // ניקוי השדה לאחר הוספה
}

function addWordTargetFromForm() {
  const wordVal = document.getElementById('word').value.trim();
  console.log("[addWordTargetFromForm] word=", wordVal);
  if (!wordVal) {
    showStatus('אין מילה להוספה', 'error');
    return;
  }
  addTarget('word', wordVal);
  document.getElementById('word').value = ''; // ניקוי השדה לאחר הוספה
}

function addTopicTargetFromForm() {
  const topicVal = document.getElementById('topic').value.trim();
  console.log("[addTopicTargetFromForm] topic=", topicVal);
  if (!topicVal) {
    showStatus('אין נושא להוספה', 'error');
    return;
  }
  addTarget('topic', topicVal);
  document.getElementById('topic').value = ''; // ניקוי השדה לאחר הוספה
}

// ===========================
//  Form Submit (Save Note)
// ===========================
document.getElementById('noteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  console.log("[EVENT] Submit note form");

  if (!firebaseManager) {
    showStatus('Firebase לא מאותחל', 'error');
    console.error("[ERROR] Firebase not initialized");
    return;
  }

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'שומר...';

  try {
    const noteType = document.getElementById('noteType').value;
    const contentText = document.getElementById('noteContent').value.trim();
    const ownerVal = Number(document.getElementById('owner').value) || 0;
    const now = new Date();

    console.log("[SAVE] noteType=", noteType, " content length=", contentText.length);

    if (!contentText) {
      showStatus('הערה ריקה', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'שמור';
      return;
    }

    // ברירת מחדל ליעד
    if (pendingTargets.length === 0) {
      console.log("[SAVE] No targets found. Adding default for noteType=", noteType);

      if (noteType === 'verse') {
        const refVal = document.getElementById('ref').value.trim();
        if (!refVal) {
          showStatus('חסר מקור', 'error');
          return;
        }
        addTarget('score', refVal);
      } else if (noteType === 'topic') {
        const topicVal = document.getElementById('topic').value.trim();
        if (!topicVal) {
          showStatus('חסר נושא', 'error');
          return;
        }
        addTarget('topic', topicVal);
      } else if (noteType === 'word') {
        const wordVal = document.getElementById('word').value.trim();
        if (!wordVal) {
          showStatus('חסר מילה', 'error');
          return;
        }
        addTarget('word', wordVal);
      }
    }

    const noteData = {
      id: generateNoteId(),
      owner: ownerVal,
      public: document.getElementById('isPublic').checked,
      targets: pendingTargets.slice(),
      date: now.toISOString().split('T')[0],
      content: contentText,
      timestamp: now.getTime()
    };

    console.log("[SAVE] final noteData=", noteData);

    const result = await firebaseManager.saveNoteToFirebase(noteData);
    console.log("[SAVE] Firebase result:", result);

    if (result.success) {
      showStatus('נשמר בהצלחה!', 'success');
      document.getElementById('noteForm').reset();
      document.getElementById('owner').value = currentOwner;
      document.getElementById('noteType').dispatchEvent(new Event('change'));
      resetTargets();
      loadAllNotes();
      // מעבר חזרה לרשימה לאחר שמירה במובייל
      if (window.innerWidth < 768) {
          currentView = 'list';
          updateLayoutVisibility();
      }
    } else {
      showStatus('שגיאה בשמירה: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('[SAVE ERROR]', error);
    showStatus('שגיאה: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'שמור';
  }
});

// ===========================
//  Load All Notes
// ===========================
async function loadAllNotes() {
  console.log("[loadAllNotes] Loading notes...");
  if (!firebaseManager) return;

  const container = document.getElementById('allNotes');
  container.innerHTML = '<div class="loading" style="padding:20px;text-align:center;color:#8e8e93;">טוען...</div>';

  try {
    const owner = Number(document.getElementById('owner').value) || 0;
    console.log("[loadAllNotes] owner filter=", owner);

    const result = await firebaseManager.loadAllNotesFromFirebase(owner);
    console.log("[loadAllNotes] Firebase result:", result);

    if (result.success) {
      allNotes = result.notes;
      console.log("[loadAllNotes] Loaded notes count=", allNotes.length);
      displayNotesByCategory();
      updateStats(allNotes);
      updateBottomStatus(allNotes.length);
    } else {
      container.innerHTML = '<div class="loading" style="color:red;">שגיאה: ' + result.error + '</div>';
    }
  } catch (error) {
    console.error("[loadAllNotes ERROR]", error);
    container.innerHTML = '<div class="loading" style="color:red;">שגיאה: ' + error.message + '</div>';
  }
}

function hasTargetType(note, type) {
  const result = Array.isArray(note.targets) && note.targets.some((t) => t.type === type);
  // console.log("[hasTargetType]", { noteId: note.id, type, result }); // Reduced log spam
  return result;
}

function displayNotesByCategory() {
  console.log("[displayNotesByCategory] Filtering notes by category...");

  const scoreNotes = allNotes.filter((note) => hasTargetType(note, 'score'));
  const topicNotes = allNotes.filter((note) => hasTargetType(note, 'topic'));
  const wordNotes = allNotes.filter((note) => hasTargetType(note, 'word'));

  console.log("[displayNotesByCategory] score=", scoreNotes.length,
              " topic=", topicNotes.length,
              " word=", wordNotes.length);

  displayNotesInContainer('allNotes', allNotes, 'אין הערות');
  displayNotesInContainer('scoreNotesContainer', scoreNotes, 'אין הערות מקור');
  displayNotesInContainer('topicNotesContainer', topicNotes, 'אין הערות נושא');
  displayNotesInContainer('wordNotesContainer', wordNotes, 'אין הערות מילה');
}

function displayNotesInContainer(containerId, notes, emptyMessage) {
  console.log(`[displayNotesInContainer] container=${containerId} notes=${notes.length}`);

  const container = document.getElementById(containerId);
  if (!container) return;

  if (notes.length === 0) {
    container.innerHTML = `<div class="loading" style="padding:20px;text-align:center;color:#8e8e93;">${emptyMessage}</div>`;
    return;
  }

  container.innerHTML = notes.map(note => {
    const dateObj = note.date ? new Date(note.date) : new Date();
    const dateText = dateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });

    // לוגיקה לבחירת הכותרת הראשית (היעד הראשון או טקסט ברירת מחדל)
    let mainTitle = "הערה כללית";
    if (note.targets && note.targets.length > 0) {
        const t = note.targets[0];
        if (t.type === 'score') mainTitle = t.value;
        else if (t.type === 'topic') mainTitle = t.value;
        else if (t.type === 'word') mainTitle = t.value;
    }

    // יצירת תקציר תוכן נקי
    let cleanContent = (note.content || '').replace(/<[^>]*>?/gm, '').substring(0, 50);
    if ((note.content || '').length > 50) cleanContent += '...';

    // פונקציית עזר לטיפול בלחיצה על הערה (לפתיחתה בעתיד)
    const onClickAttr = `onclick="onNoteClick('${note.id}')"`;

    return `
      <div class="note-item" ${onClickAttr}>
        <div class="note-header">
          <div class="note-ref">${mainTitle}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
             <div style="flex: 1; overflow: hidden;">
                <span class="note-date">${dateText} &nbsp;</span>
                <span class="note-content">${cleanContent}</span>
            </div>
             <button class="delete-btn" onclick="event.stopPropagation(); deleteNote('${note.id}')">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

// פונקציה חדשה לטיפול בלחיצה על הערה ברשימה
function onNoteClick(noteId) {
    console.log("Note clicked:", noteId);
    // כאן תהיה לוגיקה לטעינת ההערה לפאנל התוכן הראשי
    // לדוגמה:
    currentView = 'text';
    updateLayoutVisibility();
    const textPanel = document.getElementById('textPanel');
    textPanel.innerHTML = `<div style="padding: 20px;">טוען הערה ${noteId}... (כאן תוצג ההערה המלאה)</div>`;
    // במובייל, זה יעביר את המשתמש למסך התוכן
}


function updateStats(notes) {
  console.log("[updateStats] Updating summary stats for", notes.length, "notes");

  document.getElementById('totalNotes').textContent = notes.length;
  document.getElementById('scoreNotes').textContent = notes.filter(n => hasTargetType(n, 'score')).length;
  document.getElementById('topicNotes').textContent = notes.filter(n => hasTargetType(n, 'topic')).length;
  document.getElementById('wordNotes').textContent = notes.filter(n => hasTargetType(n, 'word')).length;
}

async function deleteNote(noteId) {
  console.log("[deleteNote] Deleting", noteId);

  if (!confirm('למחוק הערה זו?')) {
    console.log("[deleteNote] Cancelled by user");
    return;
  }

  if (!firebaseManager) {
    showStatus('Firebase לא מחובר', 'error');
    return;
  }

  try {
    const result = await firebaseManager.deleteNoteFromFirebase(noteId);
    console.log("[deleteNote] Firebase result:", result);

    if (result.success) {
      showStatus('נמחק', 'success');
      loadAllNotes();
    } else {
      showStatus('שגיאה במחיקה', 'error');
    }
  } catch (error) {
    console.error('[deleteNote ERROR]', error);
    showStatus('שגיאה: ' + error.message, 'error');
  }
}

// ===========================
//  Firebase Config & Manager (ללא שינוי)
// ===========================
const firebaseConfig = {
  apiKey: "AIzaSyCEcJe51mA8ebOscuSFYlEkmsefCYTDI60",
  authDomain: "notes-2f4a3.firebaseapp.com",
  projectId: "notes-2f4a3",
  storageBucket: "notes-2f4a3.firebasestorage.app",
  messagingSenderId: "647525876886",
  appId: "1:647525876886:web:1bdfe238198e29a021eeb7"
};

class FirebaseNotesManager {
  constructor() {
    console.log("[FirebaseNotesManager] Constructor called.");
    this.db = null;
    this.initialized = false;
  }

  async initializeFirebase() {
    console.log("[FirebaseNotesManager.initializeFirebase] Initializing Firebase…");

    if (this.initialized) {
      console.log("[FirebaseNotesManager.initializeFirebase] Already initialized.");
      return true;
    }

    try {
      const { initializeApp } =
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
      const {
        getFirestore,
        collection,
        doc,
        getDocs,
        deleteDoc,
        query,
        where,
        setDoc,
        getDoc,
        updateDoc,
        arrayUnion,
        arrayRemove
      } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
      );

      const app = initializeApp(firebaseConfig);
      this.db = getFirestore(app);

      this.collection = collection;
      this.doc = doc;
      this.getDocs = getDocs;
      this.deleteDoc = deleteDoc;
      this.query = query;
      this.where = where;
      this.setDoc = setDoc;
      this.getDoc = getDoc;
      this.updateDoc = updateDoc;
      this.arrayUnion = arrayUnion;
      this.arrayRemove = arrayRemove;

      this.initialized = true;

      console.log("[FirebaseNotesManager.initializeFirebase] SUCCESS");
      return true;

    } catch (error) {
      console.error("[FirebaseNotesManager.initializeFirebase] ERROR:", error);
      return false;
    }
  }

  async ensureIndexDoc() {
    const indexDocRef = this.doc(this.db, 'index', 'index');
    await this.setDoc(indexDocRef, {}, { merge: true });
    return indexDocRef;
  }

  parseScoreValue(value) {
    const verseMatch = value.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (verseMatch) {
      const [, book, chapter, verse] = verseMatch;
      return { book, chapter, verse, level: 'verse' };
    }
    const chapterMatch = value.match(/^(.+?)\s+(\d+)$/);
    if (chapterMatch) {
      const [, book, chapter] = chapterMatch;
      return { book, chapter, verse: null, level: 'chapter' };
    }
    return { book: value, chapter: null, verse: null, level: 'book' };
  }

  async updateIndices(noteData) {
    if (!this.initialized || !noteData.id || !Array.isArray(noteData.targets)) return;
    try {
      const indexDocRef = await this.ensureIndexDoc();
      for (const tgt of noteData.targets) {
        if (!tgt || !tgt.type || !tgt.value) continue;
        if (tgt.type === 'score') {
          const parsed = this.parseScoreValue(tgt.value);
          if (!parsed || !parsed.book) continue;
          if (parsed.level === 'verse') {
            await this.updateDoc(indexDocRef, { [`score.${parsed.book}.${parsed.chapter}.${parsed.verse}`]: this.arrayUnion(noteData.id) });
          } else if (parsed.level === 'chapter') {
            await this.updateDoc(indexDocRef, { [`score.${parsed.book}.${parsed.chapter}._chapter`]: this.arrayUnion(noteData.id) });
          } else if (parsed.level === 'book') {
            await this.updateDoc(indexDocRef, { [`score.${parsed.book}._book`]: this.arrayUnion(noteData.id) });
          }
        } else if (tgt.type === 'word') {
          await this.updateDoc(indexDocRef, { [`words.${tgt.value}`]: this.arrayUnion(noteData.id) });
        } else if (tgt.type === 'topic') {
          await this.updateDoc(indexDocRef, { [`topics.${tgt.value}`]: this.arrayUnion(noteData.id) });
        }
      }
    } catch (error) { console.error("[updateIndices ERROR]", error); }
  }

  async removeIndices(noteData) {
    if (!this.initialized || !noteData.id || !Array.isArray(noteData.targets)) return;
    try {
      const indexDocRef = this.doc(this.db, 'index', 'index');
      const snap = await this.getDoc(indexDocRef);
      if (!snap.exists()) return;
      for (const tgt of noteData.targets) {
        if (!tgt || !tgt.type || !tgt.value) continue;
        if (tgt.type === 'score') {
          const parsed = this.parseScoreValue(tgt.value);
          if (!parsed || !parsed.book) continue;
          if (parsed.level === 'verse') {
            await this.updateDoc(indexDocRef, { [`score.${parsed.book}.${parsed.chapter}.${parsed.verse}`]: this.arrayRemove(noteData.id) });
          } else if (parsed.level === 'chapter') {
            await this.updateDoc(indexDocRef, { [`score.${parsed.book}.${parsed.chapter}._chapter`]: this.arrayRemove(noteData.id) });
          } else if (parsed.level === 'book') {
            await this.updateDoc(indexDocRef, { [`score.${parsed.book}._book`]: this.arrayRemove(noteData.id) });
          }
        } else if (tgt.type === 'word') {
          await this.updateDoc(indexDocRef, { [`words.${tgt.value}`]: this.arrayRemove(noteData.id) });
        } else if (tgt.type === 'topic') {
          await this.updateDoc(indexDocRef, { [`topics.${tgt.value}`]: this.arrayRemove(noteData.id) });
        }
      }
    } catch (error) { console.error("[removeIndices ERROR]", error); }
  }

  async saveNoteToFirebase(noteData) {
    if (!this.initialized) await this.initializeFirebase();
    try {
      const ref = this.doc(this.db, 'nots', noteData.id);
      await this.setDoc(ref, noteData);
      await this.updateIndices(noteData);
      return { success: true, id: noteData.id };
    } catch (error) { return { success: false, error: error.message }; }
  }

  async loadAllNotesFromFirebase(owner) {
    if (!this.initialized) await this.initializeFirebase();
    try {
      const notesCol = this.collection(this.db, 'nots');
      let q;
      if (owner) {
        q = this.query(notesCol, this.where('owner', '==', owner));
      } else {
        q = this.query(notesCol);
      }
      const snap = await this.getDocs(q);
      const notes = [];
      snap.forEach(docSnap => notes.push({ id: docSnap.id, ...docSnap.data() }));
      notes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return { success: true, notes };
    } catch (error) { return { success: false, error: error.message }; }
  }

  async deleteNoteFromFirebase(noteId) {
    if (!this.initialized) await this.initializeFirebase();
    try {
      const noteRef = this.doc(this.db, 'nots', noteId);
      const snap = await this.getDoc(noteRef);
      if (!snap.exists()) return { success: false, error: 'Note not found' };
      const noteData = snap.data();
      await this.removeIndices(noteData);
      await this.deleteDoc(noteRef);
      return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
  }
}

// ===========================
//  App Init & Utils
// ===========================
function generateNoteId() {
  return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function initApp() {
  console.log("[initApp] START");
  
  // כפייה של מצב התחלתי שמתאים לעיצוב החדש
  currentLayoutMode = 'split';
  // currentView = 'list'; // כבר מוגדר למעלה

  updateLayoutVisibility();

  firebaseManager = new FirebaseNotesManager();
  const ok = await firebaseManager.initializeFirebase();

  if (ok) {
    showStatus('מחובר', 'success');
    loadAllNotes();
  } else {
    showStatus('שגיאת התחברות', 'error');
  }

  console.log("[initApp] COMPLETE");
}

// ===========================
//  UI Events
// ===========================
document.getElementById('loadAllBtn')
  .addEventListener('click', () => {
    console.log("[EVENT] Click load all notes");
    loadAllNotes();
  });

document.getElementById('clearBtn')
  .addEventListener('click', () => {
    console.log("[EVENT] Click clear note form");
    document.getElementById('noteForm').reset();
    document.getElementById('owner').value = currentOwner;
    document.getElementById('noteType').dispatchEvent(new Event('change'));
    resetTargets();
  });

document.querySelectorAll('.category-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    console.log("[EVENT] Switch category:", tab.getAttribute('data-category'));
    // הסרת active מכל הטאבים
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    // הוספת active לטאב שנלחץ
    tab.classList.add('active');
    
    const cat = tab.getAttribute('data-category');
    // הסתרת כל הקונטיינרים
    document.querySelectorAll('.notes-category').forEach(el => el.style.display = 'none');
    
    // הצגת הקונטיינר הרלוונטי
    if (cat === 'all') document.getElementById('allNotes').style.display = 'block';
    else if (cat === 'score') document.getElementById('scoreNotesContainer').style.display = 'block';
    else if (cat === 'topic') document.getElementById('topicNotesContainer').style.display = 'block';
    else if (cat === 'word') document.getElementById('wordNotesContainer').style.display = 'block';
  });
});

document.getElementById('noteType')
  .addEventListener('change', (e) => {
    const type = e.target.value;
    console.log("[EVENT] noteType changed to:", type);

    const fields = ['refGroup', 'wordGroup', 'topicGroup'];
    fields.forEach((id) => {
      document.getElementById(id).style.display = 'none';
    });

    if (type === 'verse') {
      document.getElementById('refGroup').style.display = 'block';
    }
    else if (type === 'topic') {
      document.getElementById('topicGroup').style.display = 'block';
    }
    else if (type === 'word') {
      document.getElementById('refGroup').style.display = 'block';
      document.getElementById('wordGroup').style.display = 'block';
    }

    resetTargets();
  });

document.addEventListener('DOMContentLoaded', () => {
  console.log("[EVENT] DOMContentLoaded → initializing app");
  document.getElementById('noteType').dispatchEvent(new Event('change'));
  initApp();
});
