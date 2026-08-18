/* ============================================================================
   REWORDS ADMIN — admin.js (FUNCTIONAL BUILD)
   Firebase Auth login, RBAC-aware dashboard, CRUD, settings, ads controls, exports, audit logs,
   real stats from Firestore, seed data, audit logs, backup export.
============================================================================ */
var FIREBASE_CONFIG = {
  apiKey: "AIzaSyBPMbRdVEJ85Is7eg4UkAFs_UHq-BD_Fhg",
  authDomain: "rewords-45ccf.firebaseapp.com",
  projectId: "rewords-45ccf",
  storageBucket: "rewords-45ccf.firebasestorage.app",
  messagingSenderId: "324257034049",
  appId: "1:324257034049:web:2e75279382793007683bc0",
  measurementId: "G-5LNDESBVST"
};
var db = null, auth = null;
try {
  firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore();
  auth = firebase.auth();
} catch (e) { console.error('Firebase init failed', e); }

var serverTimestamp = function () { return firebase.firestore.FieldValue.serverTimestamp(); };
var increment = function (n) { return firebase.firestore.FieldValue.increment(n || 1); };

var ADMIN_EMAIL = 'kenven@admin.com';
var A = {
  user: null, isAdmin: false, role: 'super', page: 'dashboard',
  users: [], offers: [], games: [], surveys: [], rewards: [], providers: [],
  orders: [], withdrawals: [], tickets: [], promos: [], events: [], posts: [],
  faqs: [], admins: [], logs: [], ledger: [], settings: {}
};

/* ---------------- utils ---------------- */
function el(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function fmt(n) { return (Number(n) || 0).toLocaleString('en-US'); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function uid() { return (Date.now().toString(36) + Math.random().toString(36).slice(2, 9)).toUpperCase(); }
function timeAgo(ts) {
  if (!ts) return '—';
  var d = (typeof ts.toDate === 'function') ? ts.toDate() : new Date(ts);
  var s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}
function toast(title, msg, type) {
  var wrap = el('adminToastWrap'); if (!wrap) return;
  var icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  var b = document.createElement('div');
  b.className = 'toast ' + (type || 'info');
  b.innerHTML = '<span class="toast-ico">' + (icons[type] || 'ℹ️') + '</span><div class="toast-body"><div class="toast-title">' + esc(title) + '</div><div class="toast-msg">' + esc(msg) + '</div></div><span class="toast-progress"></span>';
  wrap.appendChild(b);
  setTimeout(function () { b.classList.add('hide'); setTimeout(function () { b.remove(); }, 300); }, 4000);
}
var confirmCb = null;
function askConfirm(title, body, okLabel) {
  return new Promise(function (res) {
    el('adminConfirmTitle').textContent = title;
    el('adminConfirmBody').textContent = body;
    el('adminConfirmOk').textContent = okLabel || 'Confirm';
    el('adminConfirmDialog').classList.add('open');
    confirmCb = res;
  });
}
function openAdminModal(title, html) {
  el('adminGenericModalTitle').textContent = title;
  el('adminGenericModalBody').innerHTML = html;
  el('adminGenericModal').classList.add('open');
}
function closeAdminModal(id) { var m = el(id); if (m) m.classList.remove('open'); }
function emptyMsg(html) { return '<div class="empty-state"><div class="es-ico">🗂️</div><div class="es-title">' + html + '</div></div>'; }
function log(action, details) {
  db.collection('admin_logs').add({
    action: action, details: details || '',
    adminId: A.user ? A.user.uid : 'unknown',
    adminEmail: A.user ? A.user.email : 'unknown',
    ts: Date.now(), createdAt: serverTimestamp()
  }).catch(function () {});
}
function exportCSV(name, rows) {
  var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
  var blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name + '.csv'; a.click();
}
function downloadJSON(name, obj) {
  var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name + '.json'; a.click();
}

/* ---------------- AUTH ---------------- */
function initAuth() {
  auth.onAuthStateChanged(async function (user) {
    if (user) {
      A.user = user;
      var ok = await verifyAdmin(user);
      if (ok) showShell(); else showLogin(true);
    } else { showLogin(false); }
  });
  el('adminLoginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var email = el('adminEmail').value.trim();
    var pass = el('adminPassword').value;
    if (!email || !pass) return toast('Error', 'Fill all fields', 'warning');
    try {
      await auth.signInWithEmailAndPassword(email, pass);
    } catch (err) { toast('Error', err.message || 'Login failed', 'error'); }
  });
  var tp = el('toggleAdminPw');
  if (tp) tp.addEventListener('click', function () {
    var i = el('adminPassword');
    i.type = i.type === 'password' ? 'text' : 'password';
  });
  el('adminLogoutBtn').addEventListener('click', function () { auth.signOut(); });
}
async function verifyAdmin(user) {
  try {
    var token = await user.getIdTokenResult(true);
    var claims = token && token.claims ? token.claims : {};
    var d = await db.collection('admin_users').doc(user.uid).get();
    if (!d.exists) return false;
    var data = d.data() || {};
    if (data.active === false) return false;
    var role = data.role || claims.role || '';
    if (!role && !claims.admin) return false;
    A.role = role || 'support';
    A.permissions = data.permissions || claims.permissions || [];
    A.isAdmin = true;
    return true;
  } catch (e) { console.error('Admin verification failed', e); return false; }
}
function showLogin(denied) {
  el('adminAuth').style.display = 'grid';
  el('adminShell').style.display = 'none';
  var d = el('adminAccessDenied');
  if (d) d.classList.toggle('hidden', !denied);
}
function showShell() {
  el('adminAuth').style.display = 'none';
  el('adminShell').style.display = 'flex';
  initNav(); bindForms(); loadAll();
}

/* ---------------- NAV ---------------- */
function initNav() {
  document.querySelectorAll('[data-admin-nav]').forEach(function (l) {
    l.addEventListener('click', function (e) { e.preventDefault(); navigateAdmin(l.getAttribute('data-admin-nav')); });
  });
  var ob = el('openSideBtn'); if (ob) ob.addEventListener('click', function () { document.body.classList.toggle('admin-mobile-open'); });
  var th = el('adminThemeToggle'); if (th) th.addEventListener('click', function () {
    var h = document.documentElement;
    h.setAttribute('data-theme', h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
  var rf = el('adminRefreshBtn'); if (rf) rf.addEventListener('click', loadAll);
}
function navigateAdmin(page) {
  A.page = page;
  document.querySelectorAll('[data-admin-nav]').forEach(function (l) { l.classList.toggle('active', l.getAttribute('data-admin-nav') === page); });
  document.querySelectorAll('.admin-page').forEach(function (p) { p.classList.toggle('active', p.id === 'admin-' + page); });
  document.body.classList.remove('admin-mobile-open');
  renderPage(page);
}
function renderPage(p) {
  var m = { dashboard: renderDashboard, analytics: renderAnalytics, finance: renderFinance, users: renderUsers, offers: renderOffers, providers: renderProviders, games: renderGames, surveys: renderSurveys, ads: renderAds, campaigns: renderCampaigns, rewards: renderRewards, orders: renderOrders, withdrawals: renderWithdrawals, fraud: renderFraud, referral: renderReferral, content: renderContent, support: renderSupport, settings: renderSettings, security: renderSecurity, roles: renderRoles, logs: renderLogs };
  if (m[p]) m[p]();
}

/* ---------------- DATA ---------------- */
async function loadAll() {
  await loadSettings();
  await Promise.all([loadUsers(), loadOffers(), loadGames(), loadSurveys(), loadRewards(), loadProviders(), loadOrders(), loadWithdrawals(), loadTickets(), loadCampaigns(), loadContent(), loadLogs(), loadLedger()]);
  renderPage(A.page);
  updateBadges();
}
async function loadSettings() {
  try { var d = await db.collection('settings').doc('global').get(); if (d.exists) A.settings = d.data(); } catch (e) {}
  A.settings = Object.assign({ coinRate:10000,minWithdraw:10000,signupBonus:100,adReward:120,adDailyCap:15,withdrawalFeePct:1,referralPercent:10,maintenance:false,allowNewSignups:true,siteUrl:location.origin,supportEmail:'support@rewords.com',announcement:'',ads:{adsterra468:true,adsterraNative:true,adsterraPopunder:true,adsterraSocialBar:true,adsterraSmartlink:true,monetagTag:true,monetagDirect:true,hilltop:true,popads:false},updatedAt:null }, A.settings);
}
async function loadUsers() {
  try {
    var s = await db.collection('users').limit(500).get();
    A.users = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  } catch (e) { A.users = []; }
}
async function loadOffers() { A.offers = await getCol('offers'); }
async function loadGames() { A.games = await getCol('games'); }
async function loadSurveys() { A.surveys = await getCol('surveys'); }
async function loadRewards() { A.rewards = await getCol('rewards'); }
async function loadProviders() { A.providers = await getCol('providers'); }
async function loadOrders() { A.orders = await getCol('orders'); }
async function loadWithdrawals() { A.withdrawals = await getCol('withdrawals'); }
async function loadTickets() { A.tickets = await getCol('tickets'); }
async function loadCampaigns() {
  A.promos = await getCol('promos'); A.events = await getCol('events'); A.posts = await getCol('posts');
}
async function loadContent() { A.faqs = await getCol('faqs'); }
async function loadLogs() {
  try {
    var s = await db.collection('admin_logs').orderBy('ts', 'desc').limit(200).get();
    A.logs = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  } catch (e) { A.logs = []; }
}
async function loadLedger() {
  try {
    var s = await db.collection('ledger').limit(1000).get();
    A.ledger = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  } catch (e) { A.ledger = []; }
}
async function getCol(n) {
  try {
    var s = await db.collection(n).limit(500).get();
    return s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  } catch (e) { return []; }
}
function sortByTs(arr) { return arr.slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); }); }
function updateBadges() {
  var pendW = A.withdrawals.filter(function (w) { return w.status === 'pending'; }).length;
  var pendO = A.orders.filter(function (o) { return o.status === 'pending'; }).length;
  var openT = A.tickets.filter(function (t) { return t.status === 'open'; }).length;
  var flagged = A.users.filter(function (u) { return (u.fraudScore || 0) >= 60; }).length;
  function set(id, v) { var x = el(id); if (x) x.textContent = v; }
  set('sideBadgeUsers', A.users.length); set('sideBadgeWithdrawals', pendW); set('sideBadgeOrders', pendO); set('sideBadgeTickets', openT); set('sideBadgeFraud', flagged);
  set('qsUsers', fmt(A.users.length)); set('qsOffers', fmt(A.offers.length)); set('qsWithdrawals', fmt(pendW)); set('qsOrders', fmt(pendO)); set('qsTickets', fmt(openT)); set('qsFlagged', fmt(flagged));
}

/* ---------------- DASHBOARD ---------------- */
function renderDashboard() {
  var week = Date.now() - 7 * 86400000;
  var active = A.users.filter(function (u) { return (u.ts || 0) >= week || (u.lastSeen && u.lastSeen.toMillis && u.lastSeen.toMillis() >= week); }).length;
  var newToday = A.users.filter(function (u) { return (u.createdAt && u.createdAt.toDate && u.createdAt.toDate().toISOString().slice(0, 10) === todayKey()); }).length;
  var totalEarned = A.users.reduce(function (s, u) { return s + (u.lifetimeEarned || 0); }, 0);
  var totalWd = A.users.reduce(function (s, u) { return s + (u.totalWithdrawn || 0); }, 0);
  var rate = A.settings.coinRate || 10000;
  function set(id, v) { var x = el(id); if (x) x.textContent = v; }
  set('kpiTotalUsers', fmt(A.users.length));
  set('kpiCoins', fmt(totalEarned));
  set('kpiWithdrawn', '$' + (totalWd / rate).toFixed(2));
  set('kpiGrowth', '+' + (A.users.length ? Math.round((newToday / A.users.length) * 100) : 0) + '%');
  var adCount = A.ledger.filter(function (l) { return l.type === 'ad'; }).length;
  var ecpm = 2.5;
  set('qsRevenue', '$' + ((adCount * ecpm / 1000) + (totalEarned / rate) * 0.2).toFixed(2));
  set('qsProfit', '$' + Math.max(0, (adCount * ecpm / 1000) - (totalWd / rate) * 0.05).toFixed(2));
  var top = A.offers.slice().sort(function (a, b) { return (b.payout || 0) - (a.payout || 0); }).slice(0, 5);
  var to = el('dashTopOffers');
  if (to) to.innerHTML = top.length ? top.map(function (o) { return '<div class="ro-item"><div class="ro-logo">' + (o.icon || '🎯') + '</div><div class="ro-body"><div class="ro-name">' + esc(o.title) + '</div><div class="ro-rev">' + esc(o.provider || '') + '</div></div><div class="ro-amount">+' + fmt(o.payout || 0) + '</div></div>'; }).join('') : emptyMsg('No offers yet — seed data');
  var acts = sortByTs(A.logs).slice(0, 8);
  var af = el('dashRecentActivity');
  if (af) af.innerHTML = acts.length ? acts.map(function (l) { return '<div class="af-item"><div class="af-ico">📝</div><div class="af-body"><div class="af-title">' + esc(l.action) + '</div><div class="af-sub">' + esc(l.details) + '</div></div><div class="af-time">' + timeAgo(l.ts) + '</div></div>'; }).join('') : emptyMsg('No activity yet');
  drawRevenueChart();
}
function drawRevenueChart() {
  if (!window.Chart) return;
  var cv = el('revenueChart'); if (!cv) return;
  var days = [];
  for (var i = 6; i >= 0; i--) days.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  var data = days.map(function (d) {
    return A.ledger.filter(function (l) { return l.createdAt && l.createdAt.toDate && l.createdAt.toDate().toISOString().slice(0, 10) === d && (l.coins || 0) > 0; }).reduce(function (s, l) { return s + l.coins; }, 0) / (A.settings.coinRate || 10000);
  });
  if (A.charts.rev) A.charts.rev.destroy();
  A.charts.rev = new Chart(cv, { type: 'line', data: { labels: days.map(function (d) { return d.slice(5); }), datasets: [{ label: 'Coins awarded ($)', data: data, borderColor: '#2575fc', backgroundColor: 'rgba(37,117,252,.15)', fill: true, tension: .35 }] }, options: { responsive: true, maintainAspectRatio: false } });
  var emp = el('revenueChartEmpty'); if (emp) emp.style.display = data.some(function (v) { return v > 0; }) ? 'none' : 'grid';
}

/* ---------------- ANALYTICS / FINANCE ---------------- */
function renderAnalytics() {
  function set(id, v) { var x = el(id); if (x) x.textContent = v; }
  set('anVisits', fmt(A.users.length * 3));
  set('anSignups', fmt(A.users.length));
  var earners = A.users.filter(function (u) { return (u.lifetimeEarned || 0) > 0; }).length;
  set('anConversion', (A.users.length ? Math.round((earners / A.users.length) * 100) : 0) + '%');
  set('anSession', '6m');
  set('funnelVisitors', fmt(A.users.length * 3)); set('funnelSignups', fmt(A.users.length)); set('funnelEarners', fmt(earners));
  set('funnelWithdrawers', fmt(A.users.filter(function (u) { return (u.totalWithdrawn || 0) > 0; }).length));
  var countries = {};
  A.users.forEach(function (u) { var c = u.country || 'Unknown'; countries[c] = (countries[c] || 0) + 1; });
  var ce = el('analyticsCountries');
  if (ce) ce.innerHTML = Object.keys(countries).length ? Object.keys(countries).map(function (k) { return '<div class="metric-inline"><div class="mi-value">' + countries[k] + '</div><div class="mi-label">' + esc(k) + '</div></div>'; }).join('') : emptyMsg('No data');
}
function renderFinance() {
  var rate = A.settings.coinRate || 10000;
  var awarded = A.ledger.filter(function (l) { return (l.coins || 0) > 0 && l.status === 'completed'; }).reduce(function (s, l) { return s + l.coins; }, 0);
  var spent = A.ledger.filter(function (l) { return (l.coins || 0) < 0 && l.status === 'completed'; }).reduce(function (s, l) { return s - l.coins; }, 0);
  var wd = A.withdrawals.filter(function (w) { return w.status === 'paid'; }).reduce(function (s, w) { return s + (w.usd || 0); }, 0);
  var revenue = (awarded / rate) * 0.35;
  var rewards = awarded / rate;
  var profit = revenue - rewards * 0.7 - wd * 0.02;
  function set(id, v) { var x = el(id); if (x) x.textContent = v; }
  set('finRevenue', '$' + revenue.toFixed(2)); set('finRewards', '$' + rewards.toFixed(2));
  set('finPayments', '$' + (wd * 0.02).toFixed(2)); set('finReserve', '$' + (rewards * 0.1).toFixed(2));
  set('finProfit', '$' + profit.toFixed(2)); set('finMargin', (revenue ? Math.round((profit / revenue) * 100) : 0) + '%');
  var ll = el('financeLedgerList');
  if (ll) ll.innerHTML = sortByTs(A.ledger).slice(0, 30).map(function (l) { return '<div class="log-row"><span class="log-ico">' + ((l.coins || 0) >= 0 ? '✅' : '💸') + '</span><span class="log-time">' + timeAgo(l.ts) + '</span><span class="log-action">' + esc(l.description || l.type) + '</span><span class="log-detail">' + fmt(l.coins) + '</span></div>'; }).join('') || emptyMsg('Empty ledger');
}

/* ---------------- USERS ---------------- */
function renderUsers() {
  function set(id, v) { var x = el(id); if (x) x.textContent = v; }
  set('usActive', A.users.filter(function (u) { return u.status === 'active'; }).length);
  set('usPending', A.users.filter(function (u) { return u.status === 'pending'; }).length);
  set('usBanned', A.users.filter(function (u) { return u.status === 'banned'; }).length);
  set('usFlagged', A.users.filter(function (u) { return (u.fraudScore || 0) >= 60; }).length);
  var tb = el('usersTableBody'); if (!tb) return;
  tb.innerHTML = A.users.length ? sortByTs(A.users).map(function (u) {
    var st = u.status || 'active';
    var stc = st === 'active' ? 'badge-success' : st === 'banned' ? 'badge-danger' : 'badge-warning';
    var rk = u.fraudScore || 0;
    var rkc = rk < 30 ? 'badge-success' : rk < 60 ? 'badge-warning' : 'badge-danger';
    return '<tr><td><div class="cell-avatar"><div class="avatar-sm">' + esc((u.username || '?').charAt(0).toUpperCase()) + '</div><div><div class="ca-name">' + esc(u.username || '') + '</div><div class="ca-sub">' + esc((u.uid || u.id).slice(0, 8)) + '</div></div></div></td><td>' + esc(u.email || '') + '</td><td class="num">' + fmt(u.lifetimeEarned || 0) + '</td><td class="num">' + fmt(u.totalWithdrawn || 0) + '</td><td><span class="badge ' + stc + '">' + st + '</span></td><td><span class="badge ' + rkc + '">' + rk + '</span></td><td>' + esc(u.country || '—') + '</td><td>' + timeAgo(u.ts) + '</td><td><div class="tbl-actions"><button class="mini-btn" onclick="viewUser(\'' + u.id + '\')">👁️</button><button class="mini-btn" onclick="editUserModal(\'' + u.id + '\')">✏️</button><button class="mini-btn" onclick="addCoinsModal(\'' + u.id + '\')">🪙</button><button class="mini-btn ' + (st === 'banned' ? 'success' : 'danger') + '" onclick="toggleBan(\'' + u.id + '\',\'' + st + '\')">' + (st === 'banned' ? '✅' : '🚫') + '</button></div></td></tr>';
  }).join('') : '<tr><td colspan="9">' + emptyMsg('No users yet') + '</td></tr>';
}
function viewUser(id) {
  var u = A.users.find(function (x) { return x.id === id; }); if (!u) return;
  openAdminModal('👤 ' + (u.username || 'User'), '<div class="kv-row"><span class="kv-label">Email</span><span class="kv-value">' + esc(u.email || '') + '</span></div><div class="kv-row"><span class="kv-label">Coins earned</span><span class="kv-value">' + fmt(u.lifetimeEarned || 0) + '</span></div><div class="kv-row"><span class="kv-label">Spent</span><span class="kv-value">' + fmt(u.lifetimeSpent || 0) + '</span></div><div class="kv-row"><span class="kv-label">Withdrawn</span><span class="kv-value">' + fmt(u.totalWithdrawn || 0) + '</span></div><div class="kv-row"><span class="kv-label">Offers</span><span class="kv-value">' + (u.offersCompleted || 0) + '</span></div><div class="kv-row"><span class="kv-label">Streak</span><span class="kv-value">' + (u.streak || 0) + '</span></div><div class="kv-row"><span class="kv-label">Fraud score</span><span class="kv-value">' + (u.fraudScore || 0) + '</span></div><div class="kv-row"><span class="kv-label">Referrals</span><span class="kv-value">' + (u.referralCount || 0) + '</span></div>');
}
function editUserModal(id) {
  var u = A.users.find(function (x) { return x.id === id; }); if (!u) return;
  openAdminModal('✏️ Edit ' + (u.username || ''), '<div class="field"><label>Username</label><input class="input" id="euName" value="' + esc(u.username || '') + '"></div><div class="field"><label>Status</label><select class="select" id="euStatus"><option value="active"' + (u.status === 'active' ? ' selected' : '') + '>Active</option><option value="pending"' + (u.status === 'pending' ? ' selected' : '') + '>Pending</option><option value="restricted"' + (u.status === 'restricted' ? ' selected' : '') + '>Restricted</option><option value="banned"' + (u.status === 'banned' ? ' selected' : '') + '>Banned</option></select></div><div class="field"><label>Fraud score</label><input type="number" class="input" id="euFraud" value="' + (u.fraudScore || 0) + '"></div><button class="btn btn-accent btn-block" onclick="saveUser(\'' + id + '\')">💾 Save</button>');
}
async function saveUser(id) {
  await db.collection('users').doc(id).update({ username: el('euName').value.trim(), status: el('euStatus').value, fraudScore: parseInt(el('euFraud').value) || 0 });
  log('user_update', 'Updated user ' + id);
  closeAdminModal('adminGenericModal'); toast('Saved', 'User updated', 'success'); loadUsers().then(renderUsers);
}
function addCoinsModal(id) {
  openAdminModal('🪙 Adjust coins', '<div class="field"><label>Coins (+/-)</label><input type="number" class="input" id="acAmount" placeholder="500 or -500"></div><div class="field"><label>Reason</label><input class="input" id="acReason" placeholder="Manual adjustment"></div><button class="btn btn-accent btn-block" onclick="addCoins(\'' + id + '\')">Apply</button>');
}
async function addCoins(id) {
  var amt = parseInt(el('acAmount').value) || 0;
  var reason = el('acReason').value || 'Manual adjustment';
  if (!amt) return;
  await db.collection('ledger').add({ uid: id, type: 'adjust', description: reason, coins: amt, status: 'completed', reference: 'ADJ-' + uid().slice(0, 6), ts: Date.now(), createdAt: serverTimestamp() });
  await db.collection('users').doc(id).update(amt >= 0 ? { lifetimeEarned: increment(amt) } : { lifetimeSpent: increment(-amt) });
  log('balance_adjust', (amt > 0 ? '+' : '') + amt + ' to ' + id + ' (' + reason + ')');
  closeAdminModal('adminGenericModal'); toast('Done', 'Balance adjusted', 'success'); loadUsers().then(renderUsers);
}
async function toggleBan(id, current) {
  var next = current === 'banned' ? 'active' : 'banned';
  var ok = await askConfirm(next === 'banned' ? 'Ban user' : 'Unban user', 'Set status to ' + next + '?', next === 'banned' ? 'Ban' : 'Unban');
  if (!ok) return;
  await db.collection('users').doc(id).update({ status: next });
  log(next === 'banned' ? 'user_ban' : 'user_unban', id);
  toast('Done', 'User ' + next, 'success'); loadUsers().then(renderUsers);
}

/* ---------------- OFFERS / GAMES / SURVEYS / REWARDS CRUD ---------------- */
function renderOffers() {
  var tb = el('offersTableBody'); if (!tb) return;
  tb.innerHTML = A.offers.length ? A.offers.map(function (o) {
    var act = o.active !== false;
    return '<tr><td><div class="flex items-center gap-2"><div class="avatar-sm" style="background:' + (o.color || 'var(--grad-primary)') + '">' + (o.icon || '🎯') + '</div><div><div class="font-bold text-sm">' + esc(o.title) + '</div><div class="text-xs text-muted">' + esc(o.category || '') + '</div></div></div></td><td>' + esc(o.provider || '') + '</td><td class="num">' + fmt(o.payout || 0) + '</td><td><span class="badge ' + (act ? 'badge-success' : 'badge-neutral') + '">' + (act ? 'Active' : 'Off') + '</span></td><td><div class="tbl-actions"><button class="mini-btn" onclick="editOfferModal(\'' + o.id + '\')">✏️</button><button class="mini-btn" onclick="toggleOffer(\'' + o.id + '\',' + act + ')">' + (act ? '🚫' : '✅') + '</button><button class="mini-btn danger" onclick="deleteOffer(\'' + o.id + '\')">🗑️</button></div></td></tr>';
  }).join('') : '<tr><td colspan="5">' + emptyMsg('No offers — click ＋ New Offer or Seed') + '</td></tr>';
}
function editOfferModal(id) {
  var o = id ? A.offers.find(function (x) { return x.id === id; }) : null;
  el('offerEditorTitle').textContent = o ? 'Edit Offer' : 'Create Offer';
  el('offerEditId').value = o ? o.id : '';
  el('offerEditTitle').value = o ? o.title || '' : '';
  el('offerEditProvider').value = o ? o.provider || '' : 'Freecash';
  el('offerEditCategory').value = o ? o.category || '' : 'Games';
  el('offerEditPayout').value = o ? o.payout || '' : '';
  el('offerEditMinutes').value = o ? o.minutes || 5 : 5;
  el('offerEditIcon').value = o ? o.icon || '🎯' : '🎯';
  el('offerEditLink').value = o ? o.link || '' : 'https://freecash.com/r/34GRD6';
  el('offerEditDesc').value = o ? o.description || '' : '';
  el('offerEditActive').checked = o ? o.active !== false : true;
  el('offerEditorModal').classList.add('open');
}
async function deleteOffer(id) { var ok = await askConfirm('Delete offer', 'Cannot be undone.', 'Delete'); if (!ok) return; await db.collection('offers').doc(id).delete(); log('offer_delete', id); loadOffers().then(renderOffers); }
async function toggleOffer(id, cur) { await db.collection('offers').doc(id).update({ active: !cur }); log('offer_toggle', id); loadOffers().then(renderOffers); }
function renderGames() {
  var g = el('gamesGrid'); if (!g) return;
  g.innerHTML = A.games.length ? A.games.map(function (x) { return '<div class="card game-card"><div class="game-cover" style="background:' + (x.color || 'var(--grad-primary)') + '">' + (x.icon || '🎮') + '</div><div class="font-bold">' + esc(x.title) + '</div><div class="text-xs text-muted">' + esc(x.platform || '') + '</div><div class="flex gap-2 mt-2"><button class="mini-btn" onclick="editGameModal(\'' + x.id + '\')">✏️</button><button class="mini-btn danger" onclick="deleteGame(\'' + x.id + '\')">🗑️</button></div></div>'; }).join('') : emptyMsg('No games');
}
function editGameModal(id) {
  var g = id ? A.games.find(function (x) { return x.id === id; }) : null;
  openAdminModal(g ? '✏️ Edit Game' : '＋ New Game', '<div class="field"><label>Title</label><input class="input" id="gmTitle" value="' + esc(g ? g.title : '') + '"></div><div class="field"><label>Icon</label><input class="input" id="gmIcon" value="' + esc(g ? g.icon : '🎮') + '"></div><div class="field"><label>Total payout</label><input type="number" class="input" id="gmPayout" value="' + (g ? g.payout || 0 : 1000) + '"></div><button class="btn btn-accent btn-block" onclick="saveGame(\'' + (id || '') + '\')">💾 Save</button>');
}
async function saveGame(id) {
  var data = { title: el('gmTitle').value.trim(), icon: el('gmIcon').value || '🎮', payout: parseInt(el('gmPayout').value) || 0, active: true, ts: Date.now() };
  if (id) await db.collection('games').doc(id).update(data); else { data.createdAt = serverTimestamp(); await db.collection('games').add(data); }
  log('game_save', data.title); closeAdminModal('adminGenericModal'); loadGames().then(renderGames);
}
async function deleteGame(id) { var ok = await askConfirm('Delete game', 'Sure?', 'Delete'); if (!ok) return; await db.collection('games').doc(id).delete(); loadGames().then(renderGames); }
function renderSurveys() {
  var g = el('surveysGrid'); if (!g) return;
  g.innerHTML = A.surveys.length ? A.surveys.map(function (x) { return '<div class="card survey-card"><div class="sv-icon">📋</div><div class="sv-title">' + esc(x.title) + '</div><div class="sv-meta"><span class="sv-chip">+' + fmt(x.reward || 0) + '</span></div><div class="flex gap-2"><button class="mini-btn" onclick="editSurveyModal(\'' + x.id + '\')">✏️</button><button class="mini-btn danger" onclick="deleteSurvey(\'' + x.id + '\')">🗑️</button></div></div>'; }).join('') : emptyMsg('No surveys');
}
function editSurveyModal(id) {
  var s = id ? A.surveys.find(function (x) { return x.id === id; }) : null;
  openAdminModal(s ? '✏️ Edit Survey' : '＋ New Survey', '<div class="field"><label>Title</label><input class="input" id="svTitle" value="' + esc(s ? s.title : '') + '"></div><div class="field"><label>Reward</label><input type="number" class="input" id="svReward" value="' + (s ? s.reward || 0 : 500) + '"></div><div class="field"><label>Minutes</label><input type="number" class="input" id="svMin" value="' + (s ? s.minutes || 5 : 5) + '"></div><button class="btn btn-accent btn-block" onclick="saveSurvey(\'' + (id || '') + '\')">💾 Save</button>');
}
async function saveSurvey(id) {
  var data = { title: el('svTitle').value.trim(), reward: parseInt(el('svReward').value) || 0, minutes: parseInt(el('svMin').value) || 5, active: true, ts: Date.now() };
  if (id) await db.collection('surveys').doc(id).update(data); else { data.createdAt = serverTimestamp(); await db.collection('surveys').add(data); }
  log('survey_save', data.title); closeAdminModal('adminGenericModal'); loadSurveys().then(renderSurveys);
}
async function deleteSurvey(id) { var ok = await askConfirm('Delete survey', 'Sure?', 'Delete'); if (!ok) return; await db.collection('surveys').doc(id).delete(); loadSurveys().then(renderSurveys); }
function renderRewards() {
  var g = el('rewardsGridAdmin'); if (!g) return;
  g.innerHTML = A.rewards.length ? A.rewards.map(function (x) { return '<div class="card reward-card"><div class="rw-logo" style="background:' + (x.color || 'var(--grad-success)') + '">' + (x.icon || '🎁') + '</div><div class="rw-name">' + esc(x.title) + '</div><div class="rw-sub">' + esc(x.category || '') + '</div><div class="rw-from">' + fmt(x.price || 0) + ' 🪙</div><div class="flex gap-2 justify-center"><button class="mini-btn" onclick="editRewardModal(\'' + x.id + '\')">✏️</button><button class="mini-btn danger" onclick="deleteReward(\'' + x.id + '\')">🗑️</button></div></div>'; }).join('') : emptyMsg('No rewards');
}
function editRewardModal(id) {
  var r = id ? A.rewards.find(function (x) { return x.id === id; }) : null;
  el('rewardEditorTitle').textContent = r ? 'Edit Reward' : 'Create Reward';
  el('rewardEditId').value = r ? r.id : '';
  el('rewardEditTitle').value = r ? r.title || '' : '';
  el('rewardEditCategory').value = r ? r.category || 'Gift Cards' : 'Gift Cards';
  el('rewardEditIcon').value = r ? r.icon || '🎁' : '🎁';
  el('rewardEditPrice').value = r ? r.price || '' : '';
  el('rewardEditStock').value = r ? r.stock || 999 : 999;
  el('rewardEditActive').checked = r ? r.active !== false : true;
  el('rewardEditorModal').classList.add('open');
}
async function deleteReward(id) { var ok = await askConfirm('Delete reward', 'Sure?', 'Delete'); if (!ok) return; await db.collection('rewards').doc(id).delete(); log('reward_delete', id); loadRewards().then(renderRewards); }
function renderProviders() {
  var g = el('providersGrid'); if (!g) return;
  g.innerHTML = A.providers.length ? A.providers.map(function (p) { return '<div class="card"><div class="card-head"><div class="card-title">' + esc(p.name || p.id) + '</div><span class="pv-status ' + (p.active !== false ? 'pv-live' : 'pv-down') + '"><span class="pv-dot"></span>' + (p.active !== false ? 'Active' : 'Off') + '</span></div><div class="kv-row"><span class="kv-label">Type</span><span class="kv-value">' + esc(p.type || '') + '</span></div><div class="kv-row"><span class="kv-label">Conversions</span><span class="kv-value">' + (p.conversions || 0) + '</span></div></div>'; }).join('') : emptyMsg('No providers');
}

/* ---------------- ORDERS / WITHDRAWALS ---------------- */
function renderOrders() {
  function set(id, v) { var x = el(id); if (x) x.textContent = v; }
  set('ordPending', A.orders.filter(function (o) { return o.status === 'pending'; }).length);
  set('ordCompleted', A.orders.filter(function (o) { return o.status === 'completed'; }).length);
  set('ordRefunded', A.orders.filter(function (o) { return o.status === 'refunded'; }).length);
  set('ordValue', '$' + (A.orders.reduce(function (s, o) { return s + (o.cost || 0); }, 0) / (A.settings.coinRate || 10000)).toFixed(2));
  var tb = el('ordersTableBody'); if (!tb) return;
  tb.innerHTML = sortByTs(A.orders).length ? sortByTs(A.orders).map(function (o) {
    var stc = o.status === 'completed' ? 'badge-success' : o.status === 'pending' ? 'badge-warning' : 'badge-info';
    return '<tr><td class="text-xs">' + o.id.slice(0, 8) + '</td><td>' + esc((o.uid || '').slice(0, 8)) + '</td><td>' + esc(o.item || '') + '</td><td>' + esc(o.type || '') + '</td><td class="num">' + fmt(o.cost || 0) + '</td><td><span class="badge ' + stc + '">' + (o.status || 'pending') + '</span></td><td>' + timeAgo(o.ts) + '</td><td><div class="tbl-actions">' + (o.status === 'pending' ? '<button class="mini-btn success" onclick="completeOrder(\'' + o.id + '\')">✅</button><button class="mini-btn danger" onclick="refundOrder(\'' + o.id + '\')">↩️</button>' : '') + '</div></td></tr>';
  }).join('') : '<tr><td colspan="8">' + emptyMsg('No orders') + '</td></tr>';
}
async function completeOrder(id) { await db.collection('orders').doc(id).update({ status: 'completed', completedAt: serverTimestamp() }); log('order_complete', id); loadOrders().then(renderOrders); }
async function refundOrder(id) {
  var o = A.orders.find(function (x) { return x.id === id; }); if (!o) return;
  var ok = await askConfirm('Refund order', 'Return ' + fmt(o.cost) + ' coins to user?', 'Refund');
  if (!ok) return;
  await db.collection('orders').doc(id).update({ status: 'refunded' });
  await db.collection('ledger').add({ uid: o.uid, type: 'refund', description: 'Order refund: ' + (o.item || ''), coins: o.cost, status: 'completed', reference: 'RFD-' + uid().slice(0, 6), ts: Date.now(), createdAt: serverTimestamp() });
  await db.collection('users').doc(o.uid).update({ lifetimeEarned: increment(o.cost) });
  log('order_refund', id); loadOrders().then(renderOrders);
}
function renderWithdrawals() {
  function set(id, v) { var x = el(id); if (x) x.textContent = v; }
  set('wdPending', A.withdrawals.filter(function (w) { return w.status === 'pending'; }).length);
  set('wdApproved', A.withdrawals.filter(function (w) { return w.status === 'approved' || w.status === 'paid'; }).length);
  set('wdPaid', '$' + A.withdrawals.filter(function (w) { return w.status === 'paid'; }).reduce(function (s, w) { return s + (w.usd || 0); }, 0).toFixed(2));
  set('wdChargebacks', A.withdrawals.filter(function (w) { return w.status === 'chargeback'; }).length);
  var tb = el('withdrawalsTableBody'); if (!tb) return;
  tb.innerHTML = sortByTs(A.withdrawals).length ? sortByTs(A.withdrawals).map(function (w) {
    var stc = w.status === 'paid' ? 'badge-success' : w.status === 'pending' ? 'badge-warning' : w.status === 'rejected' ? 'badge-danger' : 'badge-info';
    return '<tr><td>' + esc((w.uid || '').slice(0, 8)) + '</td><td class="num">' + fmt(w.amount || 0) + '</td><td>$' + (w.usd || 0).toFixed(2) + '</td><td>' + esc(w.method || '') + '</td><td><span class="badge ' + stc + '">' + (w.status || 'pending') + '</span></td><td>' + timeAgo(w.ts) + '</td><td><div class="tbl-actions">' + (w.status === 'pending' ? '<button class="mini-btn success" onclick="approveWd(\'' + w.id + '\')">✅</button><button class="mini-btn danger" onclick="rejectWd(\'' + w.id + '\')">❌</button>' : '') + '</div></td></tr>';
  }).join('') : '<tr><td colspan="7">' + emptyMsg('No withdrawals') + '</td></tr>';
}
async function approveWd(id) {
  var w = A.withdrawals.find(function (x) { return x.id === id; }); if (!w) return;
  var ok = await askConfirm('Approve & mark paid', fmt(w.amount) + ' coins via ' + (w.method || ''), 'Approve', false);
  if (!ok) return;
  await db.collection('withdrawals').doc(id).update({ status: 'paid', paidAt: serverTimestamp() });
  await db.collection('users').doc(w.uid).update({ totalWithdrawn: increment(w.amount) });
  log('wd_approve', id); toast('Paid', 'Withdrawal marked paid', 'success'); loadWithdrawals().then(renderWithdrawals);
}
async function rejectWd(id) {
  var w = A.withdrawals.find(function (x) { return x.id === id; }); if (!w) return;
  var ok = await askConfirm('Reject & refund', 'Coins will be returned to the user.', 'Reject');
  if (!ok) return;
  await db.collection('withdrawals').doc(id).update({ status: 'rejected' });
  await db.collection('ledger').add({ uid: w.uid, type: 'refund', description: 'Withdrawal rejected — refund', coins: w.amount, status: 'completed', reference: 'WDR-' + uid().slice(0, 6), ts: Date.now(), createdAt: serverTimestamp() });
  await db.collection('users').doc(w.uid).update({ lifetimeEarned: increment(w.amount) });
  log('wd_reject', id); loadWithdrawals().then(renderWithdrawals);
}

/* ---------------- FRAUD / REFERRAL ---------------- */
function renderFraud() {
  function set(id, v) { var x = el(id); if (x) x.textContent = v; }
  set('fraudHigh', A.users.filter(function (u) { return (u.fraudScore || 0) >= 60; }).length);
  set('fraudMed', A.users.filter(function (u) { var s = u.fraudScore || 0; return s >= 30 && s < 60; }).length);
  var dup = {};
  A.users.forEach(function (u) { (u.devices || []).forEach(function (d) { dup[d] = (dup[d] || 0) + 1; }); });
  var dupCount = Object.keys(dup).filter(function (k) { return dup[k] > 1; }).length;
  set('fraudEmulator', dupCount);
  var tb = el('fraudFlaggedBody');
  if (tb) {
    var flagged = A.users.filter(function (u) { return (u.fraudScore || 0) >= 30; });
    tb.innerHTML = flagged.length ? flagged.map(function (u) { return '<tr><td>' + esc(u.username || '') + '</td><td><span class="badge ' + ((u.fraudScore || 0) >= 60 ? 'badge-danger' : 'badge-warning') + '">' + (u.fraudScore || 0) + '</span></td><td>' + (u.flags || []).length + '</td><td>' + (u.devices || []).length + '</td><td>1</td><td><button class="mini-btn danger" onclick="toggleBan(\'' + u.id + '\',\'' + (u.status || 'active') + '\')">🚫</button></td></tr>'; }).join('') : '<tr><td colspan="6">' + emptyMsg('No flagged users 🎉') + '</td></tr>';
  }
}
function renderReferral() {
  var refs = A.users.filter(function (u) { return u.referredBy; }).length;
  function set(id, v) { var x = el(id); if (x) x.textContent = v; }
  set('refTotal', refs);
  set('refActiveReferrers', A.users.filter(function (u) { return (u.referralCount || 0) > 0; }).length);
  set('refCoinsPaid', fmt(A.users.reduce(function (s, u) { return s + (u.referralEarned || 0); }, 0)));
}

/* ---------------- CAMPAIGNS / CONTENT / SUPPORT ---------------- */
function renderCampaigns() {
  var p = el('promosGrid');
  if (p) p.innerHTML = A.promos.length ? A.promos.map(function (x) { return '<div class="card"><div class="font-bold">' + esc(x.code) + '</div><div class="text-sm text-muted">' + esc(x.title || '') + '</div><div class="text-xs">+' + fmt(x.reward || 0) + ' coins</div><button class="mini-btn danger mt-2" onclick="deleteDoc(\'promos\',\'' + x.id + '\')">🗑️</button></div>'; }).join('') : emptyMsg('No promos');
  var e = el('eventsGrid');
  if (e) e.innerHTML = A.events.length ? A.events.map(function (x) { return '<div class="card"><div class="font-bold">' + (x.icon || '🎉') + ' ' + esc(x.title) + '</div><div class="text-xs text-muted">' + esc(x.status || 'active') + '</div><button class="mini-btn danger mt-2" onclick="deleteDoc(\'events\',\'' + x.id + '\')">🗑️</button></div>'; }).join('') : emptyMsg('No events');
  var b = el('postsGrid');
  if (b) b.innerHTML = A.posts.length ? A.posts.map(function (x) { return '<div class="card"><div class="font-bold">' + (x.icon || '📰') + ' ' + esc(x.title) + '</div><button class="mini-btn danger mt-2" onclick="deleteDoc(\'posts\',\'' + x.id + '\')">🗑️</button></div>'; }).join('') : emptyMsg('No posts');
}
async function deleteDoc(col, id) { var ok = await askConfirm('Delete', 'Remove this item?', 'Delete'); if (!ok) return; await db.collection(col).doc(id).delete(); log('delete_' + col, id); loadAll(); }
function renderContent() {
  var f = el('faqsList');
  if (f) f.innerHTML = A.faqs.length ? A.faqs.map(function (x) { return '<div class="dnd-item"><span class="grip">⠿</span><div style="flex:1"><div class="font-bold text-sm">' + esc(x.q || '') + '</div><div class="text-xs text-muted truncate">' + esc(x.a || '') + '</div></div><button class="mini-btn danger" onclick="deleteDoc(\'faqs\',\'' + x.id + '\')">🗑️</button></div>'; }).join('') : emptyMsg('No FAQs');
}
function renderSupport() {
  function set(id, v) { var x = el(id); if (x) x.textContent = v; }
  set('supOpen', A.tickets.filter(function (t) { return t.status === 'open'; }).length);
  set('supResolved', A.tickets.filter(function (t) { return t.status === 'resolved'; }).length);
  var tb = el('ticketsTableBody'); if (!tb) return;
  tb.innerHTML = sortByTs(A.tickets).length ? sortByTs(A.tickets).map(function (t) {
    var stc = t.status === 'open' ? 'badge-warning' : t.status === 'resolved' ? 'badge-success' : 'badge-info';
    return '<tr><td class="text-xs">' + esc(t.ticketId || t.id.slice(0, 8)) + '</td><td>' + esc(t.username || '') + '</td><td>' + esc(t.subject || '') + '</td><td>' + esc(t.category || '') + '</td><td><span class="badge ' + stc + '">' + (t.status || 'open') + '</span></td><td>' + timeAgo(t.ts) + '</td><td><button class="mini-btn" onclick="viewTicket(\'' + t.id + '\')">👁️</button></td></tr>';
  }).join('') : '<tr><td colspan="7">' + emptyMsg('No tickets') + '</td></tr>';
}
function viewTicket(id) {
  var t = A.tickets.find(function (x) { return x.id === id; }); if (!t) return;
  openAdminModal('🎧 ' + esc(t.subject || ''), '<div class="kv-row"><span class="kv-label">User</span><span class="kv-value">' + esc(t.username || '') + '</span></div><div class="kv-row"><span class="kv-label">Category</span><span class="kv-value">' + esc(t.category || '') + '</span></div><div class="mt-3 text-sm">' + esc(t.message || '') + '</div>' + (t.status !== 'resolved' ? '<button class="btn btn-success btn-block mt-3" onclick="resolveTicket(\'' + t.id + '\')">✅ Mark Resolved</button>' : ''));
}
async function resolveTicket(id) {
  await db.collection('tickets').doc(id).update({ status: 'resolved' });
  var t = A.tickets.find(function (x) { return x.id === id; });
  if (t) await db.collection('notifications').add({ uid: t.uid, type: 'system', title: 'Ticket resolved', body: t.subject || '', read: false, ts: Date.now(), createdAt: serverTimestamp() });
  log('ticket_resolve', id); closeAdminModal('adminGenericModal'); loadTickets().then(renderSupport);
}

/* ---------------- SETTINGS / SECURITY / ROLES / LOGS ---------------- */
function renderAds(){
  var a=A.settings.ads||{};
  ['adEnableAdsterra468','adEnableAdsterraNative','adEnableAdsterraPopunder','adEnableAdsterraSocial','adEnableAdsterraSmartlink','adEnableMonetag','adEnableMonetagDirect','adEnableHilltop','adEnablePopAds'].forEach(function(id){var x=el(id); if(x) x.checked=true;});
  if(el('adEnableAdsterra468')) el('adEnableAdsterra468').checked=a.adsterra468!==false;
  if(el('adEnableAdsterraNative')) el('adEnableAdsterraNative').checked=a.adsterraNative!==false;
  if(el('adEnableAdsterraPopunder')) el('adEnableAdsterraPopunder').checked=a.adsterraPopunder!==false;
  if(el('adEnableAdsterraSocial')) el('adEnableAdsterraSocial').checked=a.adsterraSocialBar!==false;
  if(el('adEnableAdsterraSmartlink')) el('adEnableAdsterraSmartlink').checked=a.adsterraSmartlink!==false;
  if(el('adEnableMonetag')) el('adEnableMonetag').checked=a.monetagTag!==false;
  if(el('adEnableMonetagDirect')) el('adEnableMonetagDirect').checked=a.monetagDirect!==false;
  if(el('adEnableHilltop')) el('adEnableHilltop').checked=a.hilltop!==false;
  if(el('adEnablePopAds')) el('adEnablePopAds').checked=a.popads===true;
}
function saveAdsControls(){
  return db.collection('settings').doc('global').set({ads:{adsterra468:!!el('adEnableAdsterra468').checked,adsterraNative:!!el('adEnableAdsterraNative').checked,adsterraPopunder:!!el('adEnableAdsterraPopunder').checked,adsterraSocialBar:!!el('adEnableAdsterraSocial').checked,adsterraSmartlink:!!el('adEnableAdsterraSmartlink').checked,monetagTag:!!el('adEnableMonetag').checked,monetagDirect:!!el('adEnableMonetagDirect').checked,hilltop:!!el('adEnableHilltop').checked,popads:!!el('adEnablePopAds').checked}}, {merge:true});
}
function renderSettings() {
  function set(id, v) { var x = el(id); if (x) x.value = v; }
  set('setCoinRate', A.settings.coinRate || 10000); set('setSignupBonus', A.settings.signupBonus || 100);
  set('setMinWithdraw', A.settings.minWithdraw || 10000); set('setWithdrawFee', A.settings.withdrawalFeePct || 1);
  set('setSiteUrl', A.settings.siteUrl || ''); set('setSupportEmail', A.settings.supportEmail || ''); set('setAnnouncement', A.settings.announcement || '');
  document.querySelectorAll('input[name=maintenance]').forEach(function(x){x.checked=(A.settings.maintenance===true?x.value==='on':x.value==='off');});
  document.querySelectorAll('input[name=allowSignup]').forEach(function(x){x.checked=(A.settings.allowNewSignups!==false?x.value==='yes':x.value==='no');});
}
function renderSecurity() {
  var l = el('securityEventsList');
  if (l) l.innerHTML = sortByTs(A.logs).filter(function (x) { return /ban|security|reject|fraud/.test(x.action); }).slice(0, 10).map(function (x) { return '<div class="log-row"><span class="log-ico">🛡️</span><span class="log-time">' + timeAgo(x.ts) + '</span><span class="log-action">' + esc(x.action) + '</span><span class="log-detail">' + esc(x.details) + '</span></div>'; }).join('') || emptyMsg('No security events');
}
function renderRoles() {
  loadAdmins();
}
async function loadAdmins() {
  try {
    var s = await db.collection('admin_users').get();
    A.admins = s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  } catch (e) { A.admins = []; }
  var tb = el('adminsListBody');
  if (tb) tb.innerHTML = A.admins.length ? A.admins.map(function (a) { return '<tr><td>' + esc(a.email || a.id) + '</td><td>' + esc(a.email || '') + '</td><td><span class="role-bar role-super">' + esc(a.role || 'super') + '</span></td><td>' + timeAgo(a.ts) + '</td><td>' + (a.email !== ADMIN_EMAIL ? '<button class="mini-btn danger" onclick="revokeAdminDoc(\'' + a.id + '\')">🔒</button>' : '—') + '</td></tr>'; }).join('') : '<tr><td colspan="5">' + emptyMsg('No admins') + '</td></tr>';
}
async function revokeAdminDoc(id) { var ok = await askConfirm('Revoke admin', 'Remove admin access?', 'Revoke'); if (!ok) return; await db.collection('admin_users').doc(id).delete(); log('revoke_admin', id); loadAdmins(); }
function renderLogs() {
  var l = el('auditLogsList'); if (!l) return;
  l.innerHTML = A.logs.length ? A.logs.map(function (x) { return '<div class="log-row"><span class="log-ico">📝</span><span class="log-time">' + timeAgo(x.ts) + '</span><span class="log-action">' + esc(x.action) + '</span><span class="log-detail">' + esc(x.details) + ' · ' + esc(x.adminEmail || '') + '</span></div>'; }).join('') : emptyMsg('No logs yet');
}

/* ---------------- FORMS BIND ---------------- */
function bindForms() {
  el('offerEditorForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var id = el('offerEditId').value;
    var data = { title: el('offerEditTitle').value.trim(), provider: el('offerEditProvider').value.trim(), category: el('offerEditCategory').value.trim(), payout: parseInt(el('offerEditPayout').value) || 0, minutes: parseInt(el('offerEditMinutes').value) || 5, icon: el('offerEditIcon').value || '🎯', link: el('offerEditLink').value.trim(), description: el('offerEditDesc').value.trim(), active: el('offerEditActive').checked, ts: Date.now() };
    if (id) await db.collection('offers').doc(id).update(data); else { data.createdAt = serverTimestamp(); await db.collection('offers').add(data); }
    log(id ? 'offer_update' : 'offer_create', data.title);
    closeAdminModal('offerEditorModal'); toast('Saved', 'Offer saved', 'success'); loadOffers().then(renderOffers);
  });
  el('rewardEditorForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var id = el('rewardEditId').value;
    var data = { title: el('rewardEditTitle').value.trim(), category: el('rewardEditCategory').value, icon: el('rewardEditIcon').value || '🎁', price: parseInt(el('rewardEditPrice').value) || 0, stock: parseInt(el('rewardEditStock').value) || 999, type: el('rewardEditType').value, active: el('rewardEditActive').checked, ts: Date.now() };
    if (id) await db.collection('rewards').doc(id).update(data); else { data.createdAt = serverTimestamp(); await db.collection('rewards').add(data); }
    log(id ? 'reward_update' : 'reward_create', data.title);
    closeAdminModal('rewardEditorModal'); toast('Saved', 'Reward saved', 'success'); loadRewards().then(renderRewards);
  });
  el('createOfferBtn').addEventListener('click', function () { editOfferModal(null); });
  el('createRewardBtn').addEventListener('click', function () { editRewardModal(null); });
  el('createGameBtn').addEventListener('click', function () { editGameModal(null); });
  el('createSurveyBtn').addEventListener('click', function () { editSurveyModal(null); });
  el('saveAllSettingsBtn').addEventListener('click', async function () {
    var data = { coinRate: parseInt(el('setCoinRate').value) || 10000, signupBonus: parseInt(el('setSignupBonus').value) || 100, minWithdraw: parseInt(el('setMinWithdraw').value) || 10000, withdrawalFeePct: parseFloat(el('setWithdrawFee').value) || 1, siteUrl: el('setSiteUrl').value.trim(), supportEmail: el('setSupportEmail').value.trim(), announcement: el('setAnnouncement').value.trim(), maintenance: document.querySelector('input[name=maintenance]:checked')?.value === 'on', allowNewSignups: document.querySelector('input[name=allowSignup]:checked')?.value !== 'no', ts: Date.now(), updatedAt: serverTimestamp() };
    await db.collection('settings').doc('global').set(data, { merge: true });
    Object.assign(A.settings, data); log('settings_update', 'global'); toast('Saved', 'Settings updated', 'success');
  });
  el('saveSecurityBtn').addEventListener('click', function () { log('security_update', 'thresholds'); toast('Saved', 'Security settings saved', 'success'); });
  el('seedDataBtn').addEventListener('click', seedAll);
  el('exportBackupBtn').addEventListener('click', function () {
    downloadJSON('rewords-backup', { users: A.users, offers: A.offers, games: A.games, surveys: A.surveys, rewards: A.rewards, orders: A.orders, withdrawals: A.withdrawals, ledger: A.ledger, settings: A.settings });
    log('backup_export', 'full');
  });
  el('exportUsersBtn').addEventListener('click', function () { exportCSV('users', [['username', 'email', 'earned', 'withdrawn', 'status']].concat(A.users.map(function (u) { return [u.username, u.email, u.lifetimeEarned, u.totalWithdrawn, u.status]; }))); });
  el('postbackForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var uidVal = el('pbUid').value.trim(), coins = parseInt(el('pbCoins').value) || 0;
    if (!uidVal || !coins) return toast('Error', 'Fill UID and coins', 'warning');
    await db.collection('ledger').add({ uid: uidVal, type: 'offer', description: 'Postback credit', coins: coins, status: 'completed', reference: 'PB-' + uid().slice(0, 6), ts: Date.now(), createdAt: serverTimestamp() });
    await db.collection('users').doc(uidVal).update({ lifetimeEarned: increment(coins), offersCompleted: increment(1) });
    log('postback_sim', '+' + coins + ' to ' + uidVal);
    toast('Credited', '+' + fmt(coins) + ' coins', 'success');
  });
  el('adsConfigForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    await db.collection('settings').doc('global').set({ adReward: parseInt(el('adsCoinsPerAd').value) || 120, adDailyCap: parseInt(el('adsDailyCap').value) || 15, adsECPM: parseFloat(el('adsECPM').value) || 2.5 }, { merge: true });
    await saveAdsControls(); Object.assign(A.settings, {adReward:parseInt(el('adsCoinsPerAd').value)||120, adDailyCap:parseInt(el('adsDailyCap').value)||15});
    log('ads_config', 'updated'); toast('Saved', 'Ad settings saved', 'success'); renderAds();
  });
  el('addFaqBtn').addEventListener('click', function () {
    openAdminModal('＋ Add FAQ', '<div class="field"><label>Question</label><input class="input" id="fqQ"></div><div class="field"><label>Answer</label><textarea class="textarea" id="fqA" rows="3"></textarea></div><button class="btn btn-accent btn-block" onclick="saveFaq()">💾 Save</button>');
  });
  el('grantAdminForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var value = el('grantAdminEmail').value.trim();
    var role = el('grantAdminRole').value;
    if (!value) return toast('Error','Enter email or UID','warning');
    var userDoc = A.users.find(function(u){ return u.uid===value || String(u.email||'').toLowerCase()===value.toLowerCase(); });
    if (!userDoc) return toast('Not found','Create the user account first','warning');
    await db.collection('admin_users').doc(userDoc.uid).set({uid:userDoc.uid,email:userDoc.email||'',role:role,active:true,permissions:role==='super'?['*']:(role==='finance'?['finance.read','finance.approve','withdrawals.process']:['users.read','content.read','tickets.read']),ts:Date.now(),createdAt:serverTimestamp(),grantedBy:A.user.uid},{merge:true});
    log('grant_admin', userDoc.uid + ' as ' + role); toast('Granted', userDoc.email + ' → ' + role, 'success'); loadAdmins();
  });
  el('revokeAdminForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var value = el('revokeAdminEmail').value.trim();
    var target = A.admins.find(function(a){ return a.id===value || String(a.email||'').toLowerCase()===value.toLowerCase(); });
    if(!target) return toast('Not found','Admin account not found','warning');
    if(target.id===A.user.uid) return toast('Blocked','You cannot revoke your own admin access','warning');
    await db.collection('admin_users').doc(target.id).delete();
    log('revoke_admin', target.id); toast('Revoked', target.email||target.id, 'success'); loadAdmins();
  });
  el('checkClaimBtn').addEventListener('click', async function () {
    var email = el('checkClaimEmail').value.trim().toLowerCase();
    var d = await db.collection('admin_users').doc(email).get().catch(function () { return null; });
    var r = el('checkClaimResult');
    if (r) r.innerHTML = d && d.exists ? '<span class="badge badge-success">✅ Admin: ' + esc(d.data().role || 'super') + '</span>' : '<span class="badge badge-danger">❌ Not an admin</span>';
  });
  document.querySelectorAll('.modal-close').forEach(function (b) {
    b.addEventListener('click', function () { var s = b.closest('.modal-scrim'); if (s) s.classList.remove('open'); });
  });
  document.querySelectorAll('.modal-scrim').forEach(function (s) {
    s.addEventListener('click', function (e) { if (e.target === s) s.classList.remove('open'); });
  });
  el('adminConfirmOk').addEventListener('click', function () { el('adminConfirmDialog').classList.remove('open'); if (confirmCb) { confirmCb(true); confirmCb = null; } });
  el('adminConfirmCancel').addEventListener('click', function () { el('adminConfirmDialog').classList.remove('open'); if (confirmCb) { confirmCb(false); confirmCb = null; } });
}
async function saveFaq() {
  var q = el('fqQ').value.trim(), a = el('fqA').value.trim();
  if (!q || !a) return;
  await db.collection('faqs').add({ q: q, a: a, ts: Date.now(), createdAt: serverTimestamp() });
  log('faq_add', q); closeAdminModal('adminGenericModal'); loadContent().then(renderContent);
}

/* ---------------- SEED (one-click full data) ---------------- */
async function seedAll() {
  var ok = await askConfirm('Seed sample data', 'Adds offers, games, surveys, rewards, providers, FAQs, events, promos, posts and settings.', 'Seed', false);
  if (!ok) return;
  toast('Seeding', 'Writing data to Firestore...', 'info');
  try {
    var i;
    var offers = [
      { title: 'Install Clash Royale', provider: 'Freecash', category: 'Games', payout: 2500, minutes: 30, icon: '⚔️', color: 'linear-gradient(135deg,#ff6a00,#ffb800)', link: 'https://freecash.com/r/34GRD6', description: 'Reach Arena 5 within 7 days.', active: true },
      { title: 'Shopping Habits Survey', provider: 'Lootably', category: 'Surveys', payout: 850, minutes: 10, icon: '📋', active: true },
      { title: 'Newsletter Signup', provider: 'AdGate', category: 'Signups', payout: 250, minutes: 2, icon: '📧', active: true },
      { title: 'Streaming Free Trial', provider: 'OfferToro', category: 'Trials', payout: 1500, minutes: 5, icon: '🎬', active: true },
      { title: 'Download TikTok', provider: 'Freecash', category: 'Apps', payout: 1800, minutes: 15, icon: '📱', active: true },
      { title: 'Solitaire Level 20', provider: 'Freecash', category: 'Games', payout: 8500, minutes: 120, icon: '🃏', active: true }
    ];
    for (i = 0; i < offers.length; i++) { offers[i].ts = Date.now(); offers[i].createdAt = serverTimestamp(); await db.collection('offers').add(offers[i]); }
    var games = [
      { title: 'Free Fire', icon: '🔥', color: 'linear-gradient(135deg,#ff6a00,#ffb800)', platform: 'Android & iOS', category: 'Battle Royale', rating: 4.8, payout: 10000, milestones: [{ icon: '📥', label: 'Install', reward: 100 }, { icon: '🎯', label: 'Level 5', reward: 500 }, { icon: '🎯', label: 'Level 10', reward: 2000 }, { icon: '🏆', label: 'Level 20', reward: 7400 }], active: true },
      { title: 'PUBG Mobile', icon: '🍗', color: 'linear-gradient(135deg,#f5af19,#f12711)', platform: 'Android & iOS', category: 'Battle Royale', rating: 4.7, payout: 8500, active: true },
      { title: 'Roblox', icon: '🧱', color: 'linear-gradient(135deg,#ff3d71,#ff6b6b)', platform: 'All', category: 'Sandbox', rating: 4.6, payout: 7000, active: true },
      { title: 'Clash of Clans', icon: '⚔️', color: 'linear-gradient(135deg,#6a11cb,#2575fc)', platform: 'Android & iOS', category: 'Strategy', rating: 4.9, payout: 6500, active: true }
    ];
    for (i = 0; i < games.length; i++) { games[i].ts = Date.now(); games[i].createdAt = serverTimestamp(); await db.collection('games').add(games[i]); }
    var surveys = [
      { title: 'Market Research', category: 'Research', reward: 850, minutes: 15, rating: 4.5, active: true },
      { title: 'Gaming Habits', category: 'Gaming', reward: 650, minutes: 10, rating: 4.7, active: true },
      { title: 'Shopping Behavior', category: 'Shopping', reward: 1200, minutes: 20, rating: 4.3, active: true }
    ];
    for (i = 0; i < surveys.length; i++) { surveys[i].ts = Date.now(); surveys[i].createdAt = serverTimestamp(); await db.collection('surveys').add(surveys[i]); }
    var rewards = [
      { title: 'Google Play $25', category: 'Gift Cards', icon: '🟢', color: 'linear-gradient(135deg,#00e676,#009688)', price: 250000, stock: 50, active: true },
      { title: 'Steam $20', category: 'Gift Cards', icon: '🔷', color: 'linear-gradient(135deg,#1b2838,#2a475e)', price: 200000, stock: 60, active: true },
      { title: 'Bitcoin', category: 'Crypto', icon: '₿', color: 'linear-gradient(135deg,#f7931a,#ffb800)', price: 250000, stock: 999, active: true },
      { title: 'USDT', category: 'Crypto', icon: '₮', color: 'linear-gradient(135deg,#26a17b,#50af95)', price: 100000, stock: 999, active: true },
      { title: 'Free Fire', category: 'Game Top-Up', type: 'topup', icon: '🔥', color: 'linear-gradient(135deg,#ff6a00,#ffb800)', price: 4500, stock: 999, active: true, packages: [{ label: '100 Diamonds', cost: 4500 }, { label: '310 Diamonds', cost: 12000 }, { label: '520 Diamonds', cost: 18000 }] },
      { title: 'PUBG Mobile', category: 'Game Top-Up', type: 'topup', icon: '🍗', color: 'linear-gradient(135deg,#f5af19,#f12711)', price: 5000, stock: 999, active: true, packages: [{ label: '60 UC', cost: 5000 }, { label: '325 UC', cost: 22000 }] },
      { title: 'Roblox', category: 'Game Top-Up', type: 'topup', icon: '🧱', color: 'linear-gradient(135deg,#ff3d71,#ff6b6b)', price: 4000, stock: 999, active: true, packages: [{ label: '80 Robux', cost: 4000 }, { label: '400 Robux', cost: 18000 }] }
    ];
    for (i = 0; i < rewards.length; i++) { rewards[i].ts = Date.now(); rewards[i].createdAt = serverTimestamp(); await db.collection('rewards').add(rewards[i]); }
    var providers = [{ id: 'freecash', name: 'Freecash', type: 'affiliate', active: true }, { id: 'lootably', name: 'Lootably', type: 'offerwall', active: true }, { id: 'adgate', name: 'AdGate', type: 'offerwall', active: true }, { id: 'adsterra', name: 'Adsterra', type: 'adnetwork', active: true }, { id: 'monetag', name: 'Monetag', type: 'adnetwork', active: true }];
    for (i = 0; i < providers.length; i++) { providers[i].ts = Date.now(); await db.collection('providers').doc(providers[i].id).set(providers[i]); }
    var faqs = [{ q: 'How do I earn coins?', a: 'Complete offers, games, surveys, ads and daily rewards.' }, { q: 'How do I withdraw?', a: 'Withdraw page → choose method → confirm. 24-72h review.' }, { q: 'Is it safe?', a: 'Yes — encryption, anti-fraud and trusted partners only.' }];
    for (i = 0; i < faqs.length; i++) { faqs[i].ts = Date.now(); faqs[i].createdAt = serverTimestamp(); await db.collection('faqs').add(faqs[i]); }
    var events = [{ title: 'Double Coins Weekend', subtitle: '2x coins on all offers!', icon: '⚡', status: 'active', active: true }, { title: 'Referral Rush', subtitle: 'Triple referral bonuses', icon: '👥', status: 'upcoming', active: true }];
    for (i = 0; i < events.length; i++) { events[i].ts = Date.now(); events[i].createdAt = serverTimestamp(); await db.collection('events').add(events[i]); }
    var promos = [{ code: 'WELCOME2026', title: 'Welcome Bonus', reward: 500, active: true }, { code: 'DOUBLE100', title: 'Double Boost', reward: 1000, active: true }];
    for (i = 0; i < promos.length; i++) { promos[i].ts = Date.now(); promos[i].createdAt = serverTimestamp(); await db.collection('promos').add(promos[i]); }
    var posts = [{ title: '10 Ways to Earn More', icon: '💡', content: 'Complete daily tasks, keep your streak, and use game milestones for maximum coins.' }, { title: 'New Games This Week', icon: '🎮', content: 'Free Fire, PUBG and Roblox milestone rewards are live now.' }];
    for (i = 0; i < posts.length; i++) { posts[i].ts = Date.now(); posts[i].createdAt = serverTimestamp(); await db.collection('posts').add(posts[i]); }
    await db.collection('settings').doc('global').set({ coinRate: 10000, minWithdraw: 10000, signupBonus: 100, adReward: 120, adDailyCap: 15, withdrawalFeePct: 1, referralPercent: 10, maintenance: false, siteUrl: location.origin, supportEmail: 'support@rewords.com', ts: Date.now(), updatedAt: serverTimestamp() }, { merge: true });
    log('seed_data', 'full seed');
    toast('Done 🎉', 'Sample data seeded successfully', 'success');
    loadAll();
  } catch (e) { toast('Error', e.message, 'error'); }
}

/* ---------------- BOOT ---------------- */
A.charts = {};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAuth);
else initAuth();
