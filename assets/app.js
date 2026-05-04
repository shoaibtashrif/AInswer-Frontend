
/* AInswer.co HTML demo
   - Pure HTML + JS (no backend)
   - LocalStorage for: users, customers, calls
   - Functional: register/login, portal pages, admin pages, settings save, FAQ CRUD, simulated calls
*/
const LS = {
  get: (k, d = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k)
};
const uid = (p = "id") => p + "_" + Math.random().toString(16).slice(2, 10) + "_" + Date.now().toString(36);
const fmt = (dt) => new Date(dt).toLocaleString();
// const API_BASE = "https://agent.cabex.co.uk/outbound";
const API_BASE = "https://genbot.ainswer.co/outbound";

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>';
    setTimeout(() => { btn.innerHTML = original; }, 1500);
  });
}

function viewCallDetail(id) {
  sessionStorage.setItem("ainswer_view_call_id", id);
  // Using clean URL to avoid redirect loops, but ID is safe in session
  location.href = `call-detail?id=${encodeURIComponent(id)}`;
}

function toggleTranscript() {
  const box = document.getElementById('chatTranscriptBox');
  if (box) {
    box.classList.toggle('hidden');
    const btn = document.getElementById('transcriptToggleBtn');
    if (btn) btn.textContent = box.classList.contains('hidden') ? 'Show Transcript' : 'Hide Transcript';
  }
}

function seed() {
  if (LS.get("ainswer_seeded")) return;
  const users = [
    { id: 1, email: "owner@demo.com", name: "Demo Owner", password: "demo123", role: "customer", customerId: 101 },
    { id: 2, email: "admin@ainswer.co", name: "Site Admin", password: "admin123", role: "admin", customerId: null }
  ];
  const customers = [{
    id: 101, businessName: "ABC Plumbing", industry: "Trades",
    mode: "overflow", ringTimeout: 20, timezone: "Europe/London",
    services: "Boiler repair, leak detection, emergency callouts",
    location: "Fulham & Chelsea (SW6, SW10)", hours: "Mon–Fri 9am–6pm",
    urgentKeywords: ["gas smell", "flooding", "no heating", "sparks", "fire"],
    transferEnabled: true, transferNumber: "+447700900123",
    forwardingNumber: "+442012345678",
    status: "active",
    notifications: { sms: true, smsTo: "+447700900123", email: true, emailTo: "owner@demo.com", whatsapp: false, whatsappTo: "" },
    fragments: { tone: "professional", greeting: "Thanks for calling ABC Plumbing.", alwaysAsk: ["postcode", "preferred time"], avoid: "discounts" },
    faqs: [
      { id: uid("faq"), q: "Do you cover SW6?", a: "Yes — we cover SW6 and surrounding areas.", priority: 10, enabled: true },
      { id: uid("faq"), q: "Do you offer emergency callouts?", a: "Yes. We can arrange emergency callouts outside normal business hours.", priority: 9, enabled: true },
      { id: uid("faq"), q: "Boiler service price?", a: "Standard domestic boiler service is £90. Non-standard systems are confirmed by the team before proceeding.", priority: 8, enabled: true }
    ],
    capabilities: { quoting: true, booking: true, payments: false, dispatch: false }
  }];
  const calls = [
    {
      id: uid("call"), customerId: 101, callId: "uvx_call_8f3a21b7", time: new Date(Date.now() - 1000 * 60 * 40).toISOString(), caller: "+447700900123", urgency: "high", category: "lead",
      shortSummary: "Boiler not working; urgent callback requested; postcode SW6.",
      summary: "Caller John reported boiler not working and no heating. Requested urgent callback. Provided postcode SW6. Prefers evening visit.",
      recordingUrl: ""
    },
    {
      id: uid("call"), customerId: 101, callId: "uvx_call_2a7710c1", time: new Date(Date.now() - 1000 * 60 * 120).toISOString(), caller: "+447700111222", urgency: "low", category: "booking",
      shortSummary: "Appointment request for tomorrow afternoon; postcode SW10.",
      summary: "Caller requested to book a boiler service tomorrow afternoon. Provided postcode SW10 and callback number.",
      recordingUrl: ""
    }
  ];
  LS.set("ainswer_users", users);
  LS.set("ainswer_customers", customers);
  LS.set("ainswer_calls", calls);
  LS.set("ainswer_seeded", true);
}
seed();

function sessionUser() { return LS.get("ainswer_session_user", null); }
function getCustomers() { return LS.get("ainswer_customers", []); }
function getUsers() { return LS.get("ainswer_users", []); }
function getCallsAll() { return LS.get("ainswer_calls", []); }
function saveCustomers(c) { LS.set("ainswer_customers", c); }
function saveUsers(u) { LS.set("ainswer_users", u); }
function saveCalls(c) { LS.set("ainswer_calls", c); }

function logout() {
  LS.del("ainswer_session_user");
  // Works from /app and /admin; from root, it will still go to index.html
  if (location.pathname.includes("/app/") || location.pathname.includes("/admin/")) location.href = "../index.html";
  else location.href = "index.html";
}
function requireAuth(role = null) {
  const u = sessionUser();
  if (!u) { location.href = (location.pathname.includes("/app/") || location.pathname.includes("/admin/")) ? "../login.html" : "login.html"; return null; }
  if (role && u.role !== role) {
    location.href = (u.role === "admin") ? "../admin/index.html" : "../app/dashboard.html";
    return null;
  }
  return u;
}
function setHeaderUser() {
  const u = sessionUser();
  const el = document.getElementById("portalUser");
  if (el && u) el.textContent = `${u.name} • ${u.email}`;
}
function setActiveNav() {
  const file = location.pathname.split("/").pop();
  document.querySelectorAll("[data-nav]").forEach(a => {
    if (a.getAttribute("href") === file) a.classList.add("active");
  });
}

function customerById(id) { return getCustomers().find(c => c.id === id); }
function saveCustomer(c) {
  const cs = getCustomers();
  const i = cs.findIndex(x => x.id === c.id);
  if (i >= 0) cs[i] = c; else cs.push(c);
  saveCustomers(cs);
}

function callsForCustomer(customerId) {
  return getCallsAll().filter(c => c.customerId === customerId).sort((a, b) => (b.time || "").localeCompare(a.time || ""));
}
function addCall(call) {
  const all = getCallsAll(); all.push(call); saveCalls(all);
}

function handleRegister(formId) {
  const form = document.getElementById(formId); if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    const body = {
      email: data.email,
      password: data.password,
      full_name: data.name,
      business_name: data.businessName,
      mobile: data.phone,
      industry: data.industry,
      timezone: data.timezone,
      subscription_type: "starter"
    };

    try {
      const resp = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      console.log("Registration response status:", resp.status);

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: "Registration failed with status " + resp.status }));
        console.error("Registration error:", err);
        throw new Error(err.detail ? (Array.isArray(err.detail) ? err.detail[0].msg : err.detail) : "Registration failed");
      }

      const user = await resp.json();

      // For the demo UI to keep working, we seed a local customer entry
      const customerId = user.id;
      const customers = getCustomers();
      if (!customers.some(c => c.id === customerId)) {
        customers.push({
          id: customerId,
          businessName: data.businessName || "New Business",
          industry: data.industry || "Other",
          mode: "overflow", ringTimeout: 20, timezone: data.timezone || "Europe/London",
          services: "", location: "", hours: "",
          urgentKeywords: [], transferEnabled: false, transferNumber: "",
          forwardingNumber: "",
          status: "onboarding",
          notifications: { sms: true, smsTo: data.phone || "", email: true, emailTo: data.email, whatsapp: false, whatsappTo: "" },
          fragments: { tone: "professional", greeting: `Thanks for calling ${data.businessName || "our business"}.`, alwaysAsk: [], avoid: "" },
          faqs: [],
          capabilities: { quoting: false, booking: false, payments: false, dispatch: false }
        });
        saveCustomers(customers);
      }

      const newUser = {
        ...user,
        name: user.full_name,
        role: "customer",
        customerId: customerId
      };

      // Update local users list for legacy lookups if needed
      const users = getUsers();
      if (!users.some(u => u.email === user.email)) {
        users.push(newUser);
        saveUsers(users);
      }

      LS.set("ainswer_session_user", newUser);
      location.href = "app/dashboard.html";
    } catch (e) {
      alert("Error: " + e.message);
    }
  });
}

function handleLogin(formId) {
  const form = document.getElementById(formId); if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    // Using URLSearchParams for application/x-www-form-urlencoded (standard for OAuth2 /token)
    const params = new URLSearchParams();
    params.append("username", data.email);
    params.append("password", data.password);

    console.log("Attempting login for:", data.email);

    try {
      const resp = await fetch(`${API_BASE}/token`, {
        method: "POST",
        body: params
      });

      console.log("Login response status:", resp.status);

      if (!resp.ok) {
        const errBody = await resp.text();
        console.error("Login fail body:", errBody);
        throw new Error("Login failed. Please check your email and password.");
      }

      const tokenData = await resp.json();
      const token = tokenData.access_token;
      console.log("Login successful, token received.");
      LS.set("ainswer_token", token);

      // Fetch user profile
      const profResp = await fetch(`${API_BASE}/api/user/profile`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!profResp.ok) {
        console.error("Profile fetch failed:", profResp.status);
        throw new Error("Could not fetch user profile details.");
      }

      const user = await profResp.json();
      console.log("User profile loaded:", user.email);

      const sessionUser = {
        ...user,
        name: user.full_name,
        role: user.email === "admin@ainswer.co" ? "admin" : "customer",
        customerId: user.id
      };

      // Ensure a local customer exists for this user so the dashboard works
      const customers = getCustomers();
      if (!customers.some(c => c.id === user.id)) {
        customers.push({
          id: user.id,
          businessName: user.business_name || "Business",
          industry: user.industry || "Other",
          mode: "overflow", ringTimeout: 20, timezone: user.timezone || "Europe/London",
          services: "", location: "", hours: "",
          urgentKeywords: [], transferEnabled: false, transferNumber: "",
          forwardingNumber: "",
          status: "active",
          notifications: { sms: true, smsTo: user.mobile || "", email: true, emailTo: user.email, whatsapp: false, whatsappTo: "" },
          fragments: { tone: "professional", greeting: `Thanks for calling ${user.business_name || "us"}.`, alwaysAsk: [], avoid: "" },
          faqs: [],
          capabilities: { quoting: false, booking: false, payments: false, dispatch: false }
        });
        saveCustomers(customers);
      }

      LS.set("ainswer_session_user", sessionUser);
      location.href = (sessionUser.role === "admin") ? "admin/index.html" : "app/dashboard.html";
    } catch (e) {
      alert("Error: " + e.message);
    }
  });
}

async function getCallHistory(limit = 20, page = 1) {
  const token = LS.get("ainswer_token");
  if (!token) { console.warn("No token found for history fetch"); return null; }
  try {
    const url = `${API_BASE}/api/history?limit=${limit}&page=${page}`;
    const resp = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}`, "accept": "application/json" }
    });
    if (!resp.ok) throw new Error("History fetch failed");
    return await resp.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function getCallDetail(callId) {
  const cleanId = String(callId || "").trim();
  if (!cleanId) return null;
  const token = LS.get("ainswer_token");
  const url = `${API_BASE}/api/calls/${cleanId}`;

  const attempt = async (withAuth) => {
    // Basic Accept header is safe for CORS Simple Requests
    const headers = { "accept": "application/json" };
    if (withAuth && token) headers["Authorization"] = `Bearer ${token}`;

    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      const txt = await resp.text();
      return { _err: true, status: resp.status, text: txt };
    }
    return await resp.json();
  };

  try {
    // 1. Try with Auth (triggers CORS Preflight)
    const res = await attempt(true);
    if (res._err) throw res;
    return res;
  } catch (firstErr) {
    console.warn("First attempt failed (Likely CORS Preflight blocked or 401). Retrying as Simple Request...");
    try {
      // 2. Retry without Auth (bypasses CORS Preflight if server allows it)
      const res2 = await attempt(false);
      if (res2._err) throw res2;
      return res2;
    } catch (secondErr) {
      console.error("All fetch attempts failed. Last error:", secondErr);
      return { error: secondErr.text || secondErr.message || "Network error or CORS issue" };
    }
  }
}

async function renderCallsTable(tableId, page = 1) {
  const table = document.getElementById(tableId); if (!table) return;
  table.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;">Loading call logs (Page ${page})...</td></tr>`;

  // Using 15 limit for pagination
  const resp = await getCallHistory(15, page);
  const items = resp && resp.results ? resp.results : (resp && resp.items ? resp.items : (Array.isArray(resp) ? resp : []));
  const pagination = resp && resp.pagination ? resp.pagination : { has_next: items.length === 15, has_prev: page > 1, current_page: page };

  if (items.length === 0) {
    table.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;">No calls found on this page.</td></tr>`;
    return;
  }

  LS.set("ainswer_last_history", items);

  table.innerHTML = `
    <tr>
      <th>Call ID</th>
      <th>Time</th>
      <th>From</th>
      <th>To</th>
      <th>Direction</th>
      <th>Agent</th>
      <th>Status</th>
    </tr>
    ${items.map(c => `
      <tr class="clickable-row" onclick="AInswer.viewCallDetail('${c.callId || c.id}')">
        <td onclick="event.stopPropagation()">
          <span class="small code">${(c.callId || "—").slice(0, 8).toUpperCase()}...</span>
          <button class="copy-btn" onclick="AInswer.copyToClipboard('${c.callId}', this)" title="Copy Full ID">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </td>
        <td>${fmt(c.created || c.time)}</td>
        <td>${c.fromNumber || "—"}</td>
        <td>${c.toNumber || "—"}</td>
        <td><span class="tag">${(c.direction || "web").toUpperCase()}</span></td>
        <td>${c.agentName || "—"}</td>
        <td><span class="tag ${c.status === 'ended' ? 'ok' : 'warn'}">${(c.status || "—").toUpperCase()}</span></td>
      </tr>`).join("")}
  `;

  // Create pagination controls below the table
  let pageControls = document.getElementById(tableId + "_pagination");
  if (!pageControls) {
    pageControls = document.createElement('div');
    pageControls.id = tableId + "_pagination";
    pageControls.className = "pagination";
    table.parentNode.insertBefore(pageControls, table.nextSibling);
  }

  pageControls.innerHTML = `
    <button class="btn" ${pagination.has_prev ? `onclick="AInswer.renderCallsTable('${tableId}', ${pagination.current_page - 1})"` : 'disabled'}>Previous</button>
    <span class="p">Page ${pagination.current_page}</span>
    <button class="btn" ${pagination.has_next ? `onclick="AInswer.renderCallsTable('${tableId}', ${pagination.current_page + 1})"` : 'disabled'}>Next</button>
  `;
}

async function renderCallDetail(containerId) {
  const el = document.getElementById(containerId); if (!el) return;
  const id = new URLSearchParams(location.search).get("id") || sessionStorage.getItem("ainswer_view_call_id");

  // Debug output straight to screen
  el.innerHTML = `<div style="text-align:center;padding:40px;">
    <div class="badge">Loading call details from secure server...</div>
    <div class="small muted" style="margin-top:10px">ID: ${id || 'Missing ID'}</div>
  </div>`;

  if (!id) {
    el.innerHTML = `<div class="notice">Error: Call ID is missing. Please go back to Call Logs and try again.</div>`;
    return;
  }

  const c = await getCallDetail(id);
  if (!c || c.error) {
    el.innerHTML = `
      <div class="notice">
        <h4 style="margin:0 0 10px 0">Failed to load call</h4>
        <p style="margin:0">${c?.error || "Call not found or permission denied."}</p>
        <div class="code small" style="margin-top:10px; opacity:0.8">ID Attempted: ${id}</div>
      </div>
    `;
    return;
  }

  const transcriptHtml = (c.messages || []).map(m => {
    const isAgent = m.role === "MESSAGE_ROLE_AGENT";
    const roleLabel = isAgent ? (c.agentName || "Agent") : "Customer";
    return `
      <div class="bubble ${isAgent ? 'agent' : 'user'}">
        <div class="role">${roleLabel}</div>
        <div class="text">${m.text.replaceAll("\n", "<br>")}</div>
      </div>
    `;
  }).join("");

  el.innerHTML = `
    <div class="card padded">
      <div class="topbar">
        <div>
          <div class="badge">Call ID: <span class="code" style="padding:4px 8px;border-radius:10px">${c.callId}</span></div>
          <div class="small" style="margin-top:8px">Started: ${fmt(c.created)} • Agent: ${c.agentName || "—"}</div>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap">
          <span class="tag">${(c.direction || "—").toUpperCase()}</span>
          <span class="tag ${c.status === 'ended' ? 'ok' : 'warn'}">${(c.status || "—").toUpperCase()}</span>
          <button class="btn" onclick="history.back()">Back</button>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div class="grid-3" style="gap:15px">
        <div class="card" style="padding:15px; background:rgba(99,91,255,0.03); border:none">
          <div class="small muted">Duration</div>
          <div class="h3" style="margin:5px 0">${c.billedDuration || "—"}</div>
        </div>
        <div class="card" style="padding:15px; background:rgba(99,91,255,0.03); border:none">
          <div class="small muted">End Reason</div>
          <div class="h3" style="margin:5px 0">${(c.endReason || "—").toUpperCase()}</div>
        </div>
        <div class="card" style="padding:15px; background:rgba(99,91,255,0.03); border:none">
          <div class="small muted">Satisfaction</div>
          <div class="h3" style="margin:5px 0">${c.satisfactionScore || "—"}/5</div>
        </div>
      </div>

      <div class="divider"></div>
      
      <div class="grid-2">
        <div>
          <h3 class="h3">AI Analysis & Satisfaction</h3>
          <div class="p" style="font-size:14px; color:#475569">${c.satisfactionAnalysis || "No detailed analysis available."}</div>
        </div>
        <div>
          <h3 class="h3">Audio Recording</h3>
          ${c.recordingUrl ? `
            <audio controls style="width:100%; margin-top:10px">
              <source src="${c.recordingUrl}" type="audio/wav">
              Your browser does not support the audio element.
            </audio>
          ` : '<div class="notice" style="margin-top:10px">No recording available.</div>'}
        </div>
      </div>

      <div class="divider"></div>
      
      <h3 class="h3">Call Summary</h3>
      <div class="p" style="background:#f8fafc; padding:15px; border-radius:12px; font-size:14px; line-height:1.6; border:1px solid #edf2f7">
        ${c.summary || "No summary captured for this call."}
      </div>

      <div class="divider"></div>
      
      <div class="topbar">
        <div>
          <h3 class="h3" style="margin:0; display:inline-block">Live Transcript</h3>
          <button id="transcriptToggleBtn" class="btn" style="margin-left:15px; padding:6px 12px" onclick="AInswer.toggleTranscript()">Show Transcript</button>
        </div>
        <div class="badge ok">Nettech-custom model</div>
      </div>
      
      <div id="chatTranscriptBox" class="chat-transcript hidden">
        ${transcriptHtml || '<div class="notice">No transcription messages recorded.</div>'}
      </div>
      
      <div class="divider"></div>
      <div class="small muted" style="text-align:right">
        Client Version: ${c.clientVersion || "—"} • Cost: $${(c.cost || 0).toFixed(3)}
      </div>
    </div>`;
}

function simulateTestCall() {
  const u = sessionUser(); if (!u || u.role !== "customer") return;
  const cust = customerById(u.customerId);
  const now = new Date();
  const id = uid("call");
  let shortSummary = "Test call: general enquiry captured.";
  let summary = "Simulated call. In production, Ultravox webhooks deliver shortSummary + summary, then notifications send via SMS/Email.";
  let category = "support";
  if (cust?.capabilities?.booking) {
    category = "booking";
    shortSummary = "Booking request: customer wants an appointment tomorrow afternoon.";
    summary = "Simulated booking call. In advanced booking mode the assistant checks availability via calendar integration, confirms a slot, and sends booking confirmation.";
  } else if (cust?.capabilities?.quoting) {
    category = "lead";
    shortSummary = "Quote request: caller asked for pricing; wants confirmation before booking.";
    summary = "Simulated quote call. In quoting mode the assistant quotes only from structured rules/FAQs; otherwise requests a callback.";
  }
  addCall({ id, customerId: u.customerId, callId: "test_call_" + Math.random().toString(16).slice(2, 8), time: now.toISOString(), caller: "+447700000000", urgency: "low", category, shortSummary, summary, recordingUrl: "" });
  alert("Test call created. Check Call Logs.");
}

async function renderSettings(formId) {
  const form = document.getElementById(formId); if (!form) return;
  requireAuth(); // Ensure logged in
  
  // fetch settings
  const settings = await getSettings() || {};
  
  // populate form safely mapping to our inputs
  const p = (name, val) => { if (form[name]) form[name].value = val || ""; };
  const c = (name, val) => { if (form[name]) form[name].checked = !!val; };

  p('business_name', settings.business_name);
  p('industry', settings.industry || "Other");
  p('mode', settings.mode || "overflow");
  p('ring_timeout', settings.ring_timeout || 20);
  p('timezone', settings.timezone || "Europe/London");
  p('services', settings.services);
  p('location', settings.location);
  p('hours', settings.hours);
  
  c('sms_notifications_enabled', settings.sms_notifications_enabled);
  p('sms_to_number', settings.sms_to_number);
  c('email_notifications_enabled', settings.email_notifications_enabled);
  p('email_to_address', settings.email_to_address);
  c('whatsapp_notifications_enabled', settings.whatsapp_notifications_enabled);
  p('whatsapp_to_number', settings.whatsapp_to_number);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const payload = {
      business_name: form.business_name?.value.trim() || null,
      industry: form.industry?.value || "Other",
      mode: form.mode?.value || "overflow",
      ring_timeout: parseInt(form.ring_timeout?.value || "20", 10),
      timezone: form.timezone?.value.trim() || null,
      services: form.services?.value.trim() || null,
      location: form.location?.value.trim() || null,
      hours: form.hours?.value.trim() || null,
      
      sms_notifications_enabled: !!form.sms_notifications_enabled?.checked,
      sms_to_number: form.sms_to_number?.value.trim() || null,
      email_notifications_enabled: !!form.email_notifications_enabled?.checked,
      email_to_address: form.email_to_address?.value.trim() || null,
      whatsapp_notifications_enabled: !!form.whatsapp_notifications_enabled?.checked,
      whatsapp_to_number: form.whatsapp_to_number?.value.trim() || null
    };
    
    const btn = form.querySelector('button');
    const ogText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Saving...";
    
    try {
      await updateSettings(payload);
      alert("Settings saved successfully.");
    } catch(err) {
      alert("Failed to save settings: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = ogText;
    }
  });
}

function renderGoLive(containerId) {
  const el = document.getElementById(containerId); if (!el) return;
  const u = requireAuth();
  const cust = customerById(u.customerId);
  const number = cust.forwardingNumber || "(not assigned yet)";
  el.innerHTML = `
    <div class="card padded">
      <div class="topbar">
        <div>
          <h2 class="h2" style="margin:0">Go Live</h2>
          <div class="p">Forward your business line so calls overflow to AInswer.</div>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap">
          <button class="btn primary" onclick="simulateTestCall()">Run Test Call</button>
          <a class="btn" href="calls.html">Call Logs</a>
        </div>
      </div>
      <div class="divider"></div>
      <div class="grid-2">
        <div class="card padded" style="box-shadow:none">
          <h3 class="h3">Your AInswer forwarding number</h3>
          <div class="code">${number}</div>
          <div class="small" style="margin-top:10px">Production: provision a number (telephony) and map it to Ultravox.</div>
        </div>
        <div class="card padded" style="box-shadow:none">
          <h3 class="h3">Setup guidance</h3>
          <ul class="list">
            <li><b>Overflow:</b> forward on no-answer after ${cust.ringTimeout || 20}s.</li>
            <li><b>Hybrid:</b> forward after-hours + overflow in-hours.</li>
            <li><b>24/7:</b> forward all calls.</li>
          </ul>
          <div class="notice" style="margin-top:10px">This is a UI demo. Exact forwarding steps depend on your carrier/VoIP provider.</div>
        </div>
      </div>
    </div>`;
}

async function renderFAQs(containerId) {
  const el = document.getElementById(containerId); if (!el) return;
  const kbData = await getKBs();
  const kbs = kbData.results || [];
  const canCreateKb = kbData.can_create_kb !== undefined ? kbData.can_create_kb : true;
  const isEnterprise = kbData.is_enterprise === true;

  const addBtnHtml = canCreateKb
    ? `<button class="btn primary" onclick="document.getElementById('kbFormCard').scrollIntoView({behavior:'smooth'})">Add Knowledge Base</button>`
    : `<button class="btn" disabled title="KB limit reached. Contact support to upgrade." style="opacity:0.5;cursor:not-allowed">🔒 Limit Reached</button>`;

  const upgradeBanner = (!canCreateKb && !isEnterprise)
    ? `<div style="background:#fef3c7;border:1px solid #f59e0b;padding:12px 16px;border-radius:10px;margin-bottom:16px;font-size:13px">
        🔒 You've used your 1 free knowledge base slot. <b>Contact support</b> to unlock unlimited KBs with an Enterprise plan.
       </div>`
    : '';

  el.innerHTML = `
    <div class="topbar">
      <div>
        <h1 class="h2" style="margin:0">Knowledge Base</h1>
        <div class="p">Manage your data sources for AI agents.</div>
      </div>
      ${addBtnHtml}
    </div>
    ${upgradeBanner}

    <div class="grid-2">
      ${kbs.map(kb => `
        <div class="card padded">
          <div style="display:flex; justify-content:space-between; align-items:start">
            <div>
              <div class="badge ok">ID: ${kb.id}</div>
              <h3 class="h3" style="margin:10px 0 5px">${escapeHtml(kb.name)}</h3>
              <div class="small muted">Created: ${fmt(kb.created_at)}</div>
            </div>
            <button class="btn danger small" onclick="AInswer.handleDeleteKB(${kb.id}, '${containerId}')">Delete</button>
          </div>
          <div class="divider"></div>
          <div class="small">This KB is automatically assigned to agents using its ID.</div>
        </div>
      `).join('')}
      
      ${kbs.length === 0 ? `
        <div class="card padded" style="border:2px dashed rgba(99,91,255,0.2); background:none; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; min-height:160px">
          <div class="p muted">No knowledge bases yet.</div>
        </div>
      ` : ''}
    </div>

    <div class="divider"></div>

    ${canCreateKb ? `
    <div class="card padded" id="kbFormCard">
      <h3 class="h3">Create New Knowledge Base</h3>
      <p class="p small">Provide text, URLs, or upload files (PDF/TXT/MD) to give your agents deep knowledge.</p>
      <form class="form" id="kbForm">
        <label>Knowledge Base Name</label>
        <input name="name" required placeholder="e.g. Company Handbook v1"/>
        
        <label style="margin-top:10px">Text Content (Manual Data)</label>
        <textarea name="text" placeholder="Paste internal docs, pricing, or procedures here..."></textarea>
        
        <label style="margin-top:10px">Website URLs (Comma separated)</label>
        <input name="urls" placeholder="https://example.com, https://docs.com/help"/>
        
        <label style="margin-top:10px">Upload Files (Multiple supported)</label>
        <input type="file" name="files" multiple accept=".pdf,.txt,.md" />
        
        <div style="margin-top:20px">
          <button class="btn primary" type="submit" id="kbSubmitBtn">Create Knowledge Base</button>
        </div>
      </form>
    </div>
    ` : ''}
  `;

  const form = document.getElementById("kbForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("kbSubmitBtn");
      btn.disabled = true;
      btn.textContent = "Processing & Indexing...";
      
      const fd = new FormData(form);
      const res = await createKB(fd);
      if (res) {
        alert("Knowledge Base created and indexed successfully!");
        renderFAQs(containerId);
      } else {
        btn.disabled = false;
        btn.textContent = "Create Knowledge Base";
      }
    });
  }
}

async function handleDeleteKB(id, containerId) {
  if (await deleteKB(id)) {
    renderFAQs(containerId);
  }
}

function escapeHtml(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

// ---------- Admin (site owner) ----------
function renderAdminCounts(containerId) {
  const el = document.getElementById(containerId); if (!el) return;
  requireAuth("admin");
  const customers = getCustomers();
  const calls = getCallsAll();
  el.innerHTML = `
    <div class="grid-3">
      <div class="card padded"><div class="badge ok">Customers</div><div class="h2" style="margin:10px 0 0">${customers.length}</div><div class="small">Tenants</div></div>
      <div class="card padded"><div class="badge warn">Calls</div><div class="h2" style="margin:10px 0 0">${calls.length}</div><div class="small">Call logs stored</div></div>
      <div class="card padded"><div class="badge">Mode</div><div class="h2" style="margin:10px 0 0">Demo</div><div class="small">LocalStorage</div></div>
    </div>`;
}

function renderAdminCustomers(tableId) {
  const table = document.getElementById(tableId); if (!table) return;
  requireAuth("admin");
  const customers = getCustomers();
  table.innerHTML = `
    <tr><th>ID</th><th>Business</th><th>Industry</th><th>Status</th><th>Mode</th><th></th></tr>
    ${customers.map(c => `
      <tr>
        <td>${c.id}</td>
        <td><b>${escapeHtml(c.businessName || "")}</b><div class="small">${escapeHtml(c.location || "")}</div></td>
        <td>${escapeHtml(c.industry || "")}</td>
        <td><span class="badge ${c.status === "active" ? "ok" : c.status === "paused" ? "danger" : ""}">${escapeHtml(c.status || "")}</span></td>
        <td>${escapeHtml(c.mode || "")}</td>
        <td><a class="btn" href="customer-detail.html?id=${c.id}">Manage</a></td>
      </tr>`).join("")}
  `;
}

function renderAdminCustomerDetail(containerId) {
  const el = document.getElementById(containerId); if (!el) return;
  requireAuth("admin");
  const id = parseInt(new URLSearchParams(location.search).get("id") || "0", 10);
  const cust = customerById(id);
  if (!cust) { el.innerHTML = `<div class="notice">Customer not found.</div>`; return; }

  const recent = callsForCustomer(id).slice(0, 10);
  el.innerHTML = `
    <div class="card padded">
      <div class="topbar">
        <div>
          <div class="badge">Customer #${cust.id}</div>
          <h2 class="h2" style="margin:10px 0 0">${escapeHtml(cust.businessName || "")}</h2>
          <div class="small">${escapeHtml(cust.industry || "")} • ${escapeHtml(cust.mode || "")} • ${escapeHtml(cust.status || "")}</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" onclick="toggleCustomerStatus(${cust.id})">${cust.status === "active" ? "Pause" : "Activate"}</button>
          <a class="btn" href="customers.html">Back</a>
        </div>
      </div>
      <div class="divider"></div>
      <div class="grid-2">
        <div class="card padded" style="box-shadow:none">
          <h3 class="h3">Tenant configuration</h3>
          <div class="small">Forwarding number</div>
          <div class="code">${escapeHtml(cust.forwardingNumber || "(not set)")}</div>
          <div class="small" style="margin-top:10px">Notifications</div>
          <div class="code">SMS: ${cust.notifications?.sms ? "ON" : "OFF"} → ${escapeHtml(cust.notifications?.smsTo || "")}
Email: ${cust.notifications?.email ? "ON" : "OFF"} → ${escapeHtml(cust.notifications?.emailTo || "")}
WhatsApp: ${cust.notifications?.whatsapp ? "ON" : "OFF"} → ${escapeHtml(cust.notifications?.whatsappTo || "")}</div>
        </div>
        <div class="card padded" style="box-shadow:none">
          <h3 class="h3">Advanced capabilities</h3>
          <div class="code">Quoting: ${cust.capabilities?.quoting ? "ENABLED" : "OFF"}
Booking: ${cust.capabilities?.booking ? "ENABLED" : "OFF"}
Payments: ${cust.capabilities?.payments ? "ENABLED" : "OFF"}
Dispatch: ${cust.capabilities?.dispatch ? "ENABLED" : "OFF"}</div>
          <div class="notice" style="margin-top:10px">In production, these toggles are plan-gated and audited.</div>
        </div>
      </div>
      <div class="divider"></div>
      <h3 class="h3">Recent calls</h3>
      <table class="table">
        <tr><th>Time</th><th>Caller</th><th>Urgency</th><th>Summary</th></tr>
        ${recent.map(c => `
          <tr>
            <td>${fmt(c.time)}</td>
            <td>${escapeHtml(c.caller || "Unknown")}</td>
            <td><span class="tag ${c.urgency || "low"}">${(c.urgency || "low").toUpperCase()}</span></td>
            <td>${escapeHtml(c.shortSummary || "")}</td>
          </tr>`).join("")}
      </table>
    </div>
  `;
  window.toggleCustomerStatus = (customerId) => {
    const x = customerById(customerId);
    if (!x) return;
    x.status = (x.status === "active") ? "paused" : "active";
    saveCustomer(x);
    renderAdminCustomerDetail(containerId);
    alert("Status updated (demo).");
  };
}

async function getDashboardData() {
  const token = LS.get("ainswer_token");
  if (!token) return null;
  try {
    const resp = await fetch(`${API_BASE}/api/dashboard`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error("Dashboard data fetch failed");
    return await resp.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function getAgents() {
  const token = LS.get("ainswer_token");
  if (!token) return null;
  try {
    const resp = await fetch(`${API_BASE}/api/agents`, {
      headers: { "Authorization": `Bearer ${token}`, "accept": "application/json" }
    });
    if (!resp.ok) throw new Error("Agents fetch failed");
    return await resp.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function getVoices() {
  const token = LS.get("ainswer_token");
  if (!token) return null;
  try {
    const resp = await fetch(`${API_BASE}/api/voices`, {
      headers: { "Authorization": `Bearer ${token}`, "accept": "application/json" }
    });
    if (!resp.ok) throw new Error("Voices fetch failed");
    return await resp.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function createAgent(payload) {
  const token = LS.get("ainswer_token");
  if (!token) return null;
  try {
    const resp = await fetch(`${API_BASE}/api/agents`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (resp.status === 403) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || "Agent limit reached. Contact support to upgrade to an Enterprise plan.");
    }
    if (!resp.ok) {
      const err = await resp.text();
      console.error("Create agent failed:", err);
      throw new Error("Create agent failed: " + err);
    }
    return await resp.json();
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function getAgent(id) {
  const token = LS.get("ainswer_token");
  if (!token) return null;
  try {
    const resp = await fetch(`${API_BASE}/api/agents/${id}`, {
      headers: { "Authorization": `Bearer ${token}`, "accept": "application/json" }
    });
    if (!resp.ok) throw new Error("Agent fetch failed");
    return await resp.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function updateAgent(id, payload) {
  const token = LS.get("ainswer_token");
  if (!token) return null;
  try {
    const resp = await fetch(`${API_BASE}/api/agents/${id}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error("Update agent failed:", err);
      throw new Error("Update agent failed: " + err);
    }
    return await resp.json();
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function getSettings() {
  const token = LS.get("ainswer_token");
  if (!token) return null;
  try {
    const resp = await fetch(`${API_BASE}/api/settings`, {
      headers: { "Authorization": `Bearer ${token}`, "accept": "application/json" }
    });
    if (!resp.ok) throw new Error("Settings fetch failed");
    return await resp.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function updateSettings(payload) {
  const token = LS.get("ainswer_token");
  if (!token) return null;
  try {
    const resp = await fetch(`${API_BASE}/api/settings`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error("Update settings failed:", err);
      throw new Error("Update settings failed: " + err);
    }
    return await resp.json();
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function startWebCall(agentId) {
  const token = LS.get("ainswer_token");
  if (!token) { alert("Please log in first."); return; }

  const btn = document.getElementById('webCallBtn');
  const originalHtml = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = "Connecting...";

    // 1. Create the call
    const resp = await fetch(`${API_BASE}/api/agents/${agentId}/web-call`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error("Failed to create web call: " + err);
    }
    
    const data = await resp.json();
    const joinUrl = data.joinUrl || data.join_url;

    if (!joinUrl) throw new Error("No joinUrl returned from server");

    // 2. Join the call using Ultravox SDK
    const { UltravoxSession } = await import('https://esm.sh/ultravox-client');
    const session = new UltravoxSession();
    
    const overlay = showVoiceOverlay(async () => {
      await session.leaveCall();
      hideVoiceOverlay();
      btn.innerHTML = originalHtml;
      btn.disabled = false;
      btn.style.background = "";
      btn.style.color = "";
    });

    session.joinCall(joinUrl);
    console.log("Joined Ultravox call:", joinUrl);

    // Update UI based on session events
    session.addEventListener('status', () => {
      const statusEl = document.getElementById('voiceStatus');
      if (statusEl) {
        if (session.status === 'talking') {
          statusEl.textContent = "Agent is speaking...";
          overlay.classList.add('speaking');
        } else if (session.status === 'listening') {
          statusEl.textContent = "Agent is listening...";
          overlay.classList.remove('speaking');
        } else if (session.status === 'thinking') {
          statusEl.textContent = "Agent is thinking...";
          overlay.classList.add('speaking'); // Gentle pulse
        } else if (session.status === 'disconnected') {
          hideVoiceOverlay();
          btn.innerHTML = originalHtml;
          btn.disabled = false;
          btn.style.background = "";
          btn.style.color = "";
        }
      }
    });

    session.addEventListener('transcript', (event) => {
      const transcriptEl = document.getElementById('voiceTranscript');
      if (transcriptEl && event.transcript) {
        transcriptEl.textContent = event.transcript;
      }
    });

  } catch (err) {
    console.error(err);
    alert("Call Error: " + err.message);
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

function showVoiceOverlay(onHangUp) {
  let overlay = document.getElementById('voiceOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'voiceOverlay';
    overlay.className = 'voice-overlay';
    overlay.innerHTML = `
      <div class="voice-orb-container">
        <div class="voice-orb"></div>
      </div>
      <div class="voice-status" id="voiceStatus">Connecting...</div>
      <div class="voice-transcript" id="voiceTranscript"></div>
      <button class="hang-up-btn" id="hangUpBtn">
        <span>❌ End Test Call</span>
      </button>
    `;
    document.body.appendChild(overlay);
  }
  
  document.getElementById('hangUpBtn').onclick = onHangUp;
  overlay.classList.add('active');
  return overlay;
}

function hideVoiceOverlay() {
  const overlay = document.getElementById('voiceOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.classList.remove('speaking');
    const t = document.getElementById('voiceTranscript');
    if (t) t.textContent = '';
  }
}

async function getGlobalNumbers() {
  const token = LS.get("ainswer_token");
  if (!token) return [];
  try {
    console.log("Fetching global numbers from:", `${API_BASE}/api/nettech-numbers`);
    const resp = await fetch(`${API_BASE}/api/nettech-numbers`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error("Failed to fetch global numbers: " + resp.status);
    const data = await resp.json();
    console.log("Global numbers raw data:", data);
    return Array.isArray(data) ? data : (data.results || data.numbers || data.data || []);
  } catch (e) {
    console.error("getGlobalNumbers error:", e);
    return [];
  }
}

async function claimNumber(phoneNumber) {
  const token = LS.get("ainswer_token");
  if (!token) throw new Error("Not logged in");
  const resp = await fetch(`${API_BASE}/api/numbers/claim`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ phone_number: phoneNumber })
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error("Failed to claim number: " + err);
  }
  return await resp.json();
}

async function releaseNumber(agentId) {
  const token = LS.get("ainswer_token");
  if (!token) throw new Error("Not logged in");
  const resp = await fetch(`${API_BASE}/api/agents/${agentId}/release-number`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error("Failed to release number: " + err);
  }
  return await resp.json();
}

async function getKBs() {
  const token = LS.get("ainswer_token");
  if (!token) return { results: [], can_create_kb: false, is_enterprise: false };
  try {
    const resp = await fetch(`${API_BASE}/api/knowledge-bases`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!resp.ok) return { results: [], can_create_kb: false, is_enterprise: false };
    const data = await resp.json();
    // Support both old (array) and new (object) response shapes
    if (Array.isArray(data)) return { results: data, can_create_kb: true, is_enterprise: false };
    return data;
  } catch (e) {
    console.error(e);
    return { results: [], can_create_kb: false, is_enterprise: false };
  }
}

async function deleteKB(kbId) {
  const token = LS.get("ainswer_token");
  if (!token) return;
  if (!confirm("Delete this Knowledge Base? It will be removed from all agents.")) return;
  try {
    const resp = await fetch(`${API_BASE}/api/knowledge-bases/${kbId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error("Delete failed");
    return true;
  } catch (e) {
    alert(e.message);
    return false;
  }
}

async function createKB(formData) {
  const token = LS.get("ainswer_token");
  if (!token) return;
  try {
    const resp = await fetch(`${API_BASE}/api/knowledge-bases`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    });
    if (resp.status === 403) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || "Knowledge Base limit reached. Contact support to upgrade to an Enterprise plan.");
    }
    if (!resp.ok) throw new Error("Creation failed");
    return await resp.json();
  } catch (e) {
    alert(e.message);
    return null;
  }
}

async function renderAgentsPage(containerId, view = 'list', agentId = null) {
  if (view === 'create') renderCreateAgentForm(containerId);
  else if (view === 'edit' && agentId) renderEditAgentForm(containerId, agentId);
  else renderAgentsTable(containerId);
}

async function renderAgentsTable(containerId) {
  const el = document.getElementById(containerId); if (!el) return;
  el.innerHTML = `<div class="card padded"><div class="badge">Loading agents...</div></div>`;

  const resp = await getAgents();
  const agents = resp && resp.results ? resp.results : (Array.isArray(resp) ? resp : []);
  const canCreate = resp && resp.can_create_agent !== undefined ? resp.can_create_agent : true;
  const isEnterprise = resp && resp.is_enterprise === true;

  const createBtnHtml = canCreate
    ? `<button class="btn primary" onclick="AInswer.renderAgentsPage('${containerId}', 'create')">+ Create New Agent</button>`
    : `<button class="btn" disabled title="You have reached your 1-agent limit. Contact support to upgrade." style="opacity:0.5;cursor:not-allowed">🔒 Limit Reached</button>`;

  const upgradeBanner = (!canCreate && !isEnterprise)
    ? `<div style="background:#fef3c7;border:1px solid #f59e0b;padding:12px 16px;border-radius:10px;margin-bottom:16px;font-size:13px">
        🔒 You've used your 1 free agent slot. <b>Contact support</b> to unlock unlimited agents with an Enterprise plan.
       </div>`
    : '';

  el.innerHTML = `
    <div class="topbar">
      <div>
        <h1 class="h2" style="margin:0">Manage Agents</h1>
        <div class="p">Configure your AI voice agents and their integrations.</div>
      </div>
      ${createBtnHtml}
    </div>
    ${upgradeBanner}
    <div class="card" style="overflow-x:auto">
      <table class="table" style="width:100%">
        <thead>
          <tr>
            <th>Name</th>
            <th>Model</th>
            <th>Phone</th>
            <th>Voice ID</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${agents.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:40px;">No agents found.</td></tr>' :
      agents.map(a => `
              <tr class="clickable-row" onclick="AInswer.renderAgentsPage('${containerId}', 'edit', '${a.id || a.agentId}')">
                <td><b>${a.name}</b></td>
                <td><span class="tag">${a.model || 'Nettech-custom'}</span></td>
                <td>${a.twilio_phone_number || '—'}</td>
                <td title="${a.voice}"><span class="small code">${(a.voice || "").slice(0, 8)}...</span></td>
                <td>${fmt(a.created)}</td>
              </tr>
            `).join('')
    }
        </tbody>
      </table>
    </div>
  `;
}

async function renderCreateAgentForm(containerId) {
  const el = document.getElementById(containerId); if (!el) return;

  // Render form structure immediately
  el.innerHTML = `
    <div class="topbar">
      <div>
        <h1 class="h2" style="margin:0">Create New Agent</h1>
        <div class="p">Setup a new voice persona and connection settings.</div>
      </div>
      <button class="btn" onclick="AInswer.renderAgentsPage('${containerId}', 'list')">Cancel</button>
    </div>
    <div class="card padded">
      <form id="createAgentForm" class="form">
        <div class="grid-2">
          <div>
            <label>Agent Name</label>
            <input type="text" name="name" placeholder="e.g. Alex" required />
          </div>
          <div>
            <label>Voice Profile</label>
            <select name="voice" id="voiceSelect" required>
              <option value="" disabled selected>Loading available voices...</option>
            </select>
            <div id="voicePreviewBox" style="margin-top:10px; font-size:13px;"></div>
          </div>
        </div>
        
        <label style="margin-top:10px">System Prompt (The Agent's Persona & Knowledge)</label>
        <textarea name="system_prompt" placeholder="You are a helpful assistant..." required style="min-height:120px"></textarea>
        
        <div class="divider"></div>
        <h3 class="h3">Safe Customizations</h3>
        <div class="p small" style="margin-bottom:10px">Configure specific agent behaviors without modifying the system prompt.</div>
        <div class="grid-2">
          <div>
            <label>Tone</label>
            <input type="text" name="tone" placeholder="e.g. professional, friendly" />
          </div>
          <div>
            <label>Greeting</label>
            <input type="text" name="greeting" placeholder="e.g. Thanks for calling us." />
          </div>
          <div>
            <label>Always Ask</label>
            <input type="text" name="always_ask" placeholder="e.g. postcode, preferred time" />
          </div>
          <div>
            <label>Avoid Phrases</label>
            <input type="text" name="avoid_phrases" placeholder="e.g. discounts, cheap" />
          </div>
        </div>
        
        <div class="grid-3" style="margin-top:10px">
          <div>
            <label>Language Hint</label>
            <select name="language">
              <option value="en">English (en)</option>
              <option value="es">Spanish (es)</option>
              <option value="fr">French (fr)</option>
            </select>
          </div>
          <div>
            <label>Knowledge Base (RAG)</label>
            <select name="knowledge_base_id" id="kbSelect">
              <option value="">-- No Knowledge Base --</option>
            </select>
          </div>
          <div>
            <label>Temperature (Creativity)</label>
            <input type="number" name="temperature" value="0.3" step="0.1" min="0" max="1" />
          </div>
        </div>

        <div class="divider"></div>
        <h3 class="h3">Capabilities / Tools</h3>
        <div class="p small" style="margin-bottom: 10px;">Select features to empower your agent.</div>
        <div class="grid-2">
          <label style="display:flex;gap:8px;align-items:center;">
            <input type="checkbox" name="tools" value="coldTransfer"> Enable Cold Transfer
          </label>
          <label style="display:flex;gap:8px;align-items:center;">
            <input type="checkbox" name="tools" value="warmTransfer"> Enable Warm Transfer
          </label>
        </div>

        <div class="divider"></div>
        <h3 class="h3">Twilio & CRM Integration</h3>
        <div class="grid-2">
          <div>
            <label>Twilio Phone Number</label>
            <select name="selected_phone_number" id="numberSelect">
              <option value="0">-- Select Available Number (Optional) --</option>
            </select>
            <div class="small muted" style="margin-top:5px">Numbers pulled from your global nettech account.</div>
          </div>
          <div>
            <label>Transfer Number (optional)</label>
            <input type="text" name="transfer_number" placeholder="+1234567890" />
          </div>
        </div>

        <div class="grid-3" style="margin-top:10px">
          <div>
            <label>Google Sheet ID</label>
            <input type="text" name="google_spreadsheet_id" placeholder="ID from sheet URL" />
          </div>
          <div>
            <label>Google Sheet Name</label>
            <input type="text" name="google_sheet_name" value="Sheet1" />
          </div>
          <div>
            <label>Webhook URL</label>
            <input type="text" name="google_webhook_url" placeholder="https://..." />
          </div>
        </div>

        <div class="divider"></div>
        <button type="submit" class="btn primary" style="width:100%; padding:14px">Create Agent</button>
      </form>
    </div>
  `;

  // Start background loading of voices
  (async () => {
    const voiceSelect = document.getElementById("voiceSelect");
    try {
      const resp = await getVoices();
      // Handle the case where the API returns { results: [] } or just []
      const voices = (resp && Array.isArray(resp.results)) ? resp.results : (Array.isArray(resp) ? resp : []);

      if (voices.length > 0) {
        voiceSelect.innerHTML = voices.map(v => `<option value="${v.voiceId}">${v.languageLabel || v.primaryLanguage || 'Globe'} - ${v.name}</option>`).join('');

        // Setup listener to dynamically update the preview box
        voiceSelect.addEventListener('change', () => {
          const selected = voices.find(v => v.voiceId === voiceSelect.value);
          const box = document.getElementById("voicePreviewBox");
          if (selected && box) {
            box.innerHTML = `
              <div style="background:rgba(99,91,255,0.05); padding:10px; border-radius:12px; border:1px solid rgba(99,91,255,0.1)">
                <div style="font-weight:600; color:var(--text); margin-bottom:4px">
                  ${selected.name}
                  <span class="tag" style="margin-left:5px; font-size:10px">${selected.provider || 'N/A'}</span>
                </div>
                <div style="margin-bottom:8px; line-height:1.4">${selected.description || 'No description available for this voice.'}</div>
                ${selected.previewUrl ? `<audio controls style="height:32px; width:100%" src="${selected.previewUrl}"></audio>` : '<div class="muted small">No audio preview available</div>'}
              </div>
            `;
          }
        });

        // Trigger initial preview for the first selected item
        voiceSelect.dispatchEvent(new Event("change"));

      } else {
        voiceSelect.innerHTML = '<option value="" disabled>No voices found.</option>';
      }
    } catch (err) {
      console.error("Failed to load voices:", err);
      if (voiceSelect) voiceSelect.innerHTML = '<option value="" disabled>Failed to load voices.</option>';
    }
  })();

  // Start background loading of KBs
  (async () => {
    const kbSelect = document.getElementById("kbSelect");
    try {
      const kbs = await getKBs();
      if (kbs && kbs.length > 0) {
        kbs.forEach(kb => {
          const opt = document.createElement("option");
          opt.value = kb.id;
          opt.textContent = kb.name;
          kbSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error("Failed to load KBs:", err);
    }
  })();

  // Start background loading of global numbers
  (async () => {
    const numSelect = document.getElementById("numberSelect");
    try {
      const numbers = await getGlobalNumbers();
      console.log("Create form: available numbers:", numbers);
      if (numbers && numbers.length > 0) {
        numbers.forEach(n => {
          const opt = document.createElement("option");
          // Handle both object format and string format
          const val = (typeof n === 'string') ? n : (n.phoneNumber || n.phone_number || n.number);
          const label = (typeof n === 'string') ? n : (n.friendlyName || n.friendly_name || val);
          const loc = (typeof n === 'string') ? '' : ` (${n.locality || n.city || 'Global'})`;
          
          if (val) {
            opt.value = val;
            opt.textContent = `${label}${loc}`;
            numSelect.appendChild(opt);
          }
        });
      } else {
        console.warn("No global numbers returned or empty list.");
      }
    } catch (err) {
      console.error("Failed to load global numbers in Create form:", err);
    }
  })();

  document.getElementById("createAgentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());

    try {
      const subBtn = e.target.querySelector('button');
      subBtn.disabled = true;
      subBtn.textContent = "Creating...";

      // Handle number claiming if a number is selected
      if (payload.selected_phone_number && payload.selected_phone_number !== "0") {
        const claimRes = await claimNumber(payload.selected_phone_number);
        payload.twilio_number_id = claimRes.id;
      } else {
        payload.twilio_number_id = 0;
      }
      delete payload.selected_phone_number;

      // Handle KB
      payload.knowledge_base_id = payload.knowledge_base_id ? parseInt(payload.knowledge_base_id) : null;

      // Cleanup numbers and arrays
      payload.temperature = parseFloat(payload.temperature);
      payload.speed = parseFloat(payload.speed);
      payload.twilio_number_id = parseInt(payload.twilio_number_id) || 0;
      payload.tool_names = Array.from(form.querySelectorAll('input[name="tools"]:checked')).map(el => el.value);
      
      // Handle Safe Customization fields (convert empty to null)
      ['tone', 'greeting', 'always_ask', 'avoid_phrases'].forEach(k => {
        if (!payload[k] || payload[k].trim() === "") payload[k] = null;
        else payload[k] = payload[k].trim();
      });

      await createAgent(payload);
      alert("Agent created successfully!");
      renderAgentsPage(containerId, 'list');
    } catch (err) {
      alert("Error: " + err.message);
      const subBtn = e.target.querySelector('button');
      subBtn.disabled = false;
      subBtn.textContent = "Create Agent";
    }
  });
}

async function renderEditAgentForm(containerId, agentId) {
  const el = document.getElementById(containerId); if (!el) return;

  el.innerHTML = `<div class="card padded"><div class="badge">Loading agent settings...</div></div>`;

  // Background fetch for both voices and the specific agent
  const [voicesResp, agent] = await Promise.all([getVoices(), getAgent(agentId)]);
  if (!agent) {
    el.innerHTML = `<div class="notice">Failed to load agent details.</div>
                    <button class="btn" style="margin-top:10px" onclick="AInswer.renderAgentsPage('${containerId}', 'list')">Go Back</button>`;
    return;
  }

  const voices = (voicesResp && Array.isArray(voicesResp.results)) ? voicesResp.results : (Array.isArray(voicesResp) ? voicesResp : []);
  // Support both property names for safety
  const safeSystemPrompt = agent.systemPrompt || agent.system_prompt || '';

  el.innerHTML = `
    <div class="topbar">
      <div>
        <h1 class="h2" style="margin:0">Edit Agent: ${escapeHtml(agent.name || '')}</h1>
        <div class="p">Update Persona, Voice, and Integration settings.</div>
      </div>
      <div style="display:flex; gap:10px; align-items:center">
        <button id="webCallBtn" class="btn primary" onclick="AInswer.startWebCall('${agentId}')">📞 Test Web Call</button>
        <button class="btn" onclick="AInswer.renderAgentsPage('${containerId}', 'list')">Cancel</button>
      </div>
    </div>
    <div class="card padded">
      <form id="editAgentForm" class="form">
        <div class="grid-2">
          <div>
            <label>Agent Name</label>
            <input type="text" name="name" value="${escapeHtml(agent.name || '')}" required />
          </div>
          <div>
            <label>Voice Profile</label>
            <select name="voice" id="editVoiceSelect" required>
              ${voices.length === 0 ? '<option value="" disabled>No voices found.</option>' :
      voices.map(v => `<option value="${v.voiceId}" ${v.voiceId === agent.voice ? 'selected' : ''}>${v.languageLabel || v.primaryLanguage || 'Globe'} - ${v.name}</option>`).join('')}
            </select>
            <div id="editVoicePreviewBox" style="margin-top:10px; font-size:13px;"></div>
          </div>
        </div>
        
        <label style="margin-top:10px">System Prompt (The Agent's Persona & Knowledge)</label>
        <textarea name="system_prompt" required style="min-height:120px">${escapeHtml(safeSystemPrompt)}</textarea>
        
        <div class="divider"></div>
        <h3 class="h3">Safe Customizations</h3>
        <div class="p small" style="margin-bottom:10px">Configure specific agent behaviors without modifying the system prompt.</div>
        <div class="grid-2">
          <div>
            <label>Tone</label>
            <input type="text" name="tone" value="${escapeHtml(agent.tone || '')}" placeholder="e.g. professional, friendly" />
          </div>
          <div>
            <label>Greeting</label>
            <input type="text" name="greeting" value="${escapeHtml(agent.greeting || '')}" placeholder="e.g. Thanks for calling us." />
          </div>
          <div>
            <label>Always Ask</label>
            <input type="text" name="always_ask" value="${escapeHtml(agent.always_ask || '')}" placeholder="e.g. postcode, preferred time" />
          </div>
          <div>
            <label>Avoid Phrases</label>
            <input type="text" name="avoid_phrases" value="${escapeHtml(agent.avoid_phrases || '')}" placeholder="e.g. discounts, cheap" />
          </div>
        </div>
        
        <div class="grid-3" style="margin-top:10px">
          <div>
            <label>Language Hint</label>
            <select name="language">
              <option value="en" ${(agent.languageHint || agent.language) === "en" ? 'selected' : ''}>English (en)</option>
              <option value="es" ${(agent.languageHint || agent.language) === "es" ? 'selected' : ''}>Spanish (es)</option>
              <option value="fr" ${(agent.languageHint || agent.language) === "fr" ? 'selected' : ''}>French (fr)</option>
            </select>
          </div>
          <div>
            <label>Knowledge Base (RAG)</label>
            <select name="knowledge_base_id" id="editKbSelect">
              <option value="">-- No Knowledge Base --</option>
            </select>
          </div>
          <div>
            <label>Temperature (Creativity)</label>
            <input type="number" name="temperature" value="${agent.temperature !== undefined ? agent.temperature : 0.3}" step="0.1" min="0" max="1" />
          </div>
        </div>

        <div class="divider"></div>
        <h3 class="h3">Capabilities / Tools</h3>
        <div class="p small" style="margin-bottom: 10px;">Select features to empower your agent.</div>
        <div class="grid-2">
          <label style="display:flex;gap:8px;align-items:center;">
            <input type="checkbox" name="tools" value="coldTransfer" ${(agent.tool_names || agent.selectedTools || []).includes('coldTransfer') ? 'checked' : ''}> Enable Cold Transfer
          </label>
          <label style="display:flex;gap:8px;align-items:center;">
            <input type="checkbox" name="tools" value="warmTransfer" ${(agent.tool_names || agent.selectedTools || []).includes('warmTransfer') ? 'checked' : ''}> Enable Warm Transfer
          </label>
        </div>

        <div class="divider"></div>
        <h3 class="h3">Twilio & CRM Integration</h3>
        <div class="grid-2">
          <div>
            <label>Twilio Phone Number</label>
            ${agent.twilio_phone_number ? `
              <div style="display:flex; gap:10px; align-items:center">
                <div class="code" style="flex:1">${agent.twilio_phone_number}</div>
                <button type="button" class="btn danger small" onclick="AInswer.handleReleaseNumber('${agentId}', '${containerId}')">Release</button>
              </div>
              <input type="hidden" name="twilio_number_id" value="${agent.twilio_number_id || 0}" />
            ` : `
              <select name="selected_phone_number" id="editNumberSelect">
                <option value="0">-- Select Available Number (Optional) --</option>
              </select>
              <input type="hidden" name="twilio_number_id" value="0" />
            `}
          </div>
          <div>
            <label>Transfer Number</label>
            <input type="text" name="transfer_number" value="${escapeHtml(agent.transfer_number || agent.transferNumber || '')}" />
          </div>
        </div>

        <div class="grid-3" style="margin-top:10px">
          <div>
            <label>Google Sheet ID</label>
            <input type="text" name="google_spreadsheet_id" value="${escapeHtml(agent.google_spreadsheet_id || agent.googleSpreadsheetId || '')}" />
          </div>
          <div>
            <label>Google Sheet Name</label>
            <input type="text" name="google_sheet_name" value="${escapeHtml(agent.google_sheet_name || agent.googleSheetName || 'Sheet1')}" />
          </div>
          <div>
            <label>Webhook URL</label>
            <input type="text" name="google_webhook_url" value="${escapeHtml(agent.google_webhook_url || agent.googleWebhookUrl || '')}" />
          </div>
        </div>

        <div class="divider"></div>
        <button type="submit" class="btn primary" style="width:100%; padding:14px">Save Agent</button>
      </form>
    </div>
  `;

  // Attach dynamic preview listener
  const voiceSelect = document.getElementById("editVoiceSelect");
  if (voiceSelect && voices.length > 0) {
    voiceSelect.addEventListener('change', () => {
      const selected = voices.find(v => v.voiceId === voiceSelect.value);
      const box = document.getElementById("editVoicePreviewBox");
      if (selected && box) {
        box.innerHTML = `
          <div style="background:rgba(99,91,255,0.05); padding:10px; border-radius:12px; border:1px solid rgba(99,91,255,0.1)">
            <div style="font-weight:600; color:var(--text); margin-bottom:4px">
              ${selected.name}
              <span class="tag" style="margin-left:5px; font-size:10px">${selected.provider || 'N/A'}</span>
            </div>
            <div style="margin-bottom:8px; line-height:1.4">${selected.description || 'No description available for this voice.'}</div>
            ${selected.previewUrl ? `<audio controls style="height:32px; width:100%" src="${selected.previewUrl}"></audio>` : '<div class="muted small">No audio preview available</div>'}
          </div>
        `;
      }
    });
    // trigger initial render
    voiceSelect.dispatchEvent(new Event("change"));
  }

  document.getElementById("editAgentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());

    // Handle KB
    payload.knowledge_base_id = payload.knowledge_base_id ? parseInt(payload.knowledge_base_id) : null;

    // Cleanup mapped properties exactly as defined by schema
    payload.temperature = parseFloat(payload.temperature);
    payload.speed = parseFloat(payload.speed);
    payload.twilio_number_id = parseInt(payload.twilio_number_id) || 0;
    payload.tool_names = agent.tool_names || agent.selectedTools || [];

    try {
      const subBtn = e.target.querySelector('button');
      subBtn.disabled = true;
      subBtn.textContent = "Saving...";

      // Handle number claiming if a new number is selected
      if (payload.selected_phone_number && payload.selected_phone_number !== "0") {
        const claimRes = await claimNumber(payload.selected_phone_number);
        payload.twilio_number_id = claimRes.id;
      }
      delete payload.selected_phone_number;

      // Handle KB
      payload.knowledge_base_id = payload.knowledge_base_id ? parseInt(payload.knowledge_base_id) : null;

      // Cleanup mapped properties exactly as defined by schema
      payload.temperature = parseFloat(payload.temperature);
      payload.speed = parseFloat(payload.speed);
      payload.twilio_number_id = parseInt(payload.twilio_number_id) || 0;
      payload.tool_names = Array.from(e.target.querySelectorAll('input[name="tools"]:checked')).map(el => el.value);
      
      // Handle Safe Customization fields (convert empty to null)
      ['tone', 'greeting', 'always_ask', 'avoid_phrases'].forEach(k => {
        if (!payload[k] || payload[k].trim() === "") payload[k] = null;
        else payload[k] = payload[k].trim();
      });

      await updateAgent(agentId, payload);
      alert("Agent updated successfully!");
      renderAgentsPage(containerId, 'list');
    } catch (err) {
      alert("Error: " + err.message);
      const subBtn = e.target.querySelector('button');
      subBtn.disabled = false;
      subBtn.textContent = "Save Agent";
    }
  });

  // Load global numbers if none assigned
  if (!agent.twilio_phone_number) {
    (async () => {
      const numSelect = document.getElementById("editNumberSelect");
      try {
        const numbers = await getGlobalNumbers();
        console.log("Edit form: available numbers:", numbers);
        if (numbers && numbers.length > 0) {
          numbers.forEach(n => {
            const opt = document.createElement("option");
            const val = (typeof n === 'string') ? n : (n.phoneNumber || n.phone_number || n.number);
            const label = (typeof n === 'string') ? n : (n.friendlyName || n.friendly_name || val);
            const loc = (typeof n === 'string') ? '' : ` (${n.locality || n.city || 'Global'})`;

            if (val) {
              opt.value = val;
              opt.textContent = `${label}${loc}`;
              numSelect.appendChild(opt);
            }
          });
        }
      } catch (err) {
        console.error("Failed to load global numbers in Edit form:", err);
      }
    })();
  }

  // Load KBs for edit form
  (async () => {
    const kbSelect = document.getElementById("editKbSelect");
    try {
      const kbs = await getKBs();
      if (kbs && kbs.length > 0) {
        kbs.forEach(kb => {
          const opt = document.createElement("option");
          opt.value = kb.id;
          opt.textContent = kb.name;
          if (agent.knowledge_base_id === kb.id || agent.knowledgeBaseId === kb.id) opt.selected = true;
          kbSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error("Failed to load KBs in Edit form:", err);
    }
  })();
}

async function handleReleaseNumber(agentId, containerId) {
  if (!confirm("Are you sure you want to release this number? It will be unassigned from this agent and returned to the global pool.")) return;
  try {
    await releaseNumber(agentId);
    alert("Number released successfully.");
    renderAgentsPage(containerId, 'edit', agentId);
  } catch (err) {
    alert("Error releasing number: " + err.message);
  }
}

// expose
window.AInswer = {
  API_BASE,
  handleRegister, handleLogin, requireAuth, logout,
  setHeaderUser, setActiveNav, getDashboardData, getCallHistory, getCallDetail, copyToClipboard, viewCallDetail, toggleTranscript,
  renderCallsTable, renderCallDetail, renderSettings, renderGoLive, simulateTestCall, renderFAQs,
  renderAdminCounts, renderAdminCustomers, renderAdminCustomerDetail,
  renderAgentsPage, renderAgentsTable, renderCreateAgentForm, renderEditAgentForm, startWebCall,
  getGlobalNumbers, claimNumber, releaseNumber, handleReleaseNumber,
  getKBs, createKB, deleteKB, handleDeleteKB
};



// -----------------------------
// USER MANAGEMENT (ADMIN)
// -----------------------------
function renderAdminUsers(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  requireAuth("admin");
  const users = LS.get("ainswer_users", []);
  el.innerHTML = `
    <table class="table">
      <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th></th></tr>
      ${users.map(u => `
        <tr>
          <td>${u.id}</td>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>${u.role}</td>
          <td>
            ${u.role !== "admin" ? `<button class="btn danger" onclick="deleteUser(${u.id})">Delete</button>` : ""}
          </td>
        </tr>`).join("")}
    </table>`;
  window.deleteUser = (id) => {
    if (!confirm("Delete this user?")) return;
    const updated = users.filter(u => u.id !== id);
    LS.set("ainswer_users", updated);
    renderAdminUsers(containerId);
  };
}

// -----------------------------
// PROMPT VERSION MANAGEMENT
// -----------------------------
function seedPrompts() {
  if (LS.get("ainswer_prompts")) return;
  const basePrompt = {
    id: 1,
    version: 1,
    content: "Base AI answering prompt v1",
    created: new Date().toISOString()
  };
  LS.set("ainswer_prompts", [basePrompt]);
}
seedPrompts();

function renderPromptAdmin(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  requireAuth("admin");
  const prompts = LS.get("ainswer_prompts", []);
  el.innerHTML = `
    <div class="card padded">
      <h3>Prompt Versions</h3>
      <ul>
        ${prompts.map(p => `
          <li>
            <b>v${p.version}</b> - ${new Date(p.created).toLocaleString()}
            <button class="btn" onclick="rollbackPrompt(${p.version})">Rollback</button>
          </li>`).join("")}
      </ul>
      <div class="divider"></div>
      <textarea id="newPrompt" placeholder="Edit new prompt..."></textarea>
      <button class="btn primary" onclick="savePrompt()">Save New Version</button>
    </div>
  `;

  window.savePrompt = () => {
    const txt = document.getElementById("newPrompt").value;
    if (!txt) return alert("Enter prompt content");
    const latest = Math.max(...prompts.map(p => p.version));
    prompts.push({
      id: Date.now(),
      version: latest + 1,
      content: txt,
      created: new Date().toISOString()
    });
    LS.set("ainswer_prompts", prompts);
    renderPromptAdmin(containerId);
  };

  window.rollbackPrompt = (v) => {
    const selected = prompts.find(p => p.version === v);
    if (!selected) return;
    LS.set("ainswer_prompts", [selected]);
    renderPromptAdmin(containerId);
    alert("Rolled back to v" + v + " (demo).");
  };
}
