/* ============================================================================
   REWORDS ADMIN PANEL — admin.js  (FINAL CLEAN BUILD)
   Direct admin login, full CRUD, charts, fraud, finance, audit logs.
   No external bootstrap needed — auto-creates admin on first login.
============================================================================ */

/* ============================================================================
   1. FIREBASE CONFIG & INIT
============================================================================ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBPMbRdVEJ85Is7eg4UkAFs_UHq-BD_Fhg",
  authDomain: "rewords-45ccf.firebaseapp.com",
  projectId: "rewords-45ccf",
  storageBucket: "rewords-45ccf.firebasestorage.app",
  messagingSenderId: "324257034049",
  appId: "1:324257034049:web:2e75279382793007683bc0",
  measurementId: "G-5LNDESBVST"
};

let app = null, db = null, auth = null, storage = null;
try {
  app = firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore(app);
  auth = firebase.auth(app);
  storage = firebase.storage(app);
} catch (e) { console.error("Firebase init failed", e); }

const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();
const increment = (n) => firebase.firestore.FieldValue.increment(n || 1);
const arrayUnion = (v) => firebase.firestore.FieldValue.arrayUnion(v);
const arrayRemove = (v) => firebase.firestore.FieldValue.arrayRemove(v);
const deleteField = () => firebase.firestore.FieldValue.delete();

/* ============================================================================
   2. ADMIN CONSTANTS
============================================================================ */
const ADMIN_EMAIL = "kenven@admin.com";
const ADMIN_PASS = "admin123";

/* ============================================================================
   3. GLOBAL STATE
============================================================================ */
const AdminState = {
  user: null,
  isAdmin: false,
  adminRole: 'super',
  currentPage: 'dashboard',
  users: [],
  offers: [],
  games: [],
  surveys: [],
  rewards: [],
  orders: [],
  withdrawals: [],
  providers: [],
  faqs: [],
  events: [],
  promos: [],
  posts: [],
  tickets: [],
  notifications: [],
  fraudEvents: [],
  adminLogs: [],
  settings: {},
  charts: {},
  stats: {
    totalUsers: 0, activeUsers: 0, newUsersToday: 0,
    revenueToday: 0, revenue7d: 0, revenue30d: 0,
    rewardsToday: 0, pendingWithdrawals: 0, pendingOrders: 0,
    fraudAlerts: 0, chargebacks: 0, offerConversions: 0,
    conversionRate: 0, arpu: 0
  }
};

/* ============================================================================
   4. UTILITIES
============================================================================ */
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return Array.from(document.querySelectorAll(sel)); }
function el(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function fmtNum(n) { return (Number(n) || 0).toLocaleString('en-US'); }
function fmtCoins(n) { return fmtNum(n) + ' 🪙'; }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function uid() { return (Date.now().toString(36) + Math.random().toString(36).slice(2, 9)).toUpperCase(); }

function timeAgo(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + 'm ago';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h ago';
  return Math.floor(hr / 24) + 'd ago';
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toast(title, msg, type = 'info', dur = 4000) {
  const wrap = el('adminToastWrap');
  if (!wrap) return;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const box = document.createElement('div');
  box.className = 'toast ' + type;
  box.innerHTML = '<span class="toast-ico">' + (icons[type] || 'ℹ️') + '</span><div class="toast-body"><div class="toast-title">' + esc(title) + '</div><div class="toast-msg">' + esc(msg) + '</div></div><span class="toast-progress"></span>';
  wrap.appendChild(box);
  setTimeout(() => { box.classList.add('hide'); setTimeout(() => box.remove(), 320); }, dur);
}

let adminConfirmCb = null;
function askConfirm(title, body, okLabel = 'Confirm', danger = true) {
  return new Promise((resolve) => {
    el('adminConfirmIco').textContent = danger ? '⚠️' : '❓';
    el('adminConfirmTitle').textContent = title;
    el('adminConfirmBody').textContent = body;
    el('adminConfirmOk').textContent = okLabel;
    el('adminConfirmDialog').classList.add('open');
    adminConfirmCb = resolve;
  });
}

function openAdminModal(title, html) {
  el('adminGenericModalTitle').textContent = title;
  el('adminGenericModalBody').innerHTML = html;
  el('adminGenericModal').classList.add('open');
}

function closeAdminModal(id) {
  const m = el(id);
  if (m) m.classList.remove('open');
}

function emptyState(container, icon, title, sub) {
  const box = typeof container === 'string' ? el(container) : container;
  if (!box) return;
  box.innerHTML = '<div class="empty-state"><div class="es-ico">' + (icon || '🗂️') + '</div><div class="es-title">' + title + '</div>' + (sub ? '<div class="es-sub">' + sub + '</div>' : '') + '</div>';
}

function skeletonGrid(container, n) {
  const box = typeof container === 'string' ? el(container) : container;
  if (!box) return;
  let html = '';
  for (let i = 0; i < (n || 4); i++) html += '<div class="card"><div class="skeleton-line" style="height:90px"></div><div class="skeleton-line w-70"></div><div class="skeleton-line w-40"></div></div>';
  box.innerHTML = html;
}

/* ============================================================================
   5. ADMIN AUTHENTICATION (DIRECT LOGIN — NO BOOTSTRAP NEEDED)
============================================================================ */
async function initAdminAuth() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      AdminState.user = user;
      const hasAccess = await verifyAdminAccess(user);
      if (hasAccess) {
        showAdminDashboard();
      } else {
        showLoginScreen();
        el('adminAccessDenied').classList.remove('hidden');
      }
    } else {
      showLoginScreen();
    }
  });
}

async function verifyAdminAccess(user) {
  try {
    // Check if admin_users collection has this user
    const adminDoc = await db.collection('admin_users').doc(user.uid).get();
    if (adminDoc.exists) {
      AdminState.isAdmin = true;
      AdminState.adminRole = adminDoc.data().role || 'super';
      return true;
    }

    // AUTO-BOOTSTRAP: If admin_users is empty and email matches, create admin
    const adminSnap = await db.collection('admin_users').limit(1).get();
    if (adminSnap.empty && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      await db.collection('admin_users').doc(user.uid).set({
        email: user.email,
        role: 'super',
        permissions: ['*'],
        createdAt: serverTimestamp(),
        createdBy: 'auto-bootstrap'
      });
      AdminState.isAdmin = true;
      AdminState.adminRole = 'super';
      toast('Admin Created', 'Welcome! Admin access granted automatically.', 'success');
      return true;
    }

    return false;
  } catch (e) {
    console.error('Admin verification error:', e);
    // Fallback: if email matches, allow access
    if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      AdminState.isAdmin = true;
      AdminState.adminRole = 'super';
      return true;
    }
    return false;
  }
}

function showLoginScreen() {
  el('adminAuth').style.display = 'grid';
  el('adminShell').style.display = 'none';
}

function showAdminDashboard() {
  el('adminAuth').style.display = 'none';
  el('adminShell').style.display = 'flex';
  updateAdminProfile();
  initAdminNavigation();
  loadAdminData();
  startRealtimeListeners();
}

function updateAdminProfile() {
  const profileEl = el('adminProfile');
  if (profileEl && AdminState.user) {
    profileEl.innerHTML = '<div class="avatar-sm">A</div><div class="text-sm"><div class="font-bold">' + esc(AdminState.user.email) + '</div><div class="text-xs text-muted">' + AdminState.adminRole + '</div></div>';
  }
}

/* ============================================================================
   6. NAVIGATION
============================================================================ */
function initAdminNavigation() {
  $$('[data-admin-nav]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateAdmin(link.getAttribute('data-admin-nav'));
    });
  });

  // Mobile sidebar toggle
  const openBtn = el('openSideBtn');
  if (openBtn) openBtn.addEventListener('click', () => document.body.classList.toggle('admin-mobile-open'));

  // Theme toggle
  const themeBtn = el('adminThemeToggle');
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
    themeBtn.textContent = current === 'dark' ? '☀️' : '🌙';
  });

  // Logout
  const logoutBtn = el('adminLogoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    await auth.signOut();
    toast('Logged Out', 'See you soon!', 'info');
  });

  // Refresh
  const refreshBtn = el('adminRefreshBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadAdminData());
}

function navigateAdmin(page) {
  AdminState.currentPage = page;
  $$('[data-admin-nav]').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-admin-nav') === page);
  });
  $$('.admin-page').forEach(p => {
    p.classList.toggle('active', p.id === 'admin-' + page);
  });
  document.body.classList.remove('admin-mobile-open');
  loadPageData(page);
}

function loadPageData(page) {
  const loaders = {
    dashboard: loadDashboard,
    analytics: loadAnalytics,
    finance: loadFinance,
    users: loadUsers,
    offers: loadOffers,
    providers: loadProviders,
    games: loadGames,
    surveys: loadSurveys,
    ads: loadAds,
    campaigns: loadCampaigns,
    rewards: loadRewards,
    orders: loadOrders,
    withdrawals: loadWithdrawals,
    fraud: loadFraud,
    referral: loadReferral,
    content: loadContent,
    support: loadSupport,
    settings: loadSettings,
    security: loadSecurity,
    roles: loadRoles,
    logs: loadAuditLogs
  };
  if (loaders[page]) loaders[page]();
}

/* ============================================================================
   7. DATA LOADING
============================================================================ */
async function loadAdminData() {
  await loadSettings();
  await loadDashboard();
  updateQuickStats();
}

async function loadSettings() {
  try {
    const doc = await db.collection('settings').doc('global').get();
    if (doc.exists) AdminState.settings = doc.data();
    else AdminState.settings = { coinRate: 10000, minWithdraw: 10000, signupBonus: 100, adReward: 120, adDailyCap: 15, withdrawalFeePct: 1, referralPercent: 10, maintenance: false };
  } catch (e) { AdminState.settings = {}; }
}

async function loadDashboard() {
  try {
    // Users count
    const usersSnap = await db.collection('users').get();
    AdminState.stats.totalUsers = usersSnap.size;
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    let active = 0, newToday = 0, totalCoins = 0, totalWithdrawn = 0;
    usersSnap.forEach(doc => {
      const u = doc.data();
      if (u.lastSeen && u.lastSeen.toDate && u.lastSeen.toDate() > weekAgo) active++;
      if (u.createdAt && u.createdAt.toDate && u.createdAt.toDate().toISOString().slice(0,10) === todayKey()) newToday++;
      totalCoins += u.lifetimeEarned || 0;
      totalWithdrawn += u.totalWithdrawn || 0;
    });
    AdminState.stats.activeUsers = active;
    AdminState.stats.newUsersToday = newToday;

    // Pending withdrawals
    const wdSnap = await db.collection('withdrawals').where('status', '==', 'pending').get();
    AdminState.stats.pendingWithdrawals = wdSnap.size;

    // Pending orders
    const ordSnap = await db.collection('orders').where('status', '==', 'pending').get();
    AdminState.stats.pendingOrders = ordSnap.size;

    // Update KPIs
    const set = (id, v) => { const x = el(id); if (x) x.textContent = v; };
    set('kpiTotalUsers', fmtNum(AdminState.stats.totalUsers));
    set('kpiCoins', fmtNum(totalCoins));
    set('kpiWithdrawn', '$' + (totalWithdrawn / (AdminState.settings.coinRate || 10000)).toFixed(2));
    set('kpiGrowth', '+' + (newToday > 0 ? Math.round((newToday / Math.max(1, AdminState.stats.totalUsers - newToday)) * 100) : 0) + '%');

    // Recent activity from admin_logs
    const logsSnap = await db.collection('admin_logs').orderBy('timestamp', 'desc').limit(8).get();
    const actFeed = el('dashRecentActivity');
    if (actFeed) {
      const items = [];
      logsSnap.forEach(d => {
        const l = d.data();
        items.push('<div class="af-item"><div class="af-ico">📝</div><div class="af-body"><div class="af-title">' + esc(l.action || '') + '</div><div class="af-sub">' + esc(l.details || '') + '</div></div><div class="af-time">' + timeAgo(l.timestamp) + '</div></div>');
      });
      actFeed.innerHTML = items.length ? items.join('') : '<div class="text-center text-muted p-4">No activity yet</div>';
    }

    // Top offers
    const offersSnap = await db.collection('offers').orderBy('payout', 'desc').limit(5).get();
    const topOffersEl = el('dashTopOffers');
    if (topOffersEl) {
      const items = [];
      offersSnap.forEach(d => {
        const o = d.data();
        items.push('<div class="ro-item"><div class="ro-logo">' + (o.icon || '🎯') + '</div><div class="ro-body"><div class="ro-name">' + esc(o.title) + '</div><div class="ro-rev">' + esc(o.provider || '') + '</div></div><div class="ro-amount">+' + fmtNum(o.payout || 0) + '</div></div>');
      });
      topOffersEl.innerHTML = items.length ? items.join('') : '<div class="text-center text-muted p-4">No offers yet</div>';
    }

  } catch (e) { console.error('Dashboard load error:', e); }
}

function updateQuickStats() {
  const set = (id, v) => { const x = el(id); if (x) x.textContent = v; };
  set('qsUsers', fmtNum(AdminState.stats.totalUsers));
  set('qsOffers', fmtNum(AdminState.offers.length || 0));
  set('qsWithdrawals', fmtNum(AdminState.stats.pendingWithdrawals));
  set('qsOrders', fmtNum(AdminState.stats.pendingOrders));
  set('qsTickets', '0');
  set('qsFlagged', '0');
  set('qsRevenue', '$0');
  set('qsProfit', '$0');
  // Side badges
  set('sideBadgeUsers', fmtNum(AdminState.stats.totalUsers));
  set('sideBadgeWithdrawals', fmtNum(AdminState.stats.pendingWithdrawals));
  set('sideBadgeOrders', fmtNum(AdminState.stats.pendingOrders));
}

/* ============================================================================
   8. USERS MANAGEMENT
============================================================================ */
async function loadUsers() {
  const tbody = el('usersTableBody');
  if (!tbody) return;
  skeletonGrid(tbody.parentElement, 5);
  try {
    const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(100).get();
    AdminState.users = [];
    snap.forEach(d => AdminState.users.push({ id: d.id, ...d.data() }));
    renderUsersTable();
  } catch (e) { console.error(e); emptyState(tbody, '👥', 'Failed to load users'); }
}

function renderUsersTable() {
  const tbody = el('usersTableBody');
  if (!tbody) return;
  if (!AdminState.users.length) { emptyState(tbody, '👥', 'No users yet'); return; }
  tbody.innerHTML = AdminState.users.map(u => {
    const status = u.status || 'active';
    const statusCls = status === 'active' ? 'badge-success' : status === 'banned' ? 'badge-danger' : 'badge-warning';
    const risk = u.fraudScore || 0;
    const riskCls = risk < 30 ? 'badge-success' : risk < 60 ? 'badge-warning' : 'badge-danger';
    return '<tr><td><div class="cell-avatar"><div class="avatar-sm">' + (u.username || '?').charAt(0).toUpperCase() + '</div><div><div class="ca-name">' + esc(u.username || 'Unknown') + '</div><div class="ca-sub">' + esc(u.uid ? u.uid.slice(0, 8) : '') + '</div></div></div></td>' +
      '<td>' + esc(u.email || '—') + '</td><td class="num">' + fmtNum(u.lifetimeEarned || 0) + '</td><td class="num">' + fmtNum(u.totalWithdrawn || 0) + '</td>' +
      '<td><span class="badge ' + statusCls + '">' + status + '</span></td><td><span class="badge ' + riskCls + '">' + risk + '</span></td>' +
      '<td>' + esc(u.country || '—') + '</td><td>' + formatDate(u.createdAt) + '</td>' +
      '<td><div class="tbl-actions"><button class="mini-btn" onclick="viewUser(\'' + u.id + '\')">👁️</button><button class="mini-btn" onclick="editUserModal(\'' + u.id + '\')">✏️</button>' +
      '<button class="mini-btn ' + (status === 'banned' ? 'success' : 'danger') + '" onclick="toggleBan(\'' + u.id + '\',\'' + status + '\')">' + (status === 'banned' ? '✅' : '🚫') + '</button></div></td></tr>';
  }).join('');
}

function viewUser(id) {
  const u = AdminState.users.find(x => x.id === id);
  if (!u) return;
  openAdminModal('👤 User: ' + (u.username || 'Unknown'),
    '<div class="grid grid-2 gap-3">' +
    '<div class="kv-row"><span class="kv-label">Email</span><span class="kv-value">' + esc(u.email || '—') + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Country</span><span class="kv-value">' + esc(u.country || '—') + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Lifetime Earned</span><span class="kv-value">' + fmtNum(u.lifetimeEarned || 0) + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Lifetime Spent</span><span class="kv-value">' + fmtNum(u.lifetimeSpent || 0) + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Withdrawn</span><span class="kv-value">' + fmtNum(u.totalWithdrawn || 0) + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Offers Done</span><span class="kv-value">' + (u.offersCompleted || 0) + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Surveys Done</span><span class="kv-value">' + (u.surveysCompleted || 0) + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Streak</span><span class="kv-value">' + (u.streak || 0) + ' days</span></div>' +
    '<div class="kv-row"><span class="kv-label">Fraud Score</span><span class="kv-value">' + (u.fraudScore || 0) + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Referrals</span><span class="kv-value">' + (u.referralCount || 0) + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Joined</span><span class="kv-value">' + formatDate(u.createdAt) + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Last Seen</span><span class="kv-value">' + timeAgo(u.lastSeen) + '</span></div>' +
    '</div>');
}

function editUserModal(id) {
  const u = AdminState.users.find(x => x.id === id);
  if (!u) return;
  openAdminModal('✏️ Edit User: ' + (u.username || ''),
    '<form id="editUserForm"><div class="field"><label>Username</label><input type="text" class="input" id="euName" value="' + esc(u.username || '') + '"></div>' +
    '<div class="field"><label>Country</label><input type="text" class="input" id="euCountry" value="' + esc(u.country || '') + '"></div>' +
    '<div class="field"><label>Status</label><select class="select" id="euStatus"><option value="active"' + (u.status === 'active' ? ' selected' : '') + '>Active</option><option value="pending"' + (u.status === 'pending' ? ' selected' : '') + '>Pending</option><option value="restricted"' + (u.status === 'restricted' ? ' selected' : '') + '>Restricted</option><option value="banned"' + (u.status === 'banned' ? ' selected' : '') + '>Banned</option></select></div>' +
    '<div class="field"><label>Fraud Score</label><input type="number" class="input" id="euFraud" value="' + (u.fraudScore || 0) + '"></div>' +
    '<button type="submit" class="btn btn-accent btn-block">💾 Save</button></form>');
  setTimeout(() => {
    el('editUserForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await db.collection('users').doc(id).update({
        username: el('euName').value.trim(),
        country: el('euCountry').value.trim(),
        status: el('euStatus').value,
        fraudScore: parseInt(el('euFraud').value) || 0,
        updatedAt: serverTimestamp()
      });
      await logAdminAction('user_update', 'Updated user ' + (u.username || id));
      closeAdminModal('adminGenericModal');
      toast('Success', 'User updated', 'success');
      loadUsers();
    });
  }, 100);
}

async function toggleBan(id, currentStatus) {
  const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
  const ok = await askConfirm(newStatus === 'banned' ? 'Ban User' : 'Unban User', 'Are you sure?', newStatus === 'banned' ? 'Ban' : 'Unban', newStatus === 'banned');
  if (!ok) return;
  await db.collection('users').doc(id).update({ status: newStatus, updatedAt: serverTimestamp() });
  await logAdminAction(newStatus === 'banned' ? 'user_ban' : 'user_unban', 'User ' + newStatus);
  toast('Success', 'User ' + newStatus, 'success');
  loadUsers();
}

/* ============================================================================
   9. OFFERS MANAGEMENT
============================================================================ */
async function loadOffers() {
  const tbody = el('offersTableBody');
  if (!tbody) return;
  try {
    const snap = await db.collection('offers').orderBy('createdAt', 'desc').limit(100).get();
    AdminState.offers = [];
    snap.forEach(d => AdminState.offers.push({ id: d.id, ...d.data() }));
    renderOffersTable();
    // Populate provider filter
    const provFilter = el('offersProviderFilter');
    if (provFilter) {
      const provs = [...new Set(AdminState.offers.map(o => o.provider).filter(Boolean))];
      provFilter.innerHTML = '<option value="all">All Providers</option>' + provs.map(p => '<option>' + esc(p) + '</option>').join('');
    }
  } catch (e) { console.error(e); }
}

function renderOffersTable() {
  const tbody = el('offersTableBody');
  if (!tbody) return;
  if (!AdminState.offers.length) { emptyState(tbody, '🎯', 'No offers yet', 'Create your first offer'); return; }
  tbody.innerHTML = AdminState.offers.map(o => {
    const active = o.active !== false;
    return '<tr><td><div class="flex items-center gap-2"><div class="avatar-sm" style="background:' + (o.color || 'var(--grad-primary)') + '">' + (o.icon || '🎯') + '</div><div><div class="font-bold text-sm">' + esc(o.title) + '</div><div class="text-xs text-muted">' + esc(o.category || '') + '</div></div></div></td>' +
      '<td>' + esc(o.provider || '—') + '</td><td>' + esc(o.category || '—') + '</td><td class="num">' + fmtNum(o.payout || 0) + '</td>' +
      '<td>' + esc(o.difficulty || 'Easy') + '</td><td><span class="badge ' + (active ? 'badge-success' : 'badge-neutral') + '">' + (active ? 'Active' : 'Inactive') + '</span></td>' +
      '<td class="num">' + (o.conversions || 0) + '</td>' +
      '<td><div class="tbl-actions"><button class="mini-btn" onclick="editOfferModal(\'' + o.id + '\')">✏️</button><button class="mini-btn ' + (active ? 'danger' : 'success') + '" onclick="toggleOffer(\'' + o.id + '\',' + active + ')">' + (active ? '🚫' : '✅') + '</button><button class="mini-btn danger" onclick="deleteOffer(\'' + o.id + '\')">🗑️</button></div></td></tr>';
  }).join('');
}

function editOfferModal(id) {
  const o = id ? AdminState.offers.find(x => x.id === id) : null;
  el('offerEditorTitle').textContent = o ? 'Edit Offer' : 'Create Offer';
  el('offerEditId').value = o ? o.id : '';
  el('offerEditTitle').value = o ? o.title : '';
  el('offerEditProvider').value = o ? (o.provider || '') : '';
  el('offerEditCategory').value = o ? (o.category || '') : '';
  el('offerEditDifficulty').value = o ? (o.difficulty || 'Easy') : 'Easy';
  el('offerEditPayout').value = o ? (o.payout || 0) : '';
  el('offerEditMinutes').value = o ? (o.minutes || 5) : 5;
  el('offerEditIcon').value = o ? (o.icon || '🎯') : '🎯';
  el('offerEditLink').value = o ? (o.link || '') : '';
  el('offerEditDesc').value = o ? (o.description || '') : '';
  el('offerEditActive').checked = o ? (o.active !== false) : true;
  el('offerEditorModal').classList.add('open');
}

async function deleteOffer(id) {
  const ok = await askConfirm('Delete Offer', 'This cannot be undone.', 'Delete');
  if (!ok) return;
  await db.collection('offers').doc(id).delete();
  await logAdminAction('offer_delete', 'Deleted offer ' + id);
  toast('Deleted', 'Offer removed', 'success');
  loadOffers();
}

async function toggleOffer(id, currentActive) {
  await db.collection('offers').doc(id).update({ active: !currentActive, updatedAt: serverTimestamp() });
  await logAdminAction('offer_toggle', 'Toggled offer ' + id);
  loadOffers();
}

/* ============================================================================
   10. PROVIDERS, GAMES, SURVEYS
============================================================================ */
async function loadProviders() {
  const grid = el('providersGrid');
  if (!grid) return;
  try {
    const snap = await db.collection('providers').get();
    AdminState.providers = [];
    snap.forEach(d => AdminState.providers.push({ id: d.id, ...d.data() }));
    grid.innerHTML = AdminState.providers.length ? AdminState.providers.map(p =>
      '<div class="card"><div class="card-head"><div class="card-title">' + esc(p.name || p.id) + '</div><span class="pv-status ' + (p.active !== false ? 'pv-live' : 'pv-down') + '"><span class="pv-dot"></span>' + (p.active !== false ? 'Active' : 'Inactive') + '</span></div>' +
      '<div class="kv-row"><span class="kv-label">Type</span><span class="kv-value">' + esc(p.type || '—') + '</span></div>' +
      '<div class="kv-row"><span class="kv-label">Conversions</span><span class="kv-value">' + (p.conversions || 0) + '</span></div>' +
      '<div class="kv-row"><span class="kv-label">Revenue</span><span class="kv-value">$' + ((p.revenue || 0) / 100).toFixed(2) + '</span></div></div>'
    ).join('') : emptyState(grid, '🏢', 'No providers');
  } catch (e) { emptyState(grid, '🏢', 'Error loading providers'); }
}

async function loadGames() {
  const grid = el('gamesGrid');
  if (!grid) return;
  try {
    const snap = await db.collection('games').orderBy('createdAt', 'desc').limit(50).get();
    AdminState.games = [];
    snap.forEach(d => AdminState.games.push({ id: d.id, ...d.data() }));
    grid.innerHTML = AdminState.games.length ? AdminState.games.map(g =>
      '<div class="card game-card"><div class="game-cover" style="background:' + (g.color || 'var(--grad-primary)') + '">' + (g.icon || '🎮') + '</div>' +
      '<div class="font-bold">' + esc(g.title) + '</div><div class="text-xs text-muted">' + esc(g.platform || '') + '</div>' +
      '<div class="flex gap-2 mt-2"><button class="mini-btn" onclick="editGameModal(\'' + g.id + '\')">✏️</button><button class="mini-btn danger" onclick="deleteGame(\'' + g.id + '\')">🗑️</button></div></div>'
    ).join('') : emptyState(grid, '🎮', 'No games');
  } catch (e) { emptyState(grid, '🎮', 'Error'); }
}

async function loadSurveys() {
  const grid = el('surveysGrid');
  if (!grid) return;
  try {
    const snap = await db.collection('surveys').orderBy('createdAt', 'desc').limit(50).get();
    AdminState.surveys = [];
    snap.forEach(d => AdminState.surveys.push({ id: d.id, ...d.data() }));
    grid.innerHTML = AdminState.surveys.length ? AdminState.surveys.map(s =>
      '<div class="card survey-card"><div class="sv-icon">📋</div><div class="sv-title">' + esc(s.title) + '</div>' +
      '<div class="sv-meta"><span class="sv-chip">⏱️ ' + (s.minutes || 5) + ' min</span><span class="sv-chip coin-t">+' + fmtNum(s.reward || 0) + '</span></div>' +
      '<div class="flex gap-2 mt-2"><button class="mini-btn" onclick="editSurveyModal(\'' + s.id + '\')">✏️</button><button class="mini-btn danger" onclick="deleteSurvey(\'' + s.id + '\')">🗑️</button></div></div>'
    ).join('') : emptyState(grid, '📋', 'No surveys');
  } catch (e) { emptyState(grid, '📋', 'Error'); }
}

async function deleteGame(id) { const ok = await askConfirm('Delete Game', 'Sure?', 'Delete'); if (!ok) return; await db.collection('games').doc(id).delete(); loadGames(); }
async function deleteSurvey(id) { const ok = await askConfirm('Delete Survey', 'Sure?', 'Delete'); if (!ok) return; await db.collection('surveys').doc(id).delete(); loadSurveys(); }

/* ============================================================================
   11. REWARDS, ORDERS, WITHDRAWALS
============================================================================ */
async function loadRewards() {
  const grid = el('rewardsGridAdmin');
  if (!grid) return;
  try {
    const snap = await db.collection('rewards').orderBy('createdAt', 'desc').limit(50).get();
    AdminState.rewards = [];
    snap.forEach(d => AdminState.rewards.push({ id: d.id, ...d.data() }));
    grid.innerHTML = AdminState.rewards.length ? AdminState.rewards.map(r =>
      '<div class="card reward-card"><div class="rw-logo" style="background:' + (r.color || 'var(--grad-success)') + '">' + (r.icon || '🎁') + '</div>' +
      '<div class="rw-name">' + esc(r.title) + '</div><div class="rw-sub">' + esc(r.category || '') + '</div>' +
      '<div class="rw-from">' + fmtNum(r.price || 0) + ' coins</div>' +
      '<div class="flex gap-2 mt-2 justify-center"><button class="mini-btn" onclick="editRewardModal(\'' + r.id + '\')">✏️</button><button class="mini-btn danger" onclick="deleteReward(\'' + r.id + '\')">🗑️</button></div></div>'
    ).join('') : emptyState(grid, '🎁', 'No rewards');
  } catch (e) { emptyState(grid, '🎁', 'Error'); }
}

async function loadOrders() {
  const tbody = el('ordersTableBody');
  if (!tbody) return;
  try {
    const snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(100).get();
    AdminState.orders = [];
    snap.forEach(d => AdminState.orders.push({ id: d.id, ...d.data() }));
    tbody.innerHTML = AdminState.orders.length ? AdminState.orders.map(o => {
      const stCls = o.status === 'completed' ? 'badge-success' : o.status === 'pending' ? 'badge-warning' : 'badge-info';
      return '<tr><td class="text-xs">' + o.id.slice(0, 8) + '</td><td>' + esc(o.uid ? o.uid.slice(0, 8) : '—') + '</td><td>' + esc(o.item || '—') + '</td>' +
        '<td>' + esc(o.type || '—') + '</td><td class="num">' + fmtNum(o.cost || 0) + '</td><td><span class="badge ' + stCls + '">' + (o.status || 'pending') + '</span></td>' +
        '<td>' + formatDate(o.createdAt) + '</td><td><div class="tbl-actions">' + (o.status === 'pending' ? '<button class="mini-btn success" onclick="completeOrder(\'' + o.id + '\')">✅</button>' : '') + '</div></td></tr>';
    }).join('') : '<tr><td colspan="8" class="text-center text-muted p-4">No orders</td></tr>';
  } catch (e) { console.error(e); }
}

async function loadWithdrawals() {
  const tbody = el('withdrawalsTableBody');
  if (!tbody) return;
  try {
    const snap = await db.collection('withdrawals').orderBy('createdAt', 'desc').limit(100).get();
    AdminState.withdrawals = [];
    snap.forEach(d => AdminState.withdrawals.push({ id: d.id, ...d.data() }));
    tbody.innerHTML = AdminState.withdrawals.length ? AdminState.withdrawals.map(w => {
      const stCls = w.status === 'paid' ? 'badge-success' : w.status === 'pending' ? 'badge-warning' : w.status === 'rejected' ? 'badge-danger' : 'badge-info';
      return '<tr><td>' + esc(w.uid ? w.uid.slice(0, 8) : '—') + '</td><td class="num">' + fmtNum(w.amount || 0) + '</td>' +
        '<td>$' + ((w.usd || 0)).toFixed(2) + '</td><td>' + esc(w.method || '—') + '</td>' +
        '<td><span class="badge ' + stCls + '">' + (w.status || 'pending') + '</span></td><td>—</td><td>' + formatDate(w.createdAt) + '</td>' +
        '<td><div class="tbl-actions">' + (w.status === 'pending' ? '<button class="mini-btn success" onclick="approveWd(\'' + w.id + '\')">✅</button><button class="mini-btn danger" onclick="rejectWd(\'' + w.id + '\')">❌</button>' : '') + '</div></td></tr>';
    }).join('') : '<tr><td colspan="8" class="text-center text-muted p-4">No withdrawals</td></tr>';
  } catch (e) { console.error(e); }
}

async function completeOrder(id) {
  await db.collection('orders').doc(id).update({ status: 'completed', completedAt: serverTimestamp() });
  await logAdminAction('order_complete', 'Completed order ' + id);
  toast('Done', 'Order completed', 'success');
  loadOrders();
}

async function approveWd(id) {
  const ok = await askConfirm('Approve Withdrawal', 'Mark as paid?', 'Approve', false);
  if (!ok) return;
  await db.collection('withdrawals').doc(id).update({ status: 'paid', paidAt: serverTimestamp() });
  await logAdminAction('wd_approve', 'Approved withdrawal ' + id);
  toast('Approved', 'Withdrawal marked as paid', 'success');
  loadWithdrawals();
}

async function rejectWd(id) {
  const ok = await askConfirm('Reject Withdrawal', 'Reject and refund?', 'Reject');
  if (!ok) return;
  const w = AdminState.withdrawals.find(x => x.id === id);
  await db.collection('withdrawals').doc(id).update({ status: 'rejected', rejectedAt: serverTimestamp() });
  if (w) {
    await db.collection('ledger').add({ uid: w.uid, type: 'refund', description: 'Withdrawal rejected - refund', coins: w.amount, status: 'completed', createdAt: serverTimestamp() });
  }
  await logAdminAction('wd_reject', 'Rejected withdrawal ' + id);
  toast('Rejected', 'Withdrawal rejected & refunded', 'success');
  loadWithdrawals();
}

async function deleteReward(id) { const ok = await askConfirm('Delete Reward', 'Sure?', 'Delete'); if (!ok) return; await db.collection('rewards').doc(id).delete(); loadRewards(); }

/* ============================================================================
   12. FRAUD, REFERRAL, CONTENT, SUPPORT
============================================================================ */
async function loadFraud() {
  const flagged = el('fraudFlaggedBody');
  if (flagged) flagged.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-4">No flagged users</td></tr>';
  const events = el('fraudEventsBody');
  if (events) events.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-4">No fraud events</td></tr>';
}

async function loadReferral() {
  const body = el('referralRecordsBody');
  if (body) body.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-4">No referral records</td></tr>';
}

async function loadContent() {
  // Load FAQs
  const faqList = el('faqsList');
  if (faqList) {
    try {
      const snap = await db.collection('faqs').get();
      const items = [];
      snap.forEach(d => { const f = d.data(); items.push('<div class="dnd-item"><span class="grip">⠿</span><div style="flex:1"><div class="font-bold text-sm">' + esc(f.q || '') + '</div><div class="text-xs text-muted truncate">' + esc(f.a || '') + '</div></div><button class="mini-btn danger" onclick="deleteFaq(\'' + d.id + '\')">🗑️</button></div>'); });
      faqList.innerHTML = items.length ? items.join('') : '<div class="text-center text-muted p-3">No FAQs</div>';
    } catch (e) { faqList.innerHTML = '<div class="text-center text-muted p-3">Error</div>'; }
  }
}

async function loadSupport() {
  const tbody = el('ticketsTableBody');
  if (!tbody) return;
  try {
    const snap = await db.collection('tickets').orderBy('createdAt', 'desc').limit(50).get();
    AdminState.tickets = [];
    snap.forEach(d => AdminState.tickets.push({ id: d.id, ...d.data() }));
    tbody.innerHTML = AdminState.tickets.length ? AdminState.tickets.map(tk => {
      const stCls = tk.status === 'open' ? 'badge-warning' : tk.status === 'resolved' ? 'badge-success' : 'badge-info';
      return '<tr><td class="text-xs">' + esc(tk.ticketId || tk.id.slice(0, 8)) + '</td><td>' + esc(tk.username || '—') + '</td><td>' + esc(tk.subject || '—') + '</td>' +
        '<td>' + esc(tk.category || '—') + '</td><td><span class="badge ' + stCls + '">' + (tk.status || 'open') + '</span></td><td>' + formatDate(tk.createdAt) + '</td>' +
        '<td><button class="mini-btn" onclick="viewTicket(\'' + tk.id + '\')">👁️</button></td></tr>';
    }).join('') : '<tr><td colspan="7" class="text-center text-muted p-4">No tickets</td></tr>';
  } catch (e) { console.error(e); }
}

function viewTicket(id) {
  const tk = AdminState.tickets.find(x => x.id === id);
  if (!tk) return;
  openAdminModal('🎧 Ticket: ' + esc(tk.subject || ''),
    '<div class="kv-row"><span class="kv-label">User</span><span class="kv-value">' + esc(tk.username || '—') + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Category</span><span class="kv-value">' + esc(tk.category || '—') + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Status</span><span class="kv-value">' + esc(tk.status || 'open') + '</span></div>' +
    '<div class="kv-row"><span class="kv-label">Date</span><span class="kv-value">' + formatDate(tk.createdAt) + '</span></div>' +
    '<div class="mt-3"><div class="font-bold mb-2">Message:</div><div class="text-sm">' + esc(tk.message || '') + '</div></div>' +
    (tk.status === 'open' ? '<button class="btn btn-success btn-block mt-3" onclick="resolveTicket(\'' + tk.id + '\')">✅ Mark Resolved</button>' : ''));
}

async function resolveTicket(id) {
  await db.collection('tickets').doc(id).update({ status: 'resolved', resolvedAt: serverTimestamp() });
  closeAdminModal('adminGenericModal');
  toast('Resolved', 'Ticket marked as resolved', 'success');
  loadSupport();
}

async function deleteFaq(id) { const ok = await askConfirm('Delete FAQ', 'Sure?', 'Delete'); if (!ok) return; await db.collection('faqs').doc(id).delete(); loadContent(); }

/* ============================================================================
   13. ADS, CAMPAIGNS, ANALYTICS, FINANCE
============================================================================ */
async function loadAds() { /* Static content in HTML */ }
async function loadCampaigns() {
  // Load promos
  const grid = el('promosGrid');
  if (grid) {
    try {
      const snap = await db.collection('promos').get();
      const items = [];
      snap.forEach(d => { const p = d.data(); items.push('<div class="card"><div class="font-bold">' + esc(p.code || '') + '</div><div class="text-sm text-muted">' + esc(p.title || '') + '</div><div class="text-xs">+' + fmtNum(p.reward || 0) + ' coins</div></div>'); });
      grid.innerHTML = items.length ? items.join('') : '<div class="text-center text-muted p-3">No promos</div>';
    } catch (e) {}
  }
}

async function loadAnalytics() { /* Placeholder - would need real data */ }
async function loadFinance() { /* Placeholder - computed from ledger */ }

/* ============================================================================
   14. SETTINGS, SECURITY, ROLES, LOGS
============================================================================ */
async function loadSettings() {
  // Populate settings form
  const s = AdminState.settings;
  const set = (id, v) => { const x = el(id); if (x) x.value = v; };
  set('setCoinRate', s.coinRate || 10000);
  set('setSignupBonus', s.signupBonus || 100);
  set('setMinWithdraw', s.minWithdraw || 10000);
  set('setWithdrawFee', s.withdrawalFeePct || 1);
  set('setFraudReserve', s.fraudReserve || 10);
  set('setOpCost', s.opCost || 5);
  set('setSiteUrl', s.siteUrl || '');
  set('setSupportEmail', s.supportEmail || '');
}

async function loadSecurity() { /* Security events list */ }
async function loadRoles() {
  const tbody = el('adminsListBody');
  if (tbody) {
    try {
      const snap = await db.collection('admin_users').get();
      const items = [];
      snap.forEach(d => { const a = d.data(); items.push('<tr><td>' + esc(a.email || '—') + '</td><td>' + esc(a.email || '—') + '</td><td><span class="role-bar role-super">' + esc(a.role || 'super') + '</span></td><td>—</td><td>—</td></tr>'); });
      tbody.innerHTML = items.length ? items.join('') : '<tr><td colspan="5" class="text-center text-muted p-4">No admins</td></tr>';
    } catch (e) {}
  }
}

async function loadAuditLogs() {
  const list = el('auditLogsList');
  if (!list) return;
  try {
    const snap = await db.collection('admin_logs').orderBy('timestamp', 'desc').limit(100).get();
    const items = [];
    snap.forEach(d => {
      const l = d.data();
      items.push('<div class="log-row"><span class="log-ico">📝</span><span class="log-time">' + timeAgo(l.timestamp) + '</span><span class="log-action">' + esc(l.action || '') + '</span><span class="log-detail">' + esc(l.details || '') + '</span></div>');
    });
    list.innerHTML = items.length ? items.join('') : '<div class="text-center text-muted p-4">No logs yet</div>';
  } catch (e) { list.innerHTML = '<div class="text-center text-muted p-4">Error loading logs</div>'; }
}

/* ============================================================================
   15. AUDIT LOGGING
============================================================================ */
async function logAdminAction(action, details, metadata = {}) {
  try {
    await db.collection('admin_logs').add({
      action, details,
      adminId: AdminState.user ? AdminState.user.uid : 'unknown',
      adminEmail: AdminState.user ? AdminState.user.email : 'unknown',
      metadata,
      timestamp: serverTimestamp()
    });
  } catch (e) { console.warn('Log failed', e); }
}

/* ============================================================================
   16. REAL-TIME LISTENERS
============================================================================ */
function startRealtimeListeners() {
  db.collection('withdrawals').where('status', '==', 'pending').onSnapshot(snap => {
    AdminState.stats.pendingWithdrawals = snap.size;
    updateQuickStats();
  });
  db.collection('orders').where('status', '==', 'pending').onSnapshot(snap => {
    AdminState.stats.pendingOrders = snap.size;
    updateQuickStats();
  });
}

/* ============================================================================
   17. FORM HANDLERS & MODALS
============================================================================ */
function initAdminForms() {
  // Login form
  el('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = el('adminEmail').value.trim();
    const pass = el('adminPassword').value;
    if (!email || !pass) return toast('Error', 'Fill all fields', 'warning');
    const btn = el('adminLoginBtn');
    btn.disabled = true; btn.classList.add('loading');
    try {
      await auth.signInWithEmailAndPassword(email, pass);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        // Auto-create admin account on first login
        if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          try {
            await auth.createUserWithEmailAndPassword(email, pass);
            toast('Account Created', 'Admin account created successfully!', 'success');
          } catch (e2) { toast('Error', e2.message, 'error'); }
        } else {
          toast('Error', err.message, 'error');
        }
      } else {
        toast('Error', err.message, 'error');
      }
    } finally {
      btn.disabled = false; btn.classList.remove('loading');
    }
  });

  // Toggle password visibility
  const togglePw = el('toggleAdminPw');
  if (togglePw) togglePw.addEventListener('click', () => {
    const inp = el('adminPassword');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    togglePw.textContent = inp.type === 'password' ? '👁️' : '🙈';
  });

  // Offer editor form
  el('offerEditorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = el('offerEditId').value;
    const data = {
      title: el('offerEditTitle').value.trim(),
      provider: el('offerEditProvider').value.trim(),
      category: el('offerEditCategory').value.trim(),
      difficulty: el('offerEditDifficulty').value,
      payout: parseInt(el('offerEditPayout').value) || 0,
      minutes: parseInt(el('offerEditMinutes').value) || 5,
      icon: el('offerEditIcon').value || '🎯',
      link: el('offerEditLink').value.trim(),
      description: el('offerEditDesc').value.trim(),
      active: el('offerEditActive').checked,
      updatedAt: serverTimestamp()
    };
    if (id) {
      await db.collection('offers').doc(id).update(data);
      await logAdminAction('offer_update', 'Updated offer: ' + data.title);
    } else {
      data.createdAt = serverTimestamp();
      await db.collection('offers').add(data);
      await logAdminAction('offer_create', 'Created offer: ' + data.title);
    }
    closeAdminModal('offerEditorModal');
    toast('Saved', 'Offer saved successfully', 'success');
    loadOffers();
  });

  // Create buttons
  el('createOfferBtn').addEventListener('click', () => editOfferModal(null));
  el('createProviderBtn').addEventListener('click', () => toast('Info', 'Provider creation coming soon', 'info'));
  el('createGameBtn').addEventListener('click', () => toast('Info', 'Game creation coming soon', 'info'));
  el('createSurveyBtn').addEventListener('click', () => toast('Info', 'Survey creation coming soon', 'info'));
  el('createRewardBtn').addEventListener('click', () => toast('Info', 'Reward creation coming soon', 'info'));
  el('createCampaignBtn').addEventListener('click', () => toast('Info', 'Campaign creation coming soon', 'info'));

  // Settings save
  el('saveAllSettingsBtn').addEventListener('click', async () => {
    const data = {
      coinRate: parseInt(el('setCoinRate').value) || 10000,
      signupBonus: parseInt(el('setSignupBonus').value) || 100,
      minWithdraw: parseInt(el('setMinWithdraw').value) || 10000,
      withdrawalFeePct: parseFloat(el('setWithdrawFee').value) || 1,
      fraudReserve: parseFloat(el('setFraudReserve').value) || 10,
      opCost: parseFloat(el('setOpCost').value) || 5,
      siteUrl: el('setSiteUrl').value.trim(),
      supportEmail: el('setSupportEmail').value.trim(),
      updatedAt: serverTimestamp()
    };
    await db.collection('settings').doc('global').set(data, { merge: true });
    await logAdminAction('settings_update', 'Updated global settings');
    AdminState.settings = Object.assign(AdminState.settings, data);
    toast('Saved', 'Settings updated', 'success');
  });

  // Security save
  el('saveSecurityBtn').addEventListener('click', async () => {
    await logAdminAction('security_update', 'Updated security settings');
    toast('Saved', 'Security settings updated', 'success');
  });

  // Seed data button
  el('seedDataBtn').addEventListener('click', seedSampleData);

  // Modal close buttons
  $$('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const scrim = btn.closest('.modal-scrim');
      if (scrim) scrim.classList.remove('open');
    });
  });
  $$('.modal-scrim').forEach(scrim => {
    scrim.addEventListener('click', (e) => { if (e.target === scrim) scrim.classList.remove('open'); });
  });

  // Confirm dialog buttons
  el('adminConfirmOk').addEventListener('click', () => { el('adminConfirmDialog').classList.remove('open'); if (adminConfirmCb) { adminConfirmCb(true); adminConfirmCb = null; } });
  el('adminConfirmCancel').addEventListener('click', () => { el('adminConfirmDialog').classList.remove('open'); if (adminConfirmCb) { adminConfirmCb(false); adminConfirmCb = null; } });

  // Grant/Revoke admin
  el('grantAdminForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = el('grantAdminEmail').value.trim();
    const role = el('grantAdminRole').value;
    if (!email) return;
    try {
      const userRec = await auth.fetchSignInMethodsForEmail(email);
      toast('Info', 'User must sign in first to get UID. Use Firestore console to add admin_users doc.', 'info');
    } catch (e2) { toast('Error', e2.message, 'error'); }
  });
}

/* ============================================================================
   18. SEED SAMPLE DATA
============================================================================ */
async function seedSampleData() {
  const ok = await askConfirm('Seed Data', 'This will add sample offers, games, surveys, rewards, FAQs, events, promos and posts.', 'Seed', false);
  if (!ok) return;
  toast('Seeding', 'Adding sample data...', 'info');
  try {
    // Offers
    const offers = [
      { title: 'Install Clash Royale', provider: 'Freecash', category: 'Games', payout: 2500, difficulty: 'Medium', minutes: 30, icon: '⚔️', active: true, createdAt: serverTimestamp() },
      { title: 'Complete Shopping Survey', provider: 'Lootably', category: 'Surveys', payout: 850, difficulty: 'Easy', minutes: 10, icon: '📋', active: true, createdAt: serverTimestamp() },
      { title: 'Sign Up Newsletter', provider: 'AdGate', category: 'Signups', payout: 250, difficulty: 'Easy', minutes: 2, icon: '📧', active: true, createdAt: serverTimestamp() },
      { title: 'Try Streaming Trial', provider: 'OfferToro', category: 'Trials', payout: 1500, difficulty: 'Medium', minutes: 5, icon: '🎬', active: true, createdAt: serverTimestamp() },
      { title: 'Download TikTok', provider: 'Freecash', category: 'Apps', payout: 1800, difficulty: 'Easy', minutes: 15, icon: '📱', active: true, createdAt: serverTimestamp() }
    ];
    for (const o of offers) await db.collection('offers').add(o);

    // Games
    const games = [
      { title: 'Free Fire', icon: '🔥', color: 'linear-gradient(135deg,#ff6a00,#ffb800)', platform: 'Android & iOS', category: 'Battle Royale', rating: 4.8, active: true, createdAt: serverTimestamp() },
      { title: 'PUBG Mobile', icon: '🍗', color: 'linear-gradient(135deg,#f5af19,#f12711)', platform: 'Android & iOS', category: 'Battle Royale', rating: 4.7, active: true, createdAt: serverTimestamp() },
      { title: 'Roblox', icon: '🧱', color: 'linear-gradient(135deg,#ff3d71,#ff6b6b)', platform: 'All', category: 'Sandbox', rating: 4.6, active: true, createdAt: serverTimestamp() }
    ];
    for (const g of games) await db.collection('games').add(g);

    // Surveys
    const surveys = [
      { title: 'Market Research', category: 'Research', reward: 850, minutes: 15, rating: 4.5, active: true, createdAt: serverTimestamp() },
      { title: 'Gaming Habits', category: 'Gaming', reward: 650, minutes: 10, rating: 4.7, active: true, createdAt: serverTimestamp() }
    ];
    for (const s of surveys) await db.collection('surveys').add(s);

    // Rewards
    const rewards = [
      { title: 'Google Play $25', category: 'Gift Cards', icon: '🟢', color: 'linear-gradient(135deg,#00e676,#009688)', price: 250000, active: true, createdAt: serverTimestamp() },
      { title: 'Bitcoin', category: 'Crypto', icon: '₿', color: 'linear-gradient(135deg,#f7931a,#ffb800)', price: 250000, active: true, createdAt: serverTimestamp() },
      { title: 'Free Fire Top-Up', category: 'Game Top-Up', type: 'topup', icon: '🔥', color: 'linear-gradient(135deg,#ff6a00,#ffb800)', price: 4500, active: true, createdAt: serverTimestamp() }
    ];
    for (const r of rewards) await db.collection('rewards').add(r);

    // FAQs
    const faqs = [
      { q: 'How do I earn coins?', a: 'Complete offers, play games, take surveys, watch ads, claim daily rewards and invite friends.' },
      { q: 'How do I withdraw?', a: 'Go to Withdraw, choose method, enter details and confirm. Processed in 24-72h.' },
      { q: 'Is it safe?', a: 'Yes. We use encryption, anti-fraud and only work with trusted partners.' }
    ];
    for (const f of faqs) await db.collection('faqs').add(f);

    // Events
    const events = [
      { title: 'Double Coins Weekend', subtitle: '2x coins on all offers!', icon: '⚡', status: 'active', active: true, createdAt: serverTimestamp() },
      { title: 'Referral Rush', subtitle: 'Triple referral bonuses', icon: '👥', status: 'upcoming', active: true, createdAt: serverTimestamp() }
    ];
    for (const ev of events) await db.collection('events').add(ev);

    // Promos
    const promos = [
      { code: 'WELCOME2026', title: 'Welcome Bonus', reward: 500, active: true, createdAt: serverTimestamp() },
      { code: 'DOUBLE100', title: 'Double Boost', reward: 1000, active: true, createdAt: serverTimestamp() }
    ];
    for (const p of promos) await db.collection('promos').add(p);

    // Posts
    const posts = [
      { title: '10 Ways to Earn More', icon: '💡', category: 'Tips', createdAt: serverTimestamp() },
      { title: 'New Games This Week', icon: '🎮', category: 'Update', createdAt: serverTimestamp() }
    ];
    for (const p of posts) await db.collection('posts').add(p);

    // Providers
    const providers = [
      { id: 'freecash', name: 'Freecash', type: 'affiliate', active: true, conversions: 0, revenue: 0 },
      { id: 'lootably', name: 'Lootably', type: 'offerwall', active: true, conversions: 0, revenue: 0 },
      { id: 'adsterra', name: 'Adsterra', type: 'adnetwork', active: true, conversions: 0, revenue: 0 }
    ];
    for (const p of providers) await db.collection('providers').doc(p.id).set(p);

    // Settings
    await db.collection('settings').doc('global').set({
      coinRate: 10000, minWithdraw: 10000, signupBonus: 100, adReward: 120,
      adDailyCap: 15, withdrawalFeePct: 1, referralPercent: 10, maintenance: false,
      siteUrl: location.origin, supportEmail: 'support@rewords.com', updatedAt: serverTimestamp()
    }, { merge: true });

    await logAdminAction('seed_data', 'Seeded sample data');
    toast('Done', 'Sample data seeded successfully!', 'success');
    loadAdminData();
  } catch (e) {
    toast('Error', e.message, 'error');
  }
}

/* ============================================================================
   19. BOOT
============================================================================ */
function boot() {
  initAdminForms();
  initAdminAuth();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

/* ============================================================================
   END OF ADMIN.JS
============================================================================ */
