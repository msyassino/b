/* ============================================================================
REWORDS ADMIN PANEL — admin.js
Complete admin dashboard: auth, users, offers, providers, rewards, orders,
withdrawals, fraud, finance, analytics, content, support, system settings
============================================================================ */

/* ============================================================================
FIREBASE CONFIG & INITIALIZATION
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

let app = null;
let db = null;
let auth = null;
let storage = null;

try {
  app = firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore(app);
  auth = firebase.auth(app);
  storage = firebase.storage(app);
} catch (e) {
  console.error("Firebase init failed", e);
}

const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();
const increment = (n) => firebase.firestore.FieldValue.increment(n || 1);
const arrayUnion = (v) => firebase.firestore.FieldValue.arrayUnion(v);
const arrayRemove = (v) => firebase.firestore.FieldValue.arrayRemove(v);
const deleteField = () => firebase.firestore.FieldValue.delete();

/* ============================================================================
2. GLOBAL STATE
============================================================================ */
const AdminState = {
  user: null,
  isAdmin: false,
  adminRole: null,
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
  currentPage: 'dashboard',
  settings: {},
  stats: {
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    revenueToday: 0,
    revenue7d: 0,
    revenue30d: 0,
    rewardsToday: 0,
    pendingWithdrawals: 0,
    pendingOrders: 0,
    fraudAlerts: 0,
    chargebacks: 0,
    offerConversions: 0,
    conversionRate: 0,
    arpu: 0
  },
  filters: {
    userStatus: 'all',
    offerProvider: 'all',
    withdrawalStatus: 'all',
    orderStatus: 'all'
  }
};

/* ============================================================================
3. AUTHENTICATION & ADMIN VERIFICATION
============================================================================ */
async function initAdminAuth() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      AdminState.user = user;
      await verifyAdminAccess(user);
    } else {
      showLoginScreen();
    }
  });
}

async function verifyAdminAccess(user) {
  try {
    const userDoc = await db.collection('admin_users').doc(user.uid).get();
    
    if (userDoc.exists) {
      const adminData = userDoc.data();
      AdminState.isAdmin = true;
      AdminState.adminRole = adminData.role || 'support';
      
      await logAdminAction('login', 'Admin logged in', { uid: user.uid, role: adminData.role });
      showAdminDashboard();
    } else {
      toast('Access Denied', 'You do not have admin privileges', 'error');
      await auth.signOut();
      showLoginScreen();
    }
  } catch (error) {
    console.error('Admin verification failed:', error);
    toast('Error', 'Failed to verify admin access', 'error');
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('adminAuth').style.display = 'grid';
  document.getElementById('adminShell').style.display = 'none';
}

function showAdminDashboard() {
  document.getElementById('adminAuth').style.display = 'none';
  document.getElementById('adminShell').style.display = 'flex';
  
  updateAdminProfile();
  initAdminNavigation();
  loadAdminData();
}

function updateAdminProfile() {
  const profileEl = document.getElementById('adminProfile');
  if (profileEl && AdminState.user) {
    profileEl.innerHTML = `
      <div class="avatar-sm">A</div>
      <div class="flex-1">
        <div class="font-bold text-sm">${AdminState.user.email}</div>
        <div class="text-xs text-muted">${AdminState.adminRole}</div>
      </div>
    `;
  }
}

/* ============================================================================
4. NAVIGATION
============================================================================ */
function initAdminNavigation() {
  const navLinks = document.querySelectorAll('[data-admin-nav]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('data-admin-nav');
      navigateAdmin(page);
    });
  });
}

function navigateAdmin(page) {
  AdminState.currentPage = page;
  
  // Update active state
  document.querySelectorAll('[data-admin-nav]').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-admin-nav') === page);
  });
  
  // Show/hide pages
  document.querySelectorAll('.admin-page').forEach(p => {
    p.classList.toggle('active', p.id === 'admin-' + page);
  });
  
  // Load page-specific data
  loadPageData(page);
}

function loadPageData(page) {
  switch(page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'users':
      loadUsers();
      break;
    case 'offers':
      loadOffers();
      break;
    case 'games':
      loadGames();
      break;
    case 'surveys':
      loadSurveys();
      break;
    case 'rewards':
      loadRewards();
      break;
    case 'orders':
      loadOrders();
      break;
    case 'withdrawals':
      loadWithdrawals();
      break;
    case 'providers':
      loadProviders();
      break;
    case 'fraud':
      loadFraudCenter();
      break;
    case 'finance':
      loadFinance();
      break;
    case 'analytics':
      loadAnalytics();
      break;
    case 'content':
      loadContent();
      break;
    case 'support':
      loadSupport();
      break;
    case 'settings':
      loadSettings();
      break;
    case 'security':
      loadSecurity();
      break;
    case 'logs':
      loadAuditLogs();
      break;
  }
}

/* ============================================================================
5. DATA LOADING
============================================================================ */
async function loadAdminData() {
  await loadSettings();
  await loadDashboard();
  startRealtimeListeners();
}

async function loadSettings() {
  try {
    const doc = await db.collection('settings').doc('global').get();
    if (doc.exists) {
      AdminState.settings = doc.data();
    } else {
      AdminState.settings = {
        coinRate: 10000,
        minWithdraw: 10000,
        signupBonus: 100,
        adReward: 120,
        adDailyCap: 15,
        withdrawalFeePct: 1,
        referralPercent: 10,
        maintenance: false
      };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function loadDashboard() {
  try {
    // Load users count
    const usersSnap = await db.collection('users').get();
    AdminState.stats.totalUsers = usersSnap.size;
    
    // Calculate active users (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let activeCount = 0;
    let newToday = 0;
    const today = new Date().toISOString().slice(0, 10);
    
    usersSnap.forEach(doc => {
      const user = doc.data();
      if (user.lastSeen && user.lastSeen.toDate && user.lastSeen.toDate() > weekAgo) {
        activeCount++;
      }
      if (user.createdAt && user.createdAt.toDate) {
        const createdDate = user.createdAt.toDate().toISOString().slice(0, 10);
        if (createdDate === today) newToday++;
      }
    });
    
    AdminState.stats.activeUsers = activeCount;
    AdminState.stats.newUsersToday = newToday;
    
    // Load withdrawals
    const withdrawalsSnap = await db.collection('withdrawals').where('status', '==', 'pending').get();
    AdminState.stats.pendingWithdrawals = withdrawalsSnap.size;
    
    // Load orders
    const ordersSnap = await db.collection('orders').where('status', '==', 'pending').get();
    AdminState.stats.pendingOrders = ordersSnap.size;
    
    // Load fraud events
    const fraudSnap = await db.collection('fraud_events').where('severity', '==', 'high').get();
    AdminState.stats.fraudAlerts = fraudSnap.size;
    
    // Update dashboard UI
    updateDashboardStats();
    renderRecentActivity();
    
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    toast('Error', 'Failed to load dashboard data', 'error');
  }
}

function updateDashboardStats() {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  
  set('statTotalUsers', AdminState.stats.totalUsers.toLocaleString());
  set('statActiveUsers', AdminState.stats.activeUsers.toLocaleString());
  set('statNewUsersToday', AdminState.stats.newUsersToday.toLocaleString());
  set('statPendingWithdrawals', AdminState.stats.pendingWithdrawals.toLocaleString());
  set('statPendingOrders', AdminState.stats.pendingOrders.toLocaleString());
  set('statFraudAlerts', AdminState.stats.fraudAlerts.toLocaleString());
}

async function renderRecentActivity() {
  const container = document.getElementById('recentActivity');
  if (!container) return;
  
  try {
    const logsSnap = await db.collection('admin_logs')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    
    if (logsSnap.empty) {
      container.innerHTML = '<div class="text-muted text-center p-4">No recent activity</div>';
      return;
    }
    
    const logs = [];
    logsSnap.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
    
    container.innerHTML = logs.map(log => `
      <div class="log-row">
        <span class="log-ico">${getLogIcon(log.action)}</span>
        <span class="log-time">${formatTimeAgo(log.timestamp)}</span>
        <span class="log-action">${log.action}</span>
        <span class="log-detail">${log.details || ''}</span>
      </div>
    `).join('');
    
  } catch (error) {
    container.innerHTML = '<div class="text-danger text-center p-4">Failed to load activity</div>';
  }
}

function getLogIcon(action) {
  const icons = {
    'login': '🔐',
    'user_ban': '🚫',
    'user_unban': '✅',
    'withdrawal_approve': '💰',
    'withdrawal_reject': '❌',
    'offer_create': '🎯',
    'offer_update': '✏️',
    'reward_create': '🎁',
    'settings_update': '⚙️'
  };
  return icons[action] || '📝';
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
}

/* ============================================================================
6. USERS MANAGEMENT
============================================================================ */
async function loadUsers() {
  const container = document.getElementById('usersTable');
  if (!container) return;
  
  try {
    const snap = await db.collection('users')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    AdminState.users = [];
    snap.forEach(doc => {
      AdminState.users.push({ id: doc.id, ...doc.data() });
    });
    
    renderUsersTable();
    
  } catch (error) {
    console.error('Failed to load users:', error);
    toast('Error', 'Failed to load users', 'error');
  }
}

function renderUsersTable() {
  const container = document.getElementById('usersTable');
  if (!container) return;
  
  if (AdminState.users.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="es-ico">👥</div><div class="es-title">No users yet</div></div>';
    return;
  }
  
  const filtered = filterUsers(AdminState.users);
  
  container.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>User</th>
          <th>Email</th>
          <th>Coins</th>
          <th>Status</th>
          <th>Risk</th>
          <th>Joined</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(user => renderUserRow(user)).join('')}
      </tbody>
    </table>
  `;
  
  // Add event listeners
  container.querySelectorAll('[data-user-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = btn.getAttribute('data-user-action');
      const userId = btn.getAttribute('data-user-id');
      handleUserAction(action, userId);
    });
  });
}

function renderUserRow(user) {
  const coins = user.lifetimeEarned || 0;
  const status = user.status || 'active';
  const risk = user.fraudScore || 0;
  const statusBadge = getStatusBadge(status);
  const riskBadge = getRiskBadge(risk);
  
  return `
    <tr>
      <td>
        <div class="cell-avatar">
          <div class="avatar-sm">${(user.username || '?').charAt(0).toUpperCase()}</div>
          <div>
            <div class="ca-name">${esc(user.username || 'Unknown')}</div>
            <div class="ca-sub">${user.country || '—'}</div>
          </div>
        </div>
      </td>
      <td>${esc(user.email || '—')}</td>
      <td class="num">${coins.toLocaleString()}</td>
      <td>${statusBadge}</td>
      <td>${riskBadge}</td>
      <td>${formatDate(user.createdAt)}</td>
      <td>
        <div class="tbl-actions">
          <button class="mini-btn" data-user-action="view" data-user-id="${user.id}" title="View">👁️</button>
          <button class="mini-btn" data-user-action="edit" data-user-id="${user.id}" title="Edit">✏️</button>
          <button class="mini-btn ${status === 'banned' ? 'success' : 'danger'}" 
                  data-user-action="${status === 'banned' ? 'unban' : 'ban'}" 
                  data-user-id="${user.id}" 
                  title="${status === 'banned' ? 'Unban' : 'Ban'}">
            ${status === 'banned' ? '✅' : '🚫'}
          </button>
        </div>
      </td>
    </tr>
  `;
}

function filterUsers(users) {
  const status = AdminState.filters.userStatus;
  if (status === 'all') return users;
  return users.filter(u => u.status === status);
}

function getStatusBadge(status) {
  const badges = {
    'active': '<span class="badge badge-success">Active</span>',
    'pending': '<span class="badge badge-warning">Pending</span>',
    'restricted': '<span class="badge badge-danger">Restricted</span>',
    'banned': '<span class="badge badge-danger">Banned</span>'
  };
  return badges[status] || '<span class="badge badge-neutral">Unknown</span>';
}

function getRiskBadge(score) {
  if (score < 30) return '<span class="badge badge-success">Low</span>';
  if (score < 60) return '<span class="badge badge-warning">Medium</span>';
  return '<span class="badge badge-danger">High</span>';
}

async function handleUserAction(action, userId) {
  const user = AdminState.users.find(u => u.id === userId);
  if (!user) return;
  
  switch(action) {
    case 'view':
      viewUserDetails(user);
      break;
    case 'edit':
      editUser(user);
      break;
    case 'ban':
      await banUser(user);
      break;
    case 'unban':
      await unbanUser(user);
      break;
  }
}

function viewUserDetails(user) {
  const html = `
    <div class="user-details">
      <div class="grid grid-2 gap-3 mb-4">
        <div class="card">
          <div class="font-bold mb-2">Basic Info</div>
          <div class="kv-row"><span class="kv-label">Username</span><span class="kv-value">${esc(user.username || '—')}</span></div>
          <div class="kv-row"><span class="kv-label">Email</span><span class="kv-value">${esc(user.email || '—')}</span></div>
          <div class="kv-row"><span class="kv-label">Country</span><span class="kv-value">${esc(user.country || '—')}</span></div>
          <div class="kv-row"><span class="kv-label">Status</span><span class="kv-value">${user.status || 'active'}</span></div>
          <div class="kv-row"><span class="kv-label">Joined</span><span class="kv-value">${formatDate(user.createdAt)}</span></div>
        </div>
        <div class="card">
          <div class="font-bold mb-2">Stats</div>
          <div class="kv-row"><span class="kv-label">Lifetime Earned</span><span class="kv-value">${(user.lifetimeEarned || 0).toLocaleString()} coins</span></div>
          <div class="kv-row"><span class="kv-label">Lifetime Spent</span><span class="kv-value">${(user.lifetimeSpent || 0).toLocaleString()} coins</span></div>
          <div class="kv-row"><span class="kv-label">Total Withdrawn</span><span class="kv-value">${(user.totalWithdrawn || 0).toLocaleString()} coins</span></div>
          <div class="kv-row"><span class="kv-label">Offers Completed</span><span class="kv-value">${user.offersCompleted || 0}</span></div>
          <div class="kv-row"><span class="kv-label">Surveys Completed</span><span class="kv-value">${user.surveysCompleted || 0}</span></div>
        </div>
      </div>
      <div class="card mb-4">
        <div class="font-bold mb-2">Security</div>
        <div class="kv-row"><span class="kv-label">Fraud Score</span><span class="kv-value">${user.fraudScore || 0}</span></div>
        <div class="kv-row"><span class="kv-label">Email Verified</span><span class="kv-value">${user.verification?.email ? '✅' : '❌'}</span></div>
        <div class="kv-row"><span class="kv-label">Phone Verified</span><span class="kv-value">${user.verification?.phone ? '✅' : '❌'}</span></div>
        <div class="kv-row"><span class="kv-label">2FA Enabled</span><span class="kv-value">${user.verification?.twoFa ? '✅' : '❌'}</span></div>
        <div class="kv-row"><span class="kv-label">Devices</span><span class="kv-value">${(user.devices || []).length}</span></div>
      </div>
      <div class="card">
        <div class="font-bold mb-2">Referrals</div>
        <div class="kv-row"><span class="kv-label">Referral Code</span><span class="kv-value">${user.referralCode || '—'}</span></div>
        <div class="kv-row"><span class="kv-label">Referred By</span><span class="kv-value">${user.referredBy || '—'}</span></div>
        <div class="kv-row"><span class="kv-label">Referral Count</span><span class="kv-value">${user.referralCount || 0}</span></div>
        <div class="kv-row"><span class="kv-label">Referral Earned</span><span class="kv-value">${(user.referralEarned || 0).toLocaleString()} coins</span></div>
      </div>
    </div>
  `;
  
  openModal('User Details', html);
}

function editUser(user) {
  const html = `
    <form id="editUserForm">
      <div class="field">
        <label>Username</label>
        <input type="text" class="input" id="editUsername" value="${esc(user.username || '')}">
      </div>
      <div class="field">
        <label>Country</label>
        <input type="text" class="input" id="editCountry" value="${esc(user.country || '')}">
      </div>
      <div class="field">
        <label>Status</label>
        <select class="select" id="editStatus">
          <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="pending" ${user.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="restricted" ${user.status === 'restricted' ? 'selected' : ''}>Restricted</option>
          <option value="banned" ${user.status === 'banned' ? 'selected' : ''}>Banned</option>
        </select>
      </div>
      <div class="field">
        <label>Fraud Score</label>
        <input type="number" class="input" id="editFraudScore" value="${user.fraudScore || 0}">
      </div>
      <div class="flex gap-2 mt-4">
        <button type="submit" class="btn btn-accent flex-1">Save Changes</button>
        <button type="button" class="btn btn-ghost" onclick="closeModal('genericModal')">Cancel</button>
      </div>
    </form>
  `;
  
  openModal('Edit User', html);
  
  document.getElementById('editUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveUserChanges(user.id);
  });
}

async function saveUserChanges(userId) {
  try {
    const username = document.getElementById('editUsername').value.trim();
    const country = document.getElementById('editCountry').value.trim();
    const status = document.getElementById('editStatus').value;
    const fraudScore = parseInt(document.getElementById('editFraudScore').value) || 0;
    
    await db.collection('users').doc(userId).update({
      username,
      country,
      status,
      fraudScore,
      updatedAt: serverTimestamp()
    });
    
    await logAdminAction('user_update', `Updated user ${username}`, { userId });
    
    closeModal('genericModal');
    toast('Success', 'User updated successfully', 'success');
    loadUsers();
    
  } catch (error) {
    console.error('Failed to save user:', error);
    toast('Error', 'Failed to save changes', 'error');
  }
}

async function banUser(user) {
  const confirmed = await askConfirm(
    'Ban User',
    `Are you sure you want to ban ${user.username || 'this user'}? They will no longer be able to access the platform.`,
    'Ban User',
    true
  );
  
  if (!confirmed) return;
  
  try {
    await db.collection('users').doc(user.id).update({
      status: 'banned',
      bannedAt: serverTimestamp(),
      bannedBy: AdminState.user.uid
    });
    
    await logAdminAction('user_ban', `Banned user ${user.username}`, { userId: user.id });
    
    toast('Success', 'User banned successfully', 'success');
    loadUsers();
    
  } catch (error) {
    console.error('Failed to ban user:', error);
    toast('Error', 'Failed to ban user', 'error');
  }
}

async function unbanUser(user) {
  const confirmed = await askConfirm(
    'Unban User',
    `Are you sure you want to unban ${user.username || 'this user'}?`,
    'Unban User',
    false
  );
  
  if (!confirmed) return;
  
  try {
    await db.collection('users').doc(user.id).update({
      status: 'active',
      unbannedAt: serverTimestamp(),
      unbannedBy: AdminState.user.uid
    });
    
    await logAdminAction('user_unban', `Unbanned user ${user.username}`, { userId: user.id });
    
    toast('Success', 'User unbanned successfully', 'success');
    loadUsers();
    
  } catch (error) {
    console.error('Failed to unban user:', error);
    toast('Error', 'Failed to unban user', 'error');
  }
}

/* ============================================================================
7. OFFERS MANAGEMENT
============================================================================ */
async function loadOffers() {
  const container = document.getElementById('offersTable');
  if (!container) return;
  
  try {
    const snap = await db.collection('offers')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    AdminState.offers = [];
    snap.forEach(doc => {
      AdminState.offers.push({ id: doc.id, ...doc.data() });
    });
    
    renderOffersTable();
    
  } catch (error) {
    console.error('Failed to load offers:', error);
    toast('Error', 'Failed to load offers', 'error');
  }
}

function renderOffersTable() {
  const container = document.getElementById('offersTable');
  if (!container) return;
  
  if (AdminState.offers.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="es-ico">🎯</div><div class="es-title">No offers yet</div><button class="btn btn-accent mt-3" onclick="openCreateOfferModal()">+ Create Offer</button></div>';
    return;
  }
  
  container.innerHTML = `
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">All Offers (${AdminState.offers.length})</h3>
      <button class="btn btn-accent btn-sm" onclick="openCreateOfferModal()">+ New Offer</button>
    </div>
    <table class="table">
      <thead>
        <tr>
          <th>Offer</th>
          <th>Provider</th>
          <th>Payout</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${AdminState.offers.map(offer => renderOfferRow(offer)).join('')}
      </tbody>
    </table>
  `;
  
  container.querySelectorAll('[data-offer-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = btn.getAttribute('data-offer-action');
      const offerId = btn.getAttribute('data-offer-id');
      handleOfferAction(action, offerId);
    });
  });
}

function renderOfferRow(offer) {
  const status = offer.active !== false ? 'active' : 'inactive';
  const statusBadge = status === 'active' 
    ? '<span class="badge badge-success">Active</span>'
    : '<span class="badge badge-neutral">Inactive</span>';
  
  return `
    <tr>
      <td>
        <div class="flex items-center gap-2">
          <div class="avatar-sm" style="background:${offer.color || 'var(--grad-primary)'}">${offer.icon || '🎯'}</div>
          <div>
            <div class="font-bold text-sm">${esc(offer.title || 'Untitled')}</div>
            <div class="text-xs text-muted">${esc(offer.category || '—')}</div>
          </div>
        </div>
      </td>
      <td>${esc(offer.provider || '—')}</td>
      <td class="num">${(offer.payout || 0).toLocaleString()} coins</td>
      <td>${statusBadge}</td>
      <td>
        <div class="tbl-actions">
          <button class="mini-btn" data-offer-action="edit" data-offer-id="${offer.id}" title="Edit">✏️</button>
          <button class="mini-btn ${status === 'active' ? 'danger' : 'success'}" 
                  data-offer-action="toggle" 
                  data-offer-id="${offer.id}" 
                  title="${status === 'active' ? 'Deactivate' : 'Activate'}">
            ${status === 'active' ? '🚫' : '✅'}
          </button>
          <button class="mini-btn danger" data-offer-action="delete" data-offer-id="${offer.id}" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `;
}

function openCreateOfferModal() {
  const html = `
    <form id="createOfferForm">
      <div class="field">
        <label>Title *</label>
        <input type="text" class="input" id="offerTitle" required>
      </div>
      <div class="field">
        <label>Description</label>
        <textarea class="textarea" id="offerDescription" rows="3"></textarea>
      </div>
      <div class="grid grid-2 gap-3">
        <div class="field">
          <label>Provider</label>
          <input type="text" class="input" id="offerProvider" placeholder="e.g., Freecash">
        </div>
        <div class="field">
          <label>Category</label>
          <input type="text" class="input" id="offerCategory" placeholder="e.g., Games">
        </div>
      </div>
      <div class="grid grid-2 gap-3">
        <div class="field">
          <label>Payout (coins) *</label>
          <input type="number" class="input" id="offerPayout" required>
        </div>
        <div class="field">
          <label>Difficulty</label>
          <select class="select" id="offerDifficulty">
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>
      <div class="grid grid-2 gap-3">
        <div class="field">
          <label>Estimated Time (minutes)</label>
          <input type="number" class="input" id="offerMinutes" value="5">
        </div>
        <div class="field">
          <label>Icon (emoji)</label>
          <input type="text" class="input" id="offerIcon" value="🎯">
        </div>
      </div>
      <div class="field">
        <label>Offer URL</label>
        <input type="url" class="input" id="offerLink" placeholder="https://...">
      </div>
      <div class="field">
        <label>
          <input type="checkbox" id="offerActive" checked>
          Active
        </label>
      </div>
      <div class="flex gap-2 mt-4">
        <button type="submit" class="btn btn-accent flex-1">Create Offer</button>
        <button type="button" class="btn btn-ghost" onclick="closeModal('genericModal')">Cancel</button>
      </div>
    </form>
  `;
  
  openModal('Create New Offer', html);
  
  document.getElementById('createOfferForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await createOffer();
  });
}

async function createOffer() {
  try {
    const offer = {
      title: document.getElementById('offerTitle').value.trim(),
      description: document.getElementById('offerDescription').value.trim(),
      provider: document.getElementById('offerProvider').value.trim(),
      category: document.getElementById('offerCategory').value.trim(),
      payout: parseInt(document.getElementById('offerPayout').value) || 0,
      difficulty: document.getElementById('offerDifficulty').value,
      minutes: parseInt(document.getElementById('offerMinutes').value) || 5,
      icon: document.getElementById('offerIcon').value || '🎯',
      link: document.getElementById('offerLink').value.trim(),
      active: document.getElementById('offerActive').checked,
      createdAt: serverTimestamp(),
      createdBy: AdminState.user.uid
    };
    
    const docRef = await db.collection('offers').add(offer);
    
    await logAdminAction('offer_create', `Created offer: ${offer.title}`, { offerId: docRef.id });
    
    closeModal('genericModal');
    toast('Success', 'Offer created successfully', 'success');
    loadOffers();
    
  } catch (error) {
    console.error('Failed to create offer:', error);
    toast('Error', 'Failed to create offer', 'error');
  }
}

async function handleOfferAction(action, offerId) {
  const offer = AdminState.offers.find(o => o.id === offerId);
  if (!offer) return;
  
  switch(action) {
    case 'edit':
      editOffer(offer);
      break;
    case 'toggle':
      await toggleOfferStatus(offer);
      break;
    case 'delete':
      await deleteOffer(offer);
      break;
  }
}

async function toggleOfferStatus(offer) {
  try {
    const newStatus = !(offer.active !== false);
    await db.collection('offers').doc(offer.id).update({
      active: newStatus,
      updatedAt: serverTimestamp()
    });
    
    await logAdminAction('offer_update', `Toggled offer: ${offer.title}`, { offerId: offer.id, active: newStatus });
    
    toast('Success', `Offer ${newStatus ? 'activated' : 'deactivated'}`, 'success');
    loadOffers();
    
  } catch (error) {
    console.error('Failed to toggle offer:', error);
    toast('Error', 'Failed to update offer', 'error');
  }
}

async function deleteOffer(offer) {
  const confirmed = await askConfirm(
    'Delete Offer',
    `Are you sure you want to delete "${offer.title}"? This action cannot be undone.`,
    'Delete',
    true
  );
  
  if (!confirmed) return;
  
  try {
    await db.collection('offers').doc(offer.id).delete();
    
    await logAdminAction('offer_delete', `Deleted offer: ${offer.title}`, { offerId: offer.id });
    
    toast('Success', 'Offer deleted successfully', 'success');
    loadOffers();
    
  } catch (error) {
    console.error('Failed to delete offer:', error);
    toast('Error', 'Failed to delete offer', 'error');
  }
}

/* ============================================================================
8. WITHDRAWALS MANAGEMENT
============================================================================ */
async function loadWithdrawals() {
  const container = document.getElementById('withdrawalsTable');
  if (!container) return;
  
  try {
    const snap = await db.collection('withdrawals')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    AdminState.withdrawals = [];
    snap.forEach(doc => {
      AdminState.withdrawals.push({ id: doc.id, ...doc.data() });
    });
    
    renderWithdrawalsTable();
    
  } catch (error) {
    console.error('Failed to load withdrawals:', error);
    toast('Error', 'Failed to load withdrawals', 'error');
  }
}

function renderWithdrawalsTable() {
  const container = document.getElementById('withdrawalsTable');
  if (!container) return;
  
  if (AdminState.withdrawals.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="es-ico">💵</div><div class="es-title">No withdrawals yet</div></div>';
    return;
  }
  
  const filtered = filterWithdrawals(AdminState.withdrawals);
  
  container.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>User</th>
          <th>Amount</th>
          <th>Method</th>
          <th>Status</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(wd => renderWithdrawalRow(wd)).join('')}
      </tbody>
    </table>
  `;
  
  container.querySelectorAll('[data-wd-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = btn.getAttribute('data-wd-action');
      const wdId = btn.getAttribute('data-wd-id');
      handleWithdrawalAction(action, wdId);
    });
  });
}

function renderWithdrawalRow(wd) {
  const statusBadge = getWithdrawalStatusBadge(wd.status);
  const amount = wd.amount || 0;
  const usd = (amount / (AdminState.settings.coinRate || 10000)).toFixed(2);
  
  return `
    <tr>
      <td>
        <div class="font-bold text-sm">${esc(wd.username || 'User')}</div>
        <div class="text-xs text-muted">${esc(wd.email || '')}</div>
      </td>
      <td class="num">${amount.toLocaleString()} coins<br><span class="text-xs text-muted">≈ $${usd}</span></td>
      <td>${esc(wd.method || '—')}</td>
      <td>${statusBadge}</td>
      <td>${formatDate(wd.createdAt)}</td>
      <td>
        <div class="tbl-actions">
          ${wd.status === 'pending' ? `
            <button class="mini-btn success" data-wd-action="approve" data-wd-id="${wd.id}" title="Approve">✅</button>
            <button class="mini-btn danger" data-wd-action="reject" data-wd-id="${wd.id}" title="Reject">❌</button>
          ` : ''}
          <button class="mini-btn" data-wd-action="view" data-wd-id="${wd.id}" title="View">👁️</button>
        </div>
      </td>
    </tr>
  `;
}

function filterWithdrawals(withdrawals) {
  const status = AdminState.filters.withdrawalStatus;
  if (status === 'all') return withdrawals;
  return withdrawals.filter(w => w.status === status);
}

function getWithdrawalStatusBadge(status) {
  const badges = {
    'pending': '<span class="badge badge-warning">Pending</span>',
    'approved': '<span class="badge badge-info">Approved</span>',
    'processing': '<span class="badge badge-info">Processing</span>',
    'completed': '<span class="badge badge-success">Completed</span>',
    'rejected': '<span class="badge badge-danger">Rejected</span>',
    'failed': '<span class="badge badge-danger">Failed</span>'
  };
  return badges[status] || '<span class="badge badge-neutral">Unknown</span>';
}

async function handleWithdrawalAction(action, wdId) {
  const wd = AdminState.withdrawals.find(w => w.id === wdId);
  if (!wd) return;
  
  switch(action) {
    case 'view':
      viewWithdrawalDetails(wd);
      break;
    case 'approve':
      await approveWithdrawal(wd);
      break;
    case 'reject':
      await rejectWithdrawal(wd);
      break;
  }
}

async function approveWithdrawal(wd) {
  const confirmed = await askConfirm(
    'Approve Withdrawal',
    `Approve withdrawal of ${wd.amount} coins (${wd.method})?`,
    'Approve',
    false
  );
  
  if (!confirmed) return;
  
  try {
    await db.collection('withdrawals').doc(wd.id).update({
      status: 'approved',
      approvedAt: serverTimestamp(),
      approvedBy: AdminState.user.uid
    });
    
    await logAdminAction('withdrawal_approve', `Approved withdrawal ${wd.id}`, { wdId: wd.id });
    
    toast('Success', 'Withdrawal approved', 'success');
    loadWithdrawals();
    
  } catch (error) {
    console.error('Failed to approve withdrawal:', error);
    toast('Error', 'Failed to approve withdrawal', 'error');
  }
}

async function rejectWithdrawal(wd) {
  const reason = prompt('Rejection reason (optional):');
  
  try {
    await db.collection('withdrawals').doc(wd.id).update({
      status: 'rejected',
      rejectedAt: serverTimestamp(),
      rejectedBy: AdminState.user.uid,
      rejectionReason: reason || ''
    });
    
    // Refund coins to user
    await db.collection('ledger').add({
      uid: wd.uid,
      type: 'refund',
      description: 'Withdrawal rejected - refund',
      coins: wd.amount,
      status: 'completed',
      createdAt: serverTimestamp()
    });
    
    await db.collection('users').doc(wd.uid).update({
      lifetimeEarned: increment(wd.amount)
    });
    
    await logAdminAction('withdrawal_reject', `Rejected withdrawal ${wd.id}`, { wdId: wd.id, reason });
    
    toast('Success', 'Withdrawal rejected and refunded', 'success');
    loadWithdrawals();
    
  } catch (error) {
    console.error('Failed to reject withdrawal:', error);
    toast('Error', 'Failed to reject withdrawal', 'error');
  }
}

/* ============================================================================
9. ORDERS MANAGEMENT
============================================================================ */
async function loadOrders() {
  const container = document.getElementById('ordersTable');
  if (!container) return;
  
  try {
    const snap = await db.collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    AdminState.orders = [];
    snap.forEach(doc => {
      AdminState.orders.push({ id: doc.id, ...doc.data() });
    });
    
    renderOrdersTable();
    
  } catch (error) {
    console.error('Failed to load orders:', error);
    toast('Error', 'Failed to load orders', 'error');
  }
}

function renderOrdersTable() {
  const container = document.getElementById('ordersTable');
  if (!container) return;
  
  if (AdminState.orders.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="es-ico">📦</div><div class="es-title">No orders yet</div></div>';
    return;
  }
  
  container.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>User</th>
          <th>Item</th>
          <th>Cost</th>
          <th>Status</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${AdminState.orders.map(order => renderOrderRow(order)).join('')}
      </tbody>
    </table>
  `;
  
  container.querySelectorAll('[data-order-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = btn.getAttribute('data-order-action');
      const orderId = btn.getAttribute('data-order-id');
      handleOrderAction(action, orderId);
    });
  });
}

function renderOrderRow(order) {
  const statusBadge = getOrderStatusBadge(order.status);
  
  return `
    <tr>
      <td>${esc(order.username || 'User')}</td>
      <td>${esc(order.item || '—')}</td>
      <td class="num">${(order.cost || 0).toLocaleString()} coins</td>
      <td>${statusBadge}</td>
      <td>${formatDate(order.createdAt)}</td>
      <td>
        <div class="tbl-actions">
          ${order.status === 'pending' ? `
            <button class="mini-btn success" data-order-action="complete" data-order-id="${order.id}" title="Mark Complete">✅</button>
          ` : ''}
          <button class="mini-btn" data-order-action="view" data-order-id="${order.id}" title="View">👁️</button>
        </div>
      </td>
    </tr>
  `;
}

function getOrderStatusBadge(status) {
  const badges = {
    'pending': '<span class="badge badge-warning">Pending</span>',
    'processing': '<span class="badge badge-info">Processing</span>',
    'completed': '<span class="badge badge-success">Completed</span>',
    'failed': '<span class="badge badge-danger">Failed</span>',
    'cancelled': '<span class="badge badge-neutral">Cancelled</span>'
  };
  return badges[status] || '<span class="badge badge-neutral">Unknown</span>';
}

async function handleOrderAction(action, orderId) {
  const order = AdminState.orders.find(o => o.id === orderId);
  if (!order) return;
  
  if (action === 'complete') {
    await completeOrder(order);
  }
}

async function completeOrder(order) {
  const confirmed = await askConfirm(
    'Complete Order',
    `Mark order ${order.item} as completed?`,
    'Complete',
    false
  );
  
  if (!confirmed) return;
  
  try {
    await db.collection('orders').doc(order.id).update({
      status: 'completed',
      completedAt: serverTimestamp(),
      completedBy: AdminState.user.uid
    });
    
    await logAdminAction('order_complete', `Completed order ${order.id}`, { orderId: order.id });
    
    toast('Success', 'Order marked as completed', 'success');
    loadOrders();
    
  } catch (error) {
    console.error('Failed to complete order:', error);
    toast('Error', 'Failed to complete order', 'error');
  }
}

/* ============================================================================
10. FRAUD CENTER
============================================================================ */
async function loadFraudCenter() {
  const container = document.getElementById('fraudTable');
  if (!container) return;
  
  try {
    const snap = await db.collection('fraud_events')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    
    AdminState.fraudEvents = [];
    snap.forEach(doc => {
      AdminState.fraudEvents.push({ id: doc.id, ...doc.data() });
    });
    
    renderFraudTable();
    
  } catch (error) {
    console.error('Failed to load fraud events:', error);
    toast('Error', 'Failed to load fraud data', 'error');
  }
}

function renderFraudTable() {
  const container = document.getElementById('fraudTable');
  if (!container) return;
  
  if (AdminState.fraudEvents.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="es-ico">🛡️</div><div class="es-title">No fraud events detected</div></div>';
    return;
  }
  
  container.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>User</th>
          <th>Type</th>
          <th>Severity</th>
          <th>Details</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${AdminState.fraudEvents.map(event => renderFraudRow(event)).join('')}
      </tbody>
    </table>
  `;
}

function renderFraudRow(event) {
  const severityBadge = getSeverityBadge(event.severity);
  
  return `
    <tr>
      <td>${esc(event.username || 'Unknown')}</td>
      <td>${esc(event.type || '—')}</td>
      <td>${severityBadge}</td>
      <td>${esc(event.details || '—')}</td>
      <td>${formatDate(event.timestamp)}</td>
      <td>
        <div class="tbl-actions">
          <button class="mini-btn" data-fraud-action="view" data-fraud-id="${event.id}" title="View">👁️</button>
          <button class="mini-btn danger" data-fraud-action="ban" data-fraud-id="${event.id}" title="Ban User">🚫</button>
        </div>
      </td>
    </tr>
  `;
}

function getSeverityBadge(severity) {
  const badges = {
    'low': '<span class="badge badge-success">Low</span>',
    'medium': '<span class="badge badge-warning">Medium</span>',
    'high': '<span class="badge badge-danger">High</span>'
  };
  return badges[severity] || '<span class="badge badge-neutral">Unknown</span>';
}

/* ============================================================================
11. SETTINGS
============================================================================ */
async function loadSettings() {
  const container = document.getElementById('settingsForm');
  if (!container) return;
  
  try {
    const doc = await db.collection('settings').doc('global').get();
    if (doc.exists) {
      AdminState.settings = doc.data();
    }
    
    renderSettingsForm();
    
  } catch (error) {
    console.error('Failed to load settings:', error);
    toast('Error', 'Failed to load settings', 'error');
  }
}

function renderSettingsForm() {
  const container = document.getElementById('settingsForm');
  if (!container) return;
  
  const s = AdminState.settings;
  
  container.innerHTML = `
    <form id="adminSettingsForm">
      <h3 class="font-bold mb-3">💰 Coin Economy</h3>
      <div class="grid grid-2 gap-3 mb-4">
        <div class="field">
          <label>Coins per $1</label>
          <input type="number" class="input" id="settingCoinRate" value="${s.coinRate || 10000}">
        </div>
        <div class="field">
          <label>Minimum Withdrawal (coins)</label>
          <input type="number" class="input" id="settingMinWithdraw" value="${s.minWithdraw || 10000}">
        </div>
        <div class="field">
          <label>Signup Bonus (coins)</label>
          <input type="number" class="input" id="settingSignupBonus" value="${s.signupBonus || 100}">
        </div>
        <div class="field">
          <label>Withdrawal Fee (%)</label>
          <input type="number" class="input" id="settingWithdrawalFee" value="${s.withdrawalFeePct || 1}">
        </div>
      </div>
      
      <h3 class="font-bold mb-3">📺 Ad Settings</h3>
      <div class="grid grid-2 gap-3 mb-4">
        <div class="field">
          <label>Coins per Ad</label>
          <input type="number" class="input" id="settingAdReward" value="${s.adReward || 120}">
        </div>
        <div class="field">
          <label>Daily Ad Cap</label>
          <input type="number" class="input" id="settingAdCap" value="${s.adDailyCap || 15}">
        </div>
      </div>
      
      <h3 class="font-bold mb-3">👥 Referral Settings</h3>
      <div class="field mb-4">
        <label>Referral Percentage (%)</label>
        <input type="number" class="input" id="settingReferralPercent" value="${s.referralPercent || 10}">
      </div>
      
      <h3 class="font-bold mb-3">🛠️ System</h3>
      <div class="field mb-4">
        <label>
          <input type="checkbox" id="settingMaintenance" ${s.maintenance ? 'checked' : ''}>
          Maintenance Mode
        </label>
      </div>
      
      <button type="submit" class="btn btn-accent btn-lg">💾 Save Settings</button>
    </form>
  `;
  
  document.getElementById('adminSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveSettings();
  });
}

async function saveSettings() {
  try {
    const settings = {
      coinRate: parseInt(document.getElementById('settingCoinRate').value) || 10000,
      minWithdraw: parseInt(document.getElementById('settingMinWithdraw').value) || 10000,
      signupBonus: parseInt(document.getElementById('settingSignupBonus').value) || 100,
      withdrawalFeePct: parseFloat(document.getElementById('settingWithdrawalFee').value) || 1,
      adReward: parseInt(document.getElementById('settingAdReward').value) || 120,
      adDailyCap: parseInt(document.getElementById('settingAdCap').value) || 15,
      referralPercent: parseFloat(document.getElementById('settingReferralPercent').value) || 10,
      maintenance: document.getElementById('settingMaintenance').checked,
      updatedAt: serverTimestamp(),
      updatedBy: AdminState.user.uid
    };
    
    await db.collection('settings').doc('global').set(settings);
    
    await logAdminAction('settings_update', 'Updated global settings', {});
    
    AdminState.settings = settings;
    
    toast('Success', 'Settings saved successfully', 'success');
    
  } catch (error) {
    console.error('Failed to save settings:', error);
    toast('Error', 'Failed to save settings', 'error');
  }
}

/* ============================================================================
12. AUDIT LOGS
============================================================================ */
async function loadAuditLogs() {
  const container = document.getElementById('auditLogsTable');
  if (!container) return;
  
  try {
    const snap = await db.collection('admin_logs')
      .orderBy('timestamp', 'desc')
      .limit(200)
      .get();
    
    AdminState.adminLogs = [];
    snap.forEach(doc => {
      AdminState.adminLogs.push({ id: doc.id, ...doc.data() });
    });
    
    renderAuditLogsTable();
    
  } catch (error) {
    console.error('Failed to load audit logs:', error);
    toast('Error', 'Failed to load audit logs', 'error');
  }
}

function renderAuditLogsTable() {
  const container = document.getElementById('auditLogsTable');
  if (!container) return;
  
  if (AdminState.adminLogs.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="es-ico">📜</div><div class="es-title">No audit logs yet</div></div>';
    return;
  }
  
  container.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Time</th>
          <th>Admin</th>
          <th>Action</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${AdminState.adminLogs.map(log => renderAuditLogRow(log)).join('')}
      </tbody>
    </table>
  `;
}

function renderAuditLogRow(log) {
  return `
    <tr>
      <td>${formatDate(log.timestamp)}</td>
      <td>${esc(log.adminEmail || '—')}</td>
      <td><span class="badge badge-info">${esc(log.action || '—')}</span></td>
      <td>${esc(log.details || '—')}</td>
    </tr>
  `;
}

/* ============================================================================
13. UTILITY FUNCTIONS
============================================================================ */
async function logAdminAction(action, details, metadata = {}) {
  try {
    await db.collection('admin_logs').add({
      action,
      details,
      adminId: AdminState.user.uid,
      adminEmail: AdminState.user.email,
      metadata,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

function formatDate(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toast(title, message, type = 'info') {
  const wrap = document.getElementById('adminToastWrap');
  if (!wrap) return;
  
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  
  const box = document.createElement('div');
  box.className = `toast ${type}`;
  box.innerHTML = `
    <span class="toast-ico">${icons[type] || 'ℹ️'}</span>
    <div class="toast-body">
      <div class="toast-title">${esc(title)}</div>
      <div class="toast-msg">${esc(message)}</div>
    </div>
    <span class="toast-progress"></span>
  `;
  
  wrap.appendChild(box);
  
  setTimeout(() => {
    box.classList.add('hide');
    setTimeout(() => box.remove(), 320);
  }, 4000);
}

function openModal(title, html) {
  const titleEl = document.getElementById('genericModalTitle');
  const bodyEl = document.getElementById('genericModalBody');
  
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = html;
  
  const modal = document.getElementById('genericModal');
  if (modal) modal.classList.add('open');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

async function askConfirm(title, message, okLabel = 'Confirm', danger = false) {
  return new Promise((resolve) => {
    const ico = document.getElementById('confirmDialogIco');
    const titleEl = document.getElementById('confirmDialogTitle');
    const bodyEl = document.getElementById('confirmDialogBody');
    const okBtn = document.getElementById('confirmDialogOk');
    
    if (ico) ico.textContent = danger ? '⚠️' : '❓';
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.textContent = message;
    if (okBtn) okBtn.textContent = okLabel;
    
    const modal = document.getElementById('confirmDialog');
    if (modal) modal.classList.add('open');
    
    const handleOk = () => {
      modal.classList.remove('open');
      okBtn.removeEventListener('click', handleOk);
      resolve(true);
    };
    
    const handleCancel = () => {
      modal.classList.remove('open');
      okBtn.removeEventListener('click', handleOk);
      resolve(false);
    };
    
    okBtn.addEventListener('click', handleOk);
    document.getElementById('confirmDialogCancel').addEventListener('click', handleCancel, { once: true });
  });
}

/* ============================================================================
14. REAL-TIME LISTENERS
============================================================================ */
function startRealtimeListeners() {
  // Listen for new withdrawals
  db.collection('withdrawals')
    .where('status', '==', 'pending')
    .onSnapshot((snap) => {
      AdminState.stats.pendingWithdrawals = snap.size;
      updateDashboardStats();
    });
  
  // Listen for new orders
  db.collection('orders')
    .where('status', '==', 'pending')
    .onSnapshot((snap) => {
      AdminState.stats.pendingOrders = snap.size;
      updateDashboardStats();
    });
  
  // Listen for fraud events
  db.collection('fraud_events')
    .where('severity', '==', 'high')
    .onSnapshot((snap) => {
      AdminState.stats.fraudAlerts = snap.size;
      updateDashboardStats();
    });
}

/* ============================================================================
15. INITIALIZATION
============================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Login form
  const loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('adminEmail').value.trim();
      const password = document.getElementById('adminPassword').value;
      
      if (!email || !password) {
        toast('Error', 'Please fill in all fields', 'warning');
        return;
      }
      
      try {
        await auth.signInWithEmailAndPassword(email, password);
        toast('Success', 'Logging in...', 'success');
      } catch (error) {
        toast('Error', error.message, 'error');
      }
    });
  }
  
  // Logout button
  const logoutBtn = document.getElementById('adminLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await auth.signOut();
      toast('Success', 'Logged out successfully', 'success');
    });
  }
  
  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-scrim');
      if (modal) modal.classList.remove('open');
    });
  });
  
  // Initialize auth
  initAdminAuth();
});

/* ============================================================================
END OF ADMIN.JS
============================================================================ */