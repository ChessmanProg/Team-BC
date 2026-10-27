const $ = (selector) => document.querySelector(selector);
const loginForm = $("#login-form");
const loginNotice = $("#login-notice");
const workspace = $("#workspace");
const loginPanel = $("#login-panel");
const main = document.querySelector("main");
const footer = document.querySelector("footer");
const teamSelection = $("#team-selection");
const panels = [loginPanel, $("#signup-panel"), $("#recovery-panel")];
const SUPABASE_URL = "https://asqyegtenygvgwwtazac.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tTCz-II0_05GRTzjjH1HFQ_SSNt5RZr";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let activeUser = null;
let activeMemberships = [];
let activeTeams = [];
let activeTeamKey = null;
let currentPage = "overview";
let editingRecordId = null;
let recordsCache = [];

const CHENN_AGENTS = [
  "Raphael Santiago Reyes",
  "Maria Kristelle Cambronero De Leon",
  "Chito Canuto Quintela Delvo",
  "John Anthony Reyes Villaflores",
  "Phoebe Albufuera Almacen",
  "Bryson Blando Lasam",
  "Harold Ferdie Pulgan Orbina",
  "Amalkene John Calalo Ligaya",
  "Jessa Marie Marantal Albos",
  "Neil Andre Tuballa",
  "Phoebe Regio Sarmiento",
  "Allia Cabuena Aguilar",
  "Romeo Jr. Villaviray Perez",
  "Florame Trumata Caspe",
  "Enrique Banzal Calvez"
];

function setBackgroundVideo(fileName) {
  const video = document.querySelector(".ocean-video");
  const source = video?.querySelector("source");
  if (!video || !source) return;
  const nextSource = "./" + fileName;
  if (source.getAttribute("src") === nextSource) return;
  source.setAttribute("src", nextSource);
  video.load();
  const playAttempt = video.play();
  if (playAttempt?.catch) playAttempt.catch(() => {});
}
function showPanel(panel) { panels.forEach((item) => item.classList.toggle("hidden", item !== panel)); }
function message(element, text) { if (element) element.textContent = text; }
function friendlyError(error) {
  const text = error?.message || "Something went wrong. Please try again.";
  if (/invalid login credentials/i.test(text)) return "Email or password is incorrect.";
  if (/email not confirmed/i.test(text)) return "Please confirm your email using the link we sent you.";
  if (/password should be at least/i.test(text)) return "Use a stronger password (at least 8 characters).";
  if (/row-level security|permission denied/i.test(text)) return "You don't have permission to do that in this team.";
  return text;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function activeTeam() { return activeTeams.find((team) => team.team_key === activeTeamKey); }
function teamDisplay(team) { return team?.display_name || ({chenn:"Team Chenn BC AI",gemma:"Team Gemma BC AI",lev:"Team Lev BC AI"}[team?.team_key]) || team?.team_key || "Team"; }

$("#toggle-password").addEventListener("click", () => {
  const field = $("#password");
  const reveal = field.type === "password";
  field.type = reveal ? "text" : "password";
  $("#toggle-password").setAttribute("aria-label", reveal ? "Hide password" : "Show password");
});
$("#forgot").addEventListener("click", () => {
  $("#recovery-email").value = $("#email").value.trim();
  message($("#recovery-notice"), "");
  showPanel($("#recovery-panel"));
});
function openSignup() {
  $("#signup-email").value = $("#email").value.trim();
  message($("#signup-notice"), "");
  showPanel($("#signup-panel"));
  $("#signup-email").focus();
}
$("#show-signup").addEventListener("click", openSignup);
$("#show-login").addEventListener("click", () => showPanel(loginPanel));
$("#recovery-back").addEventListener("click", () => showPanel(loginPanel));

async function getUserTeams(user) {
  const { data: memberships, error: membershipError } = await supabaseClient
    .from("team_memberships").select("team_key, role").eq("user_id", user.id);
  if (membershipError) throw membershipError;
  if (!memberships?.length) throw new Error("Your account has no team access yet. Ask a Team BC owner/admin to grant membership.");
  const { data: teams, error: teamsError } = await supabaseClient
    .from("teams").select("team_key, display_name").in("team_key", memberships.map((m) => m.team_key)).eq("is_enabled", true);
  if (teamsError) throw teamsError;
  if (!teams?.length) throw new Error("Your teams are currently disabled. Contact the site owner.");
  return { memberships, teams };
}
function showTeamSelection() {
  workspace.classList.add("hidden");
  workspace.style.display = "none";
  teamSelection.classList.remove("hidden");
  teamSelection.innerHTML = '<div class="team-selection-inner"><p class="eyebrow">WELCOME TO TEAM BC</p><h1>Choose your team</h1><p class="muted">Only teams assigned to your account are shown.</p><div class="team-card-grid">' +
    activeTeams.map((team) => '<button type="button" class="team-card" data-team-key="' + escapeHtml(team.team_key) + '"><span class="team-card-icon">✦</span><strong>' + escapeHtml(teamDisplay(team)) + '</strong><small>Open team workspace <span>→</span></small></button>').join("") +
    '</div><p class="notice" id="team-selection-notice" role="status"></p><button type="button" class="text-button" id="selection-signout">Sign out</button></div>';
  teamSelection.querySelectorAll("[data-team-key]").forEach((button) => button.addEventListener("click", () => enterTeam(button.dataset.teamKey)));
  $("#selection-signout").addEventListener("click", signOut);
  main.classList.add("hidden");
  document.querySelector(".brand").classList.add("hidden");
  footer.classList.add("hidden");
}
function enterTeam(teamKey) {
  if (!activeTeams.some((team) => team.team_key === teamKey) || !activeMemberships.some((membership) => membership.team_key === teamKey)) {
    message($("#team-selection-notice"), "You don't have access to that team.");
    return;
  }
  activeTeamKey = teamKey;
  const selector = $("#team-switch");
  selector.replaceChildren();
  activeTeams.forEach((team) => { const option = document.createElement("option"); option.value = team.team_key; option.textContent = teamDisplay(team); selector.appendChild(option); });
  selector.value = teamKey;
  $("#team-brand").textContent = teamDisplay(activeTeam()).toUpperCase();
  $("#workspace-user").textContent = activeUser?.email || "Signed in";
  $("#workspace-role").textContent = activeMemberships.find((m) => m.team_key === teamKey)?.role || "member";
  teamSelection.classList.add("hidden");
  workspace.classList.remove("hidden");
  workspace.style.display = "grid";
  renderPage("overview");
}
async function signOut() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  activeUser = null; activeMemberships = []; activeTeams = []; activeTeamKey = null;
  teamSelection.classList.add("hidden");
  workspace.classList.add("hidden"); workspace.style.display = "";
  main.classList.remove("hidden"); document.querySelector(".brand").classList.remove("hidden"); footer.classList.remove("hidden");
  setBackgroundVideo("ocean-background.mp4");
}
async function openAuthenticatedWorkspace(user, memberships, teams) {
  activeUser = user; activeMemberships = memberships; activeTeams = teams;
  message(loginNotice, "");
  showTeamSelection();
}
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) return message(loginNotice, "Authentication library did not load. Check your internet connection and refresh.");
  const submit = loginForm.querySelector('button[type="submit"]');
  submit.disabled = true; message(loginNotice, "Signing in securely…");
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#password").value });
    if (error) throw error;
    const { memberships, teams } = await getUserTeams(data.user);
    await openAuthenticatedWorkspace(data.user, memberships, teams);
  } catch (error) {
    if (/no team access|currently disabled/i.test(error.message || "")) await supabaseClient.auth.signOut();
    message(loginNotice, friendlyError(error));
  } finally { submit.disabled = false; }
});
$("#signup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const notice = $("#signup-notice");
  if (!supabaseClient) return message(notice, "Authentication library did not load. Refresh and try again.");
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true; message(notice, "Creating your account…");
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: $("#signup-email").value.trim(), password: $("#signup-password").value,
      options: { emailRedirectTo: "https://chessmanprog.github.io/Team-BC/" }
    });
    if (error) throw error;
    message(notice, data.session ? "Account created. A team admin must grant team access separately." : "Account created if this email is eligible. Check your inbox for a confirmation link. Registration does not grant team access.");
  } catch (error) { message(notice, friendlyError(error)); }
  finally { submit.disabled = false; }
});
$("#recovery-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const notice = $("#recovery-notice");
  if (!supabaseClient) return message(notice, "Authentication library did not load. Refresh and try again.");
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true; message(notice, "Requesting reset link…");
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail($("#recovery-email").value.trim(), { redirectTo: "https://chessmanprog.github.io/Team-BC/" });
    if (error) throw error;
    message(notice, "If an account exists for that email, a password-reset link will be sent. Check your inbox.");
  } catch (error) { message(notice, friendlyError(error)); }
  finally { submit.disabled = false; }
});
$("#back-login").addEventListener("click", signOut);
$("#back-teams").addEventListener("click", showTeamSelection);

const pageInfo = {
  overview: ["Team dashboard", "A clear view of the work happening across your team."],
  agents: ["Agents", "Manage agent records for this team."],
  coaching: ["Coaching", "Create and manage coaching sessions and meeting links."],
  "ic-logs": ["IC Logs", "Record and review incidents and interactions."],
  "quick-links": ["Quick Links", "Save useful team links in one place."]
};
const pageConfig = {
  agents: { table:"team_agents", singular:"agent", plural:"agents", fields:[
    {key:"agent_name",label:"Agent name",required:true},
    {key:"status",label:"Status",type:"select",options:["Active","Inactive","On Leave"],required:true},
    {key:"notes",label:"Notes",type:"textarea",required:false}
  ]},
  "ic-logs": { table:"team_ic_logs", singular:"IC log", plural:"IC logs", fields:[
    {key:"log_date",label:"Date",type:"date",required:true},
    {key:"agent_name",label:"Agent name",required:true},
    {key:"category",label:"Category",type:"select",options:["Reported","Not Reported"],required:true},
    {key:"details",label:"Details",type:"textarea",required:true}
  ]},
  coaching: { table:"team_coaching", singular:"coaching session", plural:"coaching sessions", fields:[
    {key:"agent_name",label:"Agent name",required:true},
    {key:"scheduled_at",label:"Date and time",type:"datetime-local",required:false},
    {key:"meet_link",label:"Meeting link",type:"url",required:false},
    {key:"status",label:"Status",type:"select",options:["Scheduled","Completed","Cancelled"],required:true},
    {key:"notes",label:"Coaching notes",type:"textarea",required:false}
  ]},
  "quick-links": { table:"team_quick_links", singular:"quick link", plural:"quick links", fields:[
    {key:"title",label:"Link title",required:true},
    {key:"url",label:"URL (include https://)",type:"url",required:true},
    {key:"description",label:"Description",type:"textarea",required:false}
  ]}
};
function formatDate(value, includeTime=false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleString([], includeTime ? {dateStyle:"medium",timeStyle:"short"} : {dateStyle:"medium"});
}
async function fetchRows(table) {
  const { data, error } = await supabaseClient.from(table).select("*").eq("team_key", activeTeamKey).order("created_at", {ascending:false});
  if (error) throw error;
  return data || [];
}
async function loadCounts() {
  const tables = ["team_agents","team_coaching","team_ic_logs","team_quick_links"];
  const counts = await Promise.all(tables.map(async (table) => {
    const { count, error } = await supabaseClient.from(table).select("id", {count:"exact",head:true}).eq("team_key", activeTeamKey);
    if (error) throw error;
    return count || 0;
  }));
  return counts;
}
function recordValue(row, key) {
  const value = row[key];
  if (key === "log_date") return formatDate(value);
  if (key === "scheduled_at") return formatDate(value, true);
  if (key === "meet_link" && value) { const url = /^https?:\/\//i.test(value) ? value : "https://" + value; return '<a class="meeting-pill" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer" data-meeting-link="true">Join Meeting <span aria-hidden="true">↗</span></a>'; }
  if (key === "url" && value) return '<a href="' + escapeHtml(value) + '" target="_blank" rel="noopener noreferrer">Open link ↗</a>';
  return escapeHtml(value || "—");
}
async function renderOverview(content) {
  const counts = await loadCounts();
  content.innerHTML = '<div class="stat-grid">' +
    [["TOTAL AGENTS",counts[0]],["COACHING SESSIONS",counts[1]],["TOTAL IC LOGS",counts[2]],["QUICK LINKS",counts[3]]].map(([label,count]) => '<article class="stat"><small>' + label + '</small><strong>' + count + '</strong></article>').join("") +
    '</div><section class="content-panel"><h2>Welcome to ' + escapeHtml(teamDisplay(activeTeam())) + '</h2><p class="muted">Your records are saved to this team only.</p><div class="empty-state">Choose a section from the left menu to add or manage records.</div></section>';
}
function fieldMarkup(field, row={}) {
  let value = row[field.key] ?? "";
  if (field.key === "agent_name" && activeTeamKey === "chenn") {
    return '<label>' + escapeHtml(field.label) + '<select name="agent_name" required><option value="">Choose an agent</option>' + CHENN_AGENTS.map((name) => '<option value="' + escapeHtml(name) + '"' + (value === name ? " selected" : "") + '>' + escapeHtml(name) + '</option>').join("") + '</select></label>';
  }
  if (field.type === "datetime-local" && value) value = new Date(value).toISOString().slice(0,16);
  const required = field.required ? " required" : "";
  if (field.type === "textarea") return '<label>' + escapeHtml(field.label) + '<textarea name="' + field.key + '"' + required + '>' + escapeHtml(value) + '</textarea></label>';
  if (field.type === "select") return '<label>' + escapeHtml(field.label) + '<select name="' + field.key + '"' + required + '>' + field.options.map((option) => '<option' + (value === option ? " selected" : "") + '>' + escapeHtml(option) + '</option>').join("") + '</select></label>';
  const type = field.type || "text";
  if (field.key === "log_date" && !value) value = new Date().toISOString().slice(0,10);
  return '<label>' + escapeHtml(field.label) + '<input type="' + type + '" name="' + field.key + '" value="' + escapeHtml(value) + '"' + required + '></label>';
}
function renderRecordList(page, rows) {
  const config = pageConfig[page];
  if (!rows.length) return '<div class="empty-state">No ' + config.plural + ' yet. Select “Add ' + config.singular + '” to create the first one.</div>';
  const cols = config.fields.slice(0, page === "ic-logs" ? 4 : 5);
  return '<div class="records-wrap"><table class="records-table"><thead><tr>' + cols.map((field) => '<th>' + escapeHtml(field.label) + '</th>').join("") + '<th>Actions</th></tr></thead><tbody>' +
    rows.map((row) => '<tr>' + cols.map((field) => '<td>' + recordValue(row, field.key) + '</td>').join("") +
    '<td class="record-actions"><button type="button" class="small-button" data-edit="' + row.id + '">Edit</button><button type="button" class="small-button danger" data-delete="' + row.id + '">Delete</button></td></tr>').join("") +
    '</tbody></table></div>';
}
async function renderRecordsPage(page, content) {
  const config = pageConfig[page];
  const today = new Date();
  const localToday = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
  content.innerHTML = '<section class="content-panel"><div class="panel-heading"><div><h2>' + escapeHtml(config.plural[0].toUpperCase()+config.plural.slice(1)) + '</h2><p class="muted">Saved for ' + escapeHtml(teamDisplay(activeTeam())) + ' only.</p></div><div class="record-toolbar"><button type="button" class="primary action-button" id="add-record">+ Add ' + escapeHtml(config.singular) + '</button>' + (page === "coaching" ? '<button type="button" class="small-button action-button" id="bulk-coaching-toggle">Bulk import schedules</button>' : '') + '</div></div>' + (page === "coaching" ? '<div class="daily-schedule-filter"><label for="coaching-schedule-date">Show agents scheduled on</label><input type="date" id="coaching-schedule-date" value="' + localToday + '"><p class="muted">Only coaching schedules for the selected day are shown.</p></div>' : '') + '<div id="bulk-coaching-host"></div><div id="record-form-host"></div><p class="notice" id="record-notice" role="status"></p><div id="records-list"><p class="muted">Loading records…</p></div></section>';
  $("#add-record").addEventListener("click", () => showRecordForm(page));
  if (page === "coaching") {
    $("#bulk-coaching-toggle").addEventListener("click", showBulkCoachingImport);
    $("#coaching-schedule-date").addEventListener("change", () => refreshRecordList("coaching"));
  }
  await refreshRecordList(page);
}
function showBulkCoachingImport() {
  const host = $("#bulk-coaching-host");
  if (host.innerHTML) { host.innerHTML = ""; return; }
  const today = new Date();
  const localToday = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
  host.innerHTML = '<section class="record-form bulk-import"><h3>Paste coaching schedules</h3><p class="muted">You can paste a row directly from Google Sheets with 3 columns in this order: Time range, Agent name, Meeting link. Choose the date that applies to these rows. The start time will be saved as the schedule time, and the full time range will be kept in Coaching notes. You can also use the older 5-column format: Agent name, Date and time, Meeting link, Status, Coaching notes.</p><label>Schedule date for 3-column Google Sheets rows<input type="date" id="bulk-coaching-date" value="' + localToday + '" required></label><textarea id="bulk-coaching-text" rows="7" placeholder="12:30 – 13:00&#9;Neil Andre Tuballa&#9;meet.google.com/nji-pabi-cwm"></textarea><div class="form-actions"><button type="button" class="primary action-button" id="bulk-coaching-save">Import schedules</button><button type="button" class="small-button" id="bulk-coaching-cancel">Cancel</button></div><p class="notice" id="bulk-coaching-notice" role="status"></p></section>';
  $("#bulk-coaching-cancel").addEventListener("click", () => { host.innerHTML = ""; });
  $("#bulk-coaching-save").addEventListener("click", importBulkCoaching);
}
function parseSheetTimeRange(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(?:-|–|—|to)\s*(\d{1,2}):(\d{2})$/i);
  if (!match) return null;
  const startHour = Number(match[1]), startMinute = Number(match[2]);
  const endHour = Number(match[3]), endMinute = Number(match[4]);
  if (startHour > 23 || endHour > 23 || startMinute > 59 || endMinute > 59) return null;
  return {start: String(startHour).padStart(2, "0") + ":" + String(startMinute).padStart(2, "0"), range: match[1].padStart(2, "0") + ":" + match[2] + "–" + match[3].padStart(2, "0") + ":" + match[4]};
}
async function importBulkCoaching() {
  const input = $("#bulk-coaching-text");
  const notice = $("#bulk-coaching-notice");
  const button = $("#bulk-coaching-save");
  const selectedDate = $("#bulk-coaching-date")?.value || "";
  const lines = input.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return message(notice, "Paste at least one schedule first.");
  const validStatuses = ["Scheduled","Completed","Cancelled"];
  const rows = [];
  const errors = [];
  lines.forEach((line, index) => {
    const columns = line.split("\t").map((part) => (part || "").trim());
    const pipeColumns = line.split("|").map((part) => (part || "").trim());
    const parts = columns.length > 1 ? columns : pipeColumns;
    if (index === 0 && /agent\s*name/i.test(parts[0] || "")) return;
    let agent, date, link, status, notes;
    if (parts.length === 3 && parseSheetTimeRange(parts[0])) {
      const time = parseSheetTimeRange(parts[0]);
      agent = parts[1];
      link = parts[2];
      if (!selectedDate) { errors.push("Line " + (index + 1) + ": choose the schedule date above."); return; }
      if (!agent) { errors.push("Line " + (index + 1) + ": agent name is required."); return; }
      date = new Date(selectedDate + "T" + time.start + ":00");
      status = "Scheduled";
      notes = "Time slot: " + time.range;
    } else {
      const [oldAgent, dateText, oldLink, statusText, oldNotes] = parts;
      agent = oldAgent;
      link = oldLink;
      const dateTextNormalized = dateText ? dateText.replace(" ", "T") : "";
      date = dateTextNormalized ? new Date(dateTextNormalized) : null;
      status = statusText ? validStatuses.find((item) => item.toLowerCase() === statusText.toLowerCase()) : "Scheduled";
      notes = oldNotes || null;
      if (!agent || !dateText || !date || Number.isNaN(date.getTime())) { errors.push("Line " + (index + 1) + ": agent name and a valid date/time are required. For a Google Sheets row, use Time range, Agent name, Meeting link."); return; }
      if (statusText && !status) { errors.push("Line " + (index + 1) + ": status must be Scheduled, Completed, or Cancelled."); return; }
    }
    if (Number.isNaN(date.getTime())) { errors.push("Line " + (index + 1) + ": date or time is invalid."); return; }
    if (activeTeamKey === "chenn" && !CHENN_AGENTS.includes(agent)) { errors.push("Line " + (index + 1) + ": agent name isn't in the Team Chenn list."); return; }
    if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;
    rows.push({team_key:activeTeamKey,agent_name:agent,scheduled_at:date.toISOString(),meet_link:link||null,status,notes:notes||null,created_by:activeUser.id});
  });
  if (errors.length) return message(notice, errors.slice(0,5).join(" ") + (errors.length > 5 ? " And " + (errors.length - 5) + " more issue(s)." : ""));
  button.disabled = true;
  message(notice, "Importing " + rows.length + " schedule(s)…");
  try {
    const {error} = await supabaseClient.from("team_coaching").insert(rows);
    if (error) throw error;
    $("#bulk-coaching-host").innerHTML = "";
    message($("#record-notice"), rows.length + " coaching schedule(s) imported.");
    await refreshRecordList("coaching");
  } catch (error) {
    message(notice, friendlyError(error));
  } finally { button.disabled = false; }
}
async function refreshRecordList(page) {
  const host = $("#records-list");
  if (!host) return;
  host.innerHTML = '<p class="muted">Loading records…</p>';
  try {
    recordsCache = await fetchRows(pageConfig[page].table);
    let visibleRows = recordsCache;
    if (page === "coaching") {
      const selectedDate = $("#coaching-schedule-date")?.value || "";
      visibleRows = recordsCache.filter((row) => {
        if (!row.scheduled_at || !selectedDate) return false;
        const scheduledDate = new Date(row.scheduled_at);
        if (Number.isNaN(scheduledDate.getTime())) return false;
        const localDate = [scheduledDate.getFullYear(), String(scheduledDate.getMonth() + 1).padStart(2, "0"), String(scheduledDate.getDate()).padStart(2, "0")].join("-");
        return localDate === selectedDate;
      });
    }
    host.innerHTML = visibleRows.length ? renderRecordList(page, visibleRows) : (page === "coaching" ? '<div class="empty-state">No coaching schedules for the selected date.</div>' : renderRecordList(page, visibleRows));
    host.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => {
      const row = recordsCache.find((item) => String(item.id) === button.dataset.edit);
      if (row) showRecordForm(page, row);
    }));
    host.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteRecord(page, button.dataset.delete)));
    host.querySelectorAll("[data-meeting-link]").forEach((link) => link.addEventListener("click", (event) => {
      event.preventDefault();
      const meetingUrl = link.href;
      window.open(meetingUrl, "_blank", "noopener,noreferrer");
      window.alert("Don't Forget IC and Zoho Tagging");
    }));
  } catch (error) { host.innerHTML = '<p class="notice">' + escapeHtml(friendlyError(error)) + '</p>'; }
}
function showRecordForm(page, row=null) {
  editingRecordId = row?.id ?? null;
  const config = pageConfig[page];
  const host = $("#record-form-host");
  host.innerHTML = '<form id="record-form" class="record-form"><div class="form-grid">' + config.fields.map((field) => fieldMarkup(field,row||{})).join("") +
    '</div><div class="form-actions"><button class="primary action-button" type="submit">' + (row ? "Save changes" : "Save " + escapeHtml(config.singular)) + '</button><button type="button" class="small-button" id="cancel-record">Cancel</button></div><p class="notice" id="record-form-notice" role="status"></p></form>';
  $("#cancel-record").addEventListener("click", () => { host.innerHTML = ""; editingRecordId = null; });
  $("#record-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    const values = {};
    config.fields.forEach((field) => {
      let value = new FormData(form).get(field.key);
      if (typeof value === "string") value = value.trim();
      values[field.key] = value || null;
    });
    if (values.scheduled_at) values.scheduled_at = new Date(values.scheduled_at).toISOString();
    if (page === "quick-links" && values.url && !/^https?:\/\//i.test(values.url)) values.url = "https://" + values.url;
    try {
      let request = supabaseClient.from(config.table);
      if (editingRecordId) {
        const { error } = await request.update({...values, updated_at:new Date().toISOString()}).eq("id",editingRecordId).eq("team_key",activeTeamKey);
        if (error) throw error;
      } else {
        const { error } = await request.insert({...values, team_key:activeTeamKey, created_by:activeUser.id});
        if (error) throw error;
      }
      host.innerHTML = "";
      message($("#record-notice"), row ? "Changes saved." : "Record added.");
      editingRecordId = null;
      await refreshRecordList(page);
    } catch (error) {
      message($("#record-form-notice"), friendlyError(error));
    } finally { submit.disabled = false; }
  });
}
async function deleteRecord(page, id) {
  const config = pageConfig[page];
  const row = recordsCache.find((item) => String(item.id) === String(id));
  const label = row?.[config.fields[0].key] || config.singular;
  if (!confirm('Delete this ' + config.singular + ' (' + label + ')? This cannot be undone.')) return;
  try {
    const { error } = await supabaseClient.from(config.table).delete().eq("id",id).eq("team_key",activeTeamKey);
    if (error) throw error;
    message($("#record-notice"), "Record deleted.");
    await refreshRecordList(page);
  } catch (error) { message($("#record-notice"), friendlyError(error)); }
}
async function renderPage(page) {
  if (!activeTeamKey) return showTeamSelection();
  currentPage = page;
  if (!workspace.classList.contains("hidden")) {
    setBackgroundVideo(page === "overview" ? "overview-background.mp4" : page === "agents" ? "agents-background.mp4" : page === "ic-logs" ? "ic-logs-background.mp4" : "ocean-background.mp4");
  }
  const [title, subtitle] = pageInfo[page] || pageInfo.overview;
  $("#crumb").textContent = title; $("#crumb").dataset.page = page;
  $("#page-title").textContent = title; $("#page-subtitle").textContent = subtitle;
  document.querySelectorAll(".nav-item[data-page]").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  const content = $("#page-content");
  content.innerHTML = '<section class="content-panel"><p class="muted">Loading…</p></section>';
  try {
    if (page === "overview") await renderOverview(content);
    else await renderRecordsPage(page, content);
  } catch (error) {
    content.innerHTML = '<section class="content-panel"><p class="notice">' + escapeHtml(friendlyError(error)) + '</p><button class="small-button" id="retry-load">Try again</button></section>';
    $("#retry-load").addEventListener("click", () => renderPage(page));
  }
}
$("#nav").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-page]");
  if (button) renderPage(button.dataset.page);
});
$("#team-switch").addEventListener("change", (event) => {
  if (activeTeams.some((team) => team.team_key === event.target.value)) enterTeam(event.target.value);
});
async function restoreSavedSession() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    const user = data?.session?.user;
    if (!user) return;
    const { memberships, teams } = await getUserTeams(user);
    await openAuthenticatedWorkspace(user, memberships, teams);
  } catch (error) {
    message(loginNotice, "Couldn't restore your workspace right now. " + friendlyError(error));
  }
}
restoreSavedSession();
