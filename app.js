const $ = (selector) => document.querySelector(selector);
const loginForm = $("#login-form");
const loginNotice = $("#login-notice");
const workspace = $("#workspace");
const loginPanel = $("#login-panel");
const main = document.querySelector("main");
const footer = document.querySelector("footer");
const panels = [loginPanel, $("#signup-panel"), $("#recovery-panel")];
const SUPABASE_URL = "https://asqyegtenygvgwwtazac.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tTCz-II0_05GRTzjjH1HFQ_SSNt5RZr";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function showPanel(panel) {
  panels.forEach((item) => item.classList.toggle("hidden", item !== panel));
}
function message(element, text) { element.textContent = text; }
function friendlyError(error) {
  const text = error?.message || "Something went wrong. Please try again.";
  if (/invalid login credentials/i.test(text)) return "Email or password is incorrect.";
  if (/email not confirmed/i.test(text)) return "Please confirm your email using the link we sent you.";
  if (/password should be at least/i.test(text)) return "Use a stronger password (at least 8 characters).";
  return text;
}

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
document.addEventListener("click", (event) => {
  const trigger = event.target.closest("#show-signup");
  if (trigger) {
    event.preventDefault();
    openSignup();
  }
});
$("#show-login").addEventListener("click", () => showPanel(loginPanel));
$("#recovery-back").addEventListener("click", () => showPanel(loginPanel));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) return message(loginNotice, "Authentication library did not load. Check your internet connection and refresh.");
  const submit = loginForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  message(loginNotice, "Signing in securely…");
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: $("#email").value.trim(),
      password: $("#password").value
    });
    if (error) throw error;
    const { data: memberships, error: membershipError } = await supabaseClient
      .from("team_memberships").select("team_key, role").eq("user_id", data.user.id);
    if (membershipError) {
      await supabaseClient.auth.signOut();
      throw membershipError;
    }
    if (!memberships?.length) {
      await supabaseClient.auth.signOut();
      message(loginNotice, "Your account is valid, but it has no team access yet. Ask a Team BC owner/admin to grant membership.");
      return;
    }
    const { data: teams, error: teamsError } = await supabaseClient
      .from("teams").select("team_key, display_name")
      .in("team_key", memberships.map((membership) => membership.team_key))
      .eq("is_enabled", true);
    if (teamsError) throw teamsError;
    if (!teams?.length) {
      await supabaseClient.auth.signOut();
      message(loginNotice, "Your memberships exist, but none of those teams is currently enabled. Contact the site owner.");
      return;
    }
    openAuthenticatedWorkspace(data.user, memberships, teams);
  } catch (error) {
    message(loginNotice, friendlyError(error));
  } finally {
    submit.disabled = false;
  }
});

$("#signup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const notice = $("#signup-notice");
  if (!supabaseClient) return message(notice, "Authentication library did not load. Refresh and try again.");
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true;
  message(notice, "Creating your account…");
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: $("#signup-email").value.trim(),
      password: $("#signup-password").value,
      options: { emailRedirectTo: "https://chessmanprog.github.io/Team-BC/" }
    });
    if (error) throw error;
    message(notice, data.session
      ? "Account created. Email confirmation may still be required. A team admin must grant team access separately."
      : "Account created if this email is eligible. Check your inbox for a confirmation link. Registration does not grant team access.");
  } catch (error) {
    message(notice, friendlyError(error));
  } finally {
    submit.disabled = false;
  }
});

$("#recovery-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const notice = $("#recovery-notice");
  if (!supabaseClient) return message(notice, "Authentication library did not load. Refresh and try again.");
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true;
  message(notice, "Requesting reset link…");
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail($("#recovery-email").value.trim(), {
      redirectTo: "https://chessmanprog.github.io/Team-BC/"
    });
    if (error) throw error;
    message(notice, "If an account exists for that email, a password-reset link will be sent. Check your inbox.");
  } catch (error) {
    message(notice, friendlyError(error));
  } finally {
    submit.disabled = false;
  }
});

$("#back-login").addEventListener("click", async () => {
  if (supabaseClient) await supabaseClient.auth.signOut();
  activeUser = null;
  activeMemberships = [];
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
  $("#crumb").dataset.page = page;
  $("#page-title").textContent = title;
  $("#page-subtitle").textContent = subtitle;
  document.querySelectorAll(".nav-item[data-page]").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  const content = $("#page-content");
  if (page === "overview") {
    content.innerHTML = '<div class="stat-grid"><article class="stat"><small>TOTAL AGENTS</small><strong>—</strong></article><article class="stat"><small>TOTAL COACHING</small><strong>—</strong></article><article class="stat"><small>TOTAL IC LOGS</small><strong>—</strong></article><article class="stat"><small>QUICK LINKS</small><strong>—</strong></article></div><section class="content-panel"><h2>Recent activity</h2><p class="muted">Latest updates across your team will appear here.</p><div class="empty-state">No data connected yet. This preview uses no real records.</div></section>';
  } else if (page === "quick-links") {
    content.innerHTML = '<div class="link-grid"><article class="link-card"><strong>Team resources</strong><p>Approved team reference links will appear here.</p></article><article class="link-card"><strong>Learning resources</strong><p>Helpful learning destinations for your team.</p></article><article class="link-card"><strong>Support</strong><p>Useful support links and internal guides.</p></article></div>';
  } else {
    const details = { agents: ["Agent records", "Create, review, and update agent records."], coaching: ["Coaching sessions", "Schedule and manage coaching sessions."], "ic-logs": ["IC log records", "Review and maintain IC log entries."] }[page];
    content.innerHTML = '<section class="content-panel"><h2>' + details[0] + '</h2><p class="muted">' + details[1] + '</p><div class="empty-state">This page is a layout scaffold only. Record forms, permissions, uploads, and database access still need to be implemented.</div></section>';
  }
}
$("#nav").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-page]");
  if (button) renderPage(button.dataset.page);
});
let activeUser = null;
let activeMemberships = [];
function openAuthenticatedWorkspace(user, memberships, teams) {
  activeUser = user;
  activeMemberships = memberships;
  const selector = $("#team-switch");
  selector.replaceChildren();
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = team.team_key;
    option.textContent = team.display_name;
    selector.appendChild(option);
  });
  const currentTeam = teams[0];
  selector.value = currentTeam.team_key;
  $("#team-brand").textContent = teamNames[currentTeam.team_key] || currentTeam.display_name;
  $("#workspace-user").textContent = user.email || "Signed in";
  $("#workspace-role").textContent = memberships.find((item) => item.team_key === currentTeam.team_key)?.role || "member";
  main.classList.add("hidden");
  document.querySelector(".brand").classList.add("hidden");
  footer.classList.add("hidden");
  workspace.classList.remove("hidden");
  workspace.style.display = "grid";
  renderPage("overview");
  message(loginNotice, "");
}
$("#team-switch").addEventListener("change", (event) => {
  const teamKey = event.target.value;
  const allowed = activeMemberships.some((membership) => membership.team_key === teamKey);
  if (!allowed) {
    message($("#workspace-notice"), "You don't have access to that team.");
    return;
  }
  $("#team-brand").textContent = teamNames[teamKey] || teamKey;
  $("#workspace-role").textContent = activeMemberships.find((item) => item.team_key === teamKey)?.role || "member";
  message($("#workspace-notice"), "");
  renderPage($("#crumb").dataset.page || "overview");
});


// Restore the existing Supabase session when the page is refreshed.
// Supabase persists sessions in browser storage by default; this restores the workspace UI.
async function restoreSavedSession() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    const user = data?.session?.user;
    if (!user) return;

    const { data: memberships, error: membershipError } = await supabaseClient
      .from("team_memberships")
      .select("team_key, role")
      .eq("user_id", user.id);
    if (membershipError) throw membershipError;
    if (!memberships?.length) {
      message(loginNotice, "Your account has no team access yet. Ask a Team BC owner/admin to grant membership.");
      return;
    }

    const { data: teams, error: teamsError } = await supabaseClient
      .from("teams")
      .select("team_key, display_name")
      .in("team_key", memberships.map((membership) => membership.team_key))
      .eq("is_enabled", true);
    if (teamsError) throw teamsError;
    if (!teams?.length) {
      message(loginNotice, "Your teams are currently disabled. Contact the site owner.");
      return;
    }
    openAuthenticatedWorkspace(user, memberships, teams);
  } catch (error) {
    // Keep the saved session intact if a temporary network or database error occurs.
    message(loginNotice, "Couldn't restore your workspace right now. Check your connection and refresh again.");
    console.error("Session restore failed:", error);
  }
}
restoreSavedSession();

