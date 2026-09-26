// Original inline SVGs. No external icon/font service is required.
const paths = {
  home: '<path d="m3 10 9-7 9 7v10H4V10m5 10v-7h6v7"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 11h16"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-3-5"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  file: '<path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h6"/>',
  check: '<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V3h6v2m-7 9 3 3 5-6"/>',
  notice: '<path d="m4 10 15-6v14L4 13v-3Zm2 4 2 7h3l-2-6m10-5h3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1-2 3 2 3v3l3 2 1 3h6l1-3 3-2v-3l2-3-2-3-3-1-1-3Z"/>',
  refresh: '<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5m-4 8a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
  alert: '<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v1"/>',
  logout: '<path d="M9 4H4v16h5m5-12 4 4-4 4m-6-4h10"/>',
};

export function adminIcon(name) {
  return `<svg class="admin-line-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.file}</svg>`;
}

export function applyAdminDesign() {
  if (!document.body.hasAttribute("data-admin-page")) return;
  if (!document.querySelector("#adminDesignStyles")) {
    const link = document.createElement("link");
    link.id = "adminDesignStyles";
    link.rel = "stylesheet";
    link.href = new URL("../css/admin-design.css?v=1", import.meta.url).href;
    document.head.append(link);
  }
  const names = {
    "admin.html": "home", "admin-attendance.html": "calendar",
    "admin-requests.html": "file", "admin-checklists.html": "check",
    "admin-employees.html": "users", "admin-work-schedules.html": "pin",
    "admin-notices.html": "notice", "admin-settings.html": "settings",
  };
  document.querySelectorAll(".admin-menu-item").forEach(link => {
    const slot = link.querySelector("span");
    if (slot) slot.innerHTML = adminIcon(names[link.getAttribute("href")]);
    if (link.classList.contains("active")) link.setAttribute("aria-current", "page");
  });
  const logo = document.querySelector(".admin-logo-box");
  if (logo) logo.innerHTML = '<svg viewBox="0 0 32 28" aria-hidden="true"><path d="m3 5 7 18 6-14 6 14 7-18M11 5l5 12 5-12" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const title = document.querySelector(".admin-sidebar-logo h1");
  if (title) title.textContent = "우봉라이프";
  const nav = document.querySelector(".admin-sidebar-menu");
  if (nav && !nav.querySelector(".admin-nav-label")) {
    const label = document.createElement("div");
    label.className = "admin-nav-label";
    label.textContent = "운영 관리";
    nav.prepend(label);
    const people = nav.querySelector('[href="admin-employees.html"]');
    const second = label.cloneNode(true);
    second.textContent = "조직 관리";
    people?.before(second);
  }
  const logout = document.getElementById("adminLogoutBtn");
  if (logout) logout.innerHTML = adminIcon("logout");
  const refresh = document.getElementById("dashboardRefreshBtn");
  if (refresh && !refresh.querySelector("svg")) refresh.insertAdjacentHTML("afterbegin", adminIcon("refresh"));
  const stats = ["users", "pin", "alert", "file", "users"];
  document.querySelectorAll(".dashboard-summary-grid .stat-card").forEach((card, i) => {
    if (!card.querySelector("svg")) card.insertAdjacentHTML("afterbegin", adminIcon(stats[i]));
  });
}
