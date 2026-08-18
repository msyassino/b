// ============================================================================
// REWARDS ADMIN PANEL - Complete Administration System
// Version: 2.0.0
// ============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyBPMbRdVEJ85Is7eg4UkAFs_UHq-BD_Fhg",
  authDomain: "rewords-45ccf.firebaseapp.com",
  projectId: "rewords-45ccf",
  storageBucket: "rewords-45ccf.firebasestorage.app",
  messagingSenderId: "324257034049",
  appId: "1:32457034049:web:2e75279382793007683bc0",
  measurementId: "G-5LNDESBVST"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ============================================================================
// ADMIN STATE
// ============================================================================

const AdminState = {
  currentUser: null,
  adminProfile: null,
  dashboardStats: {
    totalUsers: 0, activeUsers: 0, newUsersToday: 0,
    revenueToday: 0, revenue7d: 0, revenue30d: 0,
    userRewardsToday: 0, netProfit: 0,
    pendingWithdrawals: 0, fraudAlerts: 0, chargebacks: 0,
    conversionRate: 0, arpu: 0, revenuePerActiveUser: 0,
    topCountries: [], topOffers: []
  },
  users: [], usersPagination: { page: 1, limit: 25, total: 0 },
  offers: [], offersPagination: { page: 1, limit: 25, total: 0 },
  providers: [], rewards: [],
  rewardsPagination: { page: 1, limit: 25, total: 0 },
  rewardCategories: [], orders: [],
  ordersPagination: { page: 1, limit: 25, total: 0 },
  withdrawals: [],
  withdrawalsPagination: { page: 1, limit: 25, total: 0 },
  fraudEvents: {}, finance: {}, campaigns: [],
  tickets: [],
  ticketsPagination: { page: 1, limit: 25, total: 0 },
  settings: {}, logs: [],
  logsPagination: { page: 1, limit: 25, total: 0 },
  analytics: {}, ads: {}, referrals: {}, security: {},
  currentSection: 'dashboard', filters: {}, searchQuery: '',
  selectedItems: [], realtimeUnsubscribers: [],
  chartInstances: {},
  adminEmail: 'kenven@admin.com',
  adminPassword: 'kenven@admin'
};

// ============================================================================
// ADMIN AUTHENTICATION MODULE
// ============================================================================

const AdminAuth = {
  async adminLogin(email, password) {
    try {
      if (!email || !password) {
        showToast('error', 'Validation Error', 'Email and password are required');
        return { success: false, error: 'Email and password are required' };
      }
      if (email !== AdminState.adminEmail || password !== AdminState.adminPassword) {
        showToast('error', 'Authentication Failed', 'Invalid admin credentials');
        return { success: false, error: 'Invalid credentials' };
      }
      showLoading();
      const credential = await auth.signInWithEmailAndPassword(email, password);
      const user = credential.user;
      const adminDoc = await db.collection('admins').doc(user.uid).get();
      if (!adminDoc.exists) {
        await db.collection('admins').doc(user.uid).set({
          email: email, role: 'super_admin', permissions: ['all'],
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
          active: true, displayName: 'Kenven Admin'
        });
      } else {
        await db.collection('admins').doc(user.uid).update({
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      AdminState.currentUser = user;
      await AdminAuth.loadAdminProfile();
      await AuditLog.logAction('admin_login', 'admin', { email, uid: user.uid });
      hideLoading();
      showToast('success', 'Welcome Back', 'Successfully logged in as admin');
      navigateToAdmin('dashboard');
      return { success: true, user };
    } catch (error) {
      hideLoading();
      console.error('Admin login error:', error);
      showToast('error', 'Login Failed', error.message);
      return { success: false, error: error.message };
    }
  },

  async adminLogout() {
    try {
      const uid = AdminState.currentUser ? AdminState.currentUser.uid : 'unknown';
      await AuditLog.logAction('admin_logout', 'admin', { uid });
      AdminState.realtimeUnsubscribers.forEach(unsub => unsub());
      AdminState.realtimeUnsubscribers = [];
      Object.keys(AdminState.chartInstances).forEach(key => {
        if (AdminState.chartInstances[key]) {
          AdminState.chartInstances[key].destroy();
          delete AdminState.chartInstances[key];
        }
      });
      await auth.signOut();
      AdminState.currentUser = null;
      AdminState.adminProfile = null;
      showToast('info', 'Logged Out', 'You have been logged out');
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Admin logout error:', error);
      showToast('error', 'Logout Error', error.message);
    }
  },

  async checkAdminAuth() {
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        unsubscribe();
        if (user) {
          if (user.email !== AdminState.adminEmail) {
            showToast('error', 'Access Denied', 'You are not authorized as admin');
            await auth.signOut();
            window.location.href = 'login.html';
            resolve(false);
            return;
          }
          AdminState.currentUser = user;
          await AdminAuth.loadAdminProfile();
          resolve(true);
        } else {
          window.location.href = 'login.html';
          resolve(false);
        }
      });
    });
  },

  async loadAdminProfile() {
    try {
      if (!AdminState.currentUser) return null;
      const doc = await db.collection('admins').doc(AdminState.currentUser.uid).get();
      if (doc.exists) {
        AdminState.adminProfile = { id: doc.id, ...doc.data() };
      } else {
        AdminState.adminProfile = {
          id: AdminState.currentUser.uid,
          email: AdminState.currentUser.email,
          role: 'super_admin', permissions: ['all'],
          displayName: 'Kenven Admin', active: true
        };
      }
      return AdminState.adminProfile;
    } catch (error) {
      console.error('Load admin profile error:', error);
      return null;
    }
  },

  async protectRoute() {
    const isAuthenticated = await AdminAuth.checkAdminAuth();
    if (!isAuthenticated) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  hasPermission(permission) {
    if (!AdminState.adminProfile) return false;
    if (AdminState.adminProfile.permissions && AdminState.adminProfile.permissions.includes('all')) return true;
    if (AdminState.adminProfile.role === 'super_admin') return true;
    return AdminState.adminProfile.permissions && AdminState.adminProfile.permissions.includes(permission);
  }
};

// ============================================================================
// ADMIN ROUTING MODULE
// ============================================================================

const AdminRouter = {
  routes: {
    dashboard: { title: 'Dashboard', icon: 'fas fa-tachometer-alt', load: loadDashboard, render: renderDashboard },
    users: { title: 'Users', icon: 'fas fa-users', load: () => loadUsers({}, { page: 1, limit: 25 }) },
    offers: { title: 'Offers', icon: 'fas fa-hand-holding-usd', load: () => loadOffers({}, { page: 1, limit: 25 }) },
    providers: { title: 'Providers', icon: 'fas fa-building', load: loadProviders },
    rewards: { title: 'Rewards', icon: 'fas fa-gift', load: () => loadRewards(null, { page: 1, limit: 25 }) },
    orders: { title: 'Orders', icon: 'fas fa-shopping-cart', load: () => loadOrders({}, { page: 1, limit: 25 }) },
    withdrawals: { title: 'Withdrawals', icon: 'fas fa-money-bill-wave', load: () => loadWithdrawals('pending', {}, { page: 1, limit: 25 }) },
    fraud: { title: 'Fraud Center', icon: 'fas fa-shield-alt', load: loadFraudDashboard },
    finance: { title: 'Finance', icon: 'fas fa-chart-line', load: loadFinance },
    analytics: { title: 'Analytics', icon: 'fas fa-chart-bar', load: loadAnalytics },
    ads: { title: 'Ads', icon: 'fas fa-ad', load: loadAds },
    campaigns: { title: 'Campaigns', icon: 'fas fa-bullhorn', load: loadCampaigns },
    referrals: { title: 'Referrals', icon: 'fas fa-user-friends', load: loadReferralSettings },
    content: { title: 'Content', icon: 'fas fa-file-alt', load: loadHomepageSections },
    support: { title: 'Support', icon: 'fas fa-headset', load: () => loadTickets({}, { page: 1, limit: 25 }) },
    settings: { title: 'Settings', icon: 'fas fa-cog', load: loadSettings },
    security: { title: 'Security', icon: 'fas fa-lock', load: loadAdminAccounts },
    logs: { title: 'Audit Logs', icon: 'fas fa-history', load: () => loadLogs({}, { page: 1, limit: 25 }) }
  },

  navigateToAdmin(section) {
    if (!this.routes[section]) {
      showToast('error', 'Navigation Error', `Section "${section}" not found`);
      return;
    }
    AdminState.currentSection = section;
    AdminState.filters = {};
    AdminState.searchQuery = '';
    AdminState.selectedItems = [];
    document.querySelectorAll('.admin-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const sectionEl = document.getElementById(`section-${section}`);
    if (sectionEl) sectionEl.classList.add('active');
    const navEl = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (navEl) navEl.classList.add('active');
    document.getElementById('page-title').textContent = this.routes[section].title;
    const route = this.routes[section];
    if (route.load) route.load();
  },

  initAdminRouter() {
    document.querySelectorAll('.nav-item[data-section]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToAdmin(el.getAttribute('data-section'));
      });
    });
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    this.navigateToAdmin(this.routes[hash] ? hash : 'dashboard');
  }
};

function navigateToAdmin(section) { AdminRouter.navigateToAdmin(section); }

// ============================================================================
// DASHBOARD MODULE
// ============================================================================

async function getTotalUsers() {
  try {
    const doc = await db.collection('stats').doc('global').get();
    if (doc.exists && doc.data().totalUsers !== undefined) return doc.data().totalUsers;
    const snapshot = await db.collection('users').count().get();
    return snapshot.data().count;
  } catch (error) { console.error('getTotalUsers error:', error); return 0; }
}

async function getActiveUsers() {
  try {
    const d = new Date(); d.setDate(d.getDate() - 30);
    const snapshot = await db.collection('users').where('lastActive', '>=', d).count().get();
    return snapshot.data().count;
  } catch (error) { console.error('getActiveUsers error:', error); return 0; }
}

async function getNewUsersToday() {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const snapshot = await db.collection('users').where('createdAt', '>=', today).count().get();
    return snapshot.data().count;
  } catch (error) { console.error('getNewUsersToday error:', error); return 0; }
}

async function getRevenueToday() {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const snapshot = await db.collection('transactions').where('type', '==', 'revenue').where('createdAt', '>=', today).get();
    let total = 0; snapshot.forEach(doc => { total += doc.data().amount || 0; });
    return total;
  } catch (error) { console.error('getRevenueToday error:', error); return 0; }
}

async function getRevenue7d() {
  try {
    const d = new Date(); d.setDate(d.getDate() - 7);
    const snapshot = await db.collection('transactions').where('type', '==', 'revenue').where('createdAt', '>=', d).get();
    let total = 0; snapshot.forEach(doc => { total += doc.data().amount || 0; });
    return total;
  } catch (error) { console.error('getRevenue7d error:', error); return 0; }
}

async function getRevenue30d() {
  try {
    const d = new Date(); d.setDate(d.getDate() - 30);
    const snapshot = await db.collection('transactions').where('type', '==', 'revenue').where('createdAt', '>=', d).get();
    let total = 0; snapshot.forEach(doc => { total += doc.data().amount || 0; });
    return total;
  } catch (error) { console.error('getRevenue30d error:', error); return 0; }
}

async function getUserRewardsToday() {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const snapshot = await db.collection('transactions').where('type', '==', 'reward').where('createdAt', '>=', today).get();
    let total = 0; snapshot.forEach(doc => { total += doc.data().amount || 0; });
    return total;
  } catch (error) { console.error('getUserRewardsToday error:', error); return 0; }
}

async function getNetProfit() {
  try {
    const revenue = await getRevenueToday();
    const rewards = await getUserRewardsToday();
    return revenue - rewards;
  } catch (error) { console.error('getNetProfit error:', error); return 0; }
}

async function getPendingWithdrawals() {
  try {
    const snapshot = await db.collection('withdrawals').where('status', '==', 'pending').count().get();
    return snapshot.data().count;
  } catch (error) { console.error('getPendingWithdrawals error:', error); return 0; }
}

async function getFraudAlerts() {
  try {
    const snapshot = await db.collection('fraudEvents').where('status', '==', 'new').count().get();
    return snapshot.data().count;
  } catch (error) { console.error('getFraudAlerts error:', error); return 0; }
}

async function getChargebacks() {
  try {
    const snapshot = await db.collection('chargebacks').where('status', '==', 'pending').count().get();
    return snapshot.data().count;
  } catch (error) { console.error('getChargebacks error:', error); return 0; }
}

async function getConversionRate() {
  try {
    const totalUsers = await getTotalUsers();
    if (totalUsers === 0) return 0;
    const snap = await db.collection('users').where('completedOffers', '>', 0).count().get();
    return ((snap.data().count / totalUsers) * 100).toFixed(2);
  } catch (error) { console.error('getConversionRate error:', error); return 0; }
}

async function getARPU() {
  try {
    const totalUsers = await getTotalUsers();
    if (totalUsers === 0) return 0;
    return ((await getRevenue30d()) / totalUsers).toFixed(2);
  } catch (error) { console.error('getARPU error:', error); return 0; }
}

async function getRevenuePerActiveUser() {
  try {
    const activeUsers = await getActiveUsers();
    if (activeUsers === 0) return 0;
    return ((await getRevenue30d()) / activeUsers).toFixed(2);
  } catch (error) { console.error('getRevenuePerActiveUser error:', error); return 0; }
}

async function getTopCountries() {
  try {
    const snapshot = await db.collection('users').limit(1000).get();
    const countries = {};
    snapshot.forEach(doc => {
      const c = doc.data().country || 'Unknown';
      countries[c] = (countries[c] || 0) + 1;
    });
    return Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([country, count]) => ({ country, count }));
  } catch (error) { console.error('getTopCountries error:', error); return []; }
}

async function getTopOffers() {
  try {
    const snapshot = await db.collection('offers').orderBy('completions', 'desc').limit(10).get();
    const offers = [];
    snapshot.forEach(doc => offers.push({ id: doc.id, ...doc.data() }));
    return offers;
  } catch (error) { console.error('getTopOffers error:', error); return []; }
}

async function loadDashboard() {
  try {
    showLoading();
    const results = await Promise.all([
      getTotalUsers(), getActiveUsers(), getNewUsersToday(),
      getRevenueToday(), getRevenue7d(), getRevenue30d(),
      getUserRewardsToday(), getNetProfit(),
      getPendingWithdrawals(), getFraudAlerts(), getChargebacks(),
      getConversionRate(), getARPU(), getRevenuePerActiveUser(),
      getTopCountries(), getTopOffers()
    ]);
    AdminState.dashboardStats = {
      totalUsers: results[0], activeUsers: results[1], newUsersToday: results[2],
      revenueToday: results[3], revenue7d: results[4], revenue30d: results[5],
      userRewardsToday: results[6], netProfit: results[7],
      pendingWithdrawals: results[8], fraudAlerts: results[9], chargebacks: results[10],
      conversionRate: results[11], arpu: results[12], revenuePerActiveUser: results[13],
      topCountries: results[14], topOffers: results[15]
    };
    renderDashboard();
    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('loadDashboard error:', error);
    showToast('error', 'Dashboard Error', 'Failed to load dashboard data');
  }
}

function renderDashboard() {
  const s = AdminState.dashboardStats;
  const container = document.getElementById('dashboard-content');
  if (!container) return;
  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-info"><h3>${formatNumber(s.totalUsers)}</h3><p>Total Users</p><span class="stat-change positive">+${s.newUsersToday} today</span></div></div>
      <div class="stat-card"><div class="stat-icon revenue"><i class="fas fa-dollar-sign"></i></div><div class="stat-info"><h3>${formatUSD(s.revenueToday)}</h3><p>Revenue Today</p><span class="stat-change">${formatUSD(s.revenue7d)} (7d)</span></div></div>
      <div class="stat-card"><div class="stat-icon rewards"><i class="fas fa-coins"></i></div><div class="stat-info"><h3>${formatUSD(s.userRewardsToday)}</h3><p>Rewards Today</p></div></div>
      <div class="stat-card"><div class="stat-icon profit"><i class="fas fa-chart-line"></i></div><div class="stat-info"><h3>${formatUSD(s.netProfit)}</h3><p>Net Profit</p><span class="stat-change">${((s.netProfit / (s.revenueToday || 1)) * 100).toFixed(1)}% margin</span></div></div>
      <div class="stat-card"><div class="stat-icon warning"><i class="fas fa-clock"></i></div><div class="stat-info"><h3>${s.pendingWithdrawals}</h3><p>Pending Withdrawals</p></div></div>
      <div class="stat-card"><div class="stat-icon danger"><i class="fas fa-shield-alt"></i></div><div class="stat-info"><h3>${s.fraudAlerts}</h3><p>Fraud Alerts</p><span class="stat-change">${s.chargebacks} chargebacks</span></div></div>
      <div class="stat-card"><div class="stat-icon"><i class="fas fa-percentage"></i></div><div class="stat-info"><h3>${s.conversionRate}%</h3><p>Conversion Rate</p></div></div>
      <div class="stat-card"><div class="stat-icon revenue"><i class="fas fa-user-dollar"></i></div><div class="stat-info"><h3>${formatUSD(s.arpu)}</h3><p>ARPU (30d)</p></div></div>
    </div>
    <div class="dashboard-charts">
      <div class="chart-container"><h3>Revenue Overview</h3><canvas id="revenue-chart"></canvas></div>
      <div class="chart-container"><h3>User Growth</h3><canvas id="user-chart"></canvas></div>
    </div>
    <div class="dashboard-tables">
      <div class="table-card"><h3>Top Countries</h3><table class="admin-table"><thead><tr><th>Country</th><th>Users</th><th>%</th></tr></thead><tbody>${(s.topCountries || []).map(c => `<tr><td>${c.country}</td><td>${formatNumber(c.count)}</td><td>${((c.count / (s.totalUsers || 1)) * 100).toFixed(1)}%</td></tr>`).join('')}</tbody></table></div>
      <div class="table-card"><h3>Top Offers</h3><table class="admin-table"><thead><tr><th>Offer</th><th>Completions</th><th>Reward</th></tr></thead><tbody>${(s.topOffers || []).map(o => `<tr><td>${o.name || 'Unknown'}</td><td>${formatNumber(o.completions || 0)}</td><td>${formatUSD(o.reward || 0)}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
  renderRevenueChart(null);
  renderUserChart(null);
}

function renderRevenueChart(data) {
  const canvas = document.getElementById('revenue-chart');
  if (!canvas) return;
  if (AdminState.chartInstances.revenue) AdminState.chartInstances.revenue.destroy();
  const ctx = canvas.getContext('2d');
  const labels = data ? data.map(d => d.label) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const rt = AdminState.dashboardStats.revenueToday || 0;
  const values = data ? data.map(d => d.value) : [rt*0.8, rt*0.9, rt*1.1, rt*0.7, rt*1.2, rt*1.0, rt];
  AdminState.chartInstances.revenue = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Revenue ($)', data: values, borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.1)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#4f46e5' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v.toFixed(0) } } } }
  });
}

function renderUserChart(data) {
  const canvas = document.getElementById('user-chart');
  if (!canvas) return;
  if (AdminState.chartInstances.users) AdminState.chartInstances.users.destroy();
  const ctx = canvas.getContext('2d');
  const labels = data ? data.map(d => d.label) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  AdminState.chartInstances.users = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'New Users', data: [12,19,15,25,22,30,AdminState.dashboardStats.newUsersToday], backgroundColor: 'rgba(79,70,229,0.8)', borderRadius: 4 },
        { label: 'Active Users', data: [150,160,155,170,165,180,AdminState.dashboardStats.activeUsers], backgroundColor: 'rgba(16,185,129,0.8)', borderRadius: 4 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
  });
}

async function refreshDashboard() { await loadDashboard(); showToast('success', 'Refreshed', 'Dashboard data refreshed'); }

// ============================================================================
// USERS MANAGEMENT MODULE
// ============================================================================

async function loadUsers(filters = {}, pagination = { page: 1, limit: 25 }, search = '') {
  try {
    showLoading();
    AdminState.filters = filters;
    AdminState.usersPagination = { ...AdminState.usersPagination, ...pagination };
    let query = db.collection('users');
    const constraints = [];
    if (filters.status) constraints.push({ field: 'status', op: '==', value: filters.status });
    if (filters.country) constraints.push({ field: 'country', op: '==', value: filters.country });
    if (filters.minCoins) constraints.push({ field: 'coins', op: '>=', value: Number(filters.minCoins) });
    if (filters.maxCoins) constraints.push({ field: 'coins', op: '<=', value: Number(filters.maxCoins) });
    constraints.forEach(c => { query = query.where(c.field, c.op, c.value); });
    const countSnapshot = await query.count().get();
    AdminState.usersPagination.total = countSnapshot.data().count;
    const offset = (AdminState.usersPagination.page - 1) * AdminState.usersPagination.limit;
    query = query.orderBy('createdAt', 'desc').offset(offset).limit(AdminState.usersPagination.limit);
    const snapshot = await query.get();
    AdminState.users = [];
    snapshot.forEach(doc => AdminState.users.push({ id: doc.id, ...doc.data() }));
    if (search) {
      const q = search.toLowerCase();
      AdminState.users = AdminState.users.filter(u => (u.email && u.email.toLowerCase().includes(q)) || (u.displayName && u.displayName.toLowerCase().includes(q)) || (u.username && u.username.toLowerCase().includes(q)));
    }
    renderUsersTable(AdminState.users);
    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('loadUsers error:', error);
    showToast('error', 'Load Error', 'Failed to load users');
  }
}

async function searchUsers(query) {
  AdminState.searchQuery = query;
  await loadUsers(AdminState.filters, { page: 1, limit: 25 }, query);
}

function filterUsers(filters) { loadUsers(filters, { page: 1, limit: 25 }, AdminState.searchQuery); }

async function getUserDetail(userId) {
  try {
    showLoading();
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) { hideLoading(); showToast('error', 'Not Found', 'User not found'); return null; }
    const user = { id: doc.id, ...doc.data() };
    const [txSnap, offersSnap, devicesSnap, ipsSnap, refsSnap, wSnap] = await Promise.all([
      db.collection('transactions').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(50).get(),
      db.collection('offerCompletions').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(50).get(),
      db.collection('userDevices').where('userId', '==', userId).get(),
      db.collection('userIPs').where('userId', '==', userId).get(),
      db.collection('referrals').where('referrerId', '==', userId).get(),
      db.collection('withdrawals').where('userId', '==', userId).orderBy('createdAt', 'desc').get()
    ]);
    user.transactionsList = []; txSnap.forEach(d => user.transactionsList.push({ id: d.id, ...d.data() }));
    user.offersList = []; offersSnap.forEach(d => user.offersList.push({ id: d.id, ...d.data() }));
    user.devicesList = []; devicesSnap.forEach(d => user.devicesList.push({ id: d.id, ...d.data() }));
    user.ipsList = []; ipsSnap.forEach(d => user.ipsList.push({ id: d.id, ...d.data() }));
    user.referralsList = []; refsSnap.forEach(d => user.referralsList.push({ id: d.id, ...d.data() }));
    user.withdrawalsList = []; wSnap.forEach(d => user.withdrawalsList.push({ id: d.id, ...d.data() }));
    hideLoading();
    renderUserDetail(user);
    return user;
  } catch (error) {
    hideLoading();
    console.error('getUserDetail error:', error);
    showToast('error', 'Load Error', 'Failed to load user details');
    return null;
  }
}

function renderUsersTable(users) {
  const container = document.getElementById('users-content');
  if (!container) return;
  const p = AdminState.usersPagination;
  const tp = Math.ceil(p.total / p.limit);
  container.innerHTML = `
    <div class="section-header"><div class="search-filter">
      <input type="text" id="users-search" class="search-input" placeholder="Search users by email, name, username..." value="${AdminState.searchQuery}">
      <div class="filter-group">
        <select id="users-status-filter" class="filter-select">
          <option value="">All Status</option>
          <option value="active" ${AdminState.filters.status==='active'?'selected':''}>Active</option>
          <option value="banned" ${AdminState.filters.status==='banned'?'selected':''}>Banned</option>
          <option value="suspended" ${AdminState.filters.status==='suspended'?'selected':''}>Suspended</option>
          <option value="restricted" ${AdminState.filters.status==='restricted'?'selected':''}>Restricted</option>
        </select>
        <button class="btn btn-primary" onclick="exportUsers('csv')"><i class="fas fa-download"></i> Export</button>
      </div>
    </div></div>
    <div class="table-responsive"><table class="admin-table" id="users-table">
      <thead><tr><th><input type="checkbox" id="select-all-users"></th><th>User</th><th>Email</th><th>Coins</th><th>Country</th><th>Status</th><th>Risk</th><th>Joined</th><th>Actions</th></tr></thead>
      <tbody>${users.length===0 ? '<tr><td colspan="9" class="text-center">No users found</td></tr>' : users.map(u => `
        <tr data-user-id="${u.id}">
          <td><input type="checkbox" class="user-checkbox" value="${u.id}"></td>
          <td><div class="user-info"><img src="${u.photoURL || 'https://ui-avatars.com/api/?name=' + (u.displayName || 'U')}" class="avatar-sm" alt=""><span>${u.displayName || 'Unknown'}</span></div></td>
          <td>${u.email || 'N/A'}</td>
          <td><span class="coins-badge">${formatNumber(u.coins || 0)}</span></td>
          <td>${u.country || 'Unknown'}</td>
          <td><span class="status-badge status-${u.status || 'active'}">${u.status || 'active'}</span></td>
          <td><span class="risk-badge risk-${u.riskLevel || 'low'}">${u.riskLevel || 'low'}</span></td>
          <td>${formatDate(u.createdAt)}</td>
          <td><div class="action-buttons">
            <button class="btn-icon" onclick="getUserDetail('${u.id}')" title="View"><i class="fas fa-eye"></i></button>
            <button class="btn-icon" onclick="showAddCoinsModal('${u.id}')" title="Add Coins"><i class="fas fa-plus-circle"></i></button>
            <button class="btn-icon" onclick="showRemoveCoinsModal('${u.id}')" title="Remove Coins"><i class="fas fa-minus-circle"></i></button>
            <button class="btn-icon danger" onclick="banUser('${u.id}')" title="Ban"><i class="fas fa-ban"></i></button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>
    <div class="pagination">
      <button class="btn btn-sm" onclick="loadUsers(AdminState.filters, { page: ${p.page - 1}, limit: ${p.limit} })" ${p.page<=1?'disabled':''}><i class="fas fa-chevron-left"></i> Previous</button>
      <span class="page-info">Page ${p.page} of ${tp} (${p.total} total)</span>
      <button class="btn btn-sm" onclick="loadUsers(AdminState.filters, { page: ${p.page + 1}, limit: ${p.limit} })" ${p.page>=tp?'disabled':''}>Next <i class="fas fa-chevron-right"></i></button>
    </div>`;
  document.getElementById('users-search')?.addEventListener('input', debounce(e => searchUsers(e.target.value), 300));
  document.getElementById('users-status-filter')?.addEventListener('change', e => filterUsers({ ...AdminState.filters, status: e.target.value }));
  document.getElementById('select-all-users')?.addEventListener('change', e => document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = e.target.checked));
}

function renderUserDetail(user) {
  const container = document.getElementById('users-content');
  if (!container) return;
  container.innerHTML = `
    <div class="detail-header">
      <button class="btn btn-secondary" onclick="loadUsers(AdminState.filters, AdminState.usersPagination)"><i class="fas fa-arrow-left"></i> Back to Users</button>
      <h2>${user.displayName || 'User Detail'}</h2>
    </div>
    <div class="detail-grid">
      <div class="detail-card"><h3>User Info</h3>
        <div class="info-grid">
          <div><label>Email:</label><span>${user.email || 'N/A'}</span></div>
          <div><label>Username:</label><span>${user.username || 'N/A'}</span></div>
          <div><label>Coins:</label><span class="coins-badge">${formatNumber(user.coins || 0)}</span></div>
          <div><label>Status:</label><span class="status-badge status-${user.status || 'active'}">${user.status || 'active'}</span></div>
          <div><label>Country:</label><span>${user.country || 'Unknown'}</span></div>
          <div><label>Risk Level:</label><span class="risk-badge risk-${user.riskLevel || 'low'}">${user.riskLevel || 'low'}</span></div>
          <div><label>Joined:</label><span>${formatDate(user.createdAt)}</span></div>
          <div><label>Last Active:</label><span>${formatDate(user.lastActive)}</span></div>
        </div>
        <div class="action-bar">
          <button class="btn btn-primary" onclick="showAddCoinsModal('${user.id}')">Add Coins</button>
          <button class="btn btn-warning" onclick="showRemoveCoinsModal('${user.id}')">Remove Coins</button>
          <button class="btn btn-danger" onclick="banUser('${user.id}')">Ban User</button>
          <button class="btn btn-secondary" onclick="impersonateUser('${user.id}')">Impersonate</button>
        </div>
      </div>
      <div class="detail-card"><h3>Risk Score: ${calculateUserRiskScore(user)}</h3>
        <div class="risk-indicators">
          <div><label>Shared Devices:</label><span>${user.devicesList ? user.devicesList.length : 0}</span></div>
          <div><label>Shared IPs:</label><span>${user.ipsList ? user.ipsList.length : 0}</span></div>
          <div><label>VPN Detected:</label><span>${user.vpnDetected ? 'Yes' : 'No'}</span></div>
          <div><label>Emulator:</label><span>${user.emulatorDetected ? 'Yes' : 'No'}</span></div>
          <div><label>Referral Count:</label><span>${user.referralsList ? user.referralsList.length : 0}</span></div>
        </div>
      </div>
    </div>
    <div class="detail-tabs">
      <div class="tab-nav">
        <button class="tab-btn active" data-tab="transactions">Transactions</button>
        <button class="tab-btn" data-tab="offers">Offers</button>
        <button class="tab-btn" data-tab="devices">Devices</button>
        <button class="tab-btn" data-tab="ips">IPs</button>
        <button class="tab-btn" data-tab="referrals">Referrals</button>
        <button class="tab-btn" data-tab="withdrawals">Withdrawals</button>
      </div>
      <div class="tab-content active" id="tab-transactions">${renderUserTransactions(user.transactionsList || [])}</div>
      <div class="tab-content" id="tab-offers">${renderUserOffers(user.offersList || [])}</div>
      <div class="tab-content" id="tab-devices">${renderUserDevices(user.devicesList || [])}</div>
      <div class="tab-content" id="tab-ips">${renderUserIPs(user.ipsList || [])}</div>
      <div class="tab-content" id="tab-referrals">${renderUserReferrals(user.referralsList || [])}</div>
      <div class="tab-content" id="tab-withdrawals">${renderUserWithdrawals(user.withdrawalsList || [])}</div>
    </div>`;
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

async function addUserCoins(userId, amount, reason) {
  try {
    if (!AdminAuth.hasPermission('manage_coins')) { showToast('error', 'Permission Denied', 'You do not have permission to add coins'); return; }
    if (!amount || amount <= 0) { showToast('error', 'Validation Error', 'Amount must be positive'); return; }
    showLoading();
    const amountNum = Number(amount);
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error('User not found');
      const currentCoins = userDoc.data().coins || 0;
      transaction.update(userRef, { coins: currentCoins + amountNum });
      const txRef = db.collection('transactions').doc();
      transaction.set(txRef, { userId, type: 'admin_add', amount: amountNum, reason: reason || 'Admin coin addition', adminId: AdminState.currentUser.uid, adminEmail: AdminState.currentUser.email, createdAt: firebase.firestore.FieldValue.serverTimestamp(), balanceAfter: currentCoins + amountNum });
    });
    await AuditLog.logAction('add_coins', 'user', { userId, amount: amountNum, reason, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Coins Added', `Successfully added ${formatNumber(amountNum)} coins`);
    hideModal('add-coins-modal');
    getUserDetail(userId);
  } catch (error) { hideLoading(); console.error('addUserCoins error:', error); showToast('error', 'Error', error.message); }
}

async function removeUserCoins(userId, amount, reason) {
  try {
    if (!AdminAuth.hasPermission('manage_coins')) { showToast('error', 'Permission Denied', 'You do not have permission to remove coins'); return; }
    if (!amount || amount <= 0) { showToast('error', 'Validation Error', 'Amount must be positive'); return; }
    showLoading();
    const amountNum = Number(amount);
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error('User not found');
      const currentCoins = userDoc.data().coins || 0;
      if (currentCoins < amountNum) throw new Error('Insufficient coins');
      transaction.update(userRef, { coins: currentCoins - amountNum });
      const txRef = db.collection('transactions').doc();
      transaction.set(txRef, { userId, type: 'admin_remove', amount: -amountNum, reason: reason || 'Admin coin removal', adminId: AdminState.currentUser.uid, adminEmail: AdminState.currentUser.email, createdAt: firebase.firestore.FieldValue.serverTimestamp(), balanceAfter: currentCoins - amountNum });
    });
    await AuditLog.logAction('remove_coins', 'user', { userId, amount: amountNum, reason, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Coins Removed', `Successfully removed ${formatNumber(amountNum)} coins`);
    hideModal('remove-coins-modal');
    getUserDetail(userId);
  } catch (error) { hideLoading(); console.error('removeUserCoins error:', error); showToast('error', 'Error', error.message); }
}

async function banUser(userId, reason) {
  try {
    if (!AdminAuth.hasPermission('ban_users')) { showToast('error', 'Permission Denied', 'No permission to ban users'); return; }
    const confirmed = await confirmDialog('Are you sure you want to ban this user?');
    if (!confirmed) return;
    showLoading();
    await db.collection('users').doc(userId).update({ status: 'banned', banReason: reason || 'Admin ban', bannedAt: firebase.firestore.FieldValue.serverTimestamp(), bannedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('ban_user', 'user', { userId, reason, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'User Banned', 'User has been banned successfully');
  } catch (error) { hideLoading(); console.error('banUser error:', error); showToast('error', 'Error', error.message); }
}

async function suspendUser(userId, reason) {
  try {
    if (!AdminAuth.hasPermission('suspend_users')) { showToast('error', 'Permission Denied', 'No permission to suspend users'); return; }
    const confirmed = await confirmDialog('Are you sure you want to suspend this user?');
    if (!confirmed) return;
    showLoading();
    await db.collection('users').doc(userId).update({ status: 'suspended', suspendReason: reason || 'Admin suspension', suspendedAt: firebase.firestore.FieldValue.serverTimestamp(), suspendedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('suspend_user', 'user', { userId, reason, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'User Suspended', 'User has been suspended');
  } catch (error) { hideLoading(); console.error('suspendUser error:', error); showToast('error', 'Error', error.message); }
}

async function restrictUser(userId, reason) {
  try {
    if (!AdminAuth.hasPermission('restrict_users')) { showToast('error', 'Permission Denied', 'No permission to restrict users'); return; }
    showLoading();
    await db.collection('users').doc(userId).update({ status: 'restricted', restrictReason: reason || 'Admin restriction', restrictedAt: firebase.firestore.FieldValue.serverTimestamp(), restrictedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('restrict_user', 'user', { userId, reason, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'User Restricted', 'User has been restricted');
  } catch (error) { hideLoading(); console.error('restrictUser error:', error); showToast('error', 'Error', error.message); }
}

async function unbanUser(userId) {
  try {
    const confirmed = await confirmDialog('Are you sure you want to unban this user?');
    if (!confirmed) return;
    showLoading();
    await db.collection('users').doc(userId).update({ status: 'active', banReason: firebase.firestore.FieldValue.delete(), bannedAt: firebase.firestore.FieldValue.delete(), bannedBy: firebase.firestore.FieldValue.delete() });
    await AuditLog.logAction('unban_user', 'user', { userId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'User Unbanned', 'User has been unbanned');
  } catch (error) { hideLoading(); console.error('unbanUser error:', error); showToast('error', 'Error', error.message); }
}

async function resetVerification(userId) {
  try {
    const confirmed = await confirmDialog('Reset user verification status?');
    if (!confirmed) return;
    showLoading();
    await db.collection('users').doc(userId).update({ verified: false, verificationLevel: 0, verifiedAt: firebase.firestore.FieldValue.delete() });
    await AuditLog.logAction('reset_verification', 'user', { userId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Verification Reset', 'User verification has been reset');
  } catch (error) { hideLoading(); console.error('resetVerification error:', error); showToast('error', 'Error', error.message); }
}

async function impersonateUser(userId) {
  try {
    if (!AdminAuth.hasPermission('impersonate_users')) { showToast('error', 'Permission Denied', 'No permission to impersonate users'); return; }
    const confirmed = await confirmDialog('Impersonate this user?');
    if (!confirmed) return;
    showLoading();
    await AuditLog.logAction('impersonate_user', 'user', { userId, adminId: AdminState.currentUser.uid });
    await db.collection('adminActions').doc('impersonate').set({ action: 'impersonate', targetUserId: userId, adminId: AdminState.currentUser.uid, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('info', 'Impersonating', 'Impersonation session started');
  } catch (error) { hideLoading(); console.error('impersonateUser error:', error); showToast('error', 'Error', error.message); }
}

async function updateUserStatus(userId, status) {
  try {
    showLoading();
    await db.collection('users').doc(userId).update({ status, statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(), statusUpdatedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('update_user_status', 'user', { userId, newStatus: status, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Status Updated', `User status changed to ${status}`);
  } catch (error) { hideLoading(); console.error('updateUserStatus error:', error); showToast('error', 'Error', error.message); }
}

async function exportUsers(format) {
  try {
    showLoading();
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').limit(10000).get();
    const users = [];
    snapshot.forEach(doc => { const d = doc.data(); users.push({ id: doc.id, email: d.email || '', displayName: d.displayName || '', username: d.username || '', coins: d.coins || 0, country: d.country || '', status: d.status || 'active', createdAt: d.createdAt ? d.createdAt.toDate().toISOString() : '' }); });
    if (format === 'csv') {
      const headers = ['ID','Email','Display Name','Username','Coins','Country','Status','Created At'];
      const csv = [headers.join(','), ...users.map(u => [u.id, `"${u.email}"`, `"${u.displayName}"`, `"${u.username}"`, u.coins, `"${u.country}"`, u.status, u.createdAt].join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`; a.click();
      URL.revokeObjectURL(url);
    }
    await AuditLog.logAction('export_users', 'users', { format, count: users.length });
    hideLoading();
    showToast('success', 'Export Complete', `Exported ${users.length} users`);
  } catch (error) { hideLoading(); console.error('exportUsers error:', error); showToast('error', 'Export Error', error.message); }
}

function renderUserTransactions(transactions) {
  if (!transactions || transactions.length === 0) return '<p class="text-muted">No transactions found</p>';
  return `<table class="admin-table"><thead><tr><th>Type</th><th>Amount</th><th>Balance After</th><th>Description</th><th>Date</th></tr></thead><tbody>${transactions.map(tx => `<tr><td><span class="tx-type tx-${tx.type}">${tx.type}</span></td><td class="${tx.amount>=0?'text-success':'text-danger'}">${tx.amount>=0?'+':''}${formatNumber(tx.amount)}</td><td>${formatNumber(tx.balanceAfter||0)}</td><td>${tx.reason||tx.description||'N/A'}</td><td>${formatDate(tx.createdAt)}</td></tr>`).join('')}</tbody></table>`;
}

function renderUserOffers(offers) {
  if (!offers || offers.length === 0) return '<p class="text-muted">No offer completions found</p>';
  return `<table class="admin-table"><thead><tr><th>Offer</th><th>Reward</th><th>Status</th><th>Completed</th></tr></thead><tbody>${offers.map(o => `<tr><td>${o.offerName||o.name||'Unknown'}</td><td>${formatNumber(o.reward||0)} coins</td><td><span class="status-badge status-${o.status}">${o.status}</span></td><td>${formatDate(o.createdAt)}</td></tr>`).join('')}</tbody></table>`;
}

function renderUserDevices(devices) {
  if (!devices || devices.length === 0) return '<p class="text-muted">No devices found</p>';
  return `<table class="admin-table"><thead><tr><th>Device</th><th>OS</th><th>Browser</th><th>Last Seen</th></tr></thead><tbody>${devices.map(d => `<tr><td>${d.deviceName||d.model||'Unknown'}</td><td>${d.os||'Unknown'}</td><td>${d.browser||'Unknown'}</td><td>${formatDate(d.lastSeen)}</td></tr>`).join('')}</tbody></table>`;
}

function renderUserIPs(ips) {
  if (!ips || ips.length === 0) return '<p class="text-muted">No IP addresses found</p>';
  return `<table class="admin-table"><thead><tr><th>IP Address</th><th>Location</th><th>ISP</th><th>VPN</th><th>Last Used</th></tr></thead><tbody>${ips.map(ip => `<tr><td><code>${ip.ip||ip.address||'Unknown'}</code></td><td>${ip.location||'Unknown'}</td><td>${ip.isp||'Unknown'}</td><td>${ip.isVPN?'<span class="badge badge-danger">VPN</span>':'No'}</td><td>${formatDate(ip.lastUsed)}</td></tr>`).join('')}</tbody></table>`;
}

function renderUserReferrals(refs) {
  if (!refs || refs.length === 0) return '<p class="text-muted">No referrals found</p>';
  return `<table class="admin-table"><thead><tr><th>Referred User</th><th>Email</th><th>Coins Earned</th><th>Date</th></tr></thead><tbody>${refs.map(r => `<tr><td>${r.referredName||'Unknown'}</td><td>${r.referredEmail||'N/A'}</td><td>${formatNumber(r.coinsEarned||0)}</td><td>${formatDate(r.createdAt)}</td></tr>`).join('')}</tbody></table>`;
}

function renderUserWithdrawals(ws) {
  if (!ws || ws.length === 0) return '<p class="text-muted">No withdrawals found</p>';
  return `<table class="admin-table"><thead><tr><th>Amount</th><th>Method</th><th>Status</th><th>Requested</th></tr></thead><tbody>${ws.map(w => `<tr><td>${formatUSD(w.amount||0)}</td><td>${w.method||'N/A'}</td><td><span class="status-badge status-${w.status}">${w.status}</span></td><td>${formatDate(w.createdAt)}</td></tr>`).join('')}</tbody></table>`;
}

function calculateUserRiskScore(user) {
  let score = 0;
  if (user.vpnDetected) score += 20;
  if (user.emulatorDetected) score += 25;
  if (user.devicesList && user.devicesList.length > 3) score += 15;
  if (user.ipsList && user.ipsList.length > 5) score += 15;
  if (user.referralsList && user.referralsList.length > 10) score += 20;
  if (user.status === 'banned') score = 100;
  if (user.fraudFlags && user.fraudFlags.length > 0) score += user.fraudFlags.length * 10;
  return Math.min(score, 100);
}

function showAddCoinsModal(userId) { showModal('add-coins-modal', { userId, title: 'Add Coins', onSubmit: (amount, reason) => addUserCoins(userId, amount, reason) }); }
function showRemoveCoinsModal(userId) { showModal('remove-coins-modal', { userId, title: 'Remove Coins', onSubmit: (amount, reason) => removeUserCoins(userId, amount, reason) }); }

// ============================================================================
// OFFERS MANAGEMENT MODULE
// ============================================================================

async function loadOffers(filters = {}, pagination = { page: 1, limit: 25 }) {
  try {
    showLoading();
    AdminState.offersPagination = { ...AdminState.offersPagination, ...pagination };
    let query = db.collection('offers');
    if (filters.status) query = query.where('active', '==', filters.status === 'active');
    if (filters.provider) query = query.where('providerId', '==', filters.provider);
    const countSnap = await query.count().get();
    AdminState.offersPagination.total = countSnap.data().count;
    const offset = (AdminState.offersPagination.page - 1) * AdminState.offersPagination.limit;
    query = query.orderBy('createdAt', 'desc').offset(offset).limit(AdminState.offersPagination.limit);
    const snapshot = await query.get();
    AdminState.offers = [];
    snapshot.forEach(doc => AdminState.offers.push({ id: doc.id, ...doc.data() }));
    renderOffersTable(AdminState.offers);
    hideLoading();
  } catch (error) { hideLoading(); console.error('loadOffers error:', error); showToast('error', 'Load Error', 'Failed to load offers'); }
}

async function getOfferDetail(offerId) {
  try {
    const doc = await db.collection('offers').doc(offerId).get();
    if (!doc.exists) { showToast('error', 'Not Found', 'Offer not found'); return null; }
    return { id: doc.id, ...doc.data() };
  } catch (error) { console.error('getOfferDetail error:', error); return null; }
}

async function updateOffer(offerId, data) {
  try {
    if (!AdminAuth.hasPermission('manage_offers')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    showLoading();
    await db.collection('offers').doc(offerId).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('update_offer', 'offer', { offerId, changes: data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Offer Updated', 'Offer has been updated');
  } catch (error) { hideLoading(); console.error('updateOffer error:', error); showToast('error', 'Error', error.message); }
}

async function createOffer(data) {
  try {
    if (!AdminAuth.hasPermission('create_offers')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    if (!data.name || !data.reward) { showToast('error', 'Validation Error', 'Name and reward are required'); return; }
    showLoading();
    const docRef = await db.collection('offers').add({ ...data, active: true, completions: 0, revenue: data.revenue || 0, profitMargin: data.revenue && data.reward ? ((data.revenue - data.reward) / data.revenue * 100) : 0, createdAt: firebase.firestore.FieldValue.serverTimestamp(), createdBy: AdminState.currentUser.uid });
    await AuditLog.logAction('create_offer', 'offer', { offerId: docRef.id, data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Offer Created', 'New offer has been created');
    loadOffers();
  } catch (error) { hideLoading(); console.error('createOffer error:', error); showToast('error', 'Error', error.message); }
}

async function toggleOfferStatus(offerId, active) {
  try {
    showLoading();
    await db.collection('offers').doc(offerId).update({ active, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('toggle_offer', 'offer', { offerId, active, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Status Updated', `Offer ${active ? 'activated' : 'deactivated'}`);
    loadOffers(AdminState.filters, AdminState.offersPagination);
  } catch (error) { hideLoading(); console.error('toggleOfferStatus error:', error); showToast('error', 'Error', error.message); }
}

async function setFeaturedOffer(offerId, featured) {
  try {
    showLoading();
    await db.collection('offers').doc(offerId).update({ featured, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('feature_offer', 'offer', { offerId, featured, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Updated', `Offer ${featured ? 'featured' : 'unfeatured'}`);
  } catch (error) { hideLoading(); console.error('setFeaturedOffer error:', error); showToast('error', 'Error', error.message); }
}

async function setOfferPriority(offerId, priority) {
  try {
    showLoading();
    await db.collection('offers').doc(offerId).update({ priority: Number(priority), updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('success', 'Updated', 'Offer priority updated');
  } catch (error) { hideLoading(); console.error('setOfferPriority error:', error); showToast('error', 'Error', error.message); }
}

async function setOfferReward(offerId, reward) {
  try {
    showLoading();
    const offer = await getOfferDetail(offerId);
    if (!offer) return;
    await db.collection('offers').doc(offerId).update({ reward: Number(reward), profitMargin: offer.revenue ? ((offer.revenue - Number(reward)) / offer.revenue * 100) : 0, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('success', 'Updated', 'Offer reward updated');
  } catch (error) { hideLoading(); console.error('setOfferReward error:', error); showToast('error', 'Error', error.message); }
}

async function setOfferRevenue(offerId, revenue) {
  try {
    showLoading();
    const offer = await getOfferDetail(offerId);
    if (!offer) return;
    await db.collection('offers').doc(offerId).update({ revenue: Number(revenue), profitMargin: offer.reward ? ((Number(revenue) - offer.reward) / Number(revenue) * 100) : 0, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('success', 'Updated', 'Offer revenue updated');
  } catch (error) { hideLoading(); console.error('setOfferRevenue error:', error); showToast('error', 'Error', error.message); }
}

function calculateProfitMargin(offer) {
  if (!offer.revenue || offer.revenue === 0) return 0;
  return ((offer.revenue - (offer.reward || 0)) / offer.revenue * 100).toFixed(2);
}

async function bulkToggleOffers(offerIds, active) {
  try {
    if (!AdminAuth.hasPermission('manage_offers')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    showLoading();
    const batch = db.batch();
    offerIds.forEach(id => { batch.update(db.collection('offers').doc(id), { active, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); });
    await batch.commit();
    await AuditLog.logAction('bulk_toggle_offers', 'offers', { offerIds, active, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Bulk Update', `${offerIds.length} offers ${active ? 'activated' : 'deactivated'}`);
    loadOffers(AdminState.filters, AdminState.offersPagination);
  } catch (error) { hideLoading(); console.error('bulkToggleOffers error:', error); showToast('error', 'Error', error.message); }
}

function renderOffersTable(offers) {
  const container = document.getElementById('offers-content');
  if (!container) return;
  const p = AdminState.offersPagination;
  const tp = Math.ceil(p.total / p.limit);
  container.innerHTML = `
    <div class="section-header"><div class="search-filter">
      <input type="text" id="offers-search" class="search-input" placeholder="Search offers...">
      <div class="filter-group">
        <select id="offers-status-filter" class="filter-select"><option value="">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <button class="btn btn-primary" onclick="showCreateOfferModal()"><i class="fas fa-plus"></i> New Offer</button>
        <button class="btn btn-secondary" onclick="exportOffers('csv')"><i class="fas fa-download"></i> Export</button>
      </div>
    </div></div>
    <div class="table-responsive"><table class="admin-table" id="offers-table">
      <thead><tr><th><input type="checkbox" id="select-all-offers"></th><th>Offer</th><th>Provider</th><th>Reward</th><th>Revenue</th><th>Margin</th><th>Completions</th><th>Status</th><th>Featured</th><th>Actions</th></tr></thead>
      <tbody>${offers.length===0 ? '<tr><td colspan="10" class="text-center">No offers found</td></tr>' : offers.map(o => `
        <tr><td><input type="checkbox" class="offer-checkbox" value="${o.id}"></td>
          <td><strong>${o.name||'Unnamed'}</strong></td><td>${o.providerName||'Direct'}</td>
          <td>${formatNumber(o.reward||0)} coins</td><td>${formatUSD(o.revenue||0)}</td>
          <td><span class="${calculateProfitMargin(o)>0?'text-success':'text-danger'}">${calculateProfitMargin(o)}%</span></td>
          <td>${formatNumber(o.completions||0)}</td>
          <td><label class="toggle-switch"><input type="checkbox" ${o.active?'checked':''} onchange="toggleOfferStatus('${o.id}', this.checked)"><span class="toggle-slider"></span></label></td>
          <td><button class="btn-icon ${o.featured?'active':''}" onclick="setFeaturedOffer('${o.id}', ${!o.featured})" title="Feature"><i class="fas fa-star"></i></button></td>
          <td><div class="action-buttons"><button class="btn-icon" onclick="showEditOfferModal('${o.id}')" title="Edit"><i class="fas fa-edit"></i></button></div></td>
        </tr>`).join('')}
      </tbody></table></div>
    <div class="pagination">
      <button class="btn btn-sm" onclick="loadOffers(AdminState.filters, { page: ${p.page-1}, limit: ${p.limit} })" ${p.page<=1?'disabled':''}><i class="fas fa-chevron-left"></i> Previous</button>
      <span class="page-info">Page ${p.page} of ${tp} (${p.total} total)</span>
      <button class="btn btn-sm" onclick="loadOffers(AdminState.filters, { page: ${p.page+1}, limit: ${p.limit} })" ${p.page>=tp?'disabled':''}>Next <i class="fas fa-chevron-right"></i></button>
    </div>`;
  document.getElementById('offers-search')?.addEventListener('input', debounce(e => { const q = e.target.value.toLowerCase(); document.querySelectorAll('#offers-table tbody tr').forEach(r => r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'); }, 300));
  document.getElementById('select-all-offers')?.addEventListener('change', e => document.querySelectorAll('.offer-checkbox').forEach(cb => cb.checked = e.target.checked));
}

function filterOffers(filters) { loadOffers(filters, { page: 1, limit: 25 }); }

async function exportOffers(format) {
  try {
    showLoading();
    const snapshot = await db.collection('offers').orderBy('createdAt', 'desc').limit(10000).get();
    const offers = [];
    snapshot.forEach(doc => { const d = doc.data(); offers.push({ id: doc.id, name: d.name || '', reward: d.reward || 0, revenue: d.revenue || 0, completions: d.completions || 0, active: d.active || false }); });
    if (format === 'csv') {
      const csv = [['ID','Name','Reward','Revenue','Completions','Active'].join(','), ...offers.map(o => [o.id, `"${o.name}"`, o.reward, o.revenue, o.completions, o.active].join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `offers_export_${new Date().toISOString().split('T')[0]}.csv`; a.click();
      URL.revokeObjectURL(url);
    }
    hideLoading();
    showToast('success', 'Export Complete', `Exported ${offers.length} offers`);
  } catch (error) { hideLoading(); console.error('exportOffers error:', error); showToast('error', 'Export Error', error.message); }
}

// ============================================================================
// PROVIDERS MANAGEMENT MODULE
// ============================================================================

async function loadProviders() {
  try {
    showLoading();
    const snapshot = await db.collection('providers').orderBy('name', 'asc').get();
    AdminState.providers = [];
    snapshot.forEach(doc => AdminState.providers.push({ id: doc.id, ...doc.data() }));
    renderProviderCards(AdminState.providers);
    hideLoading();
  } catch (error) { hideLoading(); console.error('loadProviders error:', error); showToast('error', 'Load Error', 'Failed to load providers'); }
}

async function getProviderDetail(providerId) {
  try {
    const doc = await db.collection('providers').doc(providerId).get();
    if (!doc.exists) { showToast('error', 'Not Found', 'Provider not found'); return null; }
    return { id: doc.id, ...doc.data() };
  } catch (error) { console.error('getProviderDetail error:', error); return null; }
}

async function addProvider(data) {
  try {
    if (!AdminAuth.hasPermission('manage_providers')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    if (!data.name || !data.apiKey) { showToast('error', 'Validation Error', 'Name and API key are required'); return; }
    showLoading();
    const docRef = await db.collection('providers').add({ ...data, active: true, totalRevenue: 0, totalChargebacks: 0, errorCount: 0, createdAt: firebase.firestore.FieldValue.serverTimestamp(), createdBy: AdminState.currentUser.uid });
    await AuditLog.logAction('add_provider', 'provider', { providerId: docRef.id, name: data.name, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Provider Added', 'New provider has been added');
    loadProviders();
  } catch (error) { hideLoading(); console.error('addProvider error:', error); showToast('error', 'Error', error.message); }
}

async function updateProvider(providerId, data) {
  try {
    if (!AdminAuth.hasPermission('manage_providers')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    showLoading();
    await db.collection('providers').doc(providerId).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('update_provider', 'provider', { providerId, changes: data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Provider Updated', 'Provider has been updated');
    loadProviders();
  } catch (error) { hideLoading(); console.error('updateProvider error:', error); showToast('error', 'Error', error.message); }
}

async function deleteProvider(providerId) {
  try {
    if (!AdminAuth.hasPermission('delete_providers')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    const confirmed = await confirmDialog('Are you sure you want to delete this provider?');
    if (!confirmed) return;
    showLoading();
    await db.collection('providers').doc(providerId).delete();
    await AuditLog.logAction('delete_provider', 'provider', { providerId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Provider Deleted', 'Provider has been removed');
    loadProviders();
  } catch (error) { hideLoading(); console.error('deleteProvider error:', error); showToast('error', 'Error', error.message); }
}

async function toggleProviderStatus(providerId, active) {
  try {
    showLoading();
    await db.collection('providers').doc(providerId).update({ active, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('toggle_provider', 'provider', { providerId, active, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Status Updated', `Provider ${active ? 'activated' : 'deactivated'}`);
    loadProviders();
  } catch (error) { hideLoading(); console.error('toggleProviderStatus error:', error); showToast('error', 'Error', error.message); }
}

async function syncProviderOffers(providerId) {
  try {
    showLoading();
    await db.collection('providerSync').add({ providerId, status: 'pending', initiatedBy: AdminState.currentUser.uid, initiatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('sync_provider', 'provider', { providerId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Sync Initiated', 'Provider sync has been initiated');
  } catch (error) { hideLoading(); console.error('syncProviderOffers error:', error); showToast('error', 'Error', error.message); }
}

async function testPostback(providerId) {
  try {
    showLoading();
    await db.collection('providerTests').add({ providerId, type: 'postback_test', status: 'pending', initiatedBy: AdminState.currentUser.uid, initiatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('info', 'Test Sent', 'Postback test has been initiated');
  } catch (error) { hideLoading(); console.error('testPostback error:', error); showToast('error', 'Error', error.message); }
}

async function getProviderRevenue(providerId) {
  try {
    const snapshot = await db.collection('transactions').where('providerId', '==', providerId).where('type', '==', 'revenue').get();
    let total = 0; snapshot.forEach(doc => { total += doc.data().amount || 0; });
    return total;
  } catch (error) { return 0; }
}

async function getProviderChargebacks(providerId) {
  try {
    const snapshot = await db.collection('chargebacks').where('providerId', '==', providerId).get();
    let total = 0; snapshot.forEach(doc => { total += doc.data().amount || 0; });
    return total;
  } catch (error) { return 0; }
}

async function getProviderErrorLogs(providerId) {
  try {
    const snapshot = await db.collection('providerErrors').where('providerId', '==', providerId).orderBy('createdAt', 'desc').limit(50).get();
    const errors = []; snapshot.forEach(doc => errors.push({ id: doc.id, ...doc.data() }));
    return errors;
  } catch (error) { return []; }
}

function renderProviderCards(providers) {
  const container = document.getElementById('providers-content');
  if (!container) return;
  container.innerHTML = `
    <div class="section-header"><div class="search-filter">
      <input type="text" id="providers-search" class="search-input" placeholder="Search providers...">
      <button class="btn btn-primary" onclick="showAddProviderModal()"><i class="fas fa-plus"></i> Add Provider</button>
    </div></div>
    <div class="card-grid">${providers.length===0 ? '<p class="text-muted text-center">No providers found</p>' : providers.map(p => `
      <div class="provider-card">
        <div class="provider-header"><h3>${p.name||'Unknown'}</h3><label class="toggle-switch"><input type="checkbox" ${p.active?'checked':''} onchange="toggleProviderStatus('${p.id}', this.checked)"><span class="toggle-slider"></span></label></div>
        <div class="provider-stats">
          <div><label>Revenue:</label><span>${formatUSD(p.totalRevenue||0)}</span></div>
          <div><label>Chargebacks:</label><span>${formatUSD(p.totalChargebacks||0)}</span></div>
          <div><label>Offers:</label><span>${p.offerCount||0}</span></div>
          <div><label>Errors:</label><span class="${p.errorCount>0?'text-danger':''}">${p.errorCount||0}</span></div>
        </div>
        <div class="provider-actions">
          <button class="btn btn-sm btn-primary" onclick="syncProviderOffers('${p.id}')"><i class="fas fa-sync"></i> Sync</button>
          <button class="btn btn-sm btn-secondary" onclick="testPostback('${p.id}')"><i class="fas fa-vial"></i> Test</button>
          <button class="btn btn-sm btn-secondary" onclick="showEditProviderModal('${p.id}')"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteProvider('${p.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>`).join('')}
    </div>`;
  document.getElementById('providers-search')?.addEventListener('input', debounce(e => { const q = e.target.value.toLowerCase(); document.querySelectorAll('.provider-card').forEach(c => c.style.display = c.textContent.toLowerCase().includes(q) ? '' : 'none'); }, 300));
}

function renderProviderDetail(provider) {
  const container = document.getElementById('providers-content');
  if (!container) return;
  container.innerHTML = `<div class="detail-header"><button class="btn btn-secondary" onclick="loadProviders()"><i class="fas fa-arrow-left"></i> Back</button><h2>${provider.name}</h2></div>
    <div class="detail-grid"><div class="detail-card"><h3>Provider Info</h3><div class="info-grid">
      <div><label>API Endpoint:</label><span><code>${provider.apiEndpoint||'N/A'}</code></span></div>
      <div><label>Status:</label><span class="status-badge status-${provider.active?'active':'inactive'}">${provider.active?'Active':'Inactive'}</span></div>
      <div><label>Total Revenue:</label><span>${formatUSD(provider.totalRevenue||0)}</span></div>
      <div><label>Chargebacks:</label><span>${formatUSD(provider.totalChargebacks||0)}</span></div>
      <div><label>Created:</label><span>${formatDate(provider.createdAt)}</span></div>
    </div></div></div>`;
}

// ============================================================================
// REWARDS MANAGEMENT MODULE
// ============================================================================

async function loadRewards(category = null, pagination = { page: 1, limit: 25 }) {
  try {
    showLoading();
    AdminState.rewardsPagination = { ...AdminState.rewardsPagination, ...pagination };
    let query = db.collection('rewards');
    if (category) query = query.where('category', '==', category);
    const countSnap = await query.count().get();
    AdminState.rewardsPagination.total = countSnap.data().count;
    const offset = (AdminState.rewardsPagination.page - 1) * AdminState.rewardsPagination.limit;
    query = query.orderBy('createdAt', 'desc').offset(offset).limit(AdminState.rewardsPagination.limit);
    const snapshot = await query.get();
    AdminState.rewards = [];
    snapshot.forEach(doc => AdminState.rewards.push({ id: doc.id, ...doc.data() }));
    await loadRewardCategories();
    renderRewardsTable(AdminState.rewards);
    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('loadRewards error:', error);
    showToast('error', 'Load Error', 'Failed to load rewards');
  }
}

async function getRewardDetail(rewardId) {
  try {
    const doc = await db.collection('rewards').doc(rewardId).get();
    if (!doc.exists) { showToast('error', 'Not Found', 'Reward not found'); return null; }
    return { id: doc.id, ...doc.data() };
  } catch (error) { console.error('getRewardDetail error:', error); return null; }
}

async function addReward(data) {
  try {
    if (!AdminAuth.hasPermission('manage_rewards')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    if (!data.name || !data.cost || !data.category) { showToast('error', 'Validation Error', 'Name, cost, and category are required'); return; }
    showLoading();
    const docRef = await db.collection('rewards').add({
      ...data, active: true, featured: false, stock: data.stock || 0, redemptions: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(), createdBy: AdminState.currentUser.uid
    });
    await AuditLog.logAction('add_reward', 'reward', { rewardId: docRef.id, name: data.name, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Reward Added', 'New reward has been added');
    loadRewards(null, AdminState.rewardsPagination);
  } catch (error) { hideLoading(); console.error('addReward error:', error); showToast('error', 'Error', error.message); }
}

async function updateReward(rewardId, data) {
  try {
    if (!AdminAuth.hasPermission('manage_rewards')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    showLoading();
    await db.collection('rewards').doc(rewardId).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('update_reward', 'reward', { rewardId, changes: data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Reward Updated', 'Reward has been updated');
    loadRewards(null, AdminState.rewardsPagination);
  } catch (error) { hideLoading(); console.error('updateReward error:', error); showToast('error', 'Error', error.message); }
}

async function deleteReward(rewardId) {
  try {
    if (!AdminAuth.hasPermission('delete_rewards')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    const confirmed = await confirmDialog('Are you sure you want to delete this reward?');
    if (!confirmed) return;
    showLoading();
    await db.collection('rewards').doc(rewardId).delete();
    await AuditLog.logAction('delete_reward', 'reward', { rewardId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Reward Deleted', 'Reward has been removed');
    loadRewards(null, AdminState.rewardsPagination);
  } catch (error) { hideLoading(); console.error('deleteReward error:', error); showToast('error', 'Error', error.message); }
}

async function toggleRewardStatus(rewardId, active) {
  try {
    showLoading();
    await db.collection('rewards').doc(rewardId).update({ active, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('toggle_reward', 'reward', { rewardId, active, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Status Updated', `Reward ${active ? 'activated' : 'deactivated'}`);
    loadRewards(null, AdminState.rewardsPagination);
  } catch (error) { hideLoading(); console.error('toggleRewardStatus error:', error); showToast('error', 'Error', error.message); }
}

async function setFeaturedReward(rewardId, featured) {
  try {
    showLoading();
    await db.collection('rewards').doc(rewardId).update({ featured, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('success', 'Updated', `Reward ${featured ? 'featured' : 'unfeatured'}`);
    loadRewards(null, AdminState.rewardsPagination);
  } catch (error) { hideLoading(); console.error('setFeaturedReward error:', error); showToast('error', 'Error', error.message); }
}

async function updateStock(rewardId, quantity) {
  try {
    if (!AdminAuth.hasPermission('manage_rewards')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    showLoading();
    await db.runTransaction(async (transaction) => {
      const ref = db.collection('rewards').doc(rewardId);
      const doc = await transaction.get(ref);
      if (!doc.exists) throw new Error('Reward not found');
      const currentStock = doc.data().stock || 0;
      const newStock = currentStock + Number(quantity);
      if (newStock < 0) throw new Error('Stock cannot be negative');
      transaction.update(ref, { stock: newStock, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    });
    await AuditLog.logAction('update_stock', 'reward', { rewardId, quantity, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Stock Updated', 'Reward stock has been updated');
  } catch (error) { hideLoading(); console.error('updateStock error:', error); showToast('error', 'Error', error.message); }
}

async function loadRewardCategories() {
  try {
    const snapshot = await db.collection('rewardCategories').orderBy('name', 'asc').get();
    AdminState.rewardCategories = [];
    snapshot.forEach(doc => AdminState.rewardCategories.push({ id: doc.id, ...doc.data() }));
  } catch (error) { console.error('loadRewardCategories error:', error); }
}

async function addCategory(name, icon) {
  try {
    if (!AdminAuth.hasPermission('manage_rewards')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    if (!name) { showToast('error', 'Validation Error', 'Category name is required'); return; }
    showLoading();
    await db.collection('rewardCategories').add({ name, icon: icon || 'fas fa-tag', active: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('success', 'Category Added', 'New category has been added');
    loadRewardCategories();
  } catch (error) { hideLoading(); console.error('addCategory error:', error); showToast('error', 'Error', error.message); }
}

async function updateCategory(categoryId, data) {
  try {
    showLoading();
    await db.collection('rewardCategories').doc(categoryId).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('success', 'Category Updated', 'Category has been updated');
    loadRewardCategories();
  } catch (error) { hideLoading(); console.error('updateCategory error:', error); showToast('error', 'Error', error.message); }
}

async function deleteCategory(categoryId) {
  try {
    const confirmed = await confirmDialog('Delete this category?');
    if (!confirmed) return;
    showLoading();
    await db.collection('rewardCategories').doc(categoryId).delete();
    hideLoading();
    showToast('success', 'Category Deleted', 'Category has been removed');
    loadRewardCategories();
  } catch (error) { hideLoading(); console.error('deleteCategory error:', error); showToast('error', 'Error', error.message); }
}

function renderRewardsTable(rewards) {
  const container = document.getElementById('rewards-content');
  if (!container) return;
  const p = AdminState.rewardsPagination;
  const tp = Math.ceil(p.total / p.limit);
  container.innerHTML = `
    <div class="section-header"><div class="search-filter">
      <input type="text" id="rewards-search" class="search-input" placeholder="Search rewards...">
      <div class="filter-group">
        <select id="rewards-category-filter" class="filter-select" onchange="loadRewards(this.value || null, { page: 1, limit: 25 })">
          <option value="">All Categories</option>
          ${AdminState.rewardCategories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('')}
        </select>
        <button class="btn btn-primary" onclick="showAddRewardModal()"><i class="fas fa-plus"></i> Add Reward</button>
      </div>
    </div></div>
    <div class="table-responsive"><table class="admin-table" id="rewards-table">
      <thead><tr><th>Reward</th><th>Category</th><th>Cost</th><th>Stock</th><th>Redemptions</th><th>Status</th><th>Featured</th><th>Actions</th></tr></thead>
      <tbody>${rewards.length===0 ? '<tr><td colspan="8" class="text-center">No rewards found</td></tr>' : rewards.map(r => `
        <tr><td><div class="reward-info">${r.image ? `<img src="${r.image}" class="avatar-sm" alt="">` : ''}<span>${r.name}</span></div></td>
          <td><span class="category-badge">${r.category}</span></td><td>${formatNumber(r.cost)} coins</td>
          <td><span class="${r.stock<=0?'text-danger':''}">${r.stock||0}</span></td><td>${formatNumber(r.redemptions||0)}</td>
          <td><label class="toggle-switch"><input type="checkbox" ${r.active?'checked':''} onchange="toggleRewardStatus('${r.id}', this.checked)"><span class="toggle-slider"></span></label></td>
          <td><button class="btn-icon ${r.featured?'active':''}" onclick="setFeaturedReward('${r.id}', ${!r.featured})"><i class="fas fa-star"></i></button></td>
          <td><div class="action-buttons"><button class="btn-icon" onclick="showEditRewardModal('${r.id}')" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="btn-icon" onclick="showStockModal('${r.id}')" title="Update Stock"><i class="fas fa-box"></i></button>
            <button class="btn-icon danger" onclick="deleteReward('${r.id}')" title="Delete"><i class="fas fa-trash"></i></button></div></td>
        </tr>`).join('')}
      </tbody></table></div>
    <div class="pagination">
      <button class="btn btn-sm" onclick="loadRewards(null, { page: ${p.page-1}, limit: ${p.limit} })" ${p.page<=1?'disabled':''}><i class="fas fa-chevron-left"></i> Previous</button>
      <span class="page-info">Page ${p.page} of ${tp} (${p.total} total)</span>
      <button class="btn btn-sm" onclick="loadRewards(null, { page: ${p.page+1}, limit: ${p.limit} })" ${p.page>=tp?'disabled':''}>Next <i class="fas fa-chevron-right"></i></button>
    </div>`;
  document.getElementById('rewards-search')?.addEventListener('input', debounce(e => { const q = e.target.value.toLowerCase(); document.querySelectorAll('#rewards-table tbody tr').forEach(r => r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'); }, 300));
}

function renderRewardCategories(categories) {
  return categories.map(cat => `<div class="category-item"><i class="${cat.icon||'fas fa-tag'}"></i><span>${cat.name}</span>
    <button class="btn-icon" onclick="showEditCategoryModal('${cat.id}')"><i class="fas fa-edit"></i></button>
    <button class="btn-icon danger" onclick="deleteCategory('${cat.id}')"><i class="fas fa-trash"></i></button></div>`).join('');
}

// ============================================================================
// ORDERS MANAGEMENT MODULE
// ============================================================================

async function loadOrders(filters = {}, pagination = { page: 1, limit: 25 }) {
  try {
    showLoading();
    AdminState.ordersPagination = { ...AdminState.ordersPagination, ...pagination };
    let query = db.collection('orders');
    if (filters.status) query = query.where('status', '==', filters.status);
    if (filters.userId) query = query.where('userId', '==', filters.userId);
    const countSnap = await query.count().get();
    AdminState.ordersPagination.total = countSnap.data().count;
    const offset = (AdminState.ordersPagination.page - 1) * AdminState.ordersPagination.limit;
    query = query.orderBy('createdAt', 'desc').offset(offset).limit(AdminState.ordersPagination.limit);
    const snapshot = await query.get();
    AdminState.orders = [];
    snapshot.forEach(doc => AdminState.orders.push({ id: doc.id, ...doc.data() }));
    renderOrdersTable(AdminState.orders);
    hideLoading();
  } catch (error) { hideLoading(); console.error('loadOrders error:', error); showToast('error', 'Load Error', 'Failed to load orders'); }
}

async function getOrderDetail(orderId) {
  try {
    const doc = await db.collection('orders').doc(orderId).get();
    if (!doc.exists) { showToast('error', 'Not Found', 'Order not found'); return null; }
    return { id: doc.id, ...doc.data() };
  } catch (error) { console.error('getOrderDetail error:', error); return null; }
}

async function processOrder(orderId) {
  try {
    if (!AdminAuth.hasPermission('manage_orders')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    showLoading();
    await db.collection('orders').doc(orderId).update({ status: 'processing', processedAt: firebase.firestore.FieldValue.serverTimestamp(), processedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('process_order', 'order', { orderId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Order Processing', 'Order is now being processed');
    loadOrders(AdminState.filters, AdminState.ordersPagination);
  } catch (error) { hideLoading(); console.error('processOrder error:', error); showToast('error', 'Error', error.message); }
}

async function completeOrder(orderId) {
  try {
    if (!AdminAuth.hasPermission('manage_orders')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    showLoading();
    await db.runTransaction(async (transaction) => {
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) throw new Error('Order not found');
      const order = orderDoc.data();
      transaction.update(orderRef, { status: 'completed', completedAt: firebase.firestore.FieldValue.serverTimestamp(), completedBy: AdminState.currentUser.uid });
      if (order.rewardId) {
        const rewardRef = db.collection('rewards').doc(order.rewardId);
        const rewardDoc = await transaction.get(rewardRef);
        if (rewardDoc.exists) {
          const currentStock = rewardDoc.data().stock || 0;
          const currentRedemptions = rewardDoc.data().redemptions || 0;
          transaction.update(rewardRef, { stock: Math.max(0, currentStock - 1), redemptions: currentRedemptions + 1 });
        }
      }
    });
    await AuditLog.logAction('complete_order', 'order', { orderId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Order Completed', 'Order has been completed');
    loadOrders(AdminState.filters, AdminState.ordersPagination);
  } catch (error) { hideLoading(); console.error('completeOrder error:', error); showToast('error', 'Error', error.message); }
}

async function failOrder(orderId, reason) {
  try {
    if (!AdminAuth.hasPermission('manage_orders')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    showLoading();
    await db.collection('orders').doc(orderId).update({ status: 'failed', failReason: reason || 'Admin failure', failedAt: firebase.firestore.FieldValue.serverTimestamp(), failedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('fail_order', 'order', { orderId, reason, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('info', 'Order Failed', 'Order has been marked as failed');
    loadOrders(AdminState.filters, AdminState.ordersPagination);
  } catch (error) { hideLoading(); console.error('failOrder error:', error); showToast('error', 'Error', error.message); }
}

async function refundOrder(orderId, reason) {
  try {
    if (!AdminAuth.hasPermission('refund_orders')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    const confirmed = await confirmDialog('Refund this order? Coins will be returned to the user.');
    if (!confirmed) return;
    showLoading();
    await db.runTransaction(async (transaction) => {
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) throw new Error('Order not found');
      const order = orderDoc.data();
      if (order.status === 'refunded') throw new Error('Order already refunded');
      transaction.update(orderRef, { status: 'refunded', refundReason: reason || 'Admin refund', refundedAt: firebase.firestore.FieldValue.serverTimestamp(), refundedBy: AdminState.currentUser.uid });
      if (order.userId && order.cost) {
        const userRef = db.collection('users').doc(order.userId);
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists) {
          const currentCoins = userDoc.data().coins || 0;
          transaction.update(userRef, { coins: currentCoins + order.cost });
          const txRef = db.collection('transactions').doc();
          transaction.set(txRef, { userId: order.userId, type: 'refund', amount: order.cost, reason: `Refund for order ${orderId}`, orderId, adminId: AdminState.currentUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp(), balanceAfter: currentCoins + order.cost });
        }
      }
    });
    await AuditLog.logAction('refund_order', 'order', { orderId, reason, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Order Refunded', 'Order has been refunded successfully');
    loadOrders(AdminState.filters, AdminState.ordersPagination);
  } catch (error) { hideLoading(); console.error('refundOrder error:', error); showToast('error', 'Error', error.message); }
}

async function cancelOrder(orderId) {
  try {
    const confirmed = await confirmDialog('Cancel this order?');
    if (!confirmed) return;
    showLoading();
    await db.collection('orders').doc(orderId).update({ status: 'cancelled', cancelledAt: firebase.firestore.FieldValue.serverTimestamp(), cancelledBy: AdminState.currentUser.uid });
    await AuditLog.logAction('cancel_order', 'order', { orderId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('info', 'Order Cancelled', 'Order has been cancelled');
    loadOrders(AdminState.filters, AdminState.ordersPagination);
  } catch (error) { hideLoading(); console.error('cancelOrder error:', error); showToast('error', 'Error', error.message); }
}

function renderOrdersTable(orders) {
  const container = document.getElementById('orders-content');
  if (!container) return;
  const p = AdminState.ordersPagination;
  const tp = Math.ceil(p.total / p.limit);
  container.innerHTML = `
    <div class="section-header"><div class="search-filter">
      <input type="text" id="orders-search" class="search-input" placeholder="Search orders...">
      <div class="filter-group">
        <select id="orders-status-filter" class="filter-select" onchange="loadOrders({ status: this.value || undefined }, { page: 1, limit: 25 })">
          <option value="">All Status</option><option value="pending">Pending</option><option value="processing">Processing</option>
          <option value="completed">Completed</option><option value="failed">Failed</option><option value="refunded">Refunded</option><option value="cancelled">Cancelled</option>
        </select>
        <button class="btn btn-secondary" onclick="exportOrders('csv')"><i class="fas fa-download"></i> Export</button>
      </div>
    </div></div>
    <div class="table-responsive"><table class="admin-table" id="orders-table">
      <thead><tr><th>Order ID</th><th>User</th><th>Reward</th><th>Cost</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>${orders.length===0 ? '<tr><td colspan="7" class="text-center">No orders found</td></tr>' : orders.map(o => `
        <tr><td><code>${o.id.substring(0,8)}...</code></td><td>${o.userEmail||o.userId||'Unknown'}</td><td>${o.rewardName||'N/A'}</td>
          <td>${formatNumber(o.cost||0)} coins</td><td><span class="status-badge status-${o.status}">${o.status}</span></td><td>${formatDate(o.createdAt)}</td>
          <td><div class="action-buttons">
            ${o.status==='pending' ? `<button class="btn-icon" onclick="processOrder('${o.id}')" title="Process"><i class="fas fa-play"></i></button><button class="btn-icon danger" onclick="cancelOrder('${o.id}')" title="Cancel"><i class="fas fa-times"></i></button>` : ''}
            ${o.status==='processing' ? `<button class="btn-icon success" onclick="completeOrder('${o.id}')" title="Complete"><i class="fas fa-check"></i></button><button class="btn-icon danger" onclick="failOrder('${o.id}')" title="Fail"><i class="fas fa-times"></i></button>` : ''}
            ${['completed','failed'].includes(o.status) ? `<button class="btn-icon warning" onclick="refundOrder('${o.id}')" title="Refund"><i class="fas fa-undo"></i></button>` : ''}
          </div></td>
        </tr>`).join('')}
      </tbody></table></div>
    <div class="pagination">
      <button class="btn btn-sm" onclick="loadOrders(AdminState.filters, { page: ${p.page-1}, limit: ${p.limit} })" ${p.page<=1?'disabled':''}><i class="fas fa-chevron-left"></i> Previous</button>
      <span class="page-info">Page ${p.page} of ${tp} (${p.total} total)</span>
      <button class="btn btn-sm" onclick="loadOrders(AdminState.filters, { page: ${p.page+1}, limit: ${p.limit} })" ${p.page>=tp?'disabled':''}>Next <i class="fas fa-chevron-right"></i></button>
    </div>`;
}

function filterOrders(filters) { loadOrders(filters, { page: 1, limit: 25 }); }

async function exportOrders(format) {
  try {
    showLoading();
    const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').limit(10000).get();
    const orders = [];
    snapshot.forEach(doc => { const d = doc.data(); orders.push({ id: doc.id, userId: d.userId||'', rewardName: d.rewardName||'', cost: d.cost||0, status: d.status||'', createdAt: d.createdAt ? d.createdAt.toDate().toISOString() : '' }); });
    if (format === 'csv') {
      const csv = [['Order ID','User ID','Reward','Cost','Status','Created At'].join(','), ...orders.map(o => [o.id, o.userId, `"${o.rewardName}"`, o.cost, o.status, o.createdAt].join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`; a.click();
      URL.revokeObjectURL(url);
    }
    hideLoading();
    showToast('success', 'Export Complete', `Exported ${orders.length} orders`);
  } catch (error) { hideLoading(); console.error('exportOrders error:', error); showToast('error', 'Export Error', error.message); }
}

// ============================================================================
// WITHDRAWALS MANAGEMENT MODULE
// ============================================================================

async function loadWithdrawals(status = 'pending', filters = {}, pagination = { page: 1, limit: 25 }) {
  try {
    showLoading();
    AdminState.withdrawalsPagination = { ...AdminState.withdrawalsPagination, ...pagination };
    let query = db.collection('withdrawals');
    if (status) query = query.where('status', '==', status);
    const countSnap = await query.count().get();
    AdminState.withdrawalsPagination.total = countSnap.data().count;
    const offset = (AdminState.withdrawalsPagination.page - 1) * AdminState.withdrawalsPagination.limit;
    query = query.orderBy('createdAt', 'desc').offset(offset).limit(AdminState.withdrawalsPagination.limit);
    const snapshot = await query.get();
    AdminState.withdrawals = [];
    snapshot.forEach(doc => AdminState.withdrawals.push({ id: doc.id, ...doc.data() }));
    renderWithdrawalsTable(AdminState.withdrawals, status);
    hideLoading();
  } catch (error) { hideLoading(); console.error('loadWithdrawals error:', error); showToast('error', 'Load Error', 'Failed to load withdrawals'); }
}

async function getWithdrawalDetail(withdrawalId) {
  try {
    const doc = await db.collection('withdrawals').doc(withdrawalId).get();
    if (!doc.exists) { showToast('error', 'Not Found', 'Withdrawal not found'); return null; }
    return { id: doc.id, ...doc.data() };
  } catch (error) { console.error('getWithdrawalDetail error:', error); return null; }
}

async function approveWithdrawal(withdrawalId) {
  try {
    if (!AdminAuth.hasPermission('manage_withdrawals')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    const confirmed = await confirmDialog('Approve this withdrawal?');
    if (!confirmed) return;
    showLoading();
    await db.collection('withdrawals').doc(withdrawalId).update({ status: 'approved', approvedAt: firebase.firestore.FieldValue.serverTimestamp(), approvedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('approve_withdrawal', 'withdrawal', { withdrawalId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Approved', 'Withdrawal has been approved');
    loadWithdrawals('pending', AdminState.filters, AdminState.withdrawalsPagination);
  } catch (error) { hideLoading(); console.error('approveWithdrawal error:', error); showToast('error', 'Error', error.message); }
}

async function rejectWithdrawal(withdrawalId, reason) {
  try {
    if (!AdminAuth.hasPermission('manage_withdrawals')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    if (!reason) { showToast('error', 'Validation Error', 'Rejection reason is required'); return; }
    showLoading();
    await db.runTransaction(async (transaction) => {
      const wRef = db.collection('withdrawals').doc(withdrawalId);
      const wDoc = await transaction.get(wRef);
      if (!wDoc.exists) throw new Error('Withdrawal not found');
      const withdrawal = wDoc.data();
      transaction.update(wRef, { status: 'rejected', rejectReason: reason, rejectedAt: firebase.firestore.FieldValue.serverTimestamp(), rejectedBy: AdminState.currentUser.uid });
      if (withdrawal.userId && withdrawal.amount) {
        const userRef = db.collection('users').doc(withdrawal.userId);
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists) {
          const currentCoins = userDoc.data().coins || 0;
          const coinValue = withdrawal.coinAmount || (withdrawal.amount * (AdminState.settings.coinToUsdRate || 100));
          transaction.update(userRef, { coins: currentCoins + coinValue });
          const txRef = db.collection('transactions').doc();
          transaction.set(txRef, { userId: withdrawal.userId, type: 'withdrawal_refund', amount: coinValue, reason: `Withdrawal rejected: ${reason}`, withdrawalId, adminId: AdminState.currentUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp(), balanceAfter: currentCoins + coinValue });
        }
      }
    });
    await AuditLog.logAction('reject_withdrawal', 'withdrawal', { withdrawalId, reason, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('info', 'Rejected', 'Withdrawal has been rejected and coins refunded');
    loadWithdrawals('pending', AdminState.filters, AdminState.withdrawalsPagination);
  } catch (error) { hideLoading(); console.error('rejectWithdrawal error:', error); showToast('error', 'Error', error.message); }
}

async function processWithdrawal(withdrawalId) {
  try {
    if (!AdminAuth.hasPermission('process_withdrawals')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    showLoading();
    await db.collection('withdrawals').doc(withdrawalId).update({ status: 'processing', processedAt: firebase.firestore.FieldValue.serverTimestamp(), processedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('process_withdrawal', 'withdrawal', { withdrawalId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Processing', 'Withdrawal is now being processed');
  } catch (error) { hideLoading(); console.error('processWithdrawal error:', error); showToast('error', 'Error', error.message); }
}

async function completeWithdrawal(withdrawalId) {
  try {
    showLoading();
    await db.collection('withdrawals').doc(withdrawalId).update({ status: 'completed', completedAt: firebase.firestore.FieldValue.serverTimestamp(), completedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('complete_withdrawal', 'withdrawal', { withdrawalId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Completed', 'Withdrawal has been completed');
  } catch (error) { hideLoading(); console.error('completeWithdrawal error:', error); showToast('error', 'Error', error.message); }
}

async function refundWithdrawal(withdrawalId) {
  try {
    const confirmed = await confirmDialog('Refund this withdrawal?');
    if (!confirmed) return;
    showLoading();
    await db.runTransaction(async (transaction) => {
      const wRef = db.collection('withdrawals').doc(withdrawalId);
      const wDoc = await transaction.get(wRef);
      if (!wDoc.exists) throw new Error('Withdrawal not found');
      const withdrawal = wDoc.data();
      transaction.update(wRef, { status: 'refunded', refundedAt: firebase.firestore.FieldValue.serverTimestamp(), refundedBy: AdminState.currentUser.uid });
      if (withdrawal.userId && withdrawal.coinAmount) {
        const userRef = db.collection('users').doc(withdrawal.userId);
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists) {
          const currentCoins = userDoc.data().coins || 0;
          transaction.update(userRef, { coins: currentCoins + withdrawal.coinAmount });
          const txRef = db.collection('transactions').doc();
          transaction.set(txRef, { userId: withdrawal.userId, type: 'withdrawal_refund', amount: withdrawal.coinAmount, reason: 'Withdrawal refunded', withdrawalId, adminId: AdminState.currentUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp(), balanceAfter: currentCoins + withdrawal.coinAmount });
        }
      }
    });
    await AuditLog.logAction('refund_withdrawal', 'withdrawal', { withdrawalId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Refunded', 'Withdrawal has been refunded');
  } catch (error) { hideLoading(); console.error('refundWithdrawal error:', error); showToast('error', 'Error', error.message); }
}

async function bulkApprove(withdrawalIds) {
  try {
    if (!AdminAuth.hasPermission('manage_withdrawals')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    const confirmed = await confirmDialog(`Approve ${withdrawalIds.length} withdrawals?`);
    if (!confirmed) return;
    showLoading();
    const batch = db.batch();
    withdrawalIds.forEach(id => { batch.update(db.collection('withdrawals').doc(id), { status: 'approved', approvedAt: firebase.firestore.FieldValue.serverTimestamp(), approvedBy: AdminState.currentUser.uid }); });
    await batch.commit();
    await AuditLog.logAction('bulk_approve_withdrawals', 'withdrawals', { withdrawalIds, count: withdrawalIds.length, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Bulk Approved', `${withdrawalIds.length} withdrawals approved`);
    loadWithdrawals('pending', AdminState.filters, AdminState.withdrawalsPagination);
  } catch (error) { hideLoading(); console.error('bulkApprove error:', error); showToast('error', 'Error', error.message); }
}

async function checkSuspicious(withdrawalId) {
  try {
    const withdrawal = await getWithdrawalDetail(withdrawalId);
    if (!withdrawal) return;
    const userDoc = await db.collection('users').doc(withdrawal.userId).get();
    if (!userDoc.exists) return;
    const user = userDoc.data();
    let riskFactors = [];
    if (user.vpnDetected) riskFactors.push('VPN Detected');
    if (user.emulatorDetected) riskFactors.push('Emulator Detected');
    if (user.riskScore && user.riskScore > 70) riskFactors.push('High Risk Score');
    const devicesSnap = await db.collection('userDevices').where('userId', '==', withdrawal.userId).get();
    if (devicesSnap.size > 3) riskFactors.push(`Multiple Devices (${devicesSnap.size})`);
    const recentW = await db.collection('withdrawals').where('userId', '==', withdrawal.userId).where('createdAt', '>=', new Date(Date.now() - 86400000)).get();
    if (recentW.size > 3) riskFactors.push(`Multiple Withdrawals Today (${recentW.size})`);
    if (riskFactors.length > 0) {
      showToast('warning', 'Suspicious Activity', `Risk factors: ${riskFactors.join(', ')}`);
    } else {
      showToast('success', 'No Issues', 'No suspicious activity detected');
    }
  } catch (error) { console.error('checkSuspicious error:', error); showToast('error', 'Error', error.message); }
}

function renderWithdrawalsTable(withdrawals, currentStatus) {
  const container = document.getElementById('withdrawals-content');
  if (!container) return;
  const p = AdminState.withdrawalsPagination;
  const tp = Math.ceil(p.total / p.limit);
  container.innerHTML = `
    <div class="section-header"><div class="withdrawal-tabs">
      <button class="tab-btn ${currentStatus==='pending'?'active':''}" onclick="loadWithdrawals('pending', {}, { page: 1, limit: 25 })">Pending</button>
      <button class="tab-btn ${currentStatus==='approved'?'active':''}" onclick="loadWithdrawals('approved', {}, { page: 1, limit: 25 })">Approved</button>
      <button class="tab-btn ${currentStatus==='processing'?'active':''}" onclick="loadWithdrawals('processing', {}, { page: 1, limit: 25 })">Processing</button>
      <button class="tab-btn ${currentStatus==='completed'?'active':''}" onclick="loadWithdrawals('completed', {}, { page: 1, limit: 25 })">Completed</button>
      <button class="tab-btn ${currentStatus==='rejected'?'active':''}" onclick="loadWithdrawals('rejected', {}, { page: 1, limit: 25 })">Rejected</button>
    </div></div>
    <div class="table-responsive"><table class="admin-table" id="withdrawals-table">
      <thead><tr><th><input type="checkbox" id="select-all-withdrawals"></th><th>User</th><th>Amount</th><th>Method</th><th>Account</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>${withdrawals.length===0 ? '<tr><td colspan="8" class="text-center">No withdrawals found</td></tr>' : withdrawals.map(w => `
        <tr><td><input type="checkbox" class="withdrawal-checkbox" value="${w.id}"></td>
          <td>${w.userEmail||w.userId||'Unknown'}</td><td><strong>${formatUSD(w.amount||0)}</strong></td>
          <td>${w.method||'N/A'}</td><td><code>${w.accountInfo||'N/A'}</code></td>
          <td><span class="status-badge status-${w.status}">${w.status}</span></td><td>${formatDate(w.createdAt)}</td>
          <td><div class="action-buttons">
            ${w.status==='pending' ? `<button class="btn-icon success" onclick="approveWithdrawal('${w.id}')" title="Approve"><i class="fas fa-check"></i></button><button class="btn-icon danger" onclick="showRejectWithdrawalModal('${w.id}')" title="Reject"><i class="fas fa-times"></i></button><button class="btn-icon warning" onclick="checkSuspicious('${w.id}')" title="Check"><i class="fas fa-search"></i></button>` : ''}
            ${w.status==='approved' ? `<button class="btn-icon" onclick="processWithdrawal('${w.id}')" title="Process"><i class="fas fa-play"></i></button>` : ''}
            ${w.status==='processing' ? `<button class="btn-icon success" onclick="completeWithdrawal('${w.id}')" title="Complete"><i class="fas fa-check-double"></i></button>` : ''}
            ${['completed','processing'].includes(w.status) ? `<button class="btn-icon warning" onclick="refundWithdrawal('${w.id}')" title="Refund"><i class="fas fa-undo"></i></button>` : ''}
          </div></td>
        </tr>`).join('')}
      </tbody></table></div>
    <div class="bulk-actions"><button class="btn btn-primary" onclick="bulkApproveSelected()"><i class="fas fa-check-double"></i> Bulk Approve Selected</button></div>
    <div class="pagination">
      <button class="btn btn-sm" onclick="loadWithdrawals('${currentStatus}', AdminState.filters, { page: ${p.page-1}, limit: ${p.limit} })" ${p.page<=1?'disabled':''}><i class="fas fa-chevron-left"></i> Previous</button>
      <span class="page-info">Page ${p.page} of ${tp} (${p.total} total)</span>
      <button class="btn btn-sm" onclick="loadWithdrawals('${currentStatus}', AdminState.filters, { page: ${p.page+1}, limit: ${p.limit} })" ${p.page>=tp?'disabled':''}>Next <i class="fas fa-chevron-right"></i></button>
    </div>`;
  document.getElementById('select-all-withdrawals')?.addEventListener('change', e => document.querySelectorAll('.withdrawal-checkbox').forEach(cb => cb.checked = e.target.checked));
}

function renderWithdrawalDetail(withdrawal) {
  return `<div class="detail-card"><h3>Withdrawal #${withdrawal.id.substring(0,8)}</h3><div class="info-grid">
    <div><label>User:</label><span>${withdrawal.userEmail||withdrawal.userId}</span></div>
    <div><label>Amount:</label><span>${formatUSD(withdrawal.amount||0)}</span></div>
    <div><label>Coin Amount:</label><span>${formatNumber(withdrawal.coinAmount||0)} coins</span></div>
    <div><label>Method:</label><span>${withdrawal.method||'N/A'}</span></div>
    <div><label>Account:</label><span>${withdrawal.accountInfo||'N/A'}</span></div>
    <div><label>Status:</label><span class="status-badge status-${withdrawal.status}">${withdrawal.status}</span></div>
    <div><label>Requested:</label><span>${formatDate(withdrawal.createdAt)}</span></div>
    <div><label>Processed:</label><span>${formatDate(withdrawal.processedAt)}</span></div>
  </div></div>`;
}

function bulkApproveSelected() {
  const selected = [];
  document.querySelectorAll('.withdrawal-checkbox:checked').forEach(cb => selected.push(cb.value));
  if (selected.length > 0) bulkApprove(selected);
  else showToast('warning', 'No Selection', 'Please select withdrawals to approve');
}

function showRejectWithdrawalModal(withdrawalId) {
  showModal('reject-withdrawal-modal', { withdrawalId, title: 'Reject Withdrawal', onSubmit: (reason) => rejectWithdrawal(withdrawalId, reason) });
}

// ============================================================================
// FRAUD CENTER MODULE
// ============================================================================

async function loadFraudDashboard() {
  try {
    showLoading();
    const [highRiskUsers, sharedDevices, sharedIPs, vpnUsers, emulatorUsers, chargebacksList, manualReviewQueue] = await Promise.all([
      getHighRiskUsers(), getSharedDevices(), getSharedIPs(), getVPNUsers(), getEmulatorUsers(), getChargebacksList(), getManualReviewQueue()
    ]);
    AdminState.fraudEvents = { highRiskUsers, sharedDevices, sharedIPs, vpnUsers, emulatorUsers, chargebacks: chargebacksList, manualReviewQueue };
    renderFraudDashboard();
    hideLoading();
  } catch (error) { hideLoading(); console.error('loadFraudDashboard error:', error); showToast('error', 'Load Error', 'Failed to load fraud dashboard'); }
}

async function getHighRiskUsers() {
  try {
    const snapshot = await db.collection('users').where('riskScore', '>=', 70).orderBy('riskScore', 'desc').limit(50).get();
    const users = []; snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
    return users;
  } catch (error) { return []; }
}

async function getSharedDevices() {
  try {
    const snapshot = await db.collection('deviceGroups').where('deviceCount', '>', 2).orderBy('deviceCount', 'desc').limit(50).get();
    const groups = []; snapshot.forEach(doc => groups.push({ id: doc.id, ...doc.data() }));
    return groups;
  } catch (error) { return []; }
}

async function getSharedIPs() {
  try {
    const snapshot = await db.collection('ipGroups').where('userCount', '>', 3).orderBy('userCount', 'desc').limit(50).get();
    const groups = []; snapshot.forEach(doc => groups.push({ id: doc.id, ...doc.data() }));
    return groups;
  } catch (error) { return []; }
}

async function getVPNUsers() {
  try {
    const snapshot = await db.collection('users').where('vpnDetected', '==', true).limit(50).get();
    const users = []; snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
    return users;
  } catch (error) { return []; }
}

async function getEmulatorUsers() {
  try {
    const snapshot = await db.collection('users').where('emulatorDetected', '==', true).limit(50).get();
    const users = []; snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
    return users;
  } catch (error) { return []; }
}

async function getMultipleAccounts() {
  try {
    const snapshot = await db.collection('deviceGroups').where('accountCount', '>', 1).orderBy('accountCount', 'desc').limit(50).get();
    const groups = []; snapshot.forEach(doc => groups.push({ id: doc.id, ...doc.data() }));
    return groups;
  } catch (error) { return []; }
}

async function getAbnormalOffers() {
  try {
    const snapshot = await db.collection('offerCompletions').where('flagged', '==', true).orderBy('createdAt', 'desc').limit(50).get();
    const completions = []; snapshot.forEach(doc => completions.push({ id: doc.id, ...doc.data() }));
    return completions;
  } catch (error) { return []; }
}

async function getReferralAbuse() {
  try {
    const snapshot = await db.collection('referralAbuse').orderBy('riskScore', 'desc').limit(50).get();
    const events = []; snapshot.forEach(doc => events.push({ id: doc.id, ...doc.data() }));
    return events;
  } catch (error) { return []; }
}

async function getChargebacksList() {
  try {
    const snapshot = await db.collection('chargebacks').orderBy('createdAt', 'desc').limit(50).get();
    const items = []; snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    return items;
  } catch (error) { return []; }
}

async function getManualReviewQueue() {
  try {
    const snapshot = await db.collection('fraudEvents').where('status', '==', 'pending_review').orderBy('createdAt', 'desc').limit(50).get();
    const events = []; snapshot.forEach(doc => events.push({ id: doc.id, ...doc.data() }));
    return events;
  } catch (error) { return []; }
}

async function addToBlocklist(userId, reason) {
  try {
    if (!AdminAuth.hasPermission('manage_fraud')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    showLoading();
    await db.collection('blocklist').doc(userId).set({ userId, reason: reason || 'Admin block', addedAt: firebase.firestore.FieldValue.serverTimestamp(), addedBy: AdminState.currentUser.uid });
    await db.collection('users').doc(userId).update({ status: 'banned', blockedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('add_to_blocklist', 'user', { userId, reason, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Blocked', 'User has been added to blocklist');
  } catch (error) { hideLoading(); console.error('addToBlocklist error:', error); showToast('error', 'Error', error.message); }
}

async function removeFromBlocklist(userId) {
  try {
    showLoading();
    await db.collection('blocklist').doc(userId).delete();
    await db.collection('users').doc(userId).update({ status: 'active', blockedAt: firebase.firestore.FieldValue.delete() });
    await AuditLog.logAction('remove_from_blocklist', 'user', { userId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Unblocked', 'User removed from blocklist');
  } catch (error) { hideLoading(); console.error('removeFromBlocklist error:', error); showToast('error', 'Error', error.message); }
}

async function addToAllowlist(userId) {
  try {
    showLoading();
    await db.collection('allowlist').doc(userId).set({ userId, addedAt: firebase.firestore.FieldValue.serverTimestamp(), addedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('add_to_allowlist', 'user', { userId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Allowlisted', 'User added to allowlist');
  } catch (error) { hideLoading(); console.error('addToAllowlist error:', error); showToast('error', 'Error', error.message); }
}

async function removeFromAllowlist(userId) {
  try {
    showLoading();
    await db.collection('allowlist').doc(userId).delete();
    await AuditLog.logAction('remove_from_allowlist', 'user', { userId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Removed', 'User removed from allowlist');
  } catch (error) { hideLoading(); console.error('removeFromAllowlist error:', error); showToast('error', 'Error', error.message); }
}

async function loadRiskRules() {
  try {
    const snapshot = await db.collection('riskRules').orderBy('priority', 'asc').get();
    const rules = []; snapshot.forEach(doc => rules.push({ id: doc.id, ...doc.data() }));
    return rules;
  } catch (error) { return []; }
}

async function addRiskRule(rule) {
  try {
    if (!AdminAuth.hasPermission('manage_fraud_rules')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    showLoading();
    await db.collection('riskRules').add({ ...rule, active: true, createdAt: firebase.firestore.FieldValue.serverTimestamp(), createdBy: AdminState.currentUser.uid });
    await AuditLog.logAction('add_risk_rule', 'fraud', { rule, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Rule Added', 'Risk rule has been added');
  } catch (error) { hideLoading(); console.error('addRiskRule error:', error); showToast('error', 'Error', error.message); }
}

async function updateRiskRule(ruleId, data) {
  try {
    showLoading();
    await db.collection('riskRules').doc(ruleId).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('success', 'Rule Updated', 'Risk rule has been updated');
  } catch (error) { hideLoading(); console.error('updateRiskRule error:', error); showToast('error', 'Error', error.message); }
}

async function deleteRiskRule(ruleId) {
  try {
    const confirmed = await confirmDialog('Delete this risk rule?');
    if (!confirmed) return;
    showLoading();
    await db.collection('riskRules').doc(ruleId).delete();
    await AuditLog.logAction('delete_risk_rule', 'fraud', { ruleId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Rule Deleted', 'Risk rule has been removed');
  } catch (error) { hideLoading(); console.error('deleteRiskRule error:', error); showToast('error', 'Error', error.message); }
}

async function loadFraudLogs(filters = {}) {
  try {
    let query = db.collection('fraudLogs');
    if (filters.type) query = query.where('type', '==', filters.type);
    const snapshot = await query.orderBy('createdAt', 'desc').limit(200).get();
    const logs = []; snapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
    return logs;
  } catch (error) { return []; }
}

async function flagUser(userId, flag, reason) {
  try {
    showLoading();
    await db.collection('users').doc(userId).update({ [`fraudFlags.${flag}`]: { reason, flaggedAt: firebase.firestore.FieldValue.serverTimestamp(), flaggedBy: AdminState.currentUser.uid } });
    await AuditLog.logAction('flag_user', 'user', { userId, flag, reason, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Flagged', `User flagged as ${flag}`);
  } catch (error) { hideLoading(); console.error('flagUser error:', error); showToast('error', 'Error', error.message); }
}

async function unflagUser(userId, flag) {
  try {
    showLoading();
    await db.collection('users').doc(userId).update({ [`fraudFlags.${flag}`]: firebase.firestore.FieldValue.delete() });
    await AuditLog.logAction('unflag_user', 'user', { userId, flag, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Unflagged', `Flag ${flag} removed`);
  } catch (error) { hideLoading(); console.error('unflagUser error:', error); showToast('error', 'Error', error.message); }
}

function renderFraudDashboard() {
  const container = document.getElementById('fraud-content');
  if (!container) return;
  const f = AdminState.fraudEvents;
  container.innerHTML = `
    <div class="fraud-stats-grid">
      <div class="stat-card danger"><div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="stat-info"><h3>${(f.highRiskUsers||[]).length}</h3><p>High Risk Users</p></div></div>
      <div class="stat-card warning"><div class="stat-icon"><i class="fas fa-mobile-alt"></i></div><div class="stat-info"><h3>${(f.sharedDevices||[]).length}</h3><p>Shared Devices</p></div></div>
      <div class="stat-card warning"><div class="stat-icon"><i class="fas fa-globe"></i></div><div class="stat-info"><h3>${(f.sharedIPs||[]).length}</h3><p>Shared IPs</p></div></div>
      <div class="stat-card"><div class="stat-icon"><i class="fas fa-shield-alt"></i></div><div class="stat-info"><h3>${(f.vpnUsers||[]).length}</h3><p>VPN Users</p></div></div>
      <div class="stat-card"><div class="stat-icon"><i class="fas fa-desktop"></i></div><div class="stat-info"><h3>${(f.emulatorUsers||[]).length}</h3><p>Emulator Users</p></div></div>
      <div class="stat-card"><div class="stat-icon"><i class="fas fa-ban"></i></div><div class="stat-info"><h3>${(f.chargebacks||[]).length}</h3><p>Chargebacks</p></div></div>
    </div>
    <div class="fraud-sections">
      <div class="fraud-section"><h3>High Risk Users</h3>${renderHighRiskUsers(f.highRiskUsers || [])}</div>
      <div class="fraud-section"><h3>Manual Review Queue</h3>${(f.manualReviewQueue||[]).length === 0 ? '<p class="text-muted">No items in review queue</p>' : f.manualReviewQueue.map(e => `<div class="fraud-event"><span>${e.description || e.type || 'Unknown event'}</span><span>${formatDate(e.createdAt)}</span><button class="btn btn-sm btn-primary" onclick="getUserDetail('${e.userId}')">Review</button></div>`).join('')}</div>
      <div class="fraud-section"><h3>Risk Rules</h3><button class="btn btn-sm btn-primary" onclick="showAddRiskRuleModal()">Add Rule</button><div id="risk-rules-list"></div></div>
    </div>`;
}

function renderHighRiskUsers(users) {
  if (!users || users.length === 0) return '<p class="text-muted">No high risk users found</p>';
  return `<table class="admin-table"><thead><tr><th>User</th><th>Email</th><th>Risk Score</th><th>VPN</th><th>Emulator</th><th>Actions</th></tr></thead>
    <tbody>${users.map(u => `<tr><td>${u.displayName||'Unknown'}</td><td>${u.email||'N/A'}</td>
      <td><span class="risk-badge risk-${u.riskScore>=90?'critical':u.riskScore>=70?'high':'medium'}">${u.riskScore||0}</span></td>
      <td>${u.vpnDetected?'<span class="badge badge-danger">VPN</span>':'No'}</td>
      <td>${u.emulatorDetected?'<span class="badge badge-danger">EMU</span>':'No'}</td>
      <td><div class="action-buttons">
        <button class="btn-icon" onclick="getUserDetail('${u.id}')" title="View"><i class="fas fa-eye"></i></button>
        <button class="btn-icon" onclick="addToBlocklist('${u.id}', 'High risk')" title="Block"><i class="fas fa-ban"></i></button>
        <button class="btn-icon" onclick="addToAllowlist('${u.id}')" title="Allow"><i class="fas fa-check"></i></button>
      </div></td></tr>`).join('')}</tbody></table>`;
}

function renderFraudLogs(logs) {
  if (!logs || logs.length === 0) return '<p class="text-muted">No fraud logs found</p>';
  return `<table class="admin-table"><thead><tr><th>Event</th><th>User</th><th>Details</th><th>Date</th></tr></thead>
    <tbody>${logs.map(l => `<tr><td>${l.type||'Unknown'}</td><td>${l.userId||'N/A'}</td><td>${l.description||l.details||''}</td><td>${formatDate(l.createdAt)}</td></tr>`).join('')}</tbody></table>`;
}

// ============================================================================
// FINANCE MODULE
// ============================================================================

async function loadFinance() {
  try {
    showLoading();
    const [grossRevenue, userRewards, fulfillmentCost, paymentFees, providerFees, chargebacksTotal, refundsTotal, fraudLosses] = await Promise.all([
      getGrossRevenue(), getUserRewardsFinance(), getFulfillmentCost(), getPaymentFees(), getProviderFees(), getChargebacksTotal(), getRefundsTotal(), getFraudLosses()
    ]);
    const netRevenue = grossRevenue - chargebacksTotal - refundsTotal - fraudLosses;
    const totalCosts = userRewards + fulfillmentCost + paymentFees + providerFees;
    const netProfit = netRevenue - totalCosts;
    const profitMargin = netRevenue > 0 ? ((netProfit / netRevenue) * 100).toFixed(2) : 0;
    AdminState.finance = { grossRevenue, userRewards, fulfillmentCost, paymentFees, providerFees, chargebacksTotal, refundsTotal, fraudLosses, netRevenue, totalCosts, netProfit, profitMargin };
    renderFinance();
    hideLoading();
  } catch (error) { hideLoading(); console.error('loadFinance error:', error); showToast('error', 'Load Error', 'Failed to load finance data'); }
}

async function getGrossRevenue() {
  try {
    const snapshot = await db.collection('transactions').where('type', '==', 'revenue').get();
    let total = 0; snapshot.forEach(doc => { total += doc.data().amount || 0; });
    return total;
  } catch (error) { return 0; }
}

async function getUserRewardsFinance() {
  try {
    const snapshot = await db.collection('transactions').where('type', '==', 'reward').get();
    let total = 0; snapshot.forEach(doc => { total += doc.data().amount || 0; });
    return total;
  } catch (error) { return 0; }
}

async function getFulfillmentCost() {
  try {
    const doc = await db.collection('stats').doc('finance').get();
    return doc.exists ? (doc.data().fulfillmentCost || 0) : 0;
  } catch (error) { return 0; }
}

async function getPaymentFees() {
  try {
    const doc = await db.collection('stats').doc('finance').get();
    return doc.exists ? (doc.data().paymentFees || 0) : 0;
  } catch (error) { return 0; }
}

async function getProviderFees() {
  try {
    const snapshot = await db.collection('providerFees').get();
    let total = 0; snapshot.forEach(doc => { total += doc.data().amount || 0; });
    return total;
  } catch (error) { return 0; }
}

async function getChargebacksTotal() {
  try {
    const snapshot = await db.collection('chargebacks').get();
    let total = 0; snapshot.forEach(doc => { total += doc.data().amount || 0; });
    return total;
  } catch (error) { return 0; }
}

async function getRefundsTotal() {
  try {
    const snapshot = await db.collection('transactions').where('type', '==', 'refund').get();
    let total = 0; snapshot.forEach(doc => { total += doc.data().amount || 0; });
    return total;
  } catch (error) { return 0; }
}

async function getFraudLosses() {
  try {
    const doc = await db.collection('stats').doc('finance').get();
    return doc.exists ? (doc.data().fraudLosses || 0) : 0;
  } catch (error) { return 0; }
}

async function getNetRevenue() {
  try {
    const [gross, chargebacks, refunds, fraud] = await Promise.all([getGrossRevenue(), getChargebacksTotal(), getRefundsTotal(), getFraudLosses()]);
    return gross - chargebacks - refunds - fraud;
  } catch (error) { return 0; }
}

async function getNetProfitFinance() {
  try {
    const [netRev, rewards, fulfillment, payment, provider] = await Promise.all([getNetRevenue(), getUserRewardsFinance(), getFulfillmentCost(), getPaymentFees(), getProviderFees()]);
    return netRev - rewards - fulfillment - payment - provider;
  } catch (error) { return 0; }
}

async function getProfitMarginFinance() {
  try {
    const netRev = await getNetRevenue();
    const profit = await getNetProfitFinance();
    return netRev > 0 ? ((profit / netRev) * 100).toFixed(2) : 0;
  } catch (error) { return 0; }
}

async function getDailyPnL(startDate, endDate) {
  try {
    const snapshot = await db.collection('dailyPnL')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .get();
    const data = []; snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
    return data;
  } catch (error) { return []; }
}

async function getMonthlyPnL(year, month) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const snapshot = await db.collection('dailyPnL')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .get();
    const data = []; snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
    return data;
  } catch (error) { return []; }
}

async function getProviderProfitability() {
  try {
    const snapshot = await db.collection('providers').get();
    const providers = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      providers.push({ id: doc.id, name: d.name, revenue: d.totalRevenue || 0, chargebacks: d.totalChargebacks || 0, profit: (d.totalRevenue || 0) - (d.totalChargebacks || 0) });
    });
    return providers.sort((a, b) => b.profit - a.profit);
  } catch (error) { return []; }
}

async function getRewardProfitability() {
  try {
    const snapshot = await db.collection('rewards').get();
    const rewards = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      rewards.push({ id: doc.id, name: d.name, cost: d.cost || 0, redemptions: d.redemptions || 0, totalCost: (d.cost || 0) * (d.redemptions || 0) });
    });
    return rewards.sort((a, b) => b.totalCost - a.totalCost);
  } catch (error) { return []; }
}

function renderFinance() {
  const container = document.getElementById('finance-content');
  if (!container) return;
  const f = AdminState.finance;
  container.innerHTML = `
    <div class="finance-summary">
      <div class="finance-card revenue"><h3>Gross Revenue</h3><p class="amount">${formatUSD(f.grossRevenue || 0)}</p></div>
      <div class="finance-card cost"><h3>User Rewards</h3><p class="amount">${formatUSD(f.userRewards || 0)}</p></div>
      <div class="finance-card cost"><h3>Fulfillment Cost</h3><p class="amount">${formatUSD(f.fulfillmentCost || 0)}</p></div>
      <div class="finance-card cost"><h3>Payment Fees</h3><p class="amount">${formatUSD(f.paymentFees || 0)}</p></div>
      <div class="finance-card cost"><h3>Provider Fees</h3><p class="amount">${formatUSD(f.providerFees || 0)}</p></div>
      <div class="finance-card cost"><h3>Chargebacks</h3><p class="amount">${formatUSD(f.chargebacksTotal || 0)}</p></div>
      <div class="finance-card cost"><h3>Refunds</h3><p class="amount">${formatUSD(f.refundsTotal || 0)}</p></div>
      <div class="finance-card cost"><h3>Fraud Losses</h3><p class="amount">${formatUSD(f.fraudLosses || 0)}</p></div>
      <div class="finance-card net"><h3>Net Revenue</h3><p class="amount">${formatUSD(f.netRevenue || 0)}</p></div>
      <div class="finance-card profit"><h3>Net Profit</h3><p class="amount">${formatUSD(f.netProfit || 0)}</p></div>
      <div class="finance-card margin"><h3>Profit Margin</h3><p class="amount">${f.profitMargin || 0}%</p></div>
    </div>
    <div class="charts-row">
      <div class="chart-container"><h3>Revenue Breakdown</h3><canvas id="finance-pnl-chart"></canvas></div>
      <div class="chart-container"><h3>Cost Breakdown</h3><canvas id="finance-cost-chart"></canvas></div>
    </div>
    <div class="finance-actions"><button class="btn btn-primary" onclick="exportFinanceReport('csv')"><i class="fas fa-download"></i> Export Finance Report</button></div>`;
  renderPnLChart(null);
}

function renderPnLChart(data) {
  const canvas = document.getElementById('finance-pnl-chart');
  if (!canvas) return;
  if (AdminState.chartInstances.financePnl) AdminState.chartInstances.financePnl.destroy();
  const ctx = canvas.getContext('2d');
  const f = AdminState.finance;
  AdminState.chartInstances.financePnl = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Gross Revenue', 'Chargebacks', 'Refunds', 'Fraud Losses', 'Net Revenue'],
      datasets: [{ data: [f.grossRevenue||0, f.chargebacksTotal||0, f.refundsTotal||0, f.fraudLosses||0, Math.max(0, f.netRevenue||0)], backgroundColor: ['#10b981','#ef4444','#f59e0b','#8b5cf6','#3b82f6'] }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
  const costCanvas = document.getElementById('finance-cost-chart');
  if (!costCanvas) return;
  if (AdminState.chartInstances.financeCost) AdminState.chartInstances.financeCost.destroy();
  const costCtx = costCanvas.getContext('2d');
  AdminState.chartInstances.financeCost = new Chart(costCtx, {
    type: 'pie',
    data: {
      labels: ['User Rewards', 'Fulfillment', 'Payment Fees', 'Provider Fees'],
      datasets: [{ data: [f.userRewards||0, f.fulfillmentCost||0, f.paymentFees||0, f.providerFees||0], backgroundColor: ['#f59e0b','#ef4444','#3b82f6','#8b5cf6'] }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

async function exportFinanceReport(format, dateRange) {
  try {
    showLoading();
    const f = AdminState.finance;
    if (format === 'csv') {
      const rows = [
        ['Metric', 'Value'],
        ['Gross Revenue', f.grossRevenue],
        ['User Rewards', f.userRewards],
        ['Fulfillment Cost', f.fulfillmentCost],
        ['Payment Fees', f.paymentFees],
        ['Provider Fees', f.providerFees],
        ['Chargebacks', f.chargebacksTotal],
        ['Refunds', f.refundsTotal],
        ['Fraud Losses', f.fraudLosses],
        ['Net Revenue', f.netRevenue],
        ['Net Profit', f.netProfit],
        ['Profit Margin', f.profitMargin + '%']
      ];
      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `finance_report_${new Date().toISOString().split('T')[0]}.csv`; a.click();
      URL.revokeObjectURL(url);
    }
    await AuditLog.logAction('export_finance', 'finance', { format, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Export Complete', 'Finance report exported');
  } catch (error) { hideLoading(); console.error('exportFinanceReport error:', error); showToast('error', 'Export Error', error.message); }
}

// ============================================================================
// ANALYTICS MODULE
// ============================================================================

async function loadAnalytics() {
  try {
    showLoading();
    const [dau, wau, mau, newUsers, returningUsers] = await Promise.all([getDAU(), getWAU(), getMAU(), getNewUsers(), getReturningUsers()]);
    const [retention, sessionLength, conversionRates, avgRewardPerUser, avgRevenuePerUser] = await Promise.all([getRetention(), getSessionLength(), getConversionRates(), getAvgRewardPerUser(), getAvgRevenuePerUser()]);
    const [topCountries, topDevices, topTrafficSources, referralConversion] = await Promise.all([getTopCountriesAnalytics(), getTopDevices(), getTopTrafficSources(), getReferralConversion()]);
    const [ltv, cohortAnalysis] = await Promise.all([getLTV(), getCohortAnalysis()]);
    AdminState.analytics = { dau, wau, mau, newUsers, returningUsers, retention, sessionLength, conversionRates, avgRewardPerUser, avgRevenuePerUser, topCountries, topDevices, topTrafficSources, referralConversion, ltv, cohortAnalysis };
    renderAnalytics();
    hideLoading();
  } catch (error) { hideLoading(); console.error('loadAnalytics error:', error); showToast('error', 'Load Error', 'Failed to load analytics'); }
}

async function getDAU() {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const snapshot = await db.collection('users').where('lastActive', '>=', today).count().get();
    return snapshot.data().count;
  } catch (error) { return 0; }
}

async function getWAU() {
  try {
    const d = new Date(); d.setDate(d.getDate() - 7);
    const snapshot = await db.collection('users').where('lastActive', '>=', d).count().get();
    return snapshot.data().count;
  } catch (error) { return 0; }
}

async function getMAU() {
  try {
    const d = new Date(); d.setDate(d.getDate() - 30);
    const snapshot = await db.collection('users').where('lastActive', '>=', d).count().get();
    return snapshot.data().count;
  } catch (error) { return 0; }
}

async function getNewUsers() {
  try {
    const d = new Date(); d.setDate(d.getDate() - 7);
    const snapshot = await db.collection('users').where('createdAt', '>=', d).count().get();
    return snapshot.data().count;
  } catch (error) { return 0; }
}

async function getReturningUsers() {
  try {
    const d = new Date(); d.setDate(d.getDate() - 30);
    const d2 = new Date(); d2.setDate(d2.getDate() - 7);
    const snapshot = await db.collection('users').where('lastActive', '>=', d).where('createdAt', '<', d2).count().get();
    return snapshot.data().count;
  } catch (error) { return 0; }
}

async function getRetention() {
  try {
    const doc = await db.collection('analytics').doc('retention').get();
    return doc.exists ? doc.data() : {};
  } catch (error) { return {}; }
}

async function getSessionLength() {
  try {
    const doc = await db.collection('analytics').doc('sessions').get();
    return doc.exists ? doc.data().avgLength : 0;
  } catch (error) { return 0; }
}

async function getConversionRates() {
  try {
    const snapshot = await db.collection('offers').orderBy('completions', 'desc').limit(20).get();
    const offers = []; snapshot.forEach(doc => { const d = doc.data(); offers.push({ name: d.name, views: d.views || 0, completions: d.completions || 0, rate: d.views > 0 ? ((d.completions / d.views) * 100).toFixed(2) : 0 }); });
    return offers;
  } catch (error) { return []; }
}

async function getAvgRewardPerUser() {
  try {
    const totalUsers = await getTotalUsers();
    if (totalUsers === 0) return 0;
    const rewards = await getUserRewardsFinance();
    return (rewards / totalUsers).toFixed(2);
  } catch (error) { return 0; }
}

async function getAvgRevenuePerUser() {
  try {
    const totalUsers = await getTotalUsers();
    if (totalUsers === 0) return 0;
    const revenue = await getGrossRevenue();
    return (revenue / totalUsers).toFixed(2);
  } catch (error) { return 0; }
}

async function getTopCountriesAnalytics() { return getTopCountries(); }

async function getTopDevices() {
  try {
    const snapshot = await db.collection('userDevices').limit(1000).get();
    const devices = {};
    snapshot.forEach(doc => { const d = doc.data(); const os = d.os || 'Unknown'; devices[os] = (devices[os] || 0) + 1; });
    return Object.entries(devices).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([device, count]) => ({ device, count }));
  } catch (error) { return []; }
}

async function getTopTrafficSources() {
  try {
    const doc = await db.collection('analytics').doc('trafficSources').get();
    return doc.exists ? doc.data().sources || [] : [];
  } catch (error) { return []; }
}

async function getReferralConversion() {
  try {
    const snapshot = await db.collection('referrals').get();
    let total = 0, converted = 0;
    snapshot.forEach(doc => { const d = doc.data(); total++; if (d.converted) converted++; });
    return { total, converted, rate: total > 0 ? ((converted / total) * 100).toFixed(2) : 0 };
  } catch (error) { return { total: 0, converted: 0, rate: 0 }; }
}

async function getCohortAnalysis() {
  try {
    const doc = await db.collection('analytics').doc('cohorts').get();
    return doc.exists ? doc.data().cohorts || [] : [];
  } catch (error) { return []; }
}

async function getLTV() {
  try {
    const doc = await db.collection('analytics').doc('ltv').get();
    return doc.exists ? doc.data().value : 0;
  } catch (error) { return 0; }
}

function renderAnalytics() {
  const container = document.getElementById('analytics-content');
  if (!container) return;
  const a = AdminState.analytics;
  container.innerHTML = `
    <div class="analytics-stats">
      <div class="stat-card"><div class="stat-info"><h3>${formatNumber(a.dau||0)}</h3><p>DAU</p></div></div>
      <div class="stat-card"><div class="stat-info"><h3>${formatNumber(a.wau||0)}</h3><p>WAU</p></div></div>
      <div class="stat-card"><div class="stat-info"><h3>${formatNumber(a.mau||0)}</h3><p>MAU</p></div></div>
      <div class="stat-card"><div class="stat-info"><h3>${formatNumber(a.newUsers||0)}</h3><p>New Users (7d)</p></div></div>
      <div class="stat-card"><div class="stat-info"><h3>${formatNumber(a.returningUsers||0)}</h3><p>Returning Users</p></div></div>
      <div class="stat-card"><div class="stat-info"><h3>${a.sessionLength||0}m</h3><p>Avg Session Length</p></div></div>
      <div class="stat-card"><div class="stat-info"><h3>${formatUSD(a.avgRewardPerUser||0)}</h3><p>Avg Reward/User</p></div></div>
      <div class="stat-card"><div class="stat-info"><h3>${formatUSD(a.avgRevenuePerUser||0)}</h3><p>Avg Revenue/User</p></div></div>
      <div class="stat-card"><div class="stat-info"><h3>${formatUSD(a.ltv||0)}</h3><p>Customer LTV</p></div></div>
    </div>
    <div class="charts-row">
      <div class="chart-container"><h3>Device Distribution</h3><canvas id="analytics-device-chart"></canvas></div>
      <div class="chart-container"><h3>Country Distribution</h3><canvas id="analytics-country-chart"></canvas></div>
    </div>
    <div class="analytics-tables">
      <div class="table-card"><h3>Top Countries</h3><table class="admin-table"><thead><tr><th>Country</th><th>Users</th></tr></thead><tbody>${(a.topCountries||[]).map(c => `<tr><td>${c.country}</td><td>${formatNumber(c.count)}</td></tr>`).join('')}</tbody></table></div>
      <div class="table-card"><h3>Top Devices</h3><table class="admin-table"><thead><tr><th>Device</th><th>Count</th></tr></thead><tbody>${(a.topDevices||[]).map(d => `<tr><td>${d.device}</td><td>${formatNumber(d.count)}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
  renderCharts();
}

function renderCharts() {
  const a = AdminState.analytics;
  const deviceCanvas = document.getElementById('analytics-device-chart');
  if (deviceCanvas) {
    if (AdminState.chartInstances.deviceChart) AdminState.chartInstances.deviceChart.destroy();
    AdminState.chartInstances.deviceChart = new Chart(deviceCanvas.getContext('2d'), {
      type: 'pie',
      data: { labels: (a.topDevices||[]).map(d => d.device), datasets: [{ data: (a.topDevices||[]).map(d => d.count), backgroundColor: ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'] }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  const countryCanvas = document.getElementById('analytics-country-chart');
  if (countryCanvas) {
    if (AdminState.chartInstances.countryChart) AdminState.chartInstances.countryChart.destroy();
    AdminState.chartInstances.countryChart = new Chart(countryCanvas.getContext('2d'), {
      type: 'bar',
      data: { labels: (a.topCountries||[]).map(c => c.country), datasets: [{ label: 'Users', data: (a.topCountries||[]).map(c => c.count), backgroundColor: '#4f46e5', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  }
}

// ============================================================================
// ADS MANAGEMENT MODULE
// ============================================================================

async function loadAds() {
  try {
    showLoading();
    const [adProviders, placements, adRevenue] = await Promise.all([getAdProviders(), getPlacements(), getAdRevenue()]);
    AdminState.ads = { adProviders, placements, adRevenue };
    renderAdsDashboard();
    hideLoading();
  } catch (error) { hideLoading(); console.error('loadAds error:', error); showToast('error', 'Load Error', 'Failed to load ads data'); }
}

async function getAdProviders() {
  try {
    const snapshot = await db.collection('adProviders').get();
    const providers = []; snapshot.forEach(doc => providers.push({ id: doc.id, ...doc.data() }));
    return providers;
  } catch (error) { return []; }
}

async function addAdProvider(data) {
  try {
    showLoading();
    await db.collection('adProviders').add({ ...data, active: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('add_ad_provider', 'ads', { data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Ad Provider Added', 'New ad provider has been added');
    loadAds();
  } catch (error) { hideLoading(); console.error('addAdProvider error:', error); showToast('error', 'Error', error.message); }
}

async function updateAdProvider(providerId, data) {
  try {
    showLoading();
    await db.collection('adProviders').doc(providerId).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('update_ad_provider', 'ads', { providerId, data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Updated', 'Ad provider updated');
    loadAds();
  } catch (error) { hideLoading(); console.error('updateAdProvider error:', error); showToast('error', 'Error', error.message); }
}

async function getPlacements() {
  try {
    const snapshot = await db.collection('adPlacements').get();
    const placements = []; snapshot.forEach(doc => placements.push({ id: doc.id, ...doc.data() }));
    return placements;
  } catch (error) { return []; }
}

async function addPlacement(data) {
  try {
    showLoading();
    await db.collection('adPlacements').add({ ...data, active: true, impressions: 0, clicks: 0, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('success', 'Placement Added', 'New ad placement created');
    loadAds();
  } catch (error) { hideLoading(); console.error('addPlacement error:', error); showToast('error', 'Error', error.message); }
}

async function updatePlacement(placementId, data) {
  try {
    showLoading();
    await db.collection('adPlacements').doc(placementId).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('success', 'Updated', 'Ad placement updated');
    loadAds();
  } catch (error) { hideLoading(); console.error('updatePlacement error:', error); showToast('error', 'Error', error.message); }
}

async function getAdRevenue() {
  try {
    const snapshot = await db.collection('transactions').where('type', '==', 'ad_revenue').get();
    let total = 0; snapshot.forEach(doc => { total += doc.data().amount || 0; });
    return total;
  } catch (error) { return 0; }
}

async function setDailyCap(userId, cap) {
  try {
    showLoading();
    await db.collection('adCaps').doc(userId).set({ userId, dailyCap: Number(cap), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    hideLoading();
    showToast('success', 'Cap Set', 'Daily ad cap has been updated');
  } catch (error) { hideLoading(); console.error('setDailyCap error:', error); showToast('error', 'Error', error.message); }
}

async function loadABTests() {
  try {
    const snapshot = await db.collection('abTests').orderBy('createdAt', 'desc').get();
    const tests = []; snapshot.forEach(doc => tests.push({ id: doc.id, ...doc.data() }));
    return tests;
  } catch (error) { return []; }
}

async function createABTest(data) {
  try {
    showLoading();
    await db.collection('abTests').add({ ...data, active: true, createdAt: firebase.firestore.FieldValue.serverTimestamp(), createdBy: AdminState.currentUser.uid });
    await AuditLog.logAction('create_ab_test', 'ads', { data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'A/B Test Created', 'New A/B test has been created');
  } catch (error) { hideLoading(); console.error('createABTest error:', error); showToast('error', 'Error', error.message); }
}

async function toggleABTest(testId, active) {
  try {
    showLoading();
    await db.collection('abTests').doc(testId).update({ active, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('success', 'Updated', `A/B test ${active ? 'activated' : 'deactivated'}`);
  } catch (error) { hideLoading(); console.error('toggleABTest error:', error); showToast('error', 'Error', error.message); }
}

function renderAdsDashboard() {
  const container = document.getElementById('ads-content');
  if (!container) return;
  const a = AdminState.ads;
  container.innerHTML = `
    <div class="ads-stats">
      <div class="stat-card"><div class="stat-info"><h3>${formatUSD(a.adRevenue||0)}</h3><p>Total Ad Revenue</p></div></div>
      <div class="stat-card"><div class="stat-info"><h3>${(a.adProviders||[]).length}</h3><p>Ad Providers</p></div></div>
      <div class="stat-card"><div class="stat-info"><h3>${(a.placements||[]).length}</h3><p>Ad Placements</p></div></div>
    </div>
    <div class="ads-sections">
      <div class="ads-section"><h3>Ad Providers</h3>
        <button class="btn btn-sm btn-primary" onclick="showAddAdProviderModal()"><i class="fas fa-plus"></i> Add Provider</button>
        <table class="admin-table"><thead><tr><th>Provider</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${(a.adProviders||[]).map(p => `<tr><td>${p.name||'Unknown'}</td><td>${p.type||'N/A'}</td><td><span class="status-badge status-${p.active?'active':'inactive'}">${p.active?'Active':'Inactive'}</span></td>
          <td><button class="btn-icon" onclick="showEditAdProviderModal('${p.id}')"><i class="fas fa-edit"></i></button></td></tr>`).join('')}</tbody></table>
      </div>
      <div class="ads-section"><h3>Placements</h3>
        <button class="btn btn-sm btn-primary" onclick="showAddPlacementModal()"><i class="fas fa-plus"></i> Add Placement</button>
        <table class="admin-table"><thead><tr><th>Name</th><th>Location</th><th>Impressions</th><th>Clicks</th><th>CTR</th></tr></thead>
        <tbody>${(a.placements||[]).map(p => `<tr><td>${p.name||'Unknown'}</td><td>${p.location||'N/A'}</td><td>${formatNumber(p.impressions||0)}</td><td>${formatNumber(p.clicks||0)}</td><td>${p.impressions>0?((p.clicks/p.impressions)*100).toFixed(2):0}%</td></tr>`).join('')}</tbody></table>
      </div>
    </div>`;
}

// ============================================================================
// CAMPAIGNS MODULE
// ============================================================================

async function loadCampaigns() {
  try {
    showLoading();
    const snapshot = await db.collection('campaigns').orderBy('createdAt', 'desc').get();
    AdminState.campaigns = [];
    snapshot.forEach(doc => AdminState.campaigns.push({ id: doc.id, ...doc.data() }));
    renderCampaignsTable(AdminState.campaigns);
    hideLoading();
  } catch (error) { hideLoading(); console.error('loadCampaigns error:', error); showToast('error', 'Load Error', 'Failed to load campaigns'); }
}

async function getCampaignDetail(campaignId) {
  try {
    const doc = await db.collection('campaigns').doc(campaignId).get();
    if (!doc.exists) { showToast('error', 'Not Found', 'Campaign not found'); return null; }
    return { id: doc.id, ...doc.data() };
  } catch (error) { return null; }
}

async function createCampaign(data) {
  try {
    if (!AdminAuth.hasPermission('manage_campaigns')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    if (!data.name) { showToast('error', 'Validation Error', 'Campaign name is required'); return; }
    showLoading();
    const docRef = await db.collection('campaigns').add({ ...data, active: true, impressions: 0, clicks: 0, conversions: 0, createdAt: firebase.firestore.FieldValue.serverTimestamp(), createdBy: AdminState.currentUser.uid });
    await AuditLog.logAction('create_campaign', 'campaign', { campaignId: docRef.id, data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Campaign Created', 'New campaign has been created');
    loadCampaigns();
  } catch (error) { hideLoading(); console.error('createCampaign error:', error); showToast('error', 'Error', error.message); }
}

async function updateCampaign(campaignId, data) {
  try {
    showLoading();
    await db.collection('campaigns').doc(campaignId).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('update_campaign', 'campaign', { campaignId, data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Campaign Updated', 'Campaign has been updated');
    loadCampaigns();
  } catch (error) { hideLoading(); console.error('updateCampaign error:', error); showToast('error', 'Error', error.message); }
}

async function deleteCampaign(campaignId) {
  try {
    const confirmed = await confirmDialog('Delete this campaign?');
    if (!confirmed) return;
    showLoading();
    await db.collection('campaigns').doc(campaignId).delete();
    await AuditLog.logAction('delete_campaign', 'campaign', { campaignId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Campaign Deleted', 'Campaign has been removed');
    loadCampaigns();
  } catch (error) { hideLoading(); console.error('deleteCampaign error:', error); showToast('error', 'Error', error.message); }
}

async function toggleCampaignStatus(campaignId, active) {
  try {
    showLoading();
    await db.collection('campaigns').doc(campaignId).update({ active, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('toggle_campaign', 'campaign', { campaignId, active, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Status Updated', `Campaign ${active ? 'activated' : 'deactivated'}`);
    loadCampaigns();
  } catch (error) { hideLoading(); console.error('toggleCampaignStatus error:', error); showToast('error', 'Error', error.message); }
}

async function getCampaignAnalytics(campaignId) {
  try {
    const doc = await db.collection('campaignAnalytics').doc(campaignId).get();
    return doc.exists ? doc.data() : {};
  } catch (error) { return {}; }
}

function renderCampaignsTable(campaigns) {
  const container = document.getElementById('campaigns-content');
  if (!container) return;
  container.innerHTML = `
    <div class="section-header"><div class="search-filter">
      <input type="text" id="campaigns-search" class="search-input" placeholder="Search campaigns...">
      <button class="btn btn-primary" onclick="showCreateCampaignModal()"><i class="fas fa-plus"></i> New Campaign</button>
    </div></div>
    <div class="table-responsive"><table class="admin-table" id="campaigns-table">
      <thead><tr><th>Campaign</th><th>Type</th><th>Budget</th><th>Spent</th><th>Impressions</th><th>Clicks</th><th>Conversions</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${campaigns.length===0 ? '<tr><td colspan="9" class="text-center">No campaigns found</td></tr>' : campaigns.map(c => `
        <tr><td><strong>${c.name||'Unnamed'}</strong></td><td>${c.type||'N/A'}</td><td>${formatUSD(c.budget||0)}</td>
          <td>${formatUSD(c.spent||0)}</td><td>${formatNumber(c.impressions||0)}</td><td>${formatNumber(c.clicks||0)}</td><td>${formatNumber(c.conversions||0)}</td>
          <td><label class="toggle-switch"><input type="checkbox" ${c.active?'checked':''} onchange="toggleCampaignStatus('${c.id}', this.checked)"><span class="toggle-slider"></span></label></td>
          <td><div class="action-buttons"><button class="btn-icon" onclick="showEditCampaignModal('${c.id}')" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="btn-icon danger" onclick="deleteCampaign('${c.id}')" title="Delete"><i class="fas fa-trash"></i></button></div></td>
        </tr>`).join('')}
      </tbody></table></div>`;
  document.getElementById('campaigns-search')?.addEventListener('input', debounce(e => { const q = e.target.value.toLowerCase(); document.querySelectorAll('#campaigns-table tbody tr').forEach(r => r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'); }, 300));
}

// ============================================================================
// REFERRALS MANAGEMENT MODULE
// ============================================================================

async function loadReferralSettings() {
  try {
    showLoading();
    const [settings, analytics, topReferrers, campaigns] = await Promise.all([loadReferralSettingsData(), loadReferralAnalytics(), getTopReferrers(), loadReferralCampaigns()]);
    AdminState.referrals = { settings, analytics, topReferrers, campaigns };
    renderReferralDashboard();
    hideLoading();
  } catch (error) { hideLoading(); console.error('loadReferralSettings error:', error); showToast('error', 'Load Error', 'Failed to load referrals'); }
}

async function loadReferralSettingsData() {
  try {
    const doc = await db.collection('settings').doc('referrals').get();
    return doc.exists ? doc.data() : { referralBonus: 100, refereeBonus: 50, maxReferrals: 50 };
  } catch (error) { return {}; }
}

async function updateReferralSettings(data) {
  try {
    showLoading();
    await db.collection('settings').doc('referrals').set(data, { merge: true });
    await AuditLog.logAction('update_referral_settings', 'referrals', { data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Settings Updated', 'Referral settings have been updated');
    loadReferralSettings();
  } catch (error) { hideLoading(); console.error('updateReferralSettings error:', error); showToast('error', 'Error', error.message); }
}

async function loadReferralAnalytics() {
  try {
    const snapshot = await db.collection('referrals').get();
    let total = 0, converted = 0, totalBonusPaid = 0;
    snapshot.forEach(doc => { const d = doc.data(); total++; if (d.converted) converted++; totalBonusPaid += d.bonusPaid || 0; });
    return { total, converted, rate: total > 0 ? ((converted / total) * 100).toFixed(2) : 0, totalBonusPaid };
  } catch (error) { return {}; }
}

async function getTopReferrers() {
  try {
    const snapshot = await db.collection('referralStats').orderBy('totalReferrals', 'desc').limit(20).get();
    const referrers = []; snapshot.forEach(doc => referrers.push({ id: doc.id, ...doc.data() }));
    return referrers;
  } catch (error) { return []; }
}

async function loadReferralCampaigns() {
  try {
    const snapshot = await db.collection('referralCampaigns').orderBy('createdAt', 'desc').get();
    const campaigns = []; snapshot.forEach(doc => campaigns.push({ id: doc.id, ...doc.data() }));
    return campaigns;
  } catch (error) { return []; }
}

async function createReferralCampaign(data) {
  try {
    showLoading();
    await db.collection('referralCampaigns').add({ ...data, active: true, createdAt: firebase.firestore.FieldValue.serverTimestamp(), createdBy: AdminState.currentUser.uid });
    await AuditLog.logAction('create_referral_campaign', 'referrals', { data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Campaign Created', 'Referral campaign created');
    loadReferralSettings();
  } catch (error) { hideLoading(); console.error('createReferralCampaign error:', error); showToast('error', 'Error', error.message); }
}

function renderReferralDashboard() {
  const container = document.getElementById('referrals-content');
  if (!container) return;
  const r = AdminState.referrals;
  container.innerHTML = `
    <div class="referral-stats">
      <div class="stat-card"><div class="stat-info"><h3>${formatNumber(r.analytics?.total||0)}</h3><p>Total Referrals</p></div></div>
      <div class="stat-card"><div class="stat-info"><h3>${formatNumber(r.analytics?.converted||0)}</h3><p>Converted</p></div></div>
      <div class="stat-card"><div class="stat-info"><h3>${r.analytics?.rate||0}%</h3><p>Conversion Rate</p></div></div>
      <div class="stat-card"><div class="stat-info"><h3>${formatUSD(r.analytics?.totalBonusPaid||0)}</h3><p>Bonus Paid</p></div></div>
    </div>
    <div class="referral-settings">
      <h3>Referral Settings</h3>
      <div class="settings-form">
        <div class="form-group"><label>Referral Bonus (coins)</label><input type="number" id="referral-bonus" value="${r.settings?.referralBonus||100}" class="form-input"></div>
        <div class="form-group"><label>Referee Bonus (coins)</label><input type="number" id="referee-bonus" value="${r.settings?.refereeBonus||50}" class="form-input"></div>
        <div class="form-group"><label>Max Referrals per User</label><input type="number" id="max-referrals" value="${r.settings?.maxReferrals||50}" class="form-input"></div>
        <button class="btn btn-primary" onclick="saveReferralSettings()">Save Settings</button>
      </div>
    </div>
    <div class="referral-tables">
      <div class="table-card"><h3>Top Referrers</h3><table class="admin-table"><thead><tr><th>User</th><th>Referrals</th><th>Earned</th></tr></thead>
        <tbody>${(r.topReferrers||[]).map(ref => `<tr><td>${ref.userName||ref.userId||'Unknown'}</td><td>${formatNumber(ref.totalReferrals||0)}</td><td>${formatNumber(ref.totalEarned||0)} coins</td></tr>`).join('')}</tbody></table></div>
    </div>`;
}

function saveReferralSettings() {
  const bonus = document.getElementById('referral-bonus')?.value;
  const refereeBonus = document.getElementById('referee-bonus')?.value;
  const maxReferrals = document.getElementById('max-referrals')?.value;
  updateReferralSettings({ referralBonus: Number(bonus), refereeBonus: Number(refereeBonus), maxReferrals: Number(maxReferrals) });
}

// ============================================================================
// CONTENT MANAGEMENT MODULE
// ============================================================================

async function loadHomepageSections() {
  try {
    showLoading();
    const [sections, banners, faqs, announcements] = await Promise.all([loadSectionsData(), loadBanners(), loadFAQs(), loadAnnouncements()]);
    AdminState.content = { sections, banners, faqs, announcements };
    renderContentManager();
    hideLoading();
  } catch (error) { hideLoading(); console.error('loadHomepageSections error:', error); showToast('error', 'Load Error', 'Failed to load content'); }
}

async function loadSectionsData() {
  try {
    const snapshot = await db.collection('homepageSections').orderBy('order', 'asc').get();
    const sections = []; snapshot.forEach(doc => sections.push({ id: doc.id, ...doc.data() }));
    return sections;
  } catch (error) { return []; }
}

async function updateHomepageSection(sectionId, data) {
  try {
    showLoading();
    await db.collection('homepageSections').doc(sectionId).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('update_homepage_section', 'content', { sectionId, data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Section Updated', 'Homepage section has been updated');
  } catch (error) { hideLoading(); console.error('updateHomepageSection error:', error); showToast('error', 'Error', error.message); }
}

async function reorderSections(order) {
  try {
    showLoading();
    const batch = db.batch();
    order.forEach((sectionId, index) => {
      batch.update(db.collection('homepageSections').doc(sectionId), { order: index });
    });
    await batch.commit();
    hideLoading();
    showToast('success', 'Reordered', 'Sections have been reordered');
  } catch (error) { hideLoading(); console.error('reorderSections error:', error); showToast('error', 'Error', error.message); }
}

async function loadBanners() {
  try {
    const snapshot = await db.collection('banners').orderBy('createdAt', 'desc').get();
    const banners = []; snapshot.forEach(doc => banners.push({ id: doc.id, ...doc.data() }));
    return banners;
  } catch (error) { return []; }
}

async function addBanner(data) {
  try {
    showLoading();
    await db.collection('banners').add({ ...data, active: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('add_banner', 'content', { data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Banner Added', 'New banner has been created');
    loadHomepageSections();
  } catch (error) { hideLoading(); console.error('addBanner error:', error); showToast('error', 'Error', error.message); }
}

async function updateBanner(bannerId, data) {
  try {
    showLoading();
    await db.collection('banners').doc(bannerId).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('success', 'Banner Updated', 'Banner has been updated');
    loadHomepageSections();
  } catch (error) { hideLoading(); console.error('updateBanner error:', error); showToast('error', 'Error', error.message); }
}

async function deleteBanner(bannerId) {
  try {
    const confirmed = await confirmDialog('Delete this banner?');
    if (!confirmed) return;
    showLoading();
    await db.collection('banners').doc(bannerId).delete();
    hideLoading();
    showToast('success', 'Banner Deleted', 'Banner has been removed');
    loadHomepageSections();
  } catch (error) { hideLoading(); console.error('deleteBanner error:', error); showToast('error', 'Error', error.message); }
}

async function loadFAQs() {
  try {
    const snapshot = await db.collection('faqs').orderBy('order', 'asc').get();
    const faqs = []; snapshot.forEach(doc => faqs.push({ id: doc.id, ...doc.data() }));
    return faqs;
  } catch (error) { return []; }
}

async function addFAQ(data) {
  try {
    if (!data.question || !data.answer) { showToast('error', 'Validation Error', 'Question and answer are required'); return; }
    showLoading();
    await db.collection('faqs').add({ ...data, active: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('success', 'FAQ Added', 'New FAQ has been added');
    loadHomepageSections();
  } catch (error) { hideLoading(); console.error('addFAQ error:', error); showToast('error', 'Error', error.message); }
}

async function updateFAQ(faqId, data) {
  try {
    showLoading();
    await db.collection('faqs').doc(faqId).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('success', 'FAQ Updated', 'FAQ has been updated');
    loadHomepageSections();
  } catch (error) { hideLoading(); console.error('updateFAQ error:', error); showToast('error', 'Error', error.message); }
}

async function deleteFAQ(faqId) {
  try {
    const confirmed = await confirmDialog('Delete this FAQ?');
    if (!confirmed) return;
    showLoading();
    await db.collection('faqs').doc(faqId).delete();
    hideLoading();
    showToast('success', 'FAQ Deleted', 'FAQ has been removed');
    loadHomepageSections();
  } catch (error) { hideLoading(); console.error('deleteFAQ error:', error); showToast('error', 'Error', error.message); }
}

async function updateTerms(content) {
  try {
    showLoading();
    await db.collection('policies').doc('terms').set({ content, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('update_terms', 'content', { adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Terms Updated', 'Terms of service have been updated');
  } catch (error) { hideLoading(); console.error('updateTerms error:', error); showToast('error', 'Error', error.message); }
}

async function updatePrivacy(content) {
  try {
    showLoading();
    await db.collection('policies').doc('privacy').set({ content, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('update_privacy', 'content', { adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Privacy Updated', 'Privacy policy has been updated');
  } catch (error) { hideLoading(); console.error('updatePrivacy error:', error); showToast('error', 'Error', error.message); }
}

async function loadAnnouncements() {
  try {
    const snapshot = await db.collection('announcements').orderBy('createdAt', 'desc').get();
    const announcements = []; snapshot.forEach(doc => announcements.push({ id: doc.id, ...doc.data() }));
    return announcements;
  } catch (error) { return []; }
}

async function addAnnouncement(data) {
  try {
    if (!data.title || !data.message) { showToast('error', 'Validation Error', 'Title and message are required'); return; }
    showLoading();
    await db.collection('announcements').add({ ...data, active: true, createdAt: firebase.firestore.FieldValue.serverTimestamp(), createdBy: AdminState.currentUser.uid });
    await AuditLog.logAction('add_announcement', 'content', { data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Announcement Added', 'New announcement has been created');
    loadHomepageSections();
  } catch (error) { hideLoading(); console.error('addAnnouncement error:', error); showToast('error', 'Error', error.message); }
}

function renderContentManager() {
  const container = document.getElementById('content-content');
  if (!container) return;
  const c = AdminState.content || {};
  container.innerHTML = `
    <div class="content-tabs">
      <div class="tab-nav">
        <button class="tab-btn active" data-tab="sections">Sections</button>
        <button class="tab-btn" data-tab="banners">Banners</button>
        <button class="tab-btn" data-tab="faqs">FAQs</button>
        <button class="tab-btn" data-tab="policies">Policies</button>
        <button class="tab-btn" data-tab="announcements">Announcements</button>
      </div>
    </div>
    <div class="tab-content active" id="tab-sections">
      <h3>Homepage Sections</h3>
      ${(c.sections||[]).map(s => `<div class="content-item"><span>${s.title||'Untitled'}</span><span class="status-badge status-${s.active?'active':'inactive'}">${s.active?'Active':'Inactive'}</span>
        <button class="btn-icon" onclick="showEditSectionModal('${s.id}')"><i class="fas fa-edit"></i></button></div>`).join('')}
    </div>
    <div class="tab-content" id="tab-banners">
      <h3>Banners</h3><button class="btn btn-sm btn-primary" onclick="showAddBannerModal()"><i class="fas fa-plus"></i> Add Banner</button>
      ${(c.banners||[]).map(b => `<div class="content-item"><span>${b.title||'Untitled'}</span><img src="${b.image||''}" class="banner-thumb" alt="">
        <button class="btn-icon" onclick="showEditBannerModal('${b.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn-icon danger" onclick="deleteBanner('${b.id}')"><i class="fas fa-trash"></i></button></div>`).join('')}
    </div>
    <div class="tab-content" id="tab-faqs">
      <h3>FAQs</h3>
      <button class="btn btn-sm btn-primary" onclick="showAddFAQModal()"><i class="fas fa-plus"></i> Add FAQ</button>
      ${(c.faqs||[]).map(f => `<div class="content-item faq-item"><div><strong>${f.question||'Question'}</strong><p>${f.answer||'Answer'}</p></div>
        <button class="btn-icon" onclick="showEditFAQModal('${f.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn-icon danger" onclick="deleteFAQ('${f.id}')"><i class="fas fa-trash"></i></button></div>`).join('')}
    </div>
    <div class="tab-content" id="tab-policies">
      <h3>Policies</h3>
      <button class="btn btn-sm btn-primary" onclick="showEditTermsModal()">Edit Terms</button>
      <button class="btn btn-sm btn-primary" onclick="showEditPrivacyModal()">Edit Privacy Policy</button>
    </div>
    <div class="tab-content" id="tab-announcements">
      <h3>Announcements</h3>
      <button class="btn btn-sm btn-primary" onclick="showAddAnnouncementModal()"><i class="fas fa-plus"></i> New Announcement</button>
      ${(c.announcements||[]).map(a => `<div class="content-item"><span>${a.title||'Untitled'}</span><span>${a.message||''}</span><span class="status-badge status-${a.active?'active':'inactive'}">${a.active?'Active':'Inactive'}</span></div>`).join('')}
    </div>`;
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

// ============================================================================
// SUPPORT MODULE
// ============================================================================

async function loadTickets(filters = {}, pagination = { page: 1, limit: 25 }) {
  try {
    showLoading();
    AdminState.ticketsPagination = { ...AdminState.ticketsPagination, ...pagination };
    let query = db.collection('tickets');
    if (filters.status) query = query.where('status', '==', filters.status);
    if (filters.priority) query = query.where('priority', '==', filters.priority);
    const countSnap = await query.count().get();
    AdminState.ticketsPagination.total = countSnap.data().count;
    const offset = (AdminState.ticketsPagination.page - 1) * AdminState.ticketsPagination.limit;
    query = query.orderBy('createdAt', 'desc').offset(offset).limit(AdminState.ticketsPagination.limit);
    const snapshot = await query.get();
    AdminState.tickets = [];
    snapshot.forEach(doc => AdminState.tickets.push({ id: doc.id, ...doc.data() }));
    renderTicketsTable(AdminState.tickets);
    hideLoading();
  } catch (error) { hideLoading(); console.error('loadTickets error:', error); showToast('error', 'Load Error', 'Failed to load tickets'); }
}

async function getTicketDetail(ticketId) {
  try {
    const doc = await db.collection('tickets').doc(ticketId).get();
    if (!doc.exists) { showToast('error', 'Not Found', 'Ticket not found'); return null; }
    const ticket = { id: doc.id, ...doc.data() };
    const messagesSnap = await db.collection('tickets').doc(ticketId).collection('messages').orderBy('createdAt', 'asc').get();
    ticket.messages = [];
    messagesSnap.forEach(doc => ticket.messages.push({ id: doc.id, ...doc.data() }));
    return ticket;
  } catch (error) { console.error('getTicketDetail error:', error); return null; }
}

async function replyTicket(ticketId, message, isInternal = false) {
  try {
    if (!message || !message.trim()) { showToast('error', 'Validation Error', 'Message is required'); return; }
    showLoading();
    await db.collection('tickets').doc(ticketId).collection('messages').add({
      message: message.trim(), isInternal, senderId: AdminState.currentUser.uid, senderName: AdminState.adminProfile?.displayName || 'Admin',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await db.collection('tickets').doc(ticketId).update({ lastReplyAt: firebase.firestore.FieldValue.serverTimestamp(), lastReplyBy: AdminState.currentUser.uid });
    await AuditLog.logAction('reply_ticket', 'ticket', { ticketId, isInternal, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Reply Sent', 'Ticket reply has been sent');
    getTicketDetail(ticketId);
  } catch (error) { hideLoading(); console.error('replyTicket error:', error); showToast('error', 'Error', error.message); }
}

async function updateTicketStatus(ticketId, status) {
  try {
    showLoading();
    await db.collection('tickets').doc(ticketId).update({ status, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('update_ticket_status', 'ticket', { ticketId, status, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Status Updated', `Ticket status changed to ${status}`);
    loadTickets(AdminState.filters, AdminState.ticketsPagination);
  } catch (error) { hideLoading(); console.error('updateTicketStatus error:', error); showToast('error', 'Error', error.message); }
}

async function assignTicket(ticketId, adminId) {
  try {
    showLoading();
    await db.collection('tickets').doc(ticketId).update({ assignedTo: adminId, assignedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('assign_ticket', 'ticket', { ticketId, adminId, assignedBy: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Assigned', 'Ticket has been assigned');
  } catch (error) { hideLoading(); console.error('assignTicket error:', error); showToast('error', 'Error', error.message); }
}

async function closeTicket(ticketId) {
  try {
    showLoading();
    await db.collection('tickets').doc(ticketId).update({ status: 'closed', closedAt: firebase.firestore.FieldValue.serverTimestamp(), closedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('close_ticket', 'ticket', { ticketId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Ticket Closed', 'Ticket has been closed');
    loadTickets(AdminState.filters, AdminState.ticketsPagination);
  } catch (error) { hideLoading(); console.error('closeTicket error:', error); showToast('error', 'Error', error.message); }
}

async function addInternalNote(ticketId, note) {
  try {
    if (!note || !note.trim()) { showToast('error', 'Validation Error', 'Note is required'); return; }
    showLoading();
    await db.collection('tickets').doc(ticketId).collection('messages').add({ message: note.trim(), isInternal: true, isNote: true, senderId: AdminState.currentUser.uid, senderName: AdminState.adminProfile?.displayName || 'Admin', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    hideLoading();
    showToast('success', 'Note Added', 'Internal note has been added');
  } catch (error) { hideLoading(); console.error('addInternalNote error:', error); showToast('error', 'Error', error.message); }
}

function renderTicketsTable(tickets) {
  const container = document.getElementById('support-content');
  if (!container) return;
  const p = AdminState.ticketsPagination;
  const tp = Math.ceil(p.total / p.limit);
  container.innerHTML = `
    <div class="section-header"><div class="search-filter">
      <input type="text" id="tickets-search" class="search-input" placeholder="Search tickets...">
      <div class="filter-group">
        <select id="tickets-status-filter" class="filter-select" onchange="loadTickets({ status: this.value || undefined }, { page: 1, limit: 25 })">
          <option value="">All Status</option><option value="open">Open</option><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="closed">Closed</option>
        </select>
        <select id="tickets-priority-filter" class="filter-select" onchange="loadTickets({ priority: this.value || undefined }, { page: 1, limit: 25 })">
          <option value="">All Priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
        </select>
      </div>
    </div></div>
    <div class="table-responsive"><table class="admin-table" id="tickets-table">
      <thead><tr><th>Ticket</th><th>User</th><th>Subject</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>${tickets.length===0 ? '<tr><td colspan="8" class="text-center">No tickets found</td></tr>' : tickets.map(t => `
        <tr><td><code>${t.id.substring(0,8)}...</code></td><td>${t.userEmail||t.userId||'Unknown'}</td><td>${t.subject||'No Subject'}</td>
          <td><span class="priority-badge priority-${t.priority}">${t.priority||'medium'}</span></td>
          <td><span class="status-badge status-${t.status}">${t.status}</span></td>
          <td>${t.assignedTo||'Unassigned'}</td><td>${formatDate(t.createdAt)}</td>
          <td><div class="action-buttons"><button class="btn-icon" onclick="showTicketDetail('${t.id}')" title="View"><i class="fas fa-eye"></i></button>
            <button class="btn-icon" onclick="closeTicket('${t.id}')" title="Close"><i class="fas fa-times"></i></button></div></td>
        </tr>`).join('')}
      </tbody></table></div>
    <div class="pagination">
      <button class="btn btn-sm" onclick="loadTickets(AdminState.filters, { page: ${p.page-1}, limit: ${p.limit} })" ${p.page<=1?'disabled':''}><i class="fas fa-chevron-left"></i> Previous</button>
      <span class="page-info">Page ${p.page} of ${tp} (${p.total} total)</span>
      <button class="btn btn-sm" onclick="loadTickets(AdminState.filters, { page: ${p.page+1}, limit: ${p.limit} })" ${p.page>=tp?'disabled':''}>Next <i class="fas fa-chevron-right"></i></button>
    </div>`;
}

function renderTicketDetail(ticket) {
  const container = document.getElementById('support-content');
  if (!container) return;
  container.innerHTML = `
    <div class="detail-header">
      <button class="btn btn-secondary" onclick="loadTickets(AdminState.filters, AdminState.ticketsPagination)"><i class="fas fa-arrow-left"></i> Back</button>
      <h2>${ticket.subject||'Ticket'}</h2>
      <div class="ticket-actions">
        <select onchange="updateTicketStatus('${ticket.id}', this.value)" class="filter-select">
          <option value="open" ${ticket.status==='open'?'selected':''}>Open</option>
          <option value="in_progress" ${ticket.status==='in_progress'?'selected':''}>In Progress</option>
          <option value="pending" ${ticket.status==='pending'?'selected':''}>Pending</option>
          <option value="closed" ${ticket.status==='closed'?'selected':''}>Closed</option>
        </select>
        <button class="btn btn-danger" onclick="closeTicket('${ticket.id}')"><i class="fas fa-times"></i> Close</button>
      </div>
    </div>
    <div class="ticket-messages">
      ${(ticket.messages||[]).map(m => `
        <div class="message ${m.isInternal ? 'internal' : ''} ${m.senderId === AdminState.currentUser?.uid ? 'admin' : 'user'}">
          <div class="message-header"><span>${m.senderName||'Unknown'}</span><span class="message-date">${formatDate(m.createdAt)}</span>${m.isInternal?'<span class="badge badge-warning">Internal</span>':''}</div>
          <div class="message-body">${m.message}</div>
        </div>`).join('')}
    </div>
    <div class="ticket-reply">
      <textarea id="ticket-reply-text" class="form-input" placeholder="Type your reply..." rows="4"></textarea>
      <div class="reply-actions">
        <button class="btn btn-primary" onclick="replyTicket('${ticket.id}', document.getElementById('ticket-reply-text').value, false)"><i class="fas fa-paper-plane"></i> Send Reply</button>
        <button class="btn btn-warning" onclick="replyTicket('${ticket.id}', document.getElementById('ticket-reply-text').value, true)"><i class="fas fa-sticky-note"></i> Internal Note</button>
      </div>
    </div>`;
}

async function getTicketStats() {
  try {
    const [openSnap, pendingSnap, closedSnap] = await Promise.all([
      db.collection('tickets').where('status', '==', 'open').count().get(),
      db.collection('tickets').where('status', '==', 'pending').count().get(),
      db.collection('tickets').where('status', '==', 'closed').count().get()
    ]);
    return { open: openSnap.data().count, pending: pendingSnap.data().count, closed: closedSnap.data().count };
  } catch (error) { return { open: 0, pending: 0, closed: 0 }; }
}

// ============================================================================
// SETTINGS MODULE
// ============================================================================

async function loadSettings() {
  try {
    showLoading();
    const [generalDoc, coinDoc, rewardDoc, adDoc, fraudDoc, countryDoc, emailDoc, apiDoc] = await Promise.all([
      db.collection('settings').doc('general').get(),
      db.collection('settings').doc('coins').get(),
      db.collection('settings').doc('rewards').get(),
      db.collection('settings').doc('ads').get(),
      db.collection('settings').doc('fraud').get(),
      db.collection('settings').doc('countries').get(),
      db.collection('settings').doc('email').get(),
      db.collection('settings').doc('api').get()
    ]);
    AdminState.settings = {
      general: generalDoc.exists ? generalDoc.data() : {},
      coins: coinDoc.exists ? coinDoc.data() : {},
      rewards: rewardDoc.exists ? rewardDoc.data() : {},
      ads: adDoc.exists ? adDoc.data() : {},
      fraud: fraudDoc.exists ? fraudDoc.data() : {},
      countries: countryDoc.exists ? countryDoc.data() : {},
      email: emailDoc.exists ? emailDoc.data() : {},
      api: apiDoc.exists ? apiDoc.data() : {}
    };
    renderSettings();
    hideLoading();
  } catch (error) { hideLoading(); console.error('loadSettings error:', error); showToast('error', 'Load Error', 'Failed to load settings'); }
}

async function updateGeneralSettings(data) {
  try {
    showLoading();
    await db.collection('settings').doc('general').set(data, { merge: true });
    await AuditLog.logAction('update_general_settings', 'settings', { data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Settings Updated', 'General settings have been saved');
    loadSettings();
  } catch (error) { hideLoading(); console.error('updateGeneralSettings error:', error); showToast('error', 'Error', error.message); }
}

async function updateCoinSettings(rate, minWithdrawal, minTopup) {
  try {
    showLoading();
    await db.collection('settings').doc('coins').set({ coinToUsdRate: Number(rate), minWithdrawal: Number(minWithdrawal), minTopup: Number(minTopup), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    await AuditLog.logAction('update_coin_settings', 'settings', { rate, minWithdrawal, minTopup, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Coin Settings Updated', 'Coin settings have been saved');
    loadSettings();
  } catch (error) { hideLoading(); console.error('updateCoinSettings error:', error); showToast('error', 'Error', error.message); }
}

async function updateRewardSettings(data) {
  try {
    showLoading();
    await db.collection('settings').doc('rewards').set(data, { merge: true });
    await AuditLog.logAction('update_reward_settings', 'settings', { data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Reward Settings Updated', 'Reward settings have been saved');
    loadSettings();
  } catch (error) { hideLoading(); console.error('updateRewardSettings error:', error); showToast('error', 'Error', error.message); }
}

async function updateAdSettings(data) {
  try {
    showLoading();
    await db.collection('settings').doc('ads').set(data, { merge: true });
    await AuditLog.logAction('update_ad_settings', 'settings', { data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Ad Settings Updated', 'Ad settings have been saved');
    loadSettings();
  } catch (error) { hideLoading(); console.error('updateAdSettings error:', error); showToast('error', 'Error', error.message); }
}

async function updateFraudSettings(data) {
  try {
    showLoading();
    await db.collection('settings').doc('fraud').set(data, { merge: true });
    await AuditLog.logAction('update_fraud_settings', 'settings', { data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Fraud Settings Updated', 'Fraud settings have been saved');
    loadSettings();
  } catch (error) { hideLoading(); console.error('updateFraudSettings error:', error); showToast('error', 'Error', error.message); }
}

async function updateCountrySettings(data) {
  try {
    showLoading();
    await db.collection('settings').doc('countries').set(data, { merge: true });
    await AuditLog.logAction('update_country_settings', 'settings', { data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Country Settings Updated', 'Country settings have been saved');
    loadSettings();
  } catch (error) { hideLoading(); console.error('updateCountrySettings error:', error); showToast('error', 'Error', error.message); }
}

async function toggleMaintenance(mode) {
  try {
    showLoading();
    await db.collection('settings').doc('general').set({ maintenanceMode: mode, maintenanceToggledAt: firebase.firestore.FieldValue.serverTimestamp(), maintenanceToggledBy: AdminState.currentUser.uid }, { merge: true });
    await AuditLog.logAction('toggle_maintenance', 'settings', { mode, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Maintenance', `Maintenance mode ${mode ? 'enabled' : 'disabled'}`);
    loadSettings();
  } catch (error) { hideLoading(); console.error('toggleMaintenance error:', error); showToast('error', 'Error', error.message); }
}

async function updateEmailSettings(data) {
  try {
    showLoading();
    await db.collection('settings').doc('email').set(data, { merge: true });
    await AuditLog.logAction('update_email_settings', 'settings', { data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Email Settings Updated', 'Email settings have been saved');
    loadSettings();
  } catch (error) { hideLoading(); console.error('updateEmailSettings error:', error); showToast('error', 'Error', error.message); }
}

async function updateAPISettings(data) {
  try {
    showLoading();
    await db.collection('settings').doc('api').set(data, { merge: true });
    await AuditLog.logAction('update_api_settings', 'settings', { data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'API Settings Updated', 'API settings have been saved');
    loadSettings();
  } catch (error) { hideLoading(); console.error('updateAPISettings error:', error); showToast('error', 'Error', error.message); }
}

async function updateRateLimits(data) {
  try {
    showLoading();
    await db.collection('settings').doc('rateLimits').set(data, { merge: true });
    await AuditLog.logAction('update_rate_limits', 'settings', { data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Rate Limits Updated', 'Rate limits have been saved');
    loadSettings();
  } catch (error) { hideLoading(); console.error('updateRateLimits error:', error); showToast('error', 'Error', error.message); }
}

function renderSettings() {
  const container = document.getElementById('settings-content');
  if (!container) return;
  const s = AdminState.settings;
  container.innerHTML = `
    <div class="settings-sections">
      <div class="settings-section"><h3>General Settings</h3>
        <div class="settings-form">
          <div class="form-group"><label>App Name</label><input type="text" id="setting-app-name" class="form-input" value="${s.general?.appName||'Rewards'}"></div>
          <div class="form-group"><label>Support Email</label><input type="email" id="setting-support-email" class="form-input" value="${s.general?.supportEmail||''}"></div>
          <div class="form-group"><label>Currency</label><select id="setting-currency" class="form-input"><option value="USD" ${s.general?.currency==='USD'?'selected':''}>USD</option><option value="EUR" ${s.general?.currency==='EUR'?'selected':''}>EUR</option><option value="GBP" ${s.general?.currency==='GBP'?'selected':''}>GBP</option></select></div>
          <div class="form-group"><label>Maintenance Mode</label><label class="toggle-switch"><input type="checkbox" id="setting-maintenance" ${s.general?.maintenanceMode?'checked':''}><span class="toggle-slider"></span></label></div>
          <button class="btn btn-primary" onclick="updateGeneralSettings({ appName: document.getElementById('setting-app-name').value, supportEmail: document.getElementById('setting-support-email').value, currency: document.getElementById('setting-currency').value })">Save General</button>
        </div>
      </div>
      <div class="settings-section"><h3>Coin Settings</h3>
        <div class="settings-form">
          <div class="form-group"><label>Coin to USD Rate (coins per $1)</label><input type="number" id="setting-coin-rate" class="form-input" value="${s.coins?.coinToUsdRate||100}"></div>
          <div class="form-group"><label>Minimum Withdrawal ($)</label><input type="number" id="setting-min-withdrawal" class="form-input" value="${s.coins?.minWithdrawal||5}" step="0.01"></div>
          <div class="form-group"><label>Minimum Top-up ($)</label><input type="number" id="setting-min-topup" class="form-input" value="${s.coins?.minTopup||1}" step="0.01"></div>
          <button class="btn btn-primary" onclick="updateCoinSettings(document.getElementById('setting-coin-rate').value, document.getElementById('setting-min-withdrawal').value, document.getElementById('setting-min-topup').value)">Save Coin Settings</button>
        </div>
      </div>
      <div class="settings-section"><h3>Fraud Settings</h3>
        <div class="settings-form">
          <div class="form-group"><label>Risk Score Threshold</label><input type="number" id="setting-risk-threshold" class="form-input" value="${s.fraud?.riskThreshold||70}"></div>
          <div class="form-group"><label>Max Devices Per User</label><input type="number" id="setting-max-devices" class="form-input" value="${s.fraud?.maxDevices||3}"></div>
          <div class="form-group"><label>VPN Detection</label><label class="toggle-switch"><input type="checkbox" id="setting-vpn-detect" ${s.fraud?.vpnDetection!==false?'checked':''}><span class="toggle-slider"></span></label></div>
          <div class="form-group"><label>Emulator Detection</label><label class="toggle-switch"><input type="checkbox" id="setting-emu-detect" ${s.fraud?.emulatorDetection!==false?'checked':''}><span class="toggle-slider"></span></label></div>
          <button class="btn btn-primary" onclick="updateFraudSettings({ riskThreshold: Number(document.getElementById('setting-risk-threshold').value), maxDevices: Number(document.getElementById('setting-max-devices').value), vpnDetection: document.getElementById('setting-vpn-detect').checked, emulatorDetection: document.getElementById('setting-emu-detect').checked })">Save Fraud Settings</button>
        </div>
      </div>
    </div>`;
}

// ============================================================================
// SECURITY MODULE
// ============================================================================

async function loadAdminAccounts() {
  try {
    showLoading();
    const [admins, loginHistory, sessions, apiKeys] = await Promise.all([loadAdminsData(), getLoginHistory(), getActiveSessions(), loadAPIKeys()]);
    AdminState.security = { admins, loginHistory, sessions, apiKeys };
    renderSecurityDashboard();
    hideLoading();
  } catch (error) { hideLoading(); console.error('loadAdminAccounts error:', error); showToast('error', 'Load Error', 'Failed to load security data'); }
}

async function loadAdminsData() {
  try {
    const snapshot = await db.collection('admins').get();
    const admins = []; snapshot.forEach(doc => admins.push({ id: doc.id, ...doc.data() }));
    return admins;
  } catch (error) { return []; }
}

async function addAdmin(data) {
  try {
    if (!AdminAuth.hasPermission('manage_admins')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    if (!data.email || !data.role) { showToast('error', 'Validation Error', 'Email and role are required'); return; }
    showLoading();
    await db.collection('admins').add({ ...data, active: true, createdAt: firebase.firestore.FieldValue.serverTimestamp(), createdBy: AdminState.currentUser.uid });
    await AuditLog.logAction('add_admin', 'security', { data, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Admin Added', 'New admin account has been created');
    loadAdminAccounts();
  } catch (error) { hideLoading(); console.error('addAdmin error:', error); showToast('error', 'Error', error.message); }
}

async function updateAdminRole(adminId, role) {
  try {
    if (!AdminAuth.hasPermission('manage_admins')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    showLoading();
    await db.collection('admins').doc(adminId).update({ role, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('update_admin_role', 'security', { adminId, role, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Role Updated', 'Admin role has been updated');
    loadAdminAccounts();
  } catch (error) { hideLoading(); console.error('updateAdminRole error:', error); showToast('error', 'Error', error.message); }
}

async function removeAdmin(adminId) {
  try {
    if (!AdminAuth.hasPermission('manage_admins')) { showToast('error', 'Permission Denied', 'No permission'); return; }
    if (adminId === AdminState.currentUser.uid) { showToast('error', 'Error', 'Cannot remove yourself'); return; }
    const confirmed = await confirmDialog('Remove this admin?');
    if (!confirmed) return;
    showLoading();
    await db.collection('admins').doc(adminId).update({ active: false, removedAt: firebase.firestore.FieldValue.serverTimestamp(), removedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('remove_admin', 'security', { adminId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Admin Removed', 'Admin has been deactivated');
    loadAdminAccounts();
  } catch (error) { hideLoading(); console.error('removeAdmin error:', error); showToast('error', 'Error', error.message); }
}

async function toggle2FA(adminId, enabled) {
  try {
    showLoading();
    await db.collection('admins').doc(adminId).update({ twoFactorEnabled: enabled, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('toggle_2fa', 'security', { adminId, enabled, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', '2FA Updated', `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`);
    loadAdminAccounts();
  } catch (error) { hideLoading(); console.error('toggle2FA error:', error); showToast('error', 'Error', error.message); }
}

async function getLoginHistory() {
  try {
    const snapshot = await db.collection('loginHistory').orderBy('createdAt', 'desc').limit(50).get();
    const history = []; snapshot.forEach(doc => history.push({ id: doc.id, ...doc.data() }));
    return history;
  } catch (error) { return []; }
}

async function getIPSessions() {
  try {
    const snapshot = await db.collection('adminSessions').orderBy('createdAt', 'desc').limit(50).get();
    const sessions = []; snapshot.forEach(doc => sessions.push({ id: doc.id, ...doc.data() }));
    return sessions;
  } catch (error) { return []; }
}

async function getActiveSessions() {
  try {
    const snapshot = await db.collection('adminSessions').where('active', '==', true).get();
    const sessions = []; snapshot.forEach(doc => sessions.push({ id: doc.id, ...doc.data() }));
    return sessions;
  } catch (error) { return []; }
}

async function revokeSession(sessionId) {
  try {
    showLoading();
    await db.collection('adminSessions').doc(sessionId).update({ active: false, revokedAt: firebase.firestore.FieldValue.serverTimestamp(), revokedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('revoke_session', 'security', { sessionId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Session Revoked', 'Session has been revoked');
    loadAdminAccounts();
  } catch (error) { hideLoading(); console.error('revokeSession error:', error); showToast('error', 'Error', error.message); }
}

async function loadAPIKeys() {
  try {
    const snapshot = await db.collection('apiKeys').orderBy('createdAt', 'desc').get();
    const keys = []; snapshot.forEach(doc => keys.push({ id: doc.id, ...doc.data() }));
    return keys;
  } catch (error) { return []; }
}

async function generateAPIKey() {
  try {
    showLoading();
    const key = 'ak_' + Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36))).join('');
    await db.collection('apiKeys').add({ key, active: true, createdBy: AdminState.currentUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    await AuditLog.logAction('generate_api_key', 'security', { adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'API Key Generated', `New key: ${key}`);
    loadAdminAccounts();
  } catch (error) { hideLoading(); console.error('generateAPIKey error:', error); showToast('error', 'Error', error.message); }
}

async function revokeAPIKey(keyId) {
  try {
    const confirmed = await confirmDialog('Revoke this API key?');
    if (!confirmed) return;
    showLoading();
    await db.collection('apiKeys').doc(keyId).update({ active: false, revokedAt: firebase.firestore.FieldValue.serverTimestamp(), revokedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('revoke_api_key', 'security', { keyId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Key Revoked', 'API key has been revoked');
    loadAdminAccounts();
  } catch (error) { hideLoading(); console.error('revokeAPIKey error:', error); showToast('error', 'Error', error.message); }
}

async function rotateSecret(keyId) {
  try {
    showLoading();
    const newSecret = 'sk_' + Array.from({ length: 48 }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(Math.floor(Math.random() * 62))).join('');
    await db.collection('apiKeys').doc(keyId).update({ secret: newSecret, rotatedAt: firebase.firestore.FieldValue.serverTimestamp(), rotatedBy: AdminState.currentUser.uid });
    await AuditLog.logAction('rotate_secret', 'security', { keyId, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Secret Rotated', `New secret: ${newSecret}`);
    loadAdminAccounts();
  } catch (error) { hideLoading(); console.error('rotateSecret error:', error); showToast('error', 'Error', error.message); }
}

async function getSecurityAlerts() {
  try {
    const snapshot = await db.collection('securityAlerts').orderBy('createdAt', 'desc').limit(20).get();
    const alerts = []; snapshot.forEach(doc => alerts.push({ id: doc.id, ...doc.data() }));
    return alerts;
  } catch (error) { return []; }
}

function renderSecurityDashboard() {
  const container = document.getElementById('security-content');
  if (!container) return;
  const sec = AdminState.security;
  container.innerHTML = `
    <div class="security-sections">
      <div class="security-section"><h3>Admin Accounts</h3>
        <button class="btn btn-sm btn-primary" onclick="showAddAdminModal()"><i class="fas fa-plus"></i> Add Admin</button>
        <table class="admin-table"><thead><tr><th>Admin</th><th>Email</th><th>Role</th><th>2FA</th><th>Last Login</th><th>Actions</th></tr></thead>
        <tbody>${(sec.admins||[]).map(a => `<tr><td>${a.displayName||a.email}</td><td>${a.email||'N/A'}</td><td><span class="badge badge-${a.role==='super_admin'?'primary':'secondary'}">${a.role||'admin'}</span></td>
          <td>${a.twoFactorEnabled?'<span class="badge badge-success">ON</span>':'<span class="badge badge-danger">OFF</span>'}</td><td>${formatDate(a.lastLogin)}</td>
          <td><div class="action-buttons"><button class="btn-icon" onclick="toggle2FA('${a.id}', ${!a.twoFactorEnabled})" title="Toggle 2FA"><i class="fas fa-shield-alt"></i></button></div></td></tr>`).join('')}</tbody></table>
      </div>
      <div class="security-section"><h3>Active Sessions</h3>
        <table class="admin-table"><thead><tr><th>User</th><th>IP</th><th>Device</th><th>Started</th><th>Actions</th></tr></thead>
        <tbody>${(sec.sessions||[]).map(s => `<tr><td>${s.adminEmail||'Unknown'}</td><td><code>${s.ip||'N/A'}</code></td><td>${s.device||'Unknown'}</td><td>${formatDate(s.createdAt)}</td>
          <td><button class="btn-icon danger" onclick="revokeSession('${s.id}')" title="Revoke"><i class="fas fa-ban"></i></button></td></tr>`).join('')}</tbody></table>
      </div>
      <div class="security-section"><h3>API Keys</h3>
        <button class="btn btn-sm btn-primary" onclick="generateAPIKey()"><i class="fas fa-plus"></i> Generate Key</button>
        <table class="admin-table"><thead><tr><th>Key</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
        <tbody>${(sec.apiKeys||[]).map(k => `<tr><td><code>${k.key ? k.key.substring(0,12)+'...' : 'N/A'}</code></td>
          <td><span class="status-badge status-${k.active?'active':'inactive'}">${k.active?'Active':'Revoked'}</span></td><td>${formatDate(k.createdAt)}</td>
          <td><div class="action-buttons"><button class="btn-icon" onclick="rotateSecret('${k.id}')" title="Rotate Secret"><i class="fas fa-key"></i></button>
            <button class="btn-icon danger" onclick="revokeAPIKey('${k.id}')" title="Revoke"><i class="fas fa-ban"></i></button></div></td></tr>`).join('')}</tbody></table>
      </div>
      <div class="security-section"><h3>Recent Login History</h3>
        <table class="admin-table"><thead><tr><th>User</th><th>IP</th><th>Status</th><th>Time</th></tr></thead>
        <tbody>${(sec.loginHistory||[]).map(l => `<tr><td>${l.email||'Unknown'}</td><td><code>${l.ip||'N/A'}</code></td>
          <td><span class="status-badge status-${l.success?'active':'banned'}">${l.success?'Success':'Failed'}</span></td><td>${formatDate(l.createdAt)}</td></tr>`).join('')}</tbody></table>
      </div>
    </div>`;
}

// ============================================================================
// AUDIT LOGS MODULE
// ============================================================================

const AuditLog = {
  async logAction(action, target, details) {
    try {
      await db.collection('auditLogs').add({
        action, target, details: details || {},
        adminId: AdminState.currentUser ? AdminState.currentUser.uid : 'system',
        adminEmail: AdminState.currentUser ? AdminState.currentUser.email : 'system',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ip: await AuditLog.getClientIP()
      });
    } catch (error) {
      console.error('AuditLog.logAction error:', error);
    }
  },

  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch (error) { return 'unknown'; }
  }
};

async function loadLogs(filters = {}, pagination = { page: 1, limit: 25 }) {
  try {
    showLoading();
    AdminState.logsPagination = { ...AdminState.logsPagination, ...pagination };
    let query = db.collection('auditLogs');
    if (filters.action) query = query.where('action', '==', filters.action);
    if (filters.adminId) query = query.where('adminId', '==', filters.adminId);
    const countSnap = await query.count().get();
    AdminState.logsPagination.total = countSnap.data().count;
    const offset = (AdminState.logsPagination.page - 1) * AdminState.logsPagination.limit;
    query = query.orderBy('timestamp', 'desc').offset(offset).limit(AdminState.logsPagination.limit);
    const snapshot = await query.get();
    AdminState.logs = [];
    snapshot.forEach(doc => AdminState.logs.push({ id: doc.id, ...doc.data() }));
    renderLogsTable(AdminState.logs);
    hideLoading();
  } catch (error) { hideLoading(); console.error('loadLogs error:', error); showToast('error', 'Load Error', 'Failed to load logs'); }
}

async function searchLogs(query) {
  try {
    showLoading();
    const snapshot = await db.collection('auditLogs').orderBy('timestamp', 'desc').limit(500).get();
    const logs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const searchLower = query.toLowerCase();
      if ((data.action && data.action.toLowerCase().includes(searchLower)) ||
          (data.target && data.target.toLowerCase().includes(searchLower)) ||
          (data.adminEmail && data.adminEmail.toLowerCase().includes(searchLower)) ||
          (data.details && JSON.stringify(data.details).toLowerCase().includes(searchLower))) {
        logs.push({ id: doc.id, ...data });
      }
    });
    renderLogsTable(logs);
    hideLoading();
  } catch (error) { hideLoading(); console.error('searchLogs error:', error); }
}

async function exportLogs(format, dateRange) {
  try {
    showLoading();
    let query = db.collection('auditLogs').orderBy('timestamp', 'desc').limit(10000);
    if (dateRange && dateRange.start) query = query.where('timestamp', '>=', dateRange.start);
    if (dateRange && dateRange.end) query = query.where('timestamp', '<=', dateRange.end);
    const snapshot = await query.get();
    const logs = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      logs.push({ id: doc.id, action: d.action, target: d.target, adminEmail: d.adminEmail, details: JSON.stringify(d.details || {}), timestamp: d.timestamp ? d.timestamp.toDate().toISOString() : '' });
    });
    if (format === 'csv') {
      const csv = [['ID', 'Action', 'Target', 'Admin', 'Details', 'Timestamp'].join(','), ...logs.map(l => [l.id, l.action, l.target, l.adminEmail, `"${l.details}"`, l.timestamp].join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`; a.click();
      URL.revokeObjectURL(url);
    }
    await AuditLog.logAction('export_logs', 'logs', { format, count: logs.length });
    hideLoading();
    showToast('success', 'Export Complete', `Exported ${logs.length} log entries`);
  } catch (error) { hideLoading(); console.error('exportLogs error:', error); showToast('error', 'Export Error', error.message); }
}

function renderLogsTable(logs) {
  const container = document.getElementById('logs-content');
  if (!container) return;
  const p = AdminState.logsPagination;
  const tp = Math.ceil(p.total / p.limit);
  container.innerHTML = `
    <div class="section-header"><div class="search-filter">
      <input type="text" id="logs-search" class="search-input" placeholder="Search logs...">
      <div class="filter-group">
        <select id="logs-action-filter" class="filter-select" onchange="loadLogs({ action: this.value || undefined }, { page: 1, limit: 25 })">
          <option value="">All Actions</option><option value="admin_login">Admin Login</option><option value="add_coins">Add Coins</option>
          <option value="remove_coins">Remove Coins</option><option value="ban_user">Ban User</option><option value="update_offer">Update Offer</option>
          <option value="approve_withdrawal">Approve Withdrawal</option><option value="reject_withdrawal">Reject Withdrawal</option>
        </select>
        <button class="btn btn-secondary" onclick="exportLogs('csv')"><i class="fas fa-download"></i> Export</button>
      </div>
    </div></div>
    <div class="table-responsive"><table class="admin-table" id="logs-table">
      <thead><tr><th>Timestamp</th><th>Action</th><th>Target</th><th>Admin</th><th>Details</th><th>IP</th></tr></thead>
      <tbody>${logs.length===0 ? '<tr><td colspan="6" class="text-center">No logs found</td></tr>' : logs.map(l => `
        <tr><td>${formatDate(l.timestamp)}</td><td><span class="action-badge action-${l.action}">${l.action}</span></td>
          <td>${l.target||'N/A'}</td><td>${l.adminEmail||'Unknown'}</td>
          <td><span class="log-details" title="${l.details ? JSON.stringify(l.details) : ''}">${l.details ? (typeof l.details === 'object' ? Object.keys(l.details).join(', ') : l.details).substring(0, 50) : ''}...</span></td>
          <td><code>${l.ip||'N/A'}</code></td>
        </tr>`).join('')}
      </tbody></table></div>
    <div class="pagination">
      <button class="btn btn-sm" onclick="loadLogs(AdminState.filters, { page: ${p.page-1}, limit: ${p.limit} })" ${p.page<=1?'disabled':''}><i class="fas fa-chevron-left"></i> Previous</button>
      <span class="page-info">Page ${p.page} of ${tp} (${p.total} total)</span>
      <button class="btn btn-sm" onclick="loadLogs(AdminState.filters, { page: ${p.page+1}, limit: ${p.limit} })" ${p.page>=tp?'disabled':''}>Next <i class="fas fa-chevron-right"></i></button>
    </div>`;
  document.getElementById('logs-search')?.addEventListener('input', debounce(e => searchLogs(e.target.value), 300));
}

// ============================================================================
// NOTIFICATION MODULE
// ============================================================================

async function sendNotification(userId, type, title, message) {
  try {
    if (!title || !message) { showToast('error', 'Validation Error', 'Title and message are required'); return; }
    showLoading();
    await db.collection('notifications').add({
      userId, type: type || 'info', title, message,
      read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      sentBy: AdminState.currentUser.uid
    });
    await AuditLog.logAction('send_notification', 'notification', { userId, type, title, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Notification Sent', 'Notification has been sent');
  } catch (error) { hideLoading(); console.error('sendNotification error:', error); showToast('error', 'Error', error.message); }
}

async function sendBulkNotification(userIds, type, title, message) {
  try {
    if (!userIds || userIds.length === 0) { showToast('error', 'Validation Error', 'Select at least one user'); return; }
    if (!title || !message) { showToast('error', 'Validation Error', 'Title and message are required'); return; }
    showLoading();
    const batch = db.batch();
    userIds.forEach(userId => {
      const ref = db.collection('notifications').doc();
      batch.set(ref, { userId, type: type || 'info', title, message, read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(), sentBy: AdminState.currentUser.uid });
    });
    await batch.commit();
    await AuditLog.logAction('send_bulk_notification', 'notifications', { userIds, count: userIds.length, title, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Bulk Notification Sent', `${userIds.length} notifications sent`);
  } catch (error) { hideLoading(); console.error('sendBulkNotification error:', error); showToast('error', 'Error', error.message); }
}

async function sendAnnouncement(title, message) {
  try {
    if (!title || !message) { showToast('error', 'Validation Error', 'Title and message are required'); return; }
    showLoading();
    await db.collection('announcements').add({
      title, message, active: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: AdminState.currentUser.uid
    });
    await AuditLog.logAction('send_announcement', 'announcement', { title, adminId: AdminState.currentUser.uid });
    hideLoading();
    showToast('success', 'Announcement Sent', 'Announcement has been published');
  } catch (error) { hideLoading(); console.error('sendAnnouncement error:', error); showToast('error', 'Error', error.message); }
}

async function getNotificationHistory() {
  try {
    const snapshot = await db.collection('notifications').orderBy('createdAt', 'desc').limit(100).get();
    const notifications = []; snapshot.forEach(doc => notifications.push({ id: doc.id, ...doc.data() }));
    return notifications;
  } catch (error) { return []; }
}

// ============================================================================
// UI HELPERS
// ============================================================================

function showToast(type, title, message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="fas fa-${type==='success'?'check-circle':type==='error'?'times-circle':type==='warning'?'exclamation-triangle':'info-circle'}"></i></div>
    <div class="toast-content"><strong>${title}</strong><p>${message}</p></div>
    <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
  container.appendChild(toast);
  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 4000);
}

function showModal(modalId, data) {
  const modal = document.getElementById(modalId);
  if (modal) { modal.classList.add('active'); modal.style.display = 'flex'; }
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) { modal.classList.remove('active'); modal.style.display = 'none'; }
}

function showLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.add('active');
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.remove('active');
}

function confirmDialog(message) {
  return new Promise((resolve) => {
    const result = window.confirm(message);
    resolve(result);
  });
}

function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return Number(num).toLocaleString();
}

function formatUSD(usd) {
  if (usd === null || usd === undefined) return '$0.00';
  return '$' + Number(usd).toFixed(2);
}

function formatDate(date) {
  if (!date) return 'N/A';
  try {
    if (date.toDate) date = date.toDate();
    if (typeof date === 'string') date = new Date(date);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (error) { return 'N/A'; }
}

function timeAgo(date) {
  if (!date) return 'N/A';
  try {
    if (date.toDate) date = date.toDate();
    if (typeof date === 'string') date = new Date(date);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
    return Math.floor(seconds / 604800) + 'w ago';
  } catch (error) { return 'N/A'; }
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ============================================================================
// GENERIC MODAL HELPERS
// ============================================================================

function showCreateOfferModal() { showModal('create-offer-modal'); }
function showEditOfferModal(offerId) { showModal('edit-offer-modal', { offerId }); }
function showAddProviderModal() { showModal('add-provider-modal'); }
function showEditProviderModal(providerId) { showModal('edit-provider-modal', { providerId }); }
function showAddRewardModal() { showModal('add-reward-modal'); }
function showEditRewardModal(rewardId) { showModal('edit-reward-modal', { rewardId }); }
function showStockModal(rewardId) { showModal('stock-modal', { rewardId }); }
function showEditCategoryModal(categoryId) { showModal('edit-category-modal', { categoryId }); }
function showAddRiskRuleModal() { showModal('add-risk-rule-modal'); }
function showAddAdminModal() { showModal('add-admin-modal'); }
function showAddAdProviderModal() { showModal('add-ad-provider-modal'); }
function showEditAdProviderModal(providerId) { showModal('edit-ad-provider-modal', { providerId }); }
function showAddPlacementModal() { showModal('add-placement-modal'); }
function showCreateCampaignModal() { showModal('create-campaign-modal'); }
function showEditCampaignModal(campaignId) { showModal('edit-campaign-modal', { campaignId }); }
function showEditSectionModal(sectionId) { showModal('edit-section-modal', { sectionId }); }
function showAddBannerModal() { showModal('add-banner-modal'); }
function showEditBannerModal(bannerId) { showModal('edit-banner-modal', { bannerId }); }
function showAddFAQModal() { showModal('add-faq-modal'); }
function showEditFAQModal(faqId) { showModal('edit-faq-modal', { faqId }); }
function showEditTermsModal() { showModal('edit-terms-modal'); }
function showEditPrivacyModal() { showModal('edit-privacy-modal'); }
function showAddAnnouncementModal() { showModal('add-announcement-modal'); }
function showTicketDetail(ticketId) { getTicketDetail(ticketId); }

// ============================================================================
// EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.nav-item[data-section]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const section = el.getAttribute('data-section');
      navigateToAdmin(section);
    });
  });

  document.querySelectorAll('.modal-close, .modal-cancel').forEach(el => {
    el.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) { modal.classList.remove('active'); modal.style.display = 'none'; }
    });
  });

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) { modal.classList.remove('active'); modal.style.display = 'none'; }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active'); modal.style.display = 'none';
      });
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-sort]')) {
      const th = e.target;
      const table = th.closest('table');
      const tbody = table.querySelector('tbody');
      const col = th.getAttribute('data-sort');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const colIndex = Array.from(th.parentElement.children).indexOf(th);
      const isAsc = th.classList.contains('sort-asc');
      table.querySelectorAll('th').forEach(h => { h.classList.remove('sort-asc', 'sort-desc'); });
      rows.sort((a, b) => {
        const aVal = a.children[colIndex]?.textContent.trim() || '';
        const bVal = b.children[colIndex]?.textContent.trim() || '';
        const numA = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
        const numB = parseFloat(bVal.replace(/[^0-9.-]/g, ''));
        if (!isNaN(numA) && !isNaN(numB)) return isAsc ? numB - numA : numA - numB;
        return isAsc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      });
      th.classList.add(isAsc ? 'sort-desc' : 'sort-asc');
      rows.forEach(row => tbody.appendChild(row));
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'setting-maintenance') {
      toggleMaintenance(e.target.checked);
    }
  });
});

// ============================================================================
// INITIALIZATION
// ============================================================================

async function initAdminApp() {
  try {
    const isAuth = await AdminAuth.checkAdminAuth();
    if (!isAuth) {
      window.location.href = 'login.html';
      return;
    }
    AdminRouter.initAdminRouter();
    showToast('success', 'Admin Panel Loaded', `Welcome, ${AdminState.adminProfile?.displayName || 'Admin'}`);
  } catch (error) {
    console.error('initAdminApp error:', error);
    window.location.href = 'login.html';
  }
}

document.addEventListener('DOMContentLoaded', initAdminApp);
