// theme.js
// Apply theme on page load
if (localStorage.getItem("theme") === "dark") {
  document.documentElement.classList.add("dark");
}

// Toggle and save preference
function toggleTheme() {
  document.documentElement.classList.toggle("dark");
  const isDark = document.documentElement.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}
