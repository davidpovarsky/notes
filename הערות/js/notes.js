// ===========================
//  Form Submit (Save Note)
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('noteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("[EVENT] Submit note form");

    if (!firebaseManager) {
      showStatus('Firebase לא מאותחל', 'error');
      console.error("[ERROR] Firebase not initialized");
      return;
    }

    const saveBtn = document.getElementById('saveBtn');
    
    // בדיקת שדות שנשארו פתוחים ולא נוספו לרשימה
    const refInputVal = document.getElementById('refInput').value.trim();
    if (refInputVal && pendingTargets.length === 0) {
        // אם המשתמש כתב מקור אבל שכח ללחוץ על "הוסף", ננסה להוסיף אותו כעת
        // מכיוון שזו פעולה אסינכרונית, עלינו להמתין לה
        await addScoreTargetWithApi();
        
        // אם אחרי הניסיון עדיין אין יעדים (כי הייתה שגיאה), עוצרים
        if (pendingTargets.length === 0) {
            return; // ההודעה כבר הוצגה בתוך הפונקציה addScoreTargetWithApi
        }
    }

    // ואלידציה בסיסית - חייב להיות לפחות יעד אחד או תוכן
    const contentText = document.getElementById('noteContent').value.trim();
    if (!contentText && pendingTargets.length === 0) {
        showStatus('יש להזין תוכן או להוסיף תיוג (מקור/מילה/נושא)', 'error');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'שומר...';

    try {
      const ownerVal = Number(document.getElementById('owner').value) || 0;
      const now = new Date();

      // קביעת כותרת אוטומטית (לפי היעד הראשון)
      let autoTitle = "הערה";
      if (pendingTargets.length > 0) {
        autoTitle = pendingTargets[0].value;
      } else {
          // אם אין יעדים, ניקח כמה מילים מהתוכן
          autoTitle = contentText.substring(0, 20) + (contentText.length > 20 ? '...' : '');
      }

      const noteData = {
        id: generateNoteId(),
        title: autoTitle,
        content: contentText,
        public: document.getElementById('isPublic').checked,
        targets: pendingTargets.slice(), // העתקת היעדים (כולל המטא-דאטה של הספרים)
        date: now.toISOString().split('T')[0],
        timestamp: now.getTime(),
        owner: ownerVal,
        isComment: false,
        parentId: null,
        replyOrder: null,
        linkedTo: null,
        links: [],
        comments: []
      };

      console.log("[SAVE] final noteData=", noteData);

      const result = await firebaseManager.saveNoteToFirebase(noteData);
      console.log("[SAVE] Firebase result:", result);

      if (result.success) {
        showStatus('נשמר בהצלחה!', 'success');
        
        // איפוס הטופס
        document.getElementById('noteForm').reset();
        document.getElementById('owner').value = currentOwner;
        
        // החזרת ברירת המחדל של התצוגה (מקור)
        resetInputVisibility(); 
        resetTargets();
        
        loadAllNotes();
        
        // מעבר חזרה לתצוגת טקסט (או רשימה במובייל)
        if (window.innerWidth < 768) {
             currentView = 'list';
        } else {
             currentView = 'text';
             // הצגת ההערה החדשה שנוצרה (אופציונלי)
        }
        updateLayoutVisibility();

      } else {
        showStatus('שגיאה בשמירה: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('[SAVE ERROR]', error);
      showStatus('שגיאה: ' + error.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'שמור הערה';
    }
  });
});

// ===========================
//  Load All Notes
// ===========================
async function loadAllNotes() {
  console.log("[loadAllNotes] Loading notes...");
  if (!firebaseManager) return;

  const container = document.getElementById('allNotes');
  container.innerHTML = '<div class="loading">טוען...</div>';

  try {
    const result = await firebaseManager.loadAllNotesFromFirebase();
    console.log("[loadAllNotes] Firebase result:", result);

    if (result.success) {
      allNotes = result.notes || [];
      console.log("[loadAllNotes] Loaded notes count=", allNotes.length);

      displayNotesByCategory();
      updateStats(allNotes);
      updateBottomStatus(allNotes.length);
      updateSettingsStats();
    } else {
      container.innerHTML = '<div class="loading" style="color:var(--accent-red);">שגיאה: ' + result.error + '</div>';
    }
  } catch (error) {
    console.error("[loadAllNotes ERROR]", error);
    container.innerHTML = '<div class="loading" style="color:var(--accent-red);">שגיאה: ' + error.message + '</div>';
  }
}

function displayNotesByCategory() {
  console.log("[displayNotesByCategory] Filtering notes by category...");

  const scoreNotes = allNotes.filter((note) => hasTargetType(note, 'score'));
  const topicNotes = allNotes.filter((note) => hasTargetType(note, 'topic'));
  const wordNotes = allNotes.filter((note) => hasTargetType(note, 'word'));

  displayNotesInContainer('allNotes', allNotes, 'אין הערות');
  displayNotesInContainer('scoreNotesContainer', scoreNotes, 'אין הערות מקור');
  displayNotesInContainer('topicNotesContainer', topicNotes, 'אין הערות נושא');
  displayNotesInContainer('wordNotesContainer', wordNotes, 'אין הערות מילה');
}

function displayNotesInContainer(containerId, notes, emptyMessage) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (notes.length === 0) {
    container.innerHTML = `<div class="loading">${emptyMessage}</div>`;
    return;
  }

  container.innerHTML = notes.map(note => {
    const dateObj = note.date ? new Date(note.date) : new Date();
    const dateText = dateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });

    let mainTitle = note.title || "הערה כללית";
    let cleanContent = (note.content || '').replace(/<[^>]*>?/gm, '').substring(0, 80);
    if ((note.content || '').length > 80) cleanContent += '...';

    // זיהוי אייקון לפי סוג
    let typeIcon = '📝';
    if (note.targets && note.targets.length > 0) {
        if (note.targets[0].type === 'score') typeIcon = '📖';
        else if (note.targets[0].type === 'word') typeIcon = '🔤';
        else if (note.targets[0].type === 'topic') typeIcon = '💡';
    }

    return `
      <div class="note-item" onclick="onNoteClick('${note.id}')">
        <div class="note-header">
          <div class="note-ref">${typeIcon} ${mainTitle}</div>
          <button class="delete-btn" onclick="event.stopPropagation(); deleteNote('${note.id}')">🗑️</button>
        </div>
        <span class="note-date">${dateText}</span>
        <div class="note-content">${cleanContent}</div>
      </div>`;
  }).join('');
}

async function onNoteClick(noteId) {
  console.log("[onNoteClick] Note clicked:", noteId);
  currentView = 'text';
  updateLayoutVisibility();

  const textPanel = document.getElementById('textPanel');
  textPanel.innerHTML = '<div class="loading">טוען הערה...</div>';

  if (!firebaseManager) {
    textPanel.innerHTML = '<div class="loading" style="color:var(--accent-red);">שגיאה: Firebase לא מאותחל</div>';
    return;
  }

  try {
    const result = await firebaseManager.loadNoteById(noteId);

    if (!result.success) {
      textPanel.innerHTML = `<div class="loading" style="color:var(--accent-red);">לא נמצאה הערה<br/>${result.error || ''}</div>`;
      return;
    }

    const note = result.note;
    const title = note.title || "הערה";
    
    // תצוגת תאריך
    let dateText = "";
    if (note.date) {
        const d = new Date(note.date);
        dateText = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // עיבוד התוכן
    const contentText = (note.content || "")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // יצירת תגיות HTML להצגה
    let tagsHtml = '';
    if (note.targets && note.targets.length > 0) {
        tagsHtml = `<div class="note-tags-display">
            ${note.targets.map(t => `<span class="tag-chip type-${t.type}">${t.value}</span>`).join('')}
        </div>`;
    }

    textPanel.innerHTML = `
      <div style="max-width: 700px; margin: 0 auto;">
        <div style="margin-bottom: 24px;">
          <h1 style="font-size: 28px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">
            ${title}
          </h1>
          <div style="font-size: 13px; color: var(--text-secondary); display:flex; justify-content:space-between;">
            <span>${dateText}</span>
            <span>ID: ${noteId.substring(5,10)}...</span>
          </div>
          ${tagsHtml}
        </div>
        <div style="font-size: 17px; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; padding-bottom: 40px;">
          ${contentText}
        </div>
      </div>
    `;
    
    // סימון ויזואלי ברשימה
    document.querySelectorAll('.note-item').forEach(item => item.classList.remove('active'));
    const clickedNote = Array.from(document.querySelectorAll('.note-item')).find(
      item => item.getAttribute('onclick')?.includes(noteId)
    );
    if (clickedNote) clickedNote.classList.add('active');
    
  } catch (error) {
    console.error("[onNoteClick ERROR]", error);
    textPanel.innerHTML = `<div class="loading" style="color:var(--accent-red);">שגיאה בטעינת ההערה: ${error.message}</div>`;
  }
}

async function deleteNote(noteId) {
  if (!confirm('למחוק הערה זו?')) return;
  if (!firebaseManager) return;

  try {
    const result = await firebaseManager.deleteNoteFromFirebase(noteId);
    if (result.success) {
      showStatus('נמחק', 'success');
      loadAllNotes();
      
      const textPanel = document.getElementById('textPanel');
      if (textPanel.innerHTML.includes(noteId.substring(5,10))) { 
         // אם ההערה שנמחקה מוצגת כרגע, אפס מסך
         textPanel.innerHTML = `<div class="empty-state"><p>ההערה נמחקה</p></div>`;
      }
    } else {
      showStatus('שגיאה במחיקה', 'error');
    }
  } catch (error) {
    showStatus('שגיאה: ' + error.message, 'error');
  }
}

function updateSettingsStats() {
  const scoreCount = allNotes.filter(n => hasTargetType(n, 'score')).length;
  const topicCount = allNotes.filter(n => hasTargetType(n, 'topic')).length;
  const wordCount = allNotes.filter(n => hasTargetType(n, 'word')).length;
  
  const elTotal = document.getElementById('statTotal');
  if(elTotal) elTotal.textContent = allNotes.length;
  
  const elScore = document.getElementById('statScore');
  if(elScore) elScore.textContent = scoreCount;
  
  const elTopic = document.getElementById('statTopic');
  if(elTopic) elTopic.textContent = topicCount;
  
  const elWord = document.getElementById('statWord');
  if(elWord) elWord.textContent = wordCount;
}

// notes.js - פונקציה מתוקנת (נמצאת בסוף הקובץ)

function resetInputVisibility() {
    // איפוס תצוגת הקונטיינרים
    document.getElementById('inputRefContainer').style.display = 'flex';
    document.getElementById('inputWordContainer').style.display = 'none';
    document.getElementById('inputTopicContainer').style.display = 'none';
    
    // תיקון: שימוש ב-Class הנכון (tag-type-btn במקום type-btn)
    document.querySelectorAll('.tag-type-btn').forEach(btn => btn.classList.remove('active'));
    
    const defaultBtn = document.querySelector('.tag-type-btn[data-target-type="ref"]');
    if (defaultBtn) {
        defaultBtn.classList.add('active');
    }
}