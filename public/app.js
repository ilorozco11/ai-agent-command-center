"use strict";

const $ = (selector) => document.querySelector(selector);
const statusNames = { queued: "Queued", running: "Running", awaiting_approval: "Needs approval", completed: "Completed", blocked: "Blocked", failed: "Failed", cancelled: "Cancelled" };
const statusSymbols = { queued: "○", running: "◉", awaiting_approval: "↗", completed: "✓", blocked: "!", failed: "×", cancelled: "—" };
const statusOrder = { awaiting_approval: 0, blocked: 1, failed: 2, running: 3, queued: 4, completed: 5, cancelled: 6 };
let state = null;
let selectedId = null;
let busy = false;
let showAllEvents = false;
let dialogTrigger = null;
let loadedAt = null;
let loadRequest = 0;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function number(value, digits = 1) {
  return Number.isFinite(Number(value)) && value !== null && value !== undefined ? Number(value).toFixed(digits) : "—";
}

function timeLabel(value, full = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return full ? date.toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) + " UTC" : date.toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hour12: false });
}

function statusPill(status) {
  const safeStatus = Object.hasOwn(statusNames, status) ? status : "unknown";
  return `<span class="status-pill ${safeStatus}"><span class="status-symbol" aria-hidden="true">${statusSymbols[status] || "?"}</span>${escapeHtml(statusNames[status] || status || "Unknown")}</span>`;
}

function filteredSessions() {
  const query = $("#search").value.trim().toLowerCase();
  const status = $("#status-filter").value;
  return (state?.sessions || []).filter((session) => {
    const content = [session.title, session.repository, session.id, session.role].join(" ").toLowerCase();
    return (status === "all" || session.status === status) && (!query || content.includes(query));
  }).sort((left, right) => (statusOrder[left.status] ?? 9) - (statusOrder[right.status] ?? 9) || new Date(right.createdAt) - new Date(left.createdAt));
}

function announce(message) { $("#announcement").textContent = message; }

function showError(message) {
  $("#error-text").textContent = message;
  $("#error-banner").hidden = false;
}

function dismissError() { $("#error-banner").hidden = true; }

async function request(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? { Accept: "application/json" } : { "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The demo server did not respond in time. Refresh to check the latest state before retrying an action.");
    if (error instanceof SyntaxError) throw new Error("The demo server returned an unexpected response. Check that the local server is running.");
    throw error;
  } finally { clearTimeout(timeout); }
}

function acceptState(nextState) {
  if (!nextState || !Array.isArray(nextState.sessions)) throw new Error("The demo server returned an invalid session list.");
  state = nextState;
  loadedAt = new Date();
  dismissError();
  render();
}

async function loadState() {
  if (busy) return;
  const version = ++loadRequest;
  $("#refresh").disabled = true;
  $("#freshness").textContent = state ? "Refreshing demo…" : "Loading state…";
  try {
    const nextState = await request("/api/state");
    if (version !== loadRequest) return;
    acceptState(nextState);
  } catch (error) {
    if (version !== loadRequest) return;
    showError(error.message || "Could not load the local demo. Check that the server is running.");
    $("#freshness").textContent = state ? "Refresh failed · previous data shown" : "Demo unavailable";
    if (!state) {
      $("#sessions-body").innerHTML = '<tr><td colspan="3" class="loading-row">Unable to load sessions. Use Retry above.</td></tr>';
      $("#detail-panel").innerHTML = '<div class="detail-placeholder"><span class="eyebrow">Session inspector</span><h2 id="detail-heading">Connection unavailable</h2><p>Start the local server, then retry loading the demo.</p></div>';
      $("#detail-panel").setAttribute("aria-busy", "false");
    }
  } finally {
    if (version === loadRequest) $("#refresh").disabled = busy;
  }
}

function setBusy(value) {
  busy = value;
  document.querySelectorAll("[data-mutation], #task-submit, #reset-confirm, #refresh, #reset-open, #reset-mobile, #task-open").forEach((button) => { button.disabled = value; });
  document.querySelectorAll('[data-close-dialog="task-dialog"], [data-close-dialog="reset-dialog"]').forEach((button) => { button.disabled = value; });
  $("#detail-panel").setAttribute("aria-busy", String(value));
  $("#task-form").setAttribute("aria-busy", String(value));
}

async function mutate(path, body, successMessage) {
  if (busy) return null;
  ++loadRequest;
  setBusy(true);
  try {
    const result = await request(path, body);
    acceptState(result.state);
    announce(successMessage);
    return result;
  } finally { setBusy(false); }
}

function render() {
  if (!state) return;
  const sessions = filteredSessions();
  if (!sessions.some((session) => session.id === selectedId)) {
    selectedId = sessions[0]?.id || null;
    showAllEvents = false;
  }
  $("#nav-count").textContent = state.sessions.length;
  $("#metric-running").textContent = sessions.filter((session) => session.status === "running").length;
  $("#metric-review").textContent = sessions.filter((session) => session.status === "awaiting_approval").length;
  const usageKnown = sessions.every((session) => session.acuUsed !== null && session.acuUsed !== undefined && Number.isFinite(Number(session.acuUsed)));
  $("#metric-acu").textContent = usageKnown ? number(sessions.reduce((sum, session) => sum + Number(session.acuUsed), 0)) : "—";
  $("#result-count").textContent = `${sessions.length} / ${state.sessions.length} sessions`;
  const filtered = $("#search").value.trim() || $("#status-filter").value !== "all";
  $("#scope-label").textContent = filtered ? "Filtered demo sessions" : "All demo sessions";
  $("#freshness").textContent = `Fetched ${timeLabel(loadedAt)} UTC · manual refresh`;
  $("#queue-total").textContent = sessions.length ? `${sessions.length} session${sessions.length === 1 ? "" : "s"} · select a task to inspect` : "No matching sessions";
  $("#empty-state").hidden = sessions.length > 0;
  $("#sessions-body").innerHTML = sessions.map((session) => `<tr class="${session.id === selectedId ? "is-selected" : ""}"><td><button class="task-select" type="button" data-session-id="${escapeHtml(session.id)}" aria-pressed="${session.id === selectedId}" aria-controls="detail-panel">${escapeHtml(session.title)}</button><span class="task-meta">${escapeHtml(session.repository)} <span aria-hidden="true">/</span> <span class="task-role">${escapeHtml(session.role || "Developer")}</span></span></td><td>${statusPill(session.status)}</td><td class="numeric">${number(session.acuUsed)}<span class="acu-total">/ ${number(session.acuLimit)} cap</span></td></tr>`).join("");
  renderDetail();
}

function renderDetail() {
  const session = state?.sessions.find((item) => item.id === selectedId);
  const panel = $("#detail-panel");
  panel.setAttribute("aria-busy", String(busy));
  if (!session) {
    panel.innerHTML = '<div class="detail-placeholder"><span class="eyebrow">Session inspector</span><h2 id="detail-heading" tabindex="-1">Nothing selected</h2><p>Clear your filters or create a demo task to inspect a session.</p></div>';
    return;
  }
  const progress = Math.max(0, Math.min(100, Number(session.progress) || 0));
  const checks = Array.isArray(session.checks) ? session.checks : [];
  const events = [...(session.events || [])].reverse().sort((left, right) => new Date(right.at) - new Date(left.at));
  const visibleEvents = showAllEvents ? events : events.slice(0, 5);
  const checkItems = checks.map((check) => {
    const status = String(check.status || "pending");
    const symbol = ["passed", "pass", "success", "completed"].includes(status) ? "✓" : ["failed", "fail", "error"].includes(status) ? "×" : "○";
    return `<li><span class="check-symbol" aria-hidden="true">${symbol}</span><span>${escapeHtml(check.name)}</span><span class="check-status">${escapeHtml(status.replaceAll("_", " "))}</span></li>`;
  }).join("");
  let decision = "";
  if (session.status === "awaiting_approval") {
    decision = '<h3>Your review is the next step.</h3><p>Inspect the simulated checks and activity before deciding whether this task is ready.</p><div class="decision-actions"><button type="button" class="button primary" data-mutation="approve">Approve demo</button><button type="button" class="button" data-mutation="request-changes">Request changes</button></div><p class="decision-note">Approval completes this local simulation. No PR is merged.</p>';
  } else if (["queued", "running"].includes(session.status)) {
    decision = `<h3>${session.status === "queued" ? "Ready when capacity allows." : "Work is in progress."}</h3><p>Advance the simulated workflow one step to see the next event and updated usage.</p><div class="decision-actions"><button type="button" class="button primary" data-mutation="advance">${session.status === "queued" ? "Start demo session" : "Run next demo step"} <span aria-hidden="true">→</span></button></div><p class="decision-note">No code is executed and no credits are spent.</p>`;
  } else if (session.status === "blocked") {
    decision = '<h3>This session needs attention.</h3><p>Inspect the activity below for the simulated blocker. Blocked sessions cannot advance; reset the demo to restore the starter examples.</p>';
  } else if (session.status === "completed") {
    decision = '<h3>Demo session completed.</h3><p>The local workflow reached its completion checkpoint. No repository was changed and no PR was merged.</p>';
  } else {
    decision = '<h3>This session has stopped.</h3><p>Inspect the activity for context. Create a new demo task to explore another workflow.</p>';
  }
  panel.innerHTML = `<div class="detail-topline"><span class="eyebrow">Session inspector</span><button type="button" class="selection-return" id="back-to-queue">Back to queue ↑</button><span class="detail-id">${escapeHtml(session.id)}</span></div><div class="detail-main">${statusPill(session.status)}<h2 id="detail-heading" tabindex="-1">${escapeHtml(session.title)}</h2><p class="detail-repository">${escapeHtml(session.repository)}</p><p class="detail-branch">Branch label: ${escapeHtml(session.branch || "Not assigned")}</p><div class="session-progress"><div class="progress-label"><span>Simulated progress</span><span>${progress}%</span></div><progress class="progress-track" aria-label="Simulated session progress" value="${progress}" max="100">${progress}%</progress></div><dl class="session-facts"><div><dt>Agent role</dt><dd>${escapeHtml(session.role || "Developer")}<small>Simulated agent</small></dd></div><div><dt>Illustrative usage</dt><dd>${number(session.acuUsed)} / ${number(session.acuLimit)} ACU<small>Local cap · not actual billing</small></dd></div></dl></div><section class="checks-section" aria-label="Simulated checks"><h3 class="detail-section-heading">Checks <span>SIMULATED EVIDENCE</span></h3>${checks.length ? `<ul class="checks-list">${checkItems}</ul>` : '<p class="checks-empty">No check results at this stage.</p>'}</section><section class="decision-box" aria-label="Session actions">${decision}</section><section class="timeline-section" aria-label="Session activity"><h3 class="detail-section-heading">Activity <span>UTC · NEWEST FIRST</span></h3>${visibleEvents.length ? `<ol class="timeline">${visibleEvents.map((event) => `<li><time datetime="${escapeHtml(event.at)}" title="${escapeHtml(timeLabel(event.at, true))}">${escapeHtml(timeLabel(event.at))}</time><p><span class="event-type">${escapeHtml(String(event.type || "event").replaceAll("_", " "))}</span>${escapeHtml(event.message)}</p></li>`).join("")}</ol>` : '<p class="checks-empty">No activity recorded yet.</p>'}${events.length > 5 ? `<button type="button" class="text-button timeline-toggle" id="timeline-toggle">${showAllEvents ? "Show recent events" : `Show all ${events.length} events`}</button>` : ""}</section>`;
  if (busy) panel.querySelectorAll("[data-mutation]").forEach((button) => { button.disabled = true; });
}

function openDialog(id, trigger) {
  dialogTrigger = trigger || document.activeElement;
  $(id).showModal();
}

function showInfo(kind, trigger) {
  const content = {
    demo: '<h2 id="info-title">A working control-flow prototype.</h2><p class="dialog-description">Use the dashboard to inspect tasks, simulate progress and make approval decisions before building the real integration.</p><ul class="info-list"><li><strong>Available now</strong><p>Search and filter sessions, inspect activity and check fixtures, create demo tasks, advance the local workflow, and approve or request changes.</p></li><li><strong>Clearly simulated</strong><p>Agents, code changes, check outcomes, branches and ACU usage are illustrative. There are no live Devin sessions, repository connections or external side effects.</p></li><li><strong>Manual state updates</strong><p>The dashboard refreshes after actions. Use Refresh to retrieve changes made from another tab. Demo state resets when the server restarts.</p></li></ul>',
    pilot: '<h2 id="info-title">A focused 30-day pilot.</h2><p class="dialog-description">The proposed pilot starts with one repository and a measurable task-to-review workflow.</p><ul class="info-list"><li><strong>Week 1 · Validate the connection</strong><p>Confirm Devin API access, define permissions and spending limits, and connect session monitoring.</p></li><li><strong>Week 2 · Complete one useful workflow</strong><p>Run scoped development tasks with reviewable output and independently executed checks.</p></li><li><strong>Week 3 · Make oversight useful</strong><p>Track failures, approval decisions and usage. Evaluate additional coordination only after the basic path works.</p></li><li><strong>Week 4 · Publish evidence</strong><p>Share a demo, source code, reproducible task results and limitations. Use measured results to decide the next milestone.</p></li></ul><p class="info-footnote">This is a proposed evaluation plan. Access, sponsorship and integration support have not been confirmed.</p>',
    integrations: '<h2 id="info-title">Connections are planned.</h2><p class="dialog-description">This demo needs no API keys. All data stays in the local process.</p><ul class="info-list"><li><strong>Devin · Planned</strong><p>Create and inspect real sessions after validating current API access, permissions and account limits.</p></li><li><strong>GitHub · First pilot target</strong><p>Use a sandbox repository for tasks, pull requests and independent check results. Human approval remains a separate decision.</p></li><li><strong>GitLab and Microsoft Teams · Later evaluation</strong><p>Validate supported integration methods and permissions after the initial GitHub workflow is proven.</p></li></ul><p class="info-footnote">The prototype does not send messages, open pull requests or execute code on connected services.</p>'
  };
  $("#info-content").innerHTML = content[kind];
  openDialog("#info-dialog", trigger);
}

$("#sessions-body").addEventListener("click", (event) => {
  const button = event.target.closest("[data-session-id]");
  if (!button) return;
  selectedId = button.dataset.sessionId;
  showAllEvents = false;
  render();
  if (window.matchMedia("(max-width: 980px)").matches) {
    $("#detail-panel").scrollIntoView({ block: "start" });
    $("#detail-heading").focus({ preventScroll: true });
  } else {
    const selectedButton = [...document.querySelectorAll("[data-session-id]")].find((item) => item.dataset.sessionId === selectedId);
    selectedButton?.focus({ preventScroll: true });
  }
});

$("#detail-panel").addEventListener("click", async (event) => {
  if (event.target.closest("#timeline-toggle")) { showAllEvents = !showAllEvents; renderDetail(); $("#timeline-toggle")?.focus({ preventScroll: true }); return; }
  if (event.target.closest("#back-to-queue")) {
    const rowButton = [...document.querySelectorAll("[data-session-id]")].find((item) => item.dataset.sessionId === selectedId);
    rowButton?.focus();
    return;
  }
  const button = event.target.closest("[data-mutation]");
  if (!button || busy || !selectedId) return;
  const action = button.dataset.mutation;
  const sessionId = selectedId;
  const messages = { advance: "Demo session advanced.", approve: "Demo approved. No PR was merged.", "request-changes": "Changes requested in the demo." };
  try {
    await mutate(`/api/sessions/${encodeURIComponent(sessionId)}/${action}`, {}, messages[action]);
    $("#detail-heading")?.focus({ preventScroll: true });
  } catch (error) { showError(error.message || "The action could not be completed."); }
});

for (const selector of ["#search", "#status-filter"]) $(selector).addEventListener(selector === "#search" ? "input" : "change", () => { render(); });
$("#clear-filters").addEventListener("click", () => { $("#search").value = ""; $("#status-filter").value = "all"; render(); $("#search").focus(); });
$("#review-filter").addEventListener("click", () => { $("#search").value = ""; $("#status-filter").value = "awaiting_approval"; render(); $("#status-filter").focus(); announce("Showing the approval queue."); });
$("#refresh").addEventListener("click", loadState);
$("#retry").addEventListener("click", loadState);
$("#error-dismiss").addEventListener("click", dismissError);
$("#task-open").addEventListener("click", (event) => { $("#task-error").hidden = true; openDialog("#task-dialog", event.currentTarget); $("#task-title").focus(); });
for (const selector of ["#reset-open", "#reset-mobile"]) $(selector).addEventListener("click", (event) => { $("#reset-error").hidden = true; openDialog("#reset-dialog", event.currentTarget); });
$("#about-demo").addEventListener("click", (event) => showInfo("demo", event.currentTarget));
$("#pilot-open").addEventListener("click", (event) => showInfo("pilot", event.currentTarget));
$("#integrations-open").addEventListener("click", (event) => showInfo("integrations", event.currentTarget));

document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => document.getElementById(button.dataset.closeDialog).close()));
for (const selector of ["#task-dialog", "#reset-dialog"]) {
  $(selector).addEventListener("cancel", (event) => {
    if (busy) event.preventDefault();
  });
}
document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("close", () => { if (dialogTrigger?.isConnected) dialogTrigger.focus(); }));

$("#task-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy || !event.currentTarget.reportValidity()) return;
  $("#task-error").hidden = true;
  const previousIds = new Set(state?.sessions.map((session) => session.id));
  try {
    const result = await mutate("/api/tasks", { title: $("#task-title").value.trim(), repository: $("#task-repository").value.trim() }, "Demo task created.");
    if (!result) return;
    const createdSession = result.state.sessions.find((session) => !previousIds.has(session.id));
    if (createdSession) {
      selectedId = createdSession.id;
      $("#search").value = "";
      $("#status-filter").value = "all";
      showAllEvents = false;
      render();
    }
    $("#task-dialog").close();
    $("#task-title").value = "";
  } catch (error) {
    $("#task-error").textContent = error.message || "Could not create the task. Your input has been kept.";
    $("#task-error").hidden = false;
  }
});

$("#reset-confirm").addEventListener("click", async () => {
  if (busy) return;
  $("#reset-error").hidden = true;
  try {
    await mutate("/api/reset", {}, "Demo reset to its starter sessions.");
    selectedId = null;
    $("#search").value = "";
    $("#status-filter").value = "all";
    render();
    $("#reset-dialog").close();
  } catch (error) {
    $("#reset-error").textContent = error.message || "Could not reset the demo.";
    $("#reset-error").hidden = false;
  }
});

loadState();
