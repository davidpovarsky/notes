// ===========================
//  מצב תצוגה - עיצוב חדש
// ===========================
let currentView = 'text'; // ברירת מחדל - מסך ריק
let settingsOpen = false;

console.log("[INIT] view.js loaded. currentView='text', settingsOpen=false");

// פונקציה לעדכון תצוגת הפאנלים
function updateLayoutVisibility() {
  console.log("[updateLayoutVisibility] currentView=", currentView);

  const textPanel = document.getElementById('textPanel');
  const noteFormPanel = document.getElementById('noteFormPanel');
  
  // הסתרת שני הפאנלים
  textPanel.style.display = 'none';
  noteFormPanel.style.display = 'none';
  
  // הצגת הפאנל הנכון
  if (currentView === 'text') {
    textPanel.style.display = 'block';
  } else if (currentView === 'note') {
    noteFormPanel.style.display = 'block';
  }
}

// פתיחה/סגירה של פאנל ההגדרות
function toggleSettings() {
  settingsOpen = !settingsOpen;
  console.log("[toggleSettings] settingsOpen=", settingsOpen);
  
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsBtn = document.getElementById('settingsToggleBtn');
  
  if (settingsOpen) {
    settingsPanel.classList.add('open');
    settingsBtn.classList.add('active');
  } else {
    settingsPanel.classList.remove('open');
    settingsBtn.classList.remove('active');
  }
}

// Event Listeners - יטענו אחרי DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  console.log("[DOMContentLoaded] Setting up view event listeners");
  
  // כפתור יצירת הערה חדשה
  const noteViewBtn = document.getElementById('noteViewBtn');
  if (noteViewBtn) {
    noteViewBtn.addEventListener('click', () => {
      console.log("[EVENT] Click → note view");
      currentView = 'note';
      updateLayoutVisibility();
    });
  }
  
  // כפתור הגדרות
  const settingsToggleBtn = document.getElementById('settingsToggleBtn');
  if (settingsToggleBtn) {
    settingsToggleBtn.addEventListener('click', toggleSettings);
  }
  
  // כפתור סגירת הגדרות
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('click', toggleSettings);
  }
  
  // עדכון תצוגה ראשונית
  updateLayoutVisibility();
});