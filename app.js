const $ = (selector) => document.querySelector(selector);
const loginForm = $("#login-form");
const loginNotice = $("#login-notice");
const workspace = $("#workspace");
const loginPanel = $("#login-panel");
const main = document.querySelector("main");
const footer = document.querySelector("footer");

$("#toggle-password").addEventListener("click", () => {
  const field = $("#password");
  const reveal = field.type === "password";
  field.type = reveal ? "text" : "password";
  $("#toggle-password").setAttribute("aria-label", reveal ? "Hide password" : "Show password");
});
$("#forgot").addEventListener("click", () => {
  loginNotice.textContent = "Password recovery will be connected to the approved authentication provider in a later step.";
});
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loginNotice.textContent = "Sign-in is not active yet. We have not sent your email or password anywhere. Use “Preview workspace” below to review the interface.";
});
const previewButton = document.createElement("button");
previewButton.type = "button";
previewButton.className = "primary preview-button";
previewButton.style.marginTop = "12px";
previewButton.textContent = "Preview workspace (no sign-in)";
previewButton.addEventListener("click", openPreview);
loginForm.appendChild(previewButton);
function openPreview() {
  main.classList.add("hidden");
  document.querySelector(".brand").classList.add("hidden");
  footer.classList.add("hidden");
  workspace.classList.remove("hidden");
  workspace.style.display = "grid";
  renderPage("overview");
}
$("#back-login").addEventListener("click", () => {
  workspace.classList.add("hidden");
  workspace.style.display = "";
  main.classList.remove("hidden");
  document.querySelector(".brand").classList.remove("hidden");
  footer.classList.remove("hidden");
});
const teamNames = { chenn: "TEAM CHENN", gemma: "TEAM GEMMA", lev: "TEAM LEV" };
const pageInfo = {
  overview: ["Team dashboard", "A clear view of the work happening across your team."],
  agents: ["Agents", "Agent records and performance details for the selected team."],
  coaching: ["Coaching", "Review coaching sessions and upcoming meetings."],
  "ic-logs": ["IC Logs", "Keep incident and interaction records organized."],
  "quick-links": ["Quick Links", "Your team's useful destinations in one place."]
};
function renderPage(page) {
  const [title, subtitle] = pageInfo[page] || pageInfo.overview;
  $("#crumb").textContent = title;
  $("#page-title").textContent = title;
  $("#page-subtitle").textContent = subtitle;
  document.querySelectorAll(".nav-item[data-page]").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  const content = $("#page-content");
  if (page === "overview") {
    content.innerHTML = `
      <div class="stat-grid">
        <article class="stat"><small>TOTAL AGENTS</small><strong>—</strong></article>
        <article class="stat"><small>TOTAL COACHING</small><strong>—</strong></article>
        <article class="stat"><small>TOTAL IC LOGS</small><strong>—</strong></article>
        <article class="stat"><small>QUICK LINKS</small><strong>—</strong></article>
      </div>
      <section class="content-panel"><h2>Recent activity</h2><p class="muted">Latest updates across your team will appear here.</p><div class="empty-state">No data connected yet. This preview uses no real records.</div></section>`;
  } else if (page === "quick-links") {
    content.innerHTML = `<div class="link-grid"><article class="link-card"><strong>Team resources</strong><p>Approved team reference links will appear here.</p></article><article class="link-card"><strong>Learning resources</strong><p>Helpful learning destinations for your team.</p></article><article class="link-card"><strong>Support</strong><p>Useful support links and internal guides.</p></article></div>`;
  } else {
    const details = {
      agents: ["Agent records", "Create, review, and update agent records."],
      coaching: ["Coaching sessions", "Schedule and manage coaching sessions."],
      "ic-logs": ["IC log records", "Review and maintain IC log entries."]
    }[page];
    content.innerHTML = `<section class="content-panel"><h2>${details[0]}</h2><p class="muted">${details[1]}</p><div class="empty-state">This page is a layout scaffold only. Record forms, permissions, uploads, and database access still need to be implemented.</div></section>`;
  }
}
$("#nav").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-page]");
  if (button) renderPage(button.dataset.page);
});
$("#team-switch").addEventListener("change", (event) => {
  $("#team-brand").textContent = teamNames[event.target.value];
});
