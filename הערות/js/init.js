// ===========================
//  App Init & Utils
// ===========================

async function initApp() {
  console.log("[initApp] START");

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
document.addEventListener('DOMContentLoaded', () => {
  console.log("[EVENT] DOMContentLoaded → initializing app");

  // כפתור ניקוי טופס
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      document.getElementById('noteForm').reset();
      document.getElementById('owner').value = currentOwner;
      resetTargets();
      
      // איפוס תצוגת השדות
      document.getElementById('inputRefContainer').style.display = 'flex';
      document.getElementById('inputWordContainer').style.display = 'none';
      document.getElementById('inputTopicContainer').style.display = 'none';
      document.querySelectorAll('.tag-type-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.tag-type-btn[data-target-type="ref"]').classList.add('active');
    });
  }

  // --- לוגיקה: כפתורי החלפת שדות תיוג ---
  const typeButtons = document.querySelectorAll('.tag-type-btn');
  typeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
          // הסרת מחלקת active מכולם
          typeButtons.forEach(b => b.classList.remove('active'));
          // הוספה לנלחץ
          btn.classList.add('active');
          
          const type = btn.getAttribute('data-target-type');
          
          // הסתרת כל השדות
          document.getElementById('inputRefContainer').style.display = 'none';
          document.getElementById('inputWordContainer').style.display = 'none';
          document.getElementById('inputTopicContainer').style.display = 'none';
          
          // הצגת השדה הרלוונטי
          if (type === 'ref') {
              document.getElementById('inputRefContainer').style.display = 'flex';
              document.getElementById('refInput').focus();
          } else if (type === 'word') {
              document.getElementById('inputWordContainer').style.display = 'flex';
              document.getElementById('wordInput').focus();
          } else if (type === 'topic') {
              document.getElementById('inputTopicContainer').style.display = 'flex';
              document.getElementById('topicInput').focus();
          }
      });
  });


  // טאבים של קטגוריות (בפאנל ההערות)
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const cat = tab.getAttribute('data-category');
      
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.notes-category').forEach(el => el.style.display = 'none');

      if (cat === 'all') document.getElementById('allNotes').style.display = 'block';
      else if (cat === 'score') document.getElementById('scoreNotesContainer').style.display = 'block';
      else if (cat === 'topic') document.getElementById('topicNotesContainer').style.display = 'block';
      else if (cat === 'word') document.getElementById('wordNotesContainer').style.display = 'block';
    });
  });

  // כפתורי סינון בפאנל ההגדרות
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');
      
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const correspondingTab = document.querySelector(`.category-tab[data-category="${filter}"]`);
      if (correspondingTab) {
        correspondingTab.click();
      }
    });
  });

  // אתחול האפליקציה
  initApp();
});