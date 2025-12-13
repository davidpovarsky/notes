// ===========================
//  Firebase Config & Manager
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
      return true;
    }

    try {
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
      const {
        getFirestore, collection, doc, getDocs, deleteDoc, query, where, setDoc, getDoc, updateDoc,
        arrayUnion, arrayRemove, deleteField
      } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

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
      this.deleteField = deleteField;

      const app = initializeApp(firebaseConfig);
      this.db = getFirestore(app);

      this.initialized = true;
      console.log("[FirebaseNotesManager.initializeFirebase] SUCCESS");
      return true;

    } catch (error) {
      console.error("[FirebaseNotesManager.initializeFirebase] ERROR:", error);
      return false;
    }
  }

  async ensureIndexDoc() {
    const indexDocRef = this.doc(this.db, 'indexes', 'main');
    await this.setDoc(indexDocRef, {}, { merge: true });
    return indexDocRef;
  }

  // פונקציית העדכון החדשה - משתמשת בנתוני הספר שהתקבלו מה-API
  async updateIndices(noteData) {
    if (!this.initialized || !noteData.id || !Array.isArray(noteData.targets)) return;
    
    try {
      const indexDocRef = await this.ensureIndexDoc();
      
      for (const tgt of noteData.targets) {
        if (!tgt || !tgt.type || !tgt.value) continue;

        // --- טיפול במקור (SCORE) ---
        if (tgt.type === 'score') {
            // לוקחים את שם הספר והמקור מהאובייקט
            let book = tgt.book; 
            let refString = tgt.value; // "Genesis 1:1"
            
            // אם במקרה אין book (גיבוי), ננסה לחלץ בסיסית
            if (!book) {
                const parts = refString.split(' ');
                book = parts[0]; 
            }

            // הסרת שם הספר מה-Ref כדי לקבל רק את המספרים
            let rest = refString.replace(book, '').trim(); 
            
            // פיצול לפי נקודות או נקודתיים ליצירת הנתיב
            const levels = rest.replace(/:/g, '.').split('.');
            
            // בניית הנתיב הסופי: score.[book].[level1].[level2]...
            let path = `score.${book}`;
            if (levels.length > 0 && levels[0] !== '') {
                path += '.' + levels.join('.');
            }
            
            console.log(`[Indexing] Creating path: ${path} for note ${noteData.id}`);
            
            // ביצוע העדכון ב-Firestore
            await this.updateDoc(indexDocRef, { 
                [path]: this.arrayUnion(noteData.id) 
            });

        // --- טיפול במילה/נושא ---
        } else if (tgt.type === 'word') {
          await this.updateDoc(indexDocRef, { [`words.${tgt.value}`]: this.arrayUnion(noteData.id) });
        } else if (tgt.type === 'topic') {
          await this.updateDoc(indexDocRef, { [`topics.${tgt.value}`]: this.arrayUnion(noteData.id) });
        }
      }
    } catch (error) { console.error("[updateIndices ERROR]", error); }
  }

  // פונקציית המחיקה
  async removeIndices(noteData) {
    if (!this.initialized || !noteData.id || !Array.isArray(noteData.targets)) return;
    try {
      const indexDocRef = this.doc(this.db, 'indexes', 'main');
      const snap = await this.getDoc(indexDocRef);
      if (!snap.exists()) return;

      for (const tgt of noteData.targets) {
        if (!tgt || !tgt.type || !tgt.value) continue;

        if (tgt.type === 'score') {
            let book = tgt.book;
            let refString = tgt.value;
            if (!book) {
                book = refString.split(' ')[0];
            }
            let rest = refString.replace(book, '').trim();
            const levels = rest.replace(/:/g, '.').split('.');
            
            let path = `score.${book}`;
            if (levels.length > 0 && levels[0] !== '') {
                path += '.' + levels.join('.');
            }

            await this.updateDoc(indexDocRef, { 
                [path]: this.arrayRemove(noteData.id) 
            });

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
      
      // === תיקון: החזרת המפתח הסודי הנדרש ליצירת המסמך ===
      await this.setDoc(ref, {
        ...noteData,
        secretKey: "1234567890_SUPER_SECRET"
      });

      // מחיקת הסוד מהמסמך כדי שלא יישמר בדאטה
      await this.updateDoc(ref, {
        secretKey: this.deleteField()
      });

      // עדכון אינדקסים
      await this.updateIndices(noteData);

      return { success: true, id: noteData.id };

    } catch (error) {
      console.error("[saveNoteToFirebase ERROR]", error);
      return { success: false, error: error.message };
    }
  }

  async loadAllNotesFromFirebase() {
    if (!this.initialized) await this.initializeFirebase();
    try {
      const notesCol = this.collection(this.db, 'nots');
      const snap = await this.getDocs(notesCol);
      const notes = [];
      snap.forEach(docSnap => {
        notes.push({ id: docSnap.id, ...docSnap.data() });
      });
      // מיון: חדש למעלה
      notes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return { success: true, notes };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async loadNoteById(noteId) {
    if (!this.initialized) await this.initializeFirebase();
    try {
      const noteRef = this.doc(this.db, 'nots', noteId);
      const snap = await this.getDoc(noteRef);
      if (!snap.exists()) {
        return { success: false, error: 'Note not found' };
      }
      const note = { id: snap.id, ...snap.data() };
      return { success: true, note };
    } catch (error) {
      return { success: false, error: error.message };
    }
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