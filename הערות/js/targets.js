// ===========================
//  Targets (score / word / topic)
// ===========================
let pendingTargets = [];

function resetTargets() {
  console.log("[resetTargets] Clearing all pending targets");
  pendingTargets = [];
  updateTargetsInfo();
}

// פונקציה גנרית להוספת יעד (מקבלת כעת גם אובייקט מורכב למטא-דאטה)
function addTarget(type, value, metaData = null) {
  console.log("[addTarget] Adding target:", { type, value, metaData });
  if (!type || !value) return;
  
  // בדיקה למניעת כפילויות
  const exists = pendingTargets.some(t => t.type === type && t.value === value);
  if (exists) {
      showStatus('היעד כבר קיים ברשימה', 'error');
      return;
  }

  // שמירת האובייקט המלא
  pendingTargets.push({ 
      type, 
      value,
      ...metaData // פריסת נתוני המטא (כמו book, sections) אם יש
  });
  
  updateTargetsInfo();
}

function updateTargetsInfo() {
  const el = document.getElementById('targetsInfo');
  if (!el) return;

  if (pendingTargets.length === 0) {
    el.innerHTML = ''; 
    return;
  }

  // יצירת תצוגה יפה יותר (תגיות)
  const html = pendingTargets.map((t, index) => {
      let icon = '';
      if(t.type === 'score') icon = '📖';
      else if(t.type === 'word') icon = '🔤';
      else if(t.type === 'topic') icon = '💡';
      
      return `<span class="target-tag" onclick="removeTarget(${index})">
        ${icon} ${t.value} <span class="remove-x">×</span>
      </span>`;
  }).join('');

  el.innerHTML = '<div class="tags-container">' + html + '</div>';
}

function removeTarget(index) {
    pendingTargets.splice(index, 1);
    updateTargetsInfo();
}

// --- פונקציות הוספה מהטופס ---

// פונקציה חדשה ואסינכרונית להוספת מקור עם בדיקת API
async function addScoreTargetWithApi() {
  const inputEl = document.getElementById('refInput');
  const refVal = inputEl.value.trim();
  const btn = document.querySelector('#inputRefContainer button'); // כפתור ההוספה

  console.log("[addScoreTargetWithApi] ref=", refVal);
  
  if (!refVal) {
    showStatus('נא להזין מקור', 'error');
    return;
  }

  // חיווי טעינה
  const originalBtnText = btn.textContent;
  btn.textContent = 'בודק...';
  btn.disabled = true;

  try {
      // קריאה ל-API של ספריא
      const apiUrl = `https://www.sefaria.org/api/v3/texts/${refVal}`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      // בדיקת תקינות לפי ה-API
      if (data.error) {
          showStatus('מקור לא תקין (לא נמצא בספריא)', 'error');
          // לא מנקים את השדה כדי שהמשתמש יוכל לתקן
      } else {
          // הצלחה!
          // ה-API מחזיר: data.ref (השם הקנוני באנגלית), data.book (שם הספר)
          // וגם data.sections (מערך של מספרים: פרק, פסוק וכו')
          
          const canonicalRef = data.ref; // זה מה שישמר כ-value
          const bookName = data.indexTitle; // שם הספר באנגלית (או data.book)
          
          // הכנת המטא-דאטה לאינדקס
          const metaData = {
              book: bookName,
              // אם יש sections, נשמור אותם. אחרת ננסה לפרסר
              sections: Array.isArray(data.sections) ? data.sections : []
          };

          addTarget('score', canonicalRef, metaData);
          showStatus('המקור נוסף בהצלחה', 'success');
          inputEl.value = ''; // ניקוי השדה רק בהצלחה
      }

  } catch (err) {
      console.error("[API Error]", err);
      showStatus('שגיאת תקשורת בבדיקת המקור', 'error');
  } finally {
      // החזרת הכפתור למצב רגיל
      btn.textContent = originalBtnText;
      btn.disabled = false;
  }
}

function addWordTargetFromForm() {
  const inputEl = document.getElementById('wordInput');
  const wordVal = inputEl.value.trim();
  if (!wordVal) {
    showStatus('אין מילה להוספה', 'error');
    return;
  }
  addTarget('word', wordVal);
  inputEl.value = ''; 
}

function addTopicTargetFromForm() {
  const inputEl = document.getElementById('topicInput');
  const topicVal = inputEl.value.trim();
  if (!topicVal) {
    showStatus('אין נושא להוספה', 'error');
    return;
  }
  addTarget('topic', topicVal);
  inputEl.value = '';
}