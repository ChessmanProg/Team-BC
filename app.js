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
function canManageActiveTeam() {
  const role = activeMemberships.find((membership) => membership.team_key === activeTeamKey)?.role;
  return role === "owner" || role === "admin";
}
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
  if (!memberships?.length) return { memberships: [], teams: [] };
  const { data: teams, error: teamsError } = await supabaseClient
    .from("teams").select("team_key, display_name").in("team_key", memberships.map((m) => m.team_key)).eq("is_enabled", true);
  if (teamsError) throw teamsError;
  if (!teams?.length) throw new Error("Your teams are currently disabled. Contact the site owner.");
  return { memberships, teams };
}
async function showTeamRequestChoice(user) {
  activeUser = user; activeMemberships = []; activeTeams = []; activeTeamKey = null;
  sessionStorage.removeItem("teamBcSelectedTeam");
  workspace.classList.add("hidden"); workspace.style.display = "none";
  teamSelection.classList.remove("hidden");
  main.classList.add("hidden"); document.querySelector(".brand").classList.add("hidden"); footer.classList.add("hidden");
  const { data: request, error } = await supabaseClient.from("team_join_requests").select("team_key,status,created_at").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (request) {
    const statusText = request.status === "pending" ? "Your request for " + teamDisplay({team_key:request.team_key}) + " is waiting for an admin's approval." :
      request.status === "approved" ? "Your team is approved. Please sign in again to continue." :
      "Your request was declined. Contact a team admin for help.";
    teamSelection.innerHTML = '<div class="team-selection-inner"><p class="eyebrow">TEAM BC ACCESS</p><h1>Team request</h1><p class="muted">' + escapeHtml(statusText) + '</p><button type="button" class="text-button" id="request-signout">Sign out</button></div>';
    $("#request-signout").addEventListener("click", signOut);
    return;
  }
  teamSelection.innerHTML = '<div class="team-selection-inner"><p class="eyebrow">WELCOME TO TEAM BC</p><h1>Choose your team</h1><p class="muted">Your choice will be sent to that team’s admin for approval. You cannot change it yourself after submitting.</p><div class="team-card-grid">' +
    [{team_key:"chenn",display_name:"Team Chenn BC AI"},{team_key:"gemma",display_name:"Team Gemma BC AI"},{team_key:"lev",display_name:"Team Lev BC AI"}].map((team) => '<button type="button" class="team-card" data-request-team="' + team.team_key + '"><span class="team-card-icon">' + ({chenn:"☀",gemma:"〰",lev:"♥"}[team.team_key]) + '</span><strong>' + escapeHtml(team.display_name) + '</strong><small>Request access <span>→</span></small></button>').join("") +
    '</div><p class="notice" id="team-selection-notice" role="status"></p><button type="button" class="text-button" id="request-signout">Sign out</button></div>';
  teamSelection.querySelectorAll("[data-request-team]").forEach((button) => button.addEventListener("click", async () => {
    teamSelection.querySelectorAll("[data-request-team]").forEach((item) => item.disabled = true);
    const { error: insertError } = await supabaseClient.from("team_join_requests").insert({user_id:user.id,requester_email:user.email,team_key:button.dataset.requestTeam,status:"pending"});
    if (insertError) {
      message($("#team-selection-notice"), friendlyError(insertError));
      teamSelection.querySelectorAll("[data-request-team]").forEach((item) => item.disabled = false);
      return;
    }
    await showTeamRequestChoice(user);
  }));
  $("#request-signout").addEventListener("click", signOut);
}
function showTeamSelection() {
  sessionStorage.removeItem("teamBcSelectedTeam");
  sessionStorage.removeItem("teamBcCurrentPage");
  activeTeamKey = null;
  workspace.classList.add("hidden");
  workspace.style.display = "none";
  teamSelection.classList.remove("hidden");
  teamSelection.innerHTML = '<div class="team-selection-inner"><p class="eyebrow">WELCOME TO TEAM BC</p><h1>Choose your team</h1><p class="muted">Only teams assigned to your account are shown.</p><div class="team-card-grid">' +
    activeTeams.map((team) => '<button type="button" class="team-card" data-team-key="' + escapeHtml(team.team_key) + '"><span class="team-card-icon">' + ({chenn:'☀',gemma:'〰',lev:'♥'}[team.team_key] || '✦') + '</span><strong>' + escapeHtml(teamDisplay(team)) + '</strong><small>Open team workspace <span>→</span></small></button>').join("") +
    '</div><p class="notice" id="team-selection-notice" role="status"></p><button type="button" class="text-button" id="selection-signout">Sign out</button></div>';
  teamSelection.querySelectorAll("[data-team-key]").forEach((button) => button.addEventListener("click", () => enterTeam(button.dataset.teamKey)));
  $("#selection-signout").addEventListener("click", signOut);
  main.classList.add("hidden");
  document.querySelector(".brand").classList.add("hidden");
  footer.classList.add("hidden");
}
function enterTeam(teamKey, requestedPage = "overview") {
  if (!activeTeams.some((team) => team.team_key === teamKey) || !activeMemberships.some((membership) => membership.team_key === teamKey)) {
    message($("#team-selection-notice"), "You don't have access to that team.");
    return;
  }
  activeTeamKey = teamKey;
  sessionStorage.setItem("teamBcSelectedTeam", teamKey);
  const selector = $("#team-switch");
  selector.replaceChildren();
  activeTeams.forEach((team) => { const option = document.createElement("option"); option.value = team.team_key; option.textContent = teamDisplay(team); selector.appendChild(option); });
  selector.value = teamKey;
  $("#team-brand").textContent = "Team BC";
  const displayName = activeUser?.user_metadata?.full_name || activeUser?.user_metadata?.name || activeUser?.email?.split("@")[0] || "Team member";
  $("#workspace-user").textContent = "Hello, " + displayName;
  $("#workspace-role").textContent = teamDisplay(activeTeam());
  teamSelection.classList.add("hidden");
  main.classList.add("hidden");
  document.querySelector(".brand").classList.add("hidden");
  footer.classList.add("hidden");
  workspace.classList.remove("hidden");
  workspace.style.display = "grid";
  const savedPage = pageInfo[requestedPage] ? requestedPage : "overview";
  renderPage(savedPage);
}
async function signOut() {
  sessionStorage.removeItem("teamBcSelectedTeam");
  sessionStorage.removeItem("teamBcCurrentPage");
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
  const savedTeamKey = sessionStorage.getItem("teamBcSelectedTeam");
  const savedPage = sessionStorage.getItem("teamBcCurrentPage") || "overview";
  const canRestoreTeam = teams.some((team) => team.team_key === savedTeamKey) && memberships.some((membership) => membership.team_key === savedTeamKey);
  if (canRestoreTeam) enterTeam(savedTeamKey, savedPage);
  else if (!memberships.length) await showTeamRequestChoice(user);
  else showTeamSelection();
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
    if (/currently disabled/i.test(error.message || "")) await supabaseClient.auth.signOut();
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
    if (data.session) {
      const { memberships, teams } = await getUserTeams(data.user);
      await openAuthenticatedWorkspace(data.user, memberships, teams);
    } else {
      message(notice, "Account created. Check your email to confirm your account, then sign in to choose a team and request approval.");
    }
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
$("#change-password-toggle").addEventListener("click", () => {
  const host = $("#password-change-host");
  if (!host) return;
  if (host.innerHTML) { host.innerHTML = ""; return; }
  host.innerHTML = '<section class="content-panel password-change-panel"><h2>Change your password</h2><p class="muted">Enter your current password, then choose a new password of at least 8 characters.</p><form id="change-password-form" class="record-form"><div class="form-grid"><label>Current password<input type="password" name="current_password" autocomplete="current-password" required></label><label>New password<input type="password" name="new_password" autocomplete="new-password" minlength="8" required></label><label>Confirm new password<input type="password" name="confirm_password" autocomplete="new-password" minlength="8" required></label></div><div class="form-actions"><button class="primary action-button" type="submit">Update password</button><button class="small-button" type="button" id="cancel-password-change">Cancel</button></div><p class="notice" id="change-password-notice" role="status"></p></form></section>';
  $("#cancel-password-change").addEventListener("click", () => { host.innerHTML = ""; });
  $("#change-password-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const notice = $("#change-password-notice");
    const submit = form.querySelector('button[type="submit"]');
    const currentPassword = form.elements.current_password.value;
    const newPassword = form.elements.new_password.value;
    const confirmPassword = form.elements.confirm_password.value;
    if (newPassword.length < 8) return message(notice, "Your new password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return message(notice, "The new passwords do not match.");
    if (newPassword === currentPassword) return message(notice, "Choose a new password different from your current password.");
    submit.disabled = true;
    message(notice, "Verifying your current password…");
    try {
      const { error: verifyError } = await supabaseClient.auth.signInWithPassword({ email: activeUser.email, password: currentPassword });
      if (verifyError) throw new Error("Your current password is incorrect.");
      message(notice, "Updating password…");
      const { error: updateError } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      form.reset();
      message(notice, "Password changed successfully.");
    } catch (error) {
      message(notice, friendlyError(error));
    } finally {
      submit.disabled = false;
    }
  });
});


function closeChissmissReminder() {
  const modal = document.getElementById("chissmiss-reminder");
  if (modal) modal.remove();
}
function showChissmissReminder(meetingUrl) {
  closeChissmissReminder();
  const modal = document.createElement("div");
  modal.id = "chissmiss-reminder";
  modal.className = "chissmiss-backdrop";
  modal.innerHTML = '<section class="chissmiss-modal" role="dialog" aria-modal="true" aria-labelledby="chissmiss-title"><button type="button" class="chissmiss-close" aria-label="Close reminder">×</button><div class="chissmiss-sparkle" aria-hidden="true">✦</div><p class="chissmiss-eyebrow">A LITTLE REMINDER</p><h2 id="chissmiss-title">Chissmiss Time 😉</h2><p class="chissmiss-message">Don\'t forget your <strong>IC</strong> and <strong>Zoho Tagging</strong> 😉</p><div class="chissmiss-divider"></div><p class="chissmiss-subtext">Get everything ready, then join your meeting!</p><button type="button" class="chissmiss-continue">Chissmiss Time ✨</button></section>';
  document.body.appendChild(modal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest(".chissmiss-close")) closeChissmissReminder();
  });
  modal.querySelector(".chissmiss-continue").addEventListener("click", () => {
    if (meetingUrl) window.location.href = meetingUrl;
    else closeChissmissReminder();
  });
  modal.querySelector(".chissmiss-continue").focus();
}
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-meeting-link]");
  if (!link) return;
  event.preventDefault();
  showChissmissReminder(link.href);
});

$("#back-teams").addEventListener("click", showTeamSelection);

const pageInfo = {
  overview: ["Team dashboard", "A clear view of the work happening across your team."],
  agents: ["Agents", "Manage agent records for this team."],
  coaching: ["Coaching", "Create and manage coaching sessions and meeting links."],
  "ic-logs": ["IC Logs", "Record and review incidents and interactions."],
  "quick-links": ["Quick Links", "Save useful team links in one place."],
  "bc-ai": ["BC AI", "Shoot your photo into the hoop to upload it."],
  "team-requests": ["Team requests", "Review requests to join this team."]
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
    {key:"extension_minutes",label:"IC Extension / Minutes",type:"number",required:false},
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
  if (key === "extension_minutes") return value == null || value === "" ? "—" : escapeHtml(value + " min");
  if (key === "meet_link" && value) { const url = /^https?:\/\//i.test(value) ? value : "https://" + value; return '<a class="meeting-pill" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer" data-meeting-link="true">Join Meeting <span aria-hidden="true">↗</span></a>'; }
  if (key === "url" && value) return '<a class="quick-link-title" href="' + escapeHtml(/^https?:\/\//i.test(value) ? value : "https://" + value) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(row.title || "Open link") + '</a>';
  return escapeHtml(value || "—");
}
const DAILY_MOTIVATIONAL_QUOTES = [
  { text: "Progress is built one small step at a time.", author: "Team BC" },
  { text: "Your effort today creates the opportunities of tomorrow.", author: "Team BC" },
  { text: "Consistency turns small actions into meaningful results.", author: "Team BC" },
  { text: "Challenges are chances to learn, adapt, and grow.", author: "Team BC" },
  { text: "Focus on what you can do today; let tomorrow build from it.", author: "Team BC" },
  { text: "A strong team grows when each person chooses to improve.", author: "Team BC" },
  { text: "You do not need to be perfect to make progress.", author: "Team BC" },
  { text: "Keep showing up. The little things add up.", author: "Team BC" },
  { text: "Turn setbacks into lessons and lessons into better actions.", author: "Team BC" },
  { text: "Good results begin with clear goals and steady effort.", author: "Team BC" },
  { text: "Believe in the work you are putting in, even before the results appear.", author: "Team BC" },
  { text: "Every day is another chance to take one step forward.", author: "Team BC" },
  { text: "The way forward is made by the actions you take now.", author: "Team BC" },
  { text: "Small improvements, repeated daily, create lasting change.", author: "Team BC" }
];
function getDailyQuote() {
  const now = new Date();
  const dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  return DAILY_MOTIVATIONAL_QUOTES[((dayNumber % DAILY_MOTIVATIONAL_QUOTES.length) + DAILY_MOTIVATIONAL_QUOTES.length) % DAILY_MOTIVATIONAL_QUOTES.length];
}
async function renderOverview(content) {
  const counts = await loadCounts();
  const quote = getDailyQuote();
  content.innerHTML = '<div class="stat-grid">' +
    [["TOTAL AGENTS",counts[0]],["COACHING SESSIONS",counts[1]],["TOTAL IC LOGS",counts[2]],["QUICK LINKS",counts[3]]].map(([label,count]) => '<article class="stat"><small>' + label + '</small><strong>' + count + '</strong></article>').join("") +
    '</div><section class="daily-quote-card" aria-labelledby="daily-quote-title"><div class="daily-quote-magic" aria-hidden="true"><span class="quote-orbit"></span><span class="quote-orb quote-orb-one"></span><span class="quote-orb quote-orb-two"></span><span class="quote-sparkle">✦</span><span class="quote-sparkle">✧</span><span class="quote-sparkle">✦</span><span class="quote-sparkle">✧</span><span class="quote-sparkle">✦</span><span class="quote-sparkle">✧</span></div><div class="daily-quote-mark" aria-hidden="true">“</div><div class="daily-quote-copy"><p class="daily-quote-label" id="daily-quote-title">★ QUOTE OF THE DAY <span>✦</span></p><blockquote>' + escapeHtml(quote.text) + '</blockquote><p class="daily-quote-author">— ' + escapeHtml(quote.author) + '</p><p class="daily-quote-mantra"><span aria-hidden="true">♧</span> Better today than yesterday.<br>That’s progress.</p><div class="quote-pagination" aria-hidden="true"><i class="is-active"></i><i></i><i></i><i></i></div></div></section><section class="content-panel"><h2>Welcome to ' + escapeHtml(teamDisplay(activeTeam())) + '</h2><p class="muted">Your records are saved to this team only.</p><div class="empty-state">' + (canManageActiveTeam() ? "Choose a section from the left menu to add or manage records." : "Choose a section from the left menu to view records and open links.") + '</div></section>';
}
function fieldMarkup(field, row={}) {
  let value = row[field.key] ?? "";
  if (field.key === "agent_name" && activeTeamKey === "chenn") {
    return '<label>' + escapeHtml(field.label) + '<select name="agent_name" required><option value="">Choose an agent</option>' + CHENN_AGENTS.map((name) => '<option value="' + escapeHtml(name) + '"' + (value === name ? " selected" : "") + '>' + escapeHtml(name) + '</option>').join("") + '</select></label>';
  }
  if (field.type === "datetime-local" && value) value = new Date(value).toISOString().slice(0,16);
  const required = field.required ? " required" : "";
  if (field.type === "number") return '<label>' + escapeHtml(field.label) + '<input type="number" min="0" step="1" name="' + field.key + '" value="' + escapeHtml(value) + '"' + required + '></label>';
  if (field.type === "textarea") return '<label>' + escapeHtml(field.label) + '<textarea name="' + field.key + '"' + required + '>' + escapeHtml(value) + '</textarea></label>';
  if (field.type === "select") return '<label>' + escapeHtml(field.label) + '<select name="' + field.key + '"' + required + '>' + field.options.map((option) => '<option' + (value === option ? " selected" : "") + '>' + escapeHtml(option) + '</option>').join("") + '</select></label>';
  const type = field.type || "text";
  if (field.key === "log_date" && !value) value = new Date().toISOString().slice(0,10);
  return '<label>' + escapeHtml(field.label) + '<input type="' + type + '" name="' + field.key + '" value="' + escapeHtml(value) + '"' + required + '></label>';
}
function renderRecordList(page, rows) {
  const config = pageConfig[page];
  const canManage = canManageActiveTeam();
  if (!rows.length) return '<div class="empty-state">' + (canManage ? 'No ' + config.plural + ' yet. Select “Add ' + config.singular + '” to create the first one.' : 'No ' + config.plural + ' to display.') + '</div>';
  const cols = config.fields.slice(0, page === "ic-logs" ? 5 : 5);
  return '<div class="records-wrap"><table class="records-table"><thead><tr>' + cols.map((field) => '<th>' + escapeHtml(field.label) + '</th>').join("") + (canManage ? '<th>Actions</th>' : '') + '</tr></thead><tbody>' +
    rows.map((row) => '<tr>' + cols.map((field) => '<td>' + recordValue(row, field.key) + '</td>').join("") +
    (canManage ? '<td class="record-actions"><button type="button" class="small-button" data-edit="' + row.id + '">Edit</button><button type="button" class="small-button danger" data-delete="' + row.id + '">Delete</button></td>' : '') + '</tr>').join("") +
    '</tbody></table></div>';
}
async function renderRecordsPage(page, content) {
  const config = pageConfig[page];
  const today = new Date();
  const localToday = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
  const canManage = canManageActiveTeam();
  content.innerHTML = '<section class="content-panel"><div class="panel-heading"><div><h2>' + escapeHtml(config.plural[0].toUpperCase()+config.plural.slice(1)) + '</h2><p class="muted">Saved for ' + escapeHtml(teamDisplay(activeTeam())) + ' only.</p></div>' + (canManage ? '<div class="record-toolbar"><button type="button" class="primary action-button" id="add-record">+ Add ' + escapeHtml(config.singular) + '</button>' + (page === "coaching" ? '<button type="button" class="small-button action-button" id="bulk-coaching-toggle">Bulk import schedules</button>' : '') + '</div>' : '') + '</div>' + (page === "coaching" ? '<div class="daily-schedule-filter"><label for="coaching-schedule-date">Show agents scheduled on</label><input type="date" id="coaching-schedule-date" value="' + localToday + '"><p class="muted">Only coaching schedules for the selected day are shown.</p></div>' : '') + '<div id="bulk-coaching-host"></div><div id="record-form-host"></div><p class="notice" id="record-notice" role="status"></p><div id="records-list"><p class="muted">Loading records…</p></div></section>';
  if (canManage) $("#add-record").addEventListener("click", () => showRecordForm(page));
  if (page === "coaching") {
    if (canManage) $("#bulk-coaching-toggle").addEventListener("click", showBulkCoachingImport);
    $("#coaching-schedule-date").addEventListener("change", () => refreshRecordList("coaching"));
  }
  await refreshRecordList(page);
}
function showBulkCoachingImport() {
  if (!canManageActiveTeam()) return;
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
  if (!canManageActiveTeam()) return;
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
  if (!canManageActiveTeam()) return;
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
  if (!canManageActiveTeam()) return;
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
async function renderBCAIPage(content) {
  content.innerHTML = '<section class="content-panel bc-ai-panel"><div class="panel-heading"><div><h2>🏀 BC AI Photo Court</h2><p class="muted">Choose a photo, pull the ball back, then release to shoot toward the hoop.</p></div></div>' +
    '<input id="bc-ai-photo-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden><input id="bc-ai-replace-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden>' +
    '<div class="bc-ai-court" id="bc-ai-court" tabindex="0" aria-label="Basketball court. Pull the ball back and release to shoot toward the hoop.">' +
      '<div class="bc-ai-court-lines" aria-hidden="true"></div><div class="bc-ai-backboard"></div><div class="bc-ai-hoop"><span class="bc-ai-net"></span></div>' +
      '<div class="bc-ai-instructions"><strong>Pull. Aim. Release!</strong><span>Drag the ball back, then let go</span><small>Choose a JPG, PNG, WEBP or GIF · Max 10 MB</small></div>' +
      '<div class="bc-ai-ball" id="bc-ai-ball" role="button" tabindex="0" aria-label="Pull basketball back and release to shoot">🏀</div>' +
      '<div class="bc-ai-selected" id="bc-ai-selected" hidden></div>' +
      '<div class="bc-ai-score-flash" id="bc-ai-score-flash" aria-live="polite"></div>' +
    '</div><div class="bc-ai-controls"><button type="button" class="small-button" id="bc-ai-browse">Choose photo</button></div>' +
    '<p class="notice" id="bc-ai-notice" role="status">Choose a photo, pull the basketball back, then release. Photos are private to ' + escapeHtml(teamDisplay(activeTeam())) + '.</p>' +
    '<div class="bc-ai-gallery-heading"><h3>Uploaded photos</h3><button type="button" class="small-button" id="bc-ai-refresh">Refresh</button></div><div class="bc-ai-gallery" id="bc-ai-gallery"><p class="muted">Loading photos…</p></div></section>';
  const input = $("#bc-ai-photo-input"), replaceInput = $("#bc-ai-replace-input"), court = $("#bc-ai-court"), ball = $("#bc-ai-ball");
  const hoop = court.querySelector(".bc-ai-hoop"), selected = $("#bc-ai-selected"), notice = $("#bc-ai-notice");
  let chosenFile = null, busy = false, pendingReplacePath = null, pointerOffset = {x:0,y:0}, draggingBall = false, dragStart = {x:0,y:0}, ballStart = {x:0,y:0};
  function chooseFile(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) { message(notice, "Please choose a JPG, PNG, WEBP, or GIF photo."); return; }
    if (file.size > 10 * 1024 * 1024) { message(notice, "That photo is over 10 MB. Choose a smaller image."); return; }
    chosenFile = file;
    selected.hidden = false;
    selected.textContent = "📷 " + file.name + " · " + (file.size / 1024 / 1024).toFixed(2) + " MB";
    court.classList.add("has-photo");
    court.classList.remove("shot-made","shot-missed");
    message(notice, "Photo ready! Pull the ball back and release to shoot.");
  }
  input.addEventListener("change", () => chooseFile(input.files?.[0]));
  replaceInput.addEventListener("change", async () => {
    const file = replaceInput.files?.[0], oldPath = pendingReplacePath;
    replaceInput.value = ""; pendingReplacePath = null;
    if (!file || !oldPath) return;
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) { message(notice, "Please choose a JPG, PNG, WEBP, or GIF photo."); return; }
    if (file.size > 10 * 1024 * 1024) { message(notice, "That photo is over 10 MB. Choose a smaller image."); return; }
    if (!isEditablePhotoPath(oldPath)) { message(notice, "You can only replace photos you uploaded."); return; }
    const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-90) || "photo";
    const newPath = activeTeamKey + "/" + activeUser.id + "/" + Date.now() + "-" + safeName;
    replaceInput.disabled = true;
    message(notice, "Uploading replacement photo…");
    try {
      const { error: uploadError } = await supabaseClient.storage.from("bc-ai-photos").upload(newPath, file, {contentType:file.type, upsert:false});
      if (uploadError) throw uploadError;
      const { error: removeError } = await supabaseClient.storage.from("bc-ai-photos").remove([oldPath]);
      if (removeError) {
        message(notice, "Replacement uploaded, but the old photo could not be removed due to storage permissions. Both copies may appear.");
      } else {
        message(notice, "Photo replaced successfully.");
      }
      await loadBCAIGallery();
    } catch (error) {
      message(notice, "Could not replace photo: " + friendlyError(error));
    } finally { replaceInput.disabled = false; }
  });
  function isEditablePhotoPath(path) {
    const parts = String(path || "").split("/");
    return parts.length >= 3 && parts[0] === activeTeamKey && parts[1] === activeUser?.id;
  }
  $("#bc-ai-browse").addEventListener("click", () => { if (!busy) input.click(); });
  ["dragenter","dragover"].forEach((name) => court.addEventListener(name, (event) => { event.preventDefault(); if (!draggingBall) court.classList.add("is-dragging"); }));
  ["dragleave","drop"].forEach((name) => court.addEventListener(name, (event) => { event.preventDefault(); court.classList.remove("is-dragging"); }));
  court.addEventListener("drop", (event) => chooseFile(event.dataTransfer?.files?.[0]));
  ball.addEventListener("pointerdown", (event) => {
    if (busy) return;
    event.preventDefault();
    const rect = ball.getBoundingClientRect(), courtRect = court.getBoundingClientRect();
    pointerOffset = {x:event.clientX - rect.left, y:event.clientY - rect.top};
    ballStart = {x:rect.left - courtRect.left, y:rect.top - courtRect.top};
    dragStart = {x:event.clientX, y:event.clientY};
    ball.style.left = ballStart.x + "px"; ball.style.top = ballStart.y + "px";
    ball.style.right = "auto"; ball.style.bottom = "auto";
    ball.classList.add("is-grabbed"); draggingBall = true;
    ball.setPointerCapture(event.pointerId);
    court.classList.add("is-dragging");
    message(notice, chosenFile ? "Pull the ball back, then release to shoot!" : "Choose a photo first. Then pull the ball back and release.");
  });
  ball.addEventListener("pointermove", (event) => {
    if (!draggingBall) return;
    const rect = court.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - ball.offsetWidth, event.clientX - rect.left - pointerOffset.x));
    const y = Math.max(0, Math.min(rect.height - ball.offsetHeight, event.clientY - rect.top - pointerOffset.y));
    ball.style.left = x + "px"; ball.style.top = y + "px";
  });
  ball.addEventListener("pointerup", async (event) => {
    if (!draggingBall) return;
    draggingBall = false; ball.classList.remove("is-grabbed"); court.classList.remove("is-dragging");
    const courtRect = court.getBoundingClientRect(), ballRect = ball.getBoundingClientRect(), hoopRect = hoop.getBoundingClientRect();
    const release = {x:ballRect.left-courtRect.left, y:ballRect.top-courtRect.top};
    const hoopTarget = {x:hoopRect.left-courtRect.left+(hoopRect.width-ballRect.width)/2, y:hoopRect.top-courtRect.top+(hoopRect.height-ballRect.height)/2};
    const pullDistance = Math.hypot(event.clientX-dragStart.x, event.clientY-dragStart.y);
    if (!chosenFile) {
      message(notice, "Choose a photo first, then pull the ball back and release to shoot.");
      ball.style.left=""; ball.style.top=""; ball.style.right=""; ball.style.bottom="";
      return;
    }
    if (pullDistance < 12) {
      message(notice, "Pull the ball back a little, then release!");
      ball.style.left=""; ball.style.top=""; ball.style.right=""; ball.style.bottom="";
      return;
    }
    await shootBall(release, hoopTarget, pullDistance);
  });
  ball.addEventListener("pointercancel", () => {
    draggingBall = false; ball.classList.remove("is-grabbed"); court.classList.remove("is-dragging");
    ball.style.left=""; ball.style.top=""; ball.style.right=""; ball.style.bottom="";
  });
  ball.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && !busy) {
      event.preventDefault();
      if (!chosenFile) input.click();
      else message(notice, "Use your mouse or finger to pull the basketball back, then release.");
    }
  });
  async function shootBall(release, target, pullDistance) {
    if (!chosenFile || busy) return;
    busy = true; input.disabled = true; ball.classList.add("is-uploading");
    court.classList.remove("shot-made","shot-missed");
    message(notice, "You released it… shot in the air!");
    const startX = release.x, startY = release.y;
    const dx = target.x-startX, dy = target.y-startY;
    const lift = Math.min(95, 30 + pullDistance*.22);
    const duration = Math.max(420, Math.min(850, 850-pullDistance*1.2));
    try {
      if (ball.animate) {
        const animation = ball.animate([
          {left:startX+"px",top:startY+"px",transform:"rotate(0deg) scale(1)",opacity:1},
          {left:(startX+dx*.48)+"px",top:(startY+dy*.48-lift)+"px",transform:"rotate(260deg) scale(.88)",opacity:1,offset:.48},
          {left:target.x+"px",top:target.y+"px",transform:"rotate(560deg) scale(.58)",opacity:.85}
        ], {duration,easing:"cubic-bezier(.2,.7,.25,1)",fill:"forwards"});
        await animation.finished;
      } else {
        ball.style.left=target.x+"px"; ball.style.top=target.y+"px";
        await new Promise(resolve=>setTimeout(resolve,duration));
      }
      const safeName = chosenFile.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-90) || "photo";
      const path = activeTeamKey + "/" + activeUser.id + "/" + Date.now() + "-" + safeName;
      const { error } = await supabaseClient.storage.from("bc-ai-photos").upload(path, chosenFile, {contentType:chosenFile.type, upsert:false});
      if (error) throw error;
      court.classList.add("shot-made");
      $("#bc-ai-score-flash").textContent = "SWISH! PHOTO UPLOADED ✓";
      message(notice, "Great shot! Your photo was uploaded successfully.");
      chosenFile = null; input.value = ""; selected.hidden = true; selected.textContent = ""; court.classList.remove("has-photo");
      await loadBCAIGallery();
    } catch (error) {
      court.classList.remove("shot-made"); court.classList.add("shot-missed");
      $("#bc-ai-score-flash").textContent = "REBOUND — TRY AGAIN";
      message(notice, "Upload failed: " + friendlyError(error) + " Your photo is still selected, so try again.");
    } finally {
      busy = false; input.disabled = false; ball.classList.remove("is-uploading");
      ball.style.left=""; ball.style.top=""; ball.style.right=""; ball.style.bottom="";
      if (ball.getAnimations) ball.getAnimations().forEach(animation=>animation.cancel());
    }
  }
  async function loadBCAIGallery() {
    const gallery = $("#bc-ai-gallery");
    gallery.innerHTML = '<p class="muted">Loading photos…</p>';
    try {
      const { data, error } = await supabaseClient.storage.from("bc-ai-photos").list(activeTeamKey, {limit:100, sortBy:{column:"created_at",order:"desc"}});
      if (error) throw error;
      const folders = (data || []).filter((item) => item.id === null);
      const files = (data || []).filter((item) => item.id !== null && item.name);
      const allFiles = [];
      for (const folder of folders) {
        const { data: nested, error: nestedError } = await supabaseClient.storage.from("bc-ai-photos").list(activeTeamKey + "/" + folder.name, {limit:100, sortBy:{column:"created_at",order:"desc"}});
        if (!nestedError) {
          for (const item of (nested || []).filter((entry) => entry.id !== null && entry.name)) {
            allFiles.push({name:item.name,path:activeTeamKey + "/" + folder.name + "/" + item.name,created_at:item.created_at});
          }
        }
      }
      for (const item of files) allFiles.push({name:item.name,path:activeTeamKey + "/" + item.name,created_at:item.created_at});
      allFiles.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      if (!allFiles.length) { gallery.innerHTML = '<div class="empty-state">No photos yet. Be the first to score!</div>'; return; }
      gallery.innerHTML = "";
      for (const item of allFiles) {
        const { data: signed, error: signError } = await supabaseClient.storage.from("bc-ai-photos").createSignedUrl(item.path, 3600);
        if (signError || !signed?.signedUrl) continue;
        const card = document.createElement("div");
        card.className = "bc-ai-photo-card";
        const preview = document.createElement("a");
        preview.className = "bc-ai-photo-preview"; preview.href = signed.signedUrl; preview.target = "_blank"; preview.rel = "noopener noreferrer"; preview.setAttribute("aria-label", "Open " + item.name);
        const img = document.createElement("img"); img.src = signed.signedUrl; img.alt = item.name; img.loading = "lazy";
        const caption = document.createElement("span"); caption.textContent = item.name;
        preview.append(img, caption); card.appendChild(preview);

        const commentsPanel = document.createElement("div");
        commentsPanel.className = "bc-ai-comments";
        const commentsHeading = document.createElement("div");
        commentsHeading.className = "bc-ai-comments-heading";
        commentsHeading.innerHTML = '<strong>💬 Photo reminders</strong><span>Team notes</span>';
        const commentsList = document.createElement("div");
        commentsList.className = "bc-ai-comments-list";
        commentsList.innerHTML = '<p class="muted">Loading comments…</p>';
        const commentForm = document.createElement("form");
        commentForm.className = "bc-ai-comment-form";
        const commentInput = document.createElement("textarea");
        commentInput.name = "comment";
        commentInput.maxLength = 1000;
        commentInput.rows = 2;
        commentInput.placeholder = "Add a reminder or note about this photo…";
        commentInput.setAttribute("aria-label", "Comment on this photo");
        commentInput.required = true;
        const commentSubmit = document.createElement("button");
        commentSubmit.type = "submit";
        commentSubmit.className = "small-button";
        commentSubmit.textContent = "Add comment";
        commentForm.append(commentInput, commentSubmit);
        commentsPanel.append(commentsHeading, commentsList, commentForm);
        card.appendChild(commentsPanel);
        async function refreshPhotoComments() {
          commentsList.innerHTML = '<p class="muted">Loading comments…</p>';
          try {
            const { data: comments, error: commentsError } = await supabaseClient.from("team_bc_ai_photo_comments")
              .select("id, user_id, comment_text, created_at").eq("team_key", activeTeamKey).eq("photo_path", item.path)
              .order("created_at", {ascending:true});
            if (commentsError) throw commentsError;
            commentsList.innerHTML = "";
            if (!comments?.length) {
              commentsList.innerHTML = '<p class="bc-ai-no-comments">No reminders yet. Leave the first note ✨</p>';
              return;
            }
            for (const comment of comments) {
              const entry = document.createElement("article");
              entry.className = "bc-ai-comment";
              const author = document.createElement("strong");
              author.textContent = comment.user_id === activeUser?.id ? "You" : "Team member";
              const date = document.createElement("time");
              date.dateTime = comment.created_at;
              date.textContent = formatDate(comment.created_at, true);
              const body = document.createElement("p");
              body.textContent = comment.comment_text;
              entry.append(author, date, body);
              commentsList.appendChild(entry);
            }
          } catch (error) {
            commentsList.innerHTML = '<p class="bc-ai-no-comments">Comments need to be enabled in Supabase before they can be loaded.</p>';
          }
        }
        commentForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const text = commentInput.value.trim();
          if (!text) return;
          commentSubmit.disabled = true;
          commentSubmit.textContent = "Saving…";
          try {
            const { error: insertCommentError } = await supabaseClient.from("team_bc_ai_photo_comments").insert({
              team_key: activeTeamKey, photo_path: item.path, user_id: activeUser.id, comment_text: text
            });
            if (insertCommentError) throw insertCommentError;
            commentInput.value = "";
            await refreshPhotoComments();
          } catch (error) {
            message(notice, "Couldn't save the photo comment. Make sure the BC AI comments SQL setup has been run. " + friendlyError(error));
          } finally {
            commentSubmit.disabled = false;
            commentSubmit.textContent = "Add comment";
          }
        });
        await refreshPhotoComments();

        if (isEditablePhotoPath(item.path)) {
          const actions = document.createElement("div"); actions.className = "bc-ai-photo-actions";
          const replaceButton = document.createElement("button"); replaceButton.type = "button"; replaceButton.className = "small-button"; replaceButton.textContent = "Replace"; replaceButton.addEventListener("click", () => { pendingReplacePath = item.path; replaceInput.click(); });
          const deleteButton = document.createElement("button"); deleteButton.type = "button"; deleteButton.className = "small-button bc-ai-delete-button"; deleteButton.textContent = "Delete";
          deleteButton.addEventListener("click", async () => {
            if (!isEditablePhotoPath(item.path) || !confirm("Delete this photo permanently? This cannot be undone.")) return;
            deleteButton.disabled = true;
            message(notice, "Deleting photo…");
            try {
              const { error } = await supabaseClient.storage.from("bc-ai-photos").remove([item.path]);
              if (error) throw error;
              message(notice, "Photo deleted.");
              await loadBCAIGallery();
            } catch (error) {
              message(notice, "Could not delete photo: " + friendlyError(error));
              deleteButton.disabled = false;
            }
          });
          actions.append(replaceButton, deleteButton); card.appendChild(actions);
        }
        gallery.appendChild(card);
      }
      if (!gallery.children.length) gallery.innerHTML = '<p class="muted">Photos are saved, but previews could not be loaded. Try refreshing.</p>';
    } catch (error) { gallery.innerHTML = '<p class="notice">' + escapeHtml(friendlyError(error)) + '</p>'; }
  }
  $("#bc-ai-refresh").addEventListener("click", loadBCAIGallery);
  await loadBCAIGallery();
}
async function renderTeamRequests(content) {
  if (!canManageActiveTeam()) throw new Error("Only this team's admins can review requests.");
  const { data: requests, error } = await supabaseClient.from("team_join_requests")
    .select("user_id,requester_email,team_key,status,created_at").eq("team_key", activeTeamKey).eq("status", "pending").order("created_at", {ascending:true});
  if (error) throw error;
  content.innerHTML = '<section class="content-panel"><h2>Pending requests for ' + escapeHtml(teamDisplay(activeTeam())) + '</h2><p class="muted">Approving grants member access only. Existing owner/admin roles are not changed.</p><div id="team-request-list"></div><p class="notice" id="team-request-notice" role="status"></p></section>';
  const list = $("#team-request-list");
  if (!requests?.length) { list.innerHTML = '<p class="muted">No pending requests.</p>'; return; }
  for (const request of requests) {
    const item = document.createElement("div"); item.className = "request-row";
    item.innerHTML = '<div><strong>' + escapeHtml(request.requester_email || request.user_id) + '</strong><p class="muted">Requested ' + escapeHtml(new Date(request.created_at).toLocaleString()) + '</p></div><div class="form-actions"><button type="button" class="primary" data-decision="approved">Approve member</button><button type="button" class="small-button" data-decision="rejected">Reject</button></div>';
    item.querySelectorAll("[data-decision]").forEach((button) => button.addEventListener("click", async () => {
      button.disabled = true;
      const { error: updateError } = await supabaseClient.from("team_join_requests").update({status:button.dataset.decision,reviewed_at:new Date().toISOString(),reviewed_by:activeUser.id}).eq("user_id",request.user_id).eq("team_key",activeTeamKey).eq("status","pending");
      if (updateError) { message($("#team-request-notice"), friendlyError(updateError)); button.disabled = false; return; }
      await renderTeamRequests(content);
    }));
    list.appendChild(item);
  }
}
async function renderPage(page) {
  if (!activeTeamKey) return showTeamSelection();
  currentPage = page;
  sessionStorage.setItem("teamBcSelectedTeam", activeTeamKey);
  sessionStorage.setItem("teamBcCurrentPage", pageInfo[page] ? page : "overview");
  if (!workspace.classList.contains("hidden")) {
    setBackgroundVideo(page === "overview" ? "overview-background.mp4" : ["agents", "coaching", "ic-logs", "quick-links"].includes(page) ? "ic-logs-background.mp4" : "ocean-background.mp4");
  }
  const [title, subtitle] = pageInfo[page] || pageInfo.overview;
  $("#crumb").textContent = title; $("#crumb").dataset.page = page;
  $("#page-title").textContent = title; $("#page-subtitle").textContent = subtitle;
  document.querySelectorAll(".nav-item[data-page]").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  const requestNav = $("#team-requests-nav");
  if (requestNav) requestNav.classList.toggle("hidden", !canManageActiveTeam());
  const content = $("#page-content");
  content.innerHTML = '<section class="content-panel"><p class="muted">Loading…</p></section>';
  try {
    if (page === "overview") await renderOverview(content);
    else if (page === "bc-ai") await renderBCAIPage(content);
    else if (page === "team-requests") await renderTeamRequests(content);
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
