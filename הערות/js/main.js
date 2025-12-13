// main.js – קובץ JS אמיתי (לא HTML)
console.log("[MAIN] main.js loaded successfully");

// פונקציה גלובלית לעדכון הסטטוס העליון
function showStatus(msg, type = "info") {
  const el = document.getElementById("connectionStatus");
  if (!el) return;

  el.textContent = msg;

  if (type === "success") {
    el.style.color = "green";
  } else if (type === "error") {
    el.style.color = "red";
  } else {
    el.style.color = "#8e8e93";
  }

  el.style.opacity = 1;

  // מחזיר למצב חצי שקוף אחרי 3 שניות
  setTimeout(() => {
    el.style.opacity = 0.6;
  }, 3000);
}
