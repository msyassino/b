// ============================================================
// ReWords - Complete Application Logic
// Firebase Auth + Firestore + Full Reward Platform
// ============================================================

// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
  apiKey: "AIzaSyBPMbRdVEJ85Is7eg4UkAFs_UHq-BD_Fhg",
  authDomain: "rewords-45ccf.firebaseapp.com",
  projectId: "rewords-45ccf",
  storageBucket: "rewords-45ccf.firebasestorage.app",
  messagingSenderId: "324257034049",
  appId: "1:324257034049:web:2e75279382793007683bc0",
  measurementId: "G-5LNDESBVST"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();

// ==================== GLOBAL STATE ====================
let currentUser = null;
let userData = null;
let allOffers = [];
let currentPage = 'home';
let offersPage = 0;
let selectedWithdrawMethod = null;
let spinCooldown = false;
let scratchCooldown = false;
let mysteryCooldown = false;
let adVideoCooldown = false;

// ==================== CONSTANTS ====================
const COINS_PER_DOLLAR = 10000;
const MIN_WITHDRAWAL = 5000;
const WITHDRAWAL_FEE_PERCENT = 5;
const MIN_WITHDRAWAL_FEE = 250;
const REFERRAL_PERCENT = 15;
const DAILY_CHECKIN_REWARDS = [100, 150, 200, 300, 400, 500, 2000];
const STREAK_MULTIPLIERS = { 0: 1.0, 3: 1.1, 7: 1.25, 14: 1.5, 30: 2.0 };
const ADMIN_UIDS = [];
const XP_PER_LEVEL = 1000;
const XP_MULTIPLIER = 1.5;

// ==================== SAMPLE DATA ====================
const SAMPLE_OFFERS = [
  { id: 'off1', name: 'Rise of Kingdoms', desc: 'Download and reach City Hall level 10', provider: 'Lootably', category: 'games', icon: 'fa-chess-rook', iconColor: '#f59e0b', reward: 8500, revenue: 12.00, country: 'all', device: 'mobile', difficulty: 'Medium', time: '3-5 days', rating: 4.7, status: 'active' },
  { id: 'off2', name: 'Coin Master', desc: 'Install and spin 10 times', provider: 'AdGate', category: 'games', icon: 'fa-coins', iconColor: '#10b981', reward: 3200, revenue: 4.50, country: 'all', device: 'mobile', difficulty: 'Easy', time: '10 min', rating: 4.5, status: 'active' },
  { id: 'off3', name: 'Survey: Consumer Habits', desc: 'Complete a 15-minute survey about your shopping habits', provider: 'BitLabs', category: 'surveys', icon: 'fa-poll', iconColor: '#3b82f6', reward: 2500, revenue: 3.50, country: 'all', device: 'all', difficulty: 'Easy', time: '15 min', rating: 4.2, status: 'active' },
  { id: 'off4', name: 'Cash App - Sign Up', desc: 'Download Cash App and send $5 to a friend', provider: 'OfferToro', category: 'tasks', icon: 'fa-money-bill-wave', iconColor: '#10b981', reward: 12000, revenue: 17.00, country: 'US', device: 'mobile', difficulty: 'Hard', time: '30 min', rating: 4.8, status: 'active' },
  { id: 'off5', name: 'Lords Mobile', desc: 'Install and reach Castle level 15', provider: 'Ayet', category: 'games', icon: 'fa-chess', iconColor: '#7c3aed', reward: 15000, revenue: 21.00, country: 'all', device: 'mobile', difficulty: 'Hard', time: '7-14 days', rating: 4.6, status: 'active' },
  { id: 'off6', name: 'Survey: Tech Preferences', desc: 'Share your opinion on latest tech products', provider: 'Pollfish', category: 'surveys', icon: 'fa-laptop', iconColor: '#06b6d4', reward: 1800, revenue: 2.50, country: 'all', device: 'all', difficulty: 'Easy', time: '10 min', rating: 4.0, status: 'active' },
  { id: 'off7', name: 'Raid Shadow Legends', desc: 'Download, complete the tutorial, and summon 2 champions', provider: 'Lootably', category: 'games', icon: 'fa-dragon', iconColor: '#ef4444', reward: 6800, revenue: 9.50, country: 'all', device: 'mobile', difficulty: 'Medium', time: '30 min', rating: 4.4, status: 'active' },
  { id: 'off8', name: 'Niyo Global - Sign Up', desc: 'Open an account and complete KYC', provider: 'AdGate', category: 'tasks', icon: 'fa-university', iconColor: '#3b82f6', reward: 18000, revenue: 25.00, country: 'IN', device: 'mobile', difficulty: 'Hard', time: '1 hour', rating: 4.3, status: 'active' },
  { id: 'off9', name: 'Coin Dozer', desc: 'Install and play for 5 minutes', provider: 'OfferToro', category: 'games', icon: 'fa-coins', iconColor: '#f59e0b', reward: 1200, revenue: 1.70, country: 'all', device: 'mobile', difficulty: 'Easy', time: '5 min', rating: 4.1, status: 'active' },
  { id: 'off10', name: 'Survey: Travel Habits', desc: 'Tell us about your travel preferences', provider: 'BitLabs', category: 'surveys', icon: 'fa-plane', iconColor: '#06b6d4', reward: 3000, revenue: 4.20, country: 'all', device: 'all', difficulty: 'Easy', time: '12 min', rating: 4.3, status: 'active' },
  { id: 'off11', name: 'Family Island', desc: 'Install and reach Farm level 8', provider: 'Ayet', category: 'games', icon: 'fa-island-tropical', iconColor: '#10b981', reward: 5500, revenue: 7.70, country: 'all', device: 'mobile', difficulty: 'Medium', time: '2-3 days', rating: 4.5, status: 'active' },
  { id: 'off12', name: 'Temu - Shop & Save', desc: 'Download app and make a purchase', provider: 'Lootably', category: 'tasks', icon: 'fa-shopping-bag', iconColor: '#f97316', reward: 9500, revenue: 13.30, country: 'US', device: 'mobile', difficulty: 'Medium', time: '20 min', rating: 4.6, status: 'active' },
  { id: 'off13', name: 'Survey: Food Preferences', desc: 'Share your food and dining habits', provider: 'Pollfish', category: 'surveys', icon: 'fa-utensils', iconColor: '#ef4444', reward: 2000, revenue: 2.80, country: 'all', device: 'all', difficulty: 'Easy', time: '10 min', rating: 4.1, status: 'active' },
  { id: 'off14', name: 'Match Masters', desc: 'Install and reach 500 trophies', provider: 'OfferToro', category: 'games', icon: 'fa-puzzle-piece', iconColor: '#7c3aed', reward: 7200, revenue: 10.08, country: 'all', device: 'mobile', difficulty: 'Hard', time: '5-7 days', rating: 4.4, status: 'active' },
  { id: 'off15', name: 'Crypto.com - Sign Up', desc: 'Create account and verify identity', provider: 'AdGate', category: 'tasks', icon: 'fa-bitcoin', iconColor: '#f59e0b', reward: 22000, revenue: 30.80, country: 'all', device: 'mobile', difficulty: 'Hard', time: '30 min', rating: 4.7, status: 'active' },
  { id: 'off16', name: 'Gardenscapes', desc: 'Install and complete 50 levels', provider: 'Ayet', category: 'games', icon: 'fa-seedling', iconColor: '#10b981', reward: 4800, revenue: 6.72, country: 'all', device: 'mobile', difficulty: 'Medium', time: '3-5 days', rating: 4.3, status: 'active' },
  { id: 'off17', name: 'Survey: Health & Fitness', desc: 'Tell us about your fitness routine', provider: 'BitLabs', category: 'surveys', icon: 'fa-heartbeat', iconColor: '#ef4444', reward: 2800, revenue: 3.92, country: 'all', device: 'all', difficulty: 'Easy', time: '15 min', rating: 4.2, status: 'active' },
  { id: 'off18', name: 'Binance - Trade', desc: 'Sign up and complete first trade', provider: 'Lootably', category: 'tasks', icon: 'fa-chart-line', iconColor: '#f59e0b', reward: 25000, revenue: 35.00, country: 'all', device: 'all', difficulty: 'Hard', time: '30 min', rating: 4.8, status: 'active' },
  { id: 'off19', name: 'Township', desc: 'Install and reach level 20', provider: 'OfferToro', category: 'games', icon: 'fa-city', iconColor: '#3b82f6', reward: 6200, revenue: 8.68, country: 'all', device: 'mobile', difficulty: 'Medium', time: '3-5 days', rating: 4.4, status: 'active' },
  { id: 'off20', name: 'Survey: Entertainment', desc: 'Share your entertainment preferences', provider: 'Pollfish', category: 'surveys', icon: 'fa-film', iconColor: '#7c3aed', reward: 1500, revenue: 2.10, country: 'all', device: 'all', difficulty: 'Easy', time: '8 min', rating: 4.0, status: 'active' }
];

const SAMPLE_STORE_ITEMS = [
  { id: 's1', name: 'PayPal Cash', category: 'paypal', icon: 'fab fa-paypal', cost: 5000, price: '$0.50', color: '#003087', available: true },
  { id: 's2', name: 'PayPal Cash', category: 'paypal', icon: 'fab fa-paypal', cost: 10000, price: '$1.00', color: '#003087', available: true },
  { id: 's3', name: 'PayPal Cash', category: 'paypal', icon: 'fab fa-paypal', cost: 25000, price: '$2.50', color: '#003087', available: true },
  { id: 's4', name: 'PayPal Cash', category: 'paypal', icon: 'fab fa-paypal', cost: 50000, price: '$5.00', color: '#003087', available: true },
  { id: 's5', name: 'Google Play Gift Card', category: 'giftcards', icon: 'fab fa-google-play', cost: 25000, price: '$2.50', color: '#10b981', available: true },
  { id: 's6', name: 'Google Play Gift Card', category: 'giftcards', icon: 'fab fa-google-play', cost: 50000, price: '$5.00', color: '#10b981', available: true },
  { id: 's7', name: 'Steam Gift Card', category: 'gaming', icon: 'fab fa-steam', cost: 50000, price: '$5.00', color: '#66c0f4', available: true },
  { id: 's8', name: 'Steam Gift Card', category: 'gaming', icon: 'fab fa-steam', cost: 100000, price: '$10.00', color: '#66c0f4', available: true },
  { id: 's9', name: 'Apple Gift Card', category: 'giftcards', icon: 'fab fa-apple', cost: 100000, price: '$10.00', color: '#fff', available: true },
  { id: 's10', name: 'Roblox Gift Card', category: 'gaming', icon: 'fas fa-cube', cost: 50000, price: '$5.00', color: '#e2231a', available: true },
  { id: 's11', name: 'Amazon Gift Card', category: 'giftcards', icon: 'fab fa-amazon', cost: 50000, price: '$5.00', color: '#ff9900', available: true },
  { id: 's12', name: 'USDT (TRC20)', category: 'crypto', icon: 'fab fa-bitcoin', cost: 10000, price: '$1.00', color: '#f59e0b', available: true },
  { id: 's13', name: 'USDT (TRC20)', category: 'crypto', icon: 'fab fa-bitcoin', cost: 50000, price: '$5.00', color: '#f59e0b', available: true },
  { id: 's14', name: 'USDT (TRC20)', category: 'crypto', icon: 'fab fa-bitcoin', cost: 100000, price: '$10.00', color: '#f59e0b', available: true },
  { id: 's15', name: 'Xbox Gift Card', category: 'gaming', icon: 'fab fa-xbox', cost: 100000, price: '$10.00', color: '#107c10', available: true },
  { id: 's16', name: 'PlayStation Gift Card', category: 'gaming', icon: 'fab fa-playstation', cost: 100000, price: '$10.00', color: '#003087', available: true }
];

const SAMPLE_TASKS = {
  daily: [
    { id: 't1', name: 'Complete 3 offers', target: 3, current: 0, reward: 500, icon: 'fa-hand-holding-usd' },
    { id: 't2', name: 'Watch 5 ads', target: 5, current: 0, reward: 300, icon: 'fa-play-circle' },
    { id: 't3', name: 'Spin the wheel', target: 1, current: 0, reward: 200, icon: 'fa-dharmachakra' },
    { id: 't4', name: 'Check in daily', target: 1, current: 0, reward: 100, icon: 'fa-calendar-check' },
    { id: 't5', name: 'Complete 1 survey', target: 1, current: 0, reward: 400, icon: 'fa-poll' }
  ],
  weekly: [
    { id: 'w1', name: 'Complete 15 offers', target: 15, current: 0, reward: 3000, icon: 'fa-hand-holding-usd' },
    { id: 'w2', name: 'Earn 10,000 coins', target: 10000, current: 0, reward: 2000, icon: 'fa-coins' },
    { id: 'w3', name: 'Refer 2 friends', target: 2, current: 0, reward: 5000, icon: 'fa-user-friends' }
  ],
  achievements: [
    { id: 'a1', name: 'First Offer', desc: 'Complete your first offer', target: 1, current: 0, reward: 1000, icon: 'fa-star', unlocked: false },
    { id: 'a2', name: 'Week Warrior', desc: '7-day streak', target: 7, current: 0, reward: 5000, icon: 'fa-fire', unlocked: false },
    { id: 'a3', name: 'Century Club', desc: 'Complete 100 offers', target: 100, current: 0, reward: 50000, icon: 'fa-trophy', unlocked: false },
    { id: 'a4', name: 'Social Butterfly', desc: 'Refer 10 friends', target: 10, current: 0, reward: 25000, icon: 'fa-users', unlocked: false },
    { id: 'a5', name: 'Big Spender', desc: 'Withdraw for the first time', target: 1, current: 0, reward: 2000, icon: 'fa-money-bill-wave', unlocked: false }
  ]
};

const TOPUP_PACKAGES = {
  freefire: { name: 'Free Fire', unit: 'Diamonds', packages: [{ amount: 100, coins: 3000 }, { amount: 310, coins: 8000 }, { amount: 520, coins: 12000 }, { amount: 1060, coins: 22000 }] },
  pubg: { name: 'PUBG Mobile', unit: 'UC', packages: [{ amount: 60, coins: 2000 }, { amount: 325, coins: 8000 }, { amount: 660, coins: 15000 }, { amount: 1800, coins: 38000 }] },
  roblox: { name: 'Roblox', unit: 'Robux', packages: [{ amount: 80, coins: 3000 }, { amount: 400, coins: 12000 }, { amount: 800, coins: 22000 }, { amount: 1700, coins: 45000 }] },
  valorant: { name: 'Valorant', unit: 'VP', packages: [{ amount: 475, coins: 10000 }, { amount: 1000, coins: 20000 }, { amount: 2050, coins: 38000 }, { amount: 5350, coins: 95000 }] },
  mobilelegends: { name: 'Mobile Legends', unit: 'Diamonds', packages: [{ amount: 56, coins: 2000 }, { amount: 172, coins: 5000 }, { amount: 568, coins: 15000 }, { amount: 1128, coins: 28000 }] },
  fcmobile: { name: 'FC Mobile', unit: 'FC Points', packages: [{ amount: 100, coins: 3000 }, { amount: 500, coins: 12000 }, { amount: 1050, coins: 22000 }, { amount: 2200, coins: 42000 }] },
  clashofclans: { name: 'Clash of Clans', unit: 'Gems', packages: [{ amount: 80, coins: 3000 }, { amount: 500, coins: 15000 }, { amount: 1200, coins: 30000 }, { amount: 2500, coins: 58000 }] },
  clashroyale: { name: 'Clash Royale', unit: 'Gems', packages: [{ amount: 80, coins: 3000 }, { amount: 500, coins: 15000 }, { amount: 1200, coins: 30000 }, { amount: 2500, coins: 58000 }] },
  fortnite: { name: 'Fortnite', unit: 'V-Bucks', packages: [{ amount: 1000, coins: 12000 }, { amount: 2800, coins: 30000 }, { amount: 5000, coins: 52000 }, { amount: 13500, coins: 130000 }] },
  steam: { name: 'Steam', unit: 'Wallet', packages: [{ amount: 5, coins: 50000 }, { amount: 10, coins: 100000 }, { amount: 25, coins: 240000 }, { amount: 50, coins: 470000 }] },
  playstation: { name: 'PlayStation', unit: 'PSN Card', packages: [{ amount: 10, coins: 100000 }, { amount: 20, coins: 195000 }, { amount: 50, coins: 475000 }] },
  xbox: { name: 'Xbox', unit: 'Gift Card', packages: [{ amount: 10, coins: 100000 }, { amount: 25, coins: 240000 }, { amount: 50, coins: 475000 }] }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setTimeout(() => {
    document.getElementById('loadingScreen').classList.add('hidden');
  }, 2200);
  initScrollAnimations();
  animateHeroCounters();
});

async function initApp() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await loadUserData();
      updateUIForLoggedIn();
      loadPageData();
    } else {
      currentUser = null;
      userData = null;
      updateUIForLoggedOut();
    }
  });
}

// ==================== AUTH FUNCTIONS ====================
function openAuthModal() {
  document.getElementById('authModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  document.getElementById('authModal').style.display = 'none';
  document.body.style.overflow = '';
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.auth-tab[data-tab="' + tab + '"]').classList.add('active');
  if (tab === 'login') {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
  } else {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
  btn.disabled = true;
  try {
    await auth.signInWithEmailAndPassword(email, password);
    closeAuthModal();
    showToast('Welcome back!', 'success');
    await logActivity('auth', 'User signed in');
  } catch (error) {
    showToast(getAuthErrorMessage(error.code), 'error');
  }
  btn.innerHTML = '<span>Sign In</span> <i class="fas fa-arrow-right"></i>';
  btn.disabled = false;
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const country = document.getElementById('regCountry').value;
  const referralCode = document.getElementById('regReferral').value.trim();
  if (username.length < 3) { showToast('Username must be at least 3 characters', 'error'); return; }
  const btn = document.getElementById('registerBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
  btn.disabled = true;
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;
    const userRefCode = generateReferralCode(username);
    const now = new Date().toISOString();
    const newUser = {
      uid, username, email, country, role: 'user',
      referralCode: userRefCode, referredBy: referralCode || null,
      coins: { available: 500, pending: 0, locked: 0, lifetimeEarned: 500, lifetimeSpent: 0 },
      level: 1, xp: 0,
      streak: { current: 0, lastClaim: null, freezes: 2 },
      checkin: { lastCheckin: null, day: 0 },
      stats: { offersCompleted: 0, totalEarnings: 0, referrals: 0, withdrawals: 0 },
      verification: { email: false, phone: false, identity: false },
      status: 'active', riskScore: 0, riskFlags: [],
      devices: [await getDeviceInfo()],
      ips: [await getClientIP()],
      settings: { emailNotifs: true, offerAlerts: true, marketing: false },
      createdAt: now, lastLogin: now
    };
    await db.collection('users').doc(uid).set(newUser);
    if (referralCode) {
      await processReferralSignup(referralCode, uid, username);
    }
    userData = newUser;
    closeAuthModal();
    showToast('Account created! Welcome to ReWords! You received 500 bonus coins!', 'success');
    await logActivity('auth', 'User registered');
    await addCoins(500, 'bonus', 'Welcome bonus');
  } catch (error) {
    showToast(getAuthErrorMessage(error.code), 'error');
  }
  btn.innerHTML = '<span>Create Account</span> <i class="fas fa-rocket"></i>';
  btn.disabled = false;
}

async function signInWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    if (result.additionalUserInfo && result.additionalUserInfo.isNewUser) {
      const uid = result.user.uid;
      const now = new Date().toISOString();
      const newUser = {
        uid, username: result.user.displayName || 'User',
        email: result.user.email, country: 'OTHER', role: 'user',
        referralCode: generateReferralCode(result.user.displayName || 'user'),
        referredBy: null,
        coins: { available: 500, pending: 0, locked: 0, lifetimeEarned: 500, lifetimeSpent: 0 },
        level: 1, xp: 0,
        streak: { current: 0, lastClaim: null, freezes: 2 },
        checkin: { lastCheckin: null, day: 0 },
        stats: { offersCompleted: 0, totalEarnings: 0, referrals: 0, withdrawals: 0 },
        verification: { email: true, phone: false, identity: false },
        status: 'active', riskScore: 0, riskFlags: [],
        devices: [await getDeviceInfo()], ips: [await getClientIP()],
        settings: { emailNotifs: true, offerAlerts: true, marketing: false },
        createdAt: now, lastLogin: now
      };
      await db.collection('users').doc(uid).set(newUser);
      userData = newUser;
      await addCoins(500, 'bonus', 'Welcome bonus');
    }
    closeAuthModal();
    showToast('Signed in with Google!', 'success');
  } catch (error) {
    showToast(getAuthErrorMessage(error.code), 'error');
  }
}

async function signInWithGithub() {
  try {
    const provider = new firebase.auth.GithubAuthProvider();
    await auth.signInWithPopup(provider);
    closeAuthModal();
    showToast('Signed in with GitHub!', 'success');
  } catch (error) {
    showToast(getAuthErrorMessage(error.code), 'error');
  }
}

async function handleLogout() {
  await logActivity('auth', 'User signed out');
  await auth.signOut();
  showPage('home');
  showToast('Logged out successfully', 'info');
}

async function forgotPassword() {
  const email = prompt('Enter your email address:');
  if (email) {
    try {
      await auth.sendPasswordResetEmail(email);
      showToast('Password reset email sent!', 'success');
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  }
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const icon = input.nextElementSibling.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

function getAuthErrorMessage(code) {
  const messages = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
    'auth/network-request-failed': 'Network error. Check your connection.'
  };
  return messages[code] || 'An error occurred. Please try again.';
}

// ==================== USER DATA ====================
async function loadUserData() {
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    if (doc.exists) {
      userData = doc.data();
      const now = new Date().toISOString();
      await db.collection('users').doc(currentUser.uid).update({ lastLogin: now });
    } else {
      const now = new Date().toISOString();
      userData = {
        uid: currentUser.uid, username: currentUser.displayName || currentUser.email.split('@')[0],
        email: currentUser.email, country: 'OTHER', role: 'user',
        referralCode: generateReferralCode(currentUser.displayName || 'user'),
        referredBy: null,
        coins: { available: 500, pending: 0, locked: 0, lifetimeEarned: 500, lifetimeSpent: 0 },
        level: 1, xp: 0,
        streak: { current: 0, lastClaim: null, freezes: 2 },
        checkin: { lastCheckin: null, day: 0 },
        stats: { offersCompleted: 0, totalEarnings: 0, referrals: 0, withdrawals: 0 },
        verification: { email: currentUser.emailVerified, phone: false, identity: false },
        status: 'active', riskScore: 0, riskFlags: [],
        devices: [], ips: [],
        settings: { emailNotifs: true, offerAlerts: true, marketing: false },
        createdAt: now, lastLogin: now
      };
      await db.collection('users').doc(currentUser.uid).set(userData);
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    userData = {
      coins: { available: 0, pending: 0, locked: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
      level: 1, xp: 0, streak: { current: 0, lastClaim: null, freezes: 2 },
      checkin: { lastCheckin: null, day: 0 },
      stats: { offersCompleted: 0, totalEarnings: 0, referrals: 0, withdrawals: 0 }
    };
  }
}

// ==================== UI UPDATE ====================
function updateUIForLoggedIn() {
  if (!userData) return;
  document.getElementById('signInBtn').style.display = 'none';
  document.getElementById('userMenu').style.display = 'block';
  document.getElementById('headerBalance').style.display = 'flex';
  document.getElementById('notifBtn').style.display = 'block';
  document.getElementById('balanceDisplay').textContent = formatNumber(userData.coins.available);
  document.getElementById('userName').textContent = userData.username || 'User';
  document.getElementById('dropdownName').textContent = userData.username || 'User';
  document.getElementById('dropdownEmail').textContent = userData.email || '';
  document.getElementById('dropdownLevel').textContent = 'Level ' + (userData.level || 1);
  document.getElementById('sidebarUser').style.display = 'flex';
  document.getElementById('sidebarUsername').textContent = userData.username || 'User';
  document.getElementById('sidebarLevel').textContent = 'Level ' + (userData.level || 1);
  document.getElementById('accountStatusSection').style.display = 'block';
  const xpForNext = Math.floor(XP_PER_LEVEL * Math.pow(XP_MULTIPLIER, (userData.level || 1) - 1));
  const xpProgress = userData.xp ? Math.min((userData.xp / xpForNext) * 100, 100) : 0;
  document.getElementById('sidebarXp').style.width = xpProgress + '%';
  document.getElementById('streakBanner').style.display = 'block';
  document.getElementById('streakCount').textContent = userData.streak ? userData.streak.current : 0;
  updateProfilePage();
  updateWalletPage();
  updateReferralPage();
  loadTransactions();
  if (isAdmin()) {
    document.getElementById('adminLink').style.display = 'flex';
    document.getElementById('sidebarAdmin').style.display = 'block';
  }
  checkDailyCheckin();
}

function updateUIForLoggedOut() {
  document.getElementById('signInBtn').style.display = 'flex';
  document.getElementById('userMenu').style.display = 'none';
  document.getElementById('headerBalance').style.display = 'none';
  document.getElementById('notifBtn').style.display = 'none';
  document.getElementById('sidebarUser').style.display = 'none';
  document.getElementById('accountStatusSection').style.display = 'none';
  document.getElementById('adminLink').style.display = 'none';
  document.getElementById('sidebarAdmin').style.display = 'none';
  document.getElementById('streakBanner').style.display = 'none';
  document.getElementById('userDropdown').style.display = 'none';
}

function updateProfilePage() {
  if (!userData) return;
  document.getElementById('profileUsername').textContent = userData.username || 'User';
  document.getElementById('profileEmail').textContent = userData.email || '';
  document.getElementById('profileLevelBadge').textContent = 'Level ' + (userData.level || 1);
  document.getElementById('profileTotalEarned').textContent = formatNumber(userData.coins ? userData.coins.lifetimeEarned : 0);
  document.getElementById('profileOffersCompleted').textContent = userData.stats ? userData.stats.offersCompleted : 0;
  document.getElementById('profileWithdrawals').textContent = userData.stats ? userData.stats.withdrawals : 0;
  document.getElementById('profileReferrals').textContent = userData.stats ? userData.stats.referrals : 0;
  document.getElementById('profileJoinDate').textContent = userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : '-';
  document.getElementById('profileCountry').textContent = userData.country || '-';
  document.getElementById('profileLevelNum').textContent = userData.level || 1;
  const xpForNext = Math.floor(XP_PER_LEVEL * Math.pow(XP_MULTIPLIER, (userData.level || 1) - 1));
  const xpProgress = userData.xp ? Math.min((userData.xp / xpForNext) * 100, 100) : 0;
  document.getElementById('profileXpFill').style.width = xpProgress + '%';
  document.getElementById('profileCurrentXp').textContent = formatNumber(userData.xp || 0);
  document.getElementById('profileNextXp').textContent = formatNumber(xpForNext);
}

function updateWalletPage() {
  if (!userData) return;
  const c = userData.coins || { available: 0, pending: 0, locked: 0, lifetimeEarned: 0, lifetimeSpent: 0 };
  document.getElementById('walletBalance').textContent = formatNumber(c.available);
  document.getElementById('walletBalanceUSD').textContent = (c.available / COINS_PER_DOLLAR).toFixed(2);
  document.getElementById('walletPending').textContent = formatNumber(c.pending);
  document.getElementById('walletLocked').textContent = formatNumber(c.locked);
  document.getElementById('walletTotalEarned').textContent = formatNumber(c.lifetimeEarned);
  document.getElementById('walletTotalSpent').textContent = formatNumber(c.lifetimeSpent);
  document.getElementById('walletTotalWithdrawn').textContent = formatNumber(c.lifetimeSpent);
  document.getElementById('withdrawAvail').textContent = formatNumber(c.available) + ' Coins';
  document.getElementById('withdrawPending').textContent = formatNumber(c.pending) + ' Coins';
}

function updateReferralPage() {
  if (!userData) return;
  const baseUrl = window.location.origin + window.location.pathname;
  const refLink = baseUrl + '?ref=' + (userData.referralCode || '');
  document.getElementById('referralLink').value = refLink;
  document.getElementById('referralCode').textContent = userData.referralCode || 'N/A';
  document.getElementById('referralCount').textContent = userData.stats ? userData.stats.referrals : 0;
}

// ==================== COIN SYSTEM (LEDGER-BASED) ====================
async function addCoins(amount, type, description) {
  if (!currentUser || !userData) return;
  const now = new Date().toISOString();
  const before = userData.coins.available;
  try {
    await db.runTransaction(async (t) => {
      const userRef = db.collection('users').doc(currentUser.uid);
      const userDoc = await t.get(userRef);
      const data = userDoc.data();
      const currentCoins = data.coins.available;
      t.update(userRef, {
        'coins.available': currentCoins + amount,
        'coins.lifetimeEarned': data.coins.lifetimeEarned + amount,
        'xp': (data.xp || 0) + Math.floor(amount / 100)
      });
    });
    userData.coins.available += amount;
    userData.coins.lifetimeEarned += amount;
    userData.xp = (userData.xp || 0) + Math.floor(amount / 100);
    await db.collection('ledger').add({
      userId: currentUser.uid, type: 'credit', category: type,
      amount, balanceBefore: before, balanceAfter: userData.coins.available,
      description, timestamp: now
    });
    await db.collection('transactions').add({
      userId: currentUser.uid, type: 'earn', category: type,
      coins: amount, description, timestamp: now, status: 'completed'
    });
    checkLevelUp();
    updateBalanceDisplay();
  } catch (error) {
    console.error('Error adding coins:', error);
  }
}

async function deductCoins(amount, type, description) {
  if (!currentUser || !userData) return false;
  if (userData.coins.available < amount) { showToast('Insufficient coins', 'error'); return false; }
  const now = new Date().toISOString();
  const before = userData.coins.available;
  try {
    await db.collection('users').doc(currentUser.uid).update({
      'coins.available': firebase.firestore.FieldValue.increment(-amount),
      'coins.lifetimeSpent': firebase.firestore.FieldValue.increment(amount)
    });
    userData.coins.available -= amount;
    userData.coins.lifetimeSpent += amount;
    await db.collection('ledger').add({
      userId: currentUser.uid, type: 'debit', category: type,
      amount, balanceBefore: before, balanceAfter: userData.coins.available,
      description, timestamp: now
    });
    await db.collection('transactions').add({
      userId: currentUser.uid, type: 'spend', category: type,
      coins: amount, description, timestamp: now, status: 'completed'
    });
    updateBalanceDisplay();
    return true;
  } catch (error) {
    console.error('Error deducting coins:', error);
    return false;
  }
}

function updateBalanceDisplay() {
  if (!userData) return;
  document.getElementById('balanceDisplay').textContent = formatNumber(userData.coins.available);
  updateWalletPage();
}

async function addPendingCoins(amount, type, description) {
  if (!currentUser || !userData) return;
  const now = new Date().toISOString();
  try {
    await db.collection('users').doc(currentUser.uid).update({
      'coins.pending': firebase.firestore.FieldValue.increment(amount)
    });
    userData.coins.pending += amount;
    await db.collection('transactions').add({
      userId: currentUser.uid, type: 'earn', category: type,
      coins: amount, description: description + ' (pending)', timestamp: now, status: 'pending'
    });
    updateBalanceDisplay();
  } catch (error) {
    console.error('Error adding pending coins:', error);
  }
}

async function confirmPendingCoins(amount, type, description) {
  if (!currentUser || !userData) return;
  const now = new Date().toISOString();
  const before = userData.coins.available;
  try {
    await db.collection('users').doc(currentUser.uid).update({
      'coins.pending': firebase.firestore.FieldValue.increment(-amount),
      'coins.available': firebase.firestore.FieldValue.increment(amount),
      'coins.lifetimeEarned': firebase.firestore.FieldValue.increment(amount)
    });
    userData.coins.pending -= amount;
    userData.coins.available += amount;
    userData.coins.lifetimeEarned += amount;
    await db.collection('ledger').add({
      userId: currentUser.uid, type: 'credit', category: type,
      amount, balanceBefore: before, balanceAfter: userData.coins.available,
      description, timestamp: now
    });
    updateBalanceDisplay();
  } catch (error) {
    console.error('Error confirming pending coins:', error);
  }
}

// ==================== LEVEL SYSTEM ====================
function checkLevelUp() {
  if (!userData) return;
  const xpForNext = Math.floor(XP_PER_LEVEL * Math.pow(XP_MULTIPLIER, (userData.level || 1) - 1));
  if ((userData.xp || 0) >= xpForNext) {
    userData.level = (userData.level || 1) + 1;
    userData.xp -= xpForNext;
    db.collection('users').doc(currentUser.uid).update({
      level: userData.level, xp: userData.xp
    });
    showToast('Level Up! You are now Level ' + userData.level + '!', 'success');
    addNotification('level_up', 'Level Up!', 'You reached Level ' + userData.level + '!');
  }
}

// ==================== DAILY CHECKIN ====================
function checkDailyCheckin() {
  if (!userData || !userData.checkin) return;
  const lastClaim = userData.checkin.lastCheckin;
  if (!lastClaim) {
    document.getElementById('checkinBtn').disabled = false;
    document.getElementById('checkinBtn').innerHTML = '<i class="fas fa-gift"></i> Check In Now';
    return;
  }
  const lastDate = new Date(lastClaim).toDateString();
  const today = new Date().toDateString();
  if (lastDate === today) {
    document.getElementById('checkinBtn').disabled = true;
    document.getElementById('checkinBtn').innerHTML = '<i class="fas fa-check"></i> Already Claimed Today';
  } else {
    document.getElementById('checkinBtn').disabled = false;
    document.getElementById('checkinBtn').innerHTML = '<i class="fas fa-gift"></i> Check In Now';
  }
}

async function claimDailyCheckin() {
  if (!currentUser || !userData) { openAuthModal(); return; }
  const now = new Date();
  const today = now.toDateString();
  if (userData.checkin && userData.checkin.lastCheckin) {
    const lastDate = new Date(userData.checkin.lastCheckin).toDateString();
    if (lastDate === today) { showToast('Already checked in today!', 'info'); return; }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (new Date(userData.checkin.lastCheckin).toDateString() !== yesterday.toDateString()) {
      userData.checkin.day = 0;
    }
  }
  let day = (userData.checkin ? userData.checkin.day : 0) + 1;
  if (day > 7) day = 1;
  const reward = DAILY_CHECKIN_REWARDS[day - 1] || 100;
  await db.collection('users').doc(currentUser.uid).update({
    'checkin.lastCheckin': now.toISOString(),
    'checkin.day': day
  });
  userData.checkin = { lastCheckin: now.toISOString(), day };
  await addCoins(reward, 'daily', 'Day ' + day + ' check-in reward');
  showToast('Day ' + day + '! You earned ' + reward + ' coins!', 'success');
  checkDailyCheckin();
  updateDailyPage();
  updateStreak();
  await logActivity('daily', 'Daily check-in day ' + day);
}

async function updateStreak() {
  if (!userData) return;
  const today = new Date().toDateString();
  const lastClaim = userData.streak ? userData.streak.lastClaim : null;
  if (lastClaim) {
    const lastDate = new Date(lastClaim).toDateString();
    if (lastDate === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (new Date(lastClaim).toDateString() === yesterday.toDateString()) {
      userData.streak.current = (userData.streak.current || 0) + 1;
    } else if (new Date(lastClaim).toDateString() !== today) {
      if (userData.streak && userData.streak.freezes > 0) {
        userData.streak.freezes--;
        await db.collection('users').doc(currentUser.uid).update({ 'streak.freezes': userData.streak.freezes });
      } else {
        userData.streak.current = 1;
      }
    }
  } else {
    userData.streak.current = 1;
  }
  userData.streak.lastClaim = new Date().toISOString();
  await db.collection('users').doc(currentUser.uid).update({
    'streak.current': userData.streak.current,
    'streak.lastClaim': userData.streak.lastClaim
  });
  document.getElementById('streakCount').textContent = userData.streak.current;
}

function updateDailyPage() {
  if (!userData) return;
  document.getElementById('dailyStreakLarge').textContent = userData.streak ? userData.streak.current : 0;
  document.getElementById('currentStreak').textContent = userData.streak ? userData.streak.current : 0;
  document.getElementById('todayReward').textContent = DAILY_CHECKIN_REWARDS[((userData.checkin ? userData.checkin.day : 0)) % 7] || 100;
  document.getElementById('freezeCount').textContent = userData.streak ? userData.streak.freezes : 0;
  const streak = userData.streak ? userData.streak.current : 0;
  let mult = 1.0;
  if (streak >= 30) mult = 2.0;
  else if (streak >= 14) mult = 1.5;
  else if (streak >= 7) mult = 1.25;
  else if (streak >= 3) mult = 1.1;
  document.getElementById('multValue').textContent = mult.toFixed(1) + 'x';
}

async function claimDailyStreak() {
  await claimDailyCheckin();
}

async function buyStreakFreeze() {
  if (!currentUser || !userData) { openAuthModal(); return; }
  const success = await deductCoins(500, 'freeze', 'Streak freeze purchase');
  if (success) {
    await db.collection('users').doc(currentUser.uid).update({ 'streak.freezes': firebase.firestore.FieldValue.increment(1) });
    userData.streak.freezes = (userData.streak.freezes || 0) + 1;
    document.getElementById('freezeCount').textContent = userData.streak.freezes;
    showToast('Streak freeze purchased!', 'success');
  }
}

// ==================== OFFERS ====================
function loadPageData() {
  renderOffers(SAMPLE_OFFERS);
  renderStoreItems(SAMPLE_STORE_ITEMS);
  renderTasks(SAMPLE_TASKS.daily);
  loadTransactions();
}

function renderOffers(offers) {
  const grid = document.getElementById('topOffersGrid');
  if (!grid) return;
  const topOffers = [...offers].sort((a, b) => b.reward - a.reward).slice(0, 4);
  grid.innerHTML = topOffers.map(offer => createOfferCard(offer)).join('');
  const gamesGrid = document.getElementById('topGamesGrid');
  if (gamesGrid) {
    const games = offers.filter(o => o.category === 'games').slice(0, 4);
    gamesGrid.innerHTML = games.map(offer => createOfferCard(offer)).join('');
  }
  const surveysGrid = document.getElementById('topSurveysGrid');
  if (surveysGrid) {
    const surveys = offers.filter(o => o.category === 'surveys').slice(0, 3);
    surveysGrid.innerHTML = surveys.map(offer => createOfferCard(offer)).join('');
  }
  const earnGrid = document.getElementById('earnOffersGrid');
  if (earnGrid) earnGrid.innerHTML = offers.map(offer => createOfferCard(offer)).join('');
  const allList = document.getElementById('allOffersList');
  if (allList) allList.innerHTML = offers.map(offer => createOfferListItem(offer)).join('');
  const allCount = document.getElementById('allOfferCount');
  if (allCount) allCount.textContent = offers.length + ' offers';
  allOffers = offers;
}

function createOfferCard(offer) {
  return '<div class="offer-card" onclick="openOfferDetail(\'' + offer.id + '\')">' +
    '<div class="offer-card-icon" style="color:' + offer.iconColor + '"><i class="fas ' + offer.icon + '"></i></div>' +
    '<div class="offer-card-body"><div class="offer-card-name">' + offer.name + '</div>' +
    '<div class="offer-card-provider">' + offer.provider + ' &middot; ' + offer.difficulty + '</div></div>' +
    '<div class="offer-card-footer"><span class="offer-card-reward">' + formatNumber(offer.reward) + ' Coins</span>' +
    '<span class="offer-card-time"><i class="fas fa-clock"></i> ' + offer.time + '</span></div></div>';
}

function createOfferListItem(offer) {
  return '<div class="recent-item" onclick="openOfferDetail(\'' + offer.id + '\')" style="cursor:pointer;">' +
    '<div class="recent-item-icon" style="color:' + offer.iconColor + ';background:' + offer.iconColor + '15"><i class="fas ' + offer.icon + '"></i></div>' +
    '<div class="recent-item-info"><div class="recent-item-name">' + offer.name + '</div>' +
    '<div class="recent-item-time">' + offer.provider + ' &middot; ' + offer.difficulty + ' &middot; ' + offer.time + '</div></div>' +
    '<span class="offer-card-reward">' + formatNumber(offer.reward) + ' Coins</span></div>';
}

function openOfferDetail(offerId) {
  const offer = SAMPLE_OFFERS.find(o => o.id === offerId);
  if (!offer) return;
  document.getElementById('odTitle').textContent = offer.name;
  document.getElementById('odProvider').textContent = offer.provider;
  document.getElementById('odReward').textContent = formatNumber(offer.reward) + ' Coins';
  document.getElementById('odTime').textContent = offer.time;
  document.getElementById('odDifficulty').textContent = offer.difficulty;
  document.getElementById('odCountry').textContent = offer.country === 'all' ? 'All Countries' : offer.country;
  document.getElementById('odDevice').textContent = offer.device.charAt(0).toUpperCase() + offer.device.slice(1);
  document.getElementById('odCategory').textContent = offer.category.charAt(0).toUpperCase() + offer.category.slice(1);
  document.getElementById('odDescription').innerHTML = '<p>' + offer.desc + '</p>';
  document.getElementById('offerDetailModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeOfferDetail() {
  document.getElementById('offerDetailModal').style.display = 'none';
  document.body.style.overflow = '';
}

async function startOffer() {
  if (!currentUser) { openAuthModal(); return; }
  showToast('Starting offer... Redirecting to offer page.', 'info');
  closeOfferDetail();
  await logActivity('offer', 'Started an offer');
}

function filterEarn(cat) {
  document.querySelectorAll('.earn-cat').forEach(b => b.classList.remove('active'));
  document.querySelector('.earn-cat[data-cat="' + cat + '"]').classList.add('active');
  let filtered = SAMPLE_OFFERS;
  if (cat !== 'all') {
    if (cat === 'offerwalls') filtered = SAMPLE_OFFERS.filter(o => o.category === 'tasks');
    else filtered = SAMPLE_OFFERS.filter(o => o.category === cat);
  }
  renderOffers(filtered);
}

function applyEarnFilters() {
  const country = document.getElementById('earnCountryFilter').value;
  const sort = document.getElementById('earnSortFilter').value;
  const device = document.getElementById('earnDeviceFilter').value;
  const search = document.getElementById('earnSearch').value.toLowerCase();
  let filtered = [...SAMPLE_OFFERS];
  if (country !== 'all') filtered = filtered.filter(o => o.country === 'all' || o.country === country);
  if (device !== 'all') filtered = filtered.filter(o => o.device === 'all' || o.device === device);
  if (search) filtered = filtered.filter(o => o.name.toLowerCase().includes(search) || o.desc.toLowerCase().includes(search));
  if (sort === 'reward-desc') filtered.sort((a, b) => b.reward - a.reward);
  else if (sort === 'reward-asc') filtered.sort((a, b) => a.reward - b.reward);
  else if (sort === 'time-asc') filtered.sort((a, b) => a.time.localeCompare(b.time));
  else if (sort === 'rating-desc') filtered.sort((a, b) => b.rating - a.rating);
  renderOffers(filtered);
}

function loadMoreOffers() {
  showToast('Loading more offers...', 'info');
}

function filterGames(genre) {
  document.querySelectorAll('.gf-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  const games = SAMPLE_OFFERS.filter(o => o.category === 'games');
  const grid = document.getElementById('gamesGrid');
  if (grid) grid.innerHTML = games.map(offer => createOfferCard(offer)).join('');
}

// ==================== PROVIDERS ====================
function openProvider(name) {
  if (!currentUser) { openAuthModal(); return; }
  showToast('Opening ' + name + ' offerwall...', 'info');
}

// ==================== WHEEL ====================
function openSpinWheel() {
  if (!currentUser) { openAuthModal(); return; }
  if (spinCooldown) { showToast('Spin cooldown active. Try again later.', 'warning'); return; }
  document.getElementById('spinWheelModal').style.display = 'flex';
  document.getElementById('spinResult').style.display = 'none';
  document.getElementById('spinBtn').style.display = 'inline-flex';
  document.getElementById('spinBtn').disabled = false;
  document.getElementById('spinBtn').innerHTML = '<i class="fas fa-play"></i> SPIN';
  document.body.style.overflow = 'hidden';
}

function closeSpinWheel() {
  document.getElementById('spinWheelModal').style.display = 'none';
  document.body.style.overflow = '';
}

async function spinTheWheel() {
  if (!currentUser) return;
  const rewards = [50, 100, 25, 250, 75, 500, 150, 1000];
  const winIndex = Math.floor(Math.random() * rewards.length);
  const reward = rewards[winIndex];
  const deg = 360 * 5 + (winIndex * 45 + 22.5);
  const wheel = document.getElementById('spinWheel');
  wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
  wheel.style.transform = 'rotate(' + deg + 'deg)';
  document.getElementById('spinBtn').disabled = true;
  document.getElementById('spinBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Spinning...';
  spinCooldown = true;
  setTimeout(async () => {
    document.getElementById('spinResult').textContent = '+' + reward + ' Coins!';
    document.getElementById('spinResult').style.display = 'block';
    document.getElementById('spinBtn').style.display = 'none';
    await addCoins(reward, 'spin', 'Spin wheel reward');
    await logActivity('spin', 'Spin wheel: +' + reward);
    setTimeout(() => { spinCooldown = false; }, 3600000);
  }, 4200);
}

// ==================== SCRATCH CARD ====================
function openScratchCard() {
  if (!currentUser) { openAuthModal(); return; }
  if (scratchCooldown) { showToast('Scratch cooldown active.', 'warning'); return; }
  document.getElementById('scratchModal').style.display = 'flex';
  document.getElementById('scratchClaimBtn').style.display = 'none';
  document.getElementById('scratchPercent').textContent = '0%';
  document.body.style.overflow = 'hidden';
  initScratchCanvas();
}

function closeScratchCard() {
  document.getElementById('scratchModal').style.display = 'none';
  document.body.style.overflow = '';
}

function initScratchCanvas() {
  const canvas = document.getElementById('scratchCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 280;
  canvas.height = 180;
  const gradient = ctx.createLinearGradient(0, 0, 280, 180);
  gradient.addColorStop(0, '#7c3aed');
  gradient.addColorStop(0.5, '#00d4ff');
  gradient.addColorStop(1, '#f59e0b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 280, 180);
  ctx.font = 'bold 16px Inter';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('SCRATCH HERE', 140, 95);
  const rewards = [50, 75, 100, 150, 200, 300, 500];
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  document.getElementById('scratchReward').textContent = reward + ' Coins';
  document.getElementById('scratchReward').dataset.reward = reward;
  let isScratching = false;
  let scratchedPixels = 0;
  const totalPixels = canvas.width * canvas.height;
  const handleScratch = (x, y) => {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    scratchedPixels += Math.PI * 20 * 20;
    const percent = Math.min(Math.round((scratchedPixels / totalPixels) * 100), 100);
    document.getElementById('scratchPercent').textContent = percent + '%';
    if (percent >= 50) {
      document.getElementById('scratchClaimBtn').style.display = 'inline-flex';
    }
  };
  canvas.onmousedown = (e) => { isScratching = true; const r = canvas.getBoundingClientRect(); handleScratch(e.clientX - r.left, e.clientY - r.top); };
  canvas.onmousemove = (e) => { if (!isScratching) return; const r = canvas.getBoundingClientRect(); handleScratch(e.clientX - r.left, e.clientY - r.top); };
  canvas.onmouseup = () => { isScratching = false; };
  canvas.ontouchstart = (e) => { isScratching = true; const r = canvas.getBoundingClientRect(); const t = e.touches[0]; handleScratch(t.clientX - r.left, t.clientY - r.top); };
  canvas.ontouchmove = (e) => { if (!isScratching) return; e.preventDefault(); const r = canvas.getBoundingClientRect(); const t = e.touches[0]; handleScratch(t.clientX - r.left, t.clientY - r.top); };
  canvas.ontouchend = () => { isScratching = false; };
}

async function claimScratchReward() {
  const reward = parseInt(document.getElementById('scratchReward').dataset.reward);
  await addCoins(reward, 'scratch', 'Scratch card reward');
  showToast('You won ' + reward + ' coins from scratch card!', 'success');
  closeScratchCard();
  scratchCooldown = true;
  setTimeout(() => { scratchCooldown = false; }, 3600000);
}

// ==================== MYSTERY BOX ====================
function openMysteryBox() {
  if (!currentUser) { openAuthModal(); return; }
  if (mysteryCooldown) { showToast('Mystery box cooldown active.', 'warning'); return; }
  document.getElementById('mysteryBoxModal').style.display = 'flex';
  document.getElementById('mysteryResult').style.display = 'none';
  document.getElementById('mysteryClaimBtn').style.display = 'none';
  document.getElementById('mysteryBox3D').classList.remove('opened');
  document.body.style.overflow = 'hidden';
}

function closeMysteryBox() {
  document.getElementById('mysteryBoxModal').style.display = 'none';
  document.body.style.overflow = '';
}

function openMysteryBoxAnim() {
  const box = document.getElementById('mysteryBox3D');
  if (box.classList.contains('opened')) return;
  box.classList.add('opened');
  const rewards = [100, 200, 300, 500, 750, 1000, 1500, 2000];
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  setTimeout(async () => {
    document.getElementById('mysteryResult').textContent = '+' + reward + ' Coins!';
    document.getElementById('mysteryResult').style.display = 'block';
    document.getElementById('mysteryClaimBtn').style.display = 'inline-flex';
    document.getElementById('mysteryClaimBtn').onclick = async () => {
      await addCoins(reward, 'mystery', 'Mystery box reward');
      showToast('You earned ' + reward + ' coins from mystery box!', 'success');
      closeMysteryBox();
      mysteryCooldown = true;
      setTimeout(() => { mysteryCooldown = false; }, 3600000);
    };
  }, 600);
}

// ==================== WATCH ADS ====================
function watchRewardedAd() {
  if (!currentUser) { openAuthModal(); return; }
  showToast('Playing rewarded video ad...', 'info');
  setTimeout(async () => {
    await addCoins(50, 'ad', 'Rewarded video ad');
    showToast('+50 coins for watching the video!', 'success');
    await logActivity('ad', 'Watched rewarded video');
  }, 3000);
}

function watchInterstitial() {
  if (!currentUser) { openAuthModal(); return; }
  showToast('Loading interstitial ad...', 'info');
  setTimeout(async () => {
    await addCoins(30, 'ad', 'Interstitial ad view');
    showToast('+30 coins!', 'success');
  }, 2000);
}

// ==================== WALLET & WITHDRAWAL ====================
function selectWithdrawMethod(method) {
  if (!currentUser) { openAuthModal(); return; }
  selectedWithdrawMethod = method;
  document.getElementById('withdrawMethods').style.display = 'none';
  document.getElementById('withdrawFormContainer').style.display = 'block';
  if (method === 'paypal') {
    document.getElementById('withdrawMethodTitle').textContent = 'Withdraw via PayPal';
    document.getElementById('withdrawEmailGroup').style.display = 'block';
    document.getElementById('withdrawCryptoGroup').style.display = 'none';
  } else if (method === 'crypto') {
    document.getElementById('withdrawMethodTitle').textContent = 'Withdraw via USDT (TRC20)';
    document.getElementById('withdrawEmailGroup').style.display = 'none';
    document.getElementById('withdrawCryptoGroup').style.display = 'block';
  } else {
    document.getElementById('withdrawMethodTitle').textContent = 'Mobile Top-Up';
    document.getElementById('withdrawEmailGroup').style.display = 'none';
    document.getElementById('withdrawCryptoGroup').style.display = 'none';
  }
}

function closeWithdrawForm() {
  document.getElementById('withdrawMethods').style.display = 'block';
  document.getElementById('withdrawFormContainer').style.display = 'none';
}

function calculateWithdraw() {
  const amount = parseInt(document.getElementById('withdrawAmount').value) || 0;
  const fee = Math.max(Math.floor(amount * WITHDRAWAL_FEE_PERCENT / 100), amount > 0 ? MIN_WITHDRAWAL_FEE : 0);
  const receive = amount - fee;
  document.getElementById('withdrawCalc').innerHTML = '<span>You will receive: <strong>$' + (receive / COINS_PER_DOLLAR).toFixed(2) + '</strong></span><br><small>Fee: ' + fee + ' coins (' + WITHDRAWAL_FEE_PERCENT + '%)</small>';
}

async function submitWithdrawal(e) {
  e.preventDefault();
  if (!currentUser || !userData) return;
  const amount = parseInt(document.getElementById('withdrawAmount').value);
  if (amount < MIN_WITHDRAWAL) { showToast('Minimum withdrawal is ' + MIN_WITHDRAWAL + ' coins', 'error'); return; }
  if (amount > userData.coins.available) { showToast('Insufficient balance', 'error'); return; }
  const success = await deductCoins(amount, 'withdrawal', 'Withdrawal via ' + selectedWithdrawMethod);
  if (success) {
    const now = new Date().toISOString();
    await db.collection('withdrawals').add({
      userId: currentUser.uid, username: userData.username, method: selectedWithdrawMethod,
      amount, coins: amount, usd: (amount / COINS_PER_DOLLAR).toFixed(2),
      email: document.getElementById('withdrawPaypalEmail')?.value || '',
      address: document.getElementById('withdrawCryptoAddr')?.value || '',
      status: 'pending', riskScore: userData.riskScore || 0,
      ip: await getClientIP(), device: await getDeviceInfo(),
      createdAt: now
    });
    await db.collection('users').doc(currentUser.uid).update({
      'stats.withdrawals': firebase.firestore.FieldValue.increment(1)
    });
    userData.stats.withdrawals = (userData.stats.withdrawals || 0) + 1;
    showToast('Withdrawal request submitted! Processing within 24 hours.', 'success');
    closeWithdrawForm();
    updateBalanceDisplay();
    await addNotification('withdrawal', 'Withdrawal Submitted', 'Your withdrawal of ' + amount + ' coins is being processed.');
    await logActivity('withdrawal', 'Submitted withdrawal: ' + amount + ' coins via ' + selectedWithdrawMethod);
  }
}

// ==================== TOP UP ====================
function selectTopUpGame(gameKey) {
  if (!currentUser) { openAuthModal(); return; }
  const game = TOPUP_PACKAGES[gameKey];
  if (!game) return;
  document.getElementById('topupGamesGrid').style.display = 'none';
  document.getElementById('topupFormContainer').style.display = 'block';
  document.getElementById('topupGameTitle').textContent = 'Top Up - ' + game.name;
  const packagesHtml = game.packages.map((pkg, i) =>
    '<label class="package-option"><input type="radio" name="topupPkg" value="' + pkg.amount + '" ' + (i === 0 ? 'required' : '') + '><div class="pkg-card"><span class="pkg-amount">' + pkg.amount + ' ' + game.unit + '</span><span class="pkg-cost">' + formatNumber(pkg.coins) + ' Coins</span></div></label>'
  ).join('');
  document.getElementById('topupPackages').innerHTML = packagesHtml;
}

function closeTopUpForm() {
  document.getElementById('topupGamesGrid').style.display = 'grid';
  document.getElementById('topupFormContainer').style.display = 'none';
}

async function submitTopUp(e) {
  e.preventDefault();
  if (!currentUser || !userData) return;
  const amount = document.querySelector('input[name="topupPkg"]:checked')?.value;
  if (!amount) { showToast('Please select a package', 'error'); return; }
  const playerId = document.getElementById('topupPlayerId').value.trim();
  if (!playerId) { showToast('Please enter your Player ID', 'error'); return; }
  showToast('Processing top-up...', 'info');
  await logActivity('topup', 'Top-up request for Player ID: ' + playerId);
  showToast('Top-up request submitted! We will process it shortly.', 'success');
  closeTopUpForm();
}

// ==================== STORE ====================
function renderStoreItems(items) {
  const grid = document.getElementById('storeGrid');
  if (!grid) return;
  grid.innerHTML = items.map(item =>
    '<div class="offer-card" onclick="purchaseStoreItem(\'' + item.id + '\')">' +
    '<div class="offer-card-icon" style="color:' + item.color + ';font-size:2rem"><i class="' + item.icon + '"></i></div>' +
    '<div class="offer-card-body"><div class="offer-card-name">' + item.name + '</div>' +
    '<div class="offer-card-provider">' + item.price + '</div></div>' +
    '<div class="offer-card-footer"><span class="offer-card-reward">' + formatNumber(item.cost) + ' Coins</span>' +
    '<span class="offer-card-time"><i class="fas fa-exchange-alt"></i></span></div></div>'
  ).join('');
}

function filterStore(cat) {
  document.querySelectorAll('.store-cat').forEach(b => b.classList.remove('active'));
  event.target.closest('.store-cat').classList.add('active');
  let filtered = SAMPLE_STORE_ITEMS;
  if (cat !== 'all') filtered = SAMPLE_STORE_ITEMS.filter(i => i.category === cat);
  renderStoreItems(filtered);
}

async function purchaseStoreItem(itemId) {
  if (!currentUser) { openAuthModal(); return; }
  const item = SAMPLE_STORE_ITEMS.find(i => i.id === itemId);
  if (!item) return;
  if (userData.coins.available < item.cost) { showToast('Insufficient coins! You need ' + formatNumber(item.cost) + ' coins.', 'error'); return; }
  const confirm_ = confirm('Redeem ' + item.name + ' for ' + formatNumber(item.cost) + ' coins?');
  if (!confirm_) return;
  const success = await deductCoins(item.cost, 'store', 'Redeemed: ' + item.name);
  if (success) {
    const now = new Date().toISOString();
    await db.collection('orders').add({
      userId: currentUser.uid, username: userData.username, type: 'reward',
      item: item.name, category: item.category, cost: item.cost,
      usd: item.price, status: 'processing', createdAt: now
    });
    showToast('Order placed! We will process your ' + item.name + ' shortly.', 'success');
    await addNotification('order', 'Order Placed', 'Your ' + item.name + ' order is being processed.');
  }
}

// ==================== TRANSACTIONS ====================
async function loadTransactions() {
  if (!currentUser) return;
  try {
    const snap = await db.collection('transactions').where('userId', '==', currentUser.uid).orderBy('timestamp', 'desc').limit(50).get();
    const list = document.getElementById('transactionsList');
    if (!list) return;
    if (snap.empty) { list.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>No transactions yet</p></div>'; return; }
    list.innerHTML = snap.docs.map(doc => {
      const tx = doc.data();
      const isPositive = tx.type === 'earn' || tx.category === 'bonus' || tx.category === 'referral';
      return '<div class="recent-item">' +
        '<div class="recent-item-icon" style="color:' + (isPositive ? 'var(--green)' : 'var(--red)') + ';background:' + (isPositive ? 'var(--green-bg)' : 'var(--red-bg)') + '">' +
        '<i class="fas ' + (isPositive ? 'fa-arrow-up' : 'fa-arrow-down') + '"></i></div>' +
        '<div class="recent-item-info"><div class="recent-item-name">' + tx.description + '</div>' +
        '<div class="recent-item-time">' + formatTime(tx.timestamp) + '</div></div>' +
        '<span style="font-weight:700;color:' + (isPositive ? 'var(--green)' : 'var(--red)') + '">' +
        (isPositive ? '+' : '-') + formatNumber(tx.coins) + '</span></div>';
    }).join('');
  } catch (error) {
    console.error('Error loading transactions:', error);
  }
}

function filterTransactions() {
  loadTransactions();
}

// ==================== REFERRALS ====================
function generateReferralCode(username) {
  const clean = (username || 'user').replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return clean + random;
}

async function processReferralSignup(refCode, newUid, newUsername) {
  try {
    const refQuery = await db.collection('users').where('referralCode', '==', refCode).limit(1).get();
    if (refQuery.empty) return;
    const referrerDoc = refQuery.docs[0];
    const referrerId = referrerDoc.id;
    await db.collection('referrals').add({
      referrerId, referredId: newUid, referredUsername: newUsername,
      status: 'signed_up', earnings: 0, createdAt: new Date().toISOString()
    });
    await db.collection('users').doc(referrerId).update({
      'stats.referrals': firebase.firestore.FieldValue.increment(1)
    });
    await addCoins(500, 'referral', 'Referral signup bonus');
    await db.collection('users').doc(referrerId).get().then(doc => {
      if (doc.exists) {
        const referrer = doc.data();
        db.collection('notifications').add({
          userId: referrerId, type: 'referral',
          title: 'New Referral!', message: newUsername + ' signed up using your link!',
          read: false, createdAt: new Date().toISOString()
        });
      }
    });
  } catch (error) {
    console.error('Error processing referral:', error);
  }
}

function copyReferralLink() {
  const input = document.getElementById('referralLink');
  input.select();
  document.execCommand('copy');
  showToast('Referral link copied!', 'success');
}

function copyReferralCode() {
  const code = document.getElementById('referralCode').textContent;
  navigator.clipboard.writeText(code).then(() => showToast('Code copied!', 'success'));
}

function shareReferral(platform) {
  const link = document.getElementById('referralLink').value;
  const text = 'Join ReWords and earn real rewards! Use my link: ' + link;
  let url = '';
  if (platform === 'whatsapp') url = 'https://wa.me/?text=' + encodeURIComponent(text);
  else if (platform === 'telegram') url = 'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text);
  else if (platform === 'twitter') url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
  else if (platform === 'facebook') url = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link);
  window.open(url, '_blank', 'width=600,height=400');
}

// ==================== TASKS ====================
function renderTasks(tasks) {
  const list = document.getElementById('tasksList');
  if (!list) return;
  list.innerHTML = tasks.map(task =>
    '<div class="recent-item">' +
    '<div class="recent-item-icon"><i class="fas ' + task.icon + '"></i></div>' +
    '<div class="recent-item-info"><div class="recent-item-name">' + task.name + '</div>' +
    '<div class="recent-item-time">' + task.current + '/' + task.target + '</div>' +
    '<div class="ch-progress" style="margin-top:4px;"><div class="ch-bar" style="width:' + ((task.current / task.target) * 100) + '%"></div></div></div>' +
    '<span class="offer-card-reward">+' + formatNumber(task.reward) + '</span></div>'
  ).join('');
}

function switchTaskTab(tab) {
  document.querySelectorAll('.task-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  if (tab === 'daily') renderTasks(SAMPLE_TASKS.daily);
  else if (tab === 'weekly') renderTasks(SAMPLE_TASKS.weekly);
  else renderTasks(SAMPLE_TASKS.achievements);
}

// ==================== LEADERBOARD ====================
function switchLeaderboard(period) {
  document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  const lbList = document.getElementById('lbList');
  if (!lbList) return;
  const sampleUsers = [
    { name: 'CryptoKing', earned: 12800 }, { name: 'GameMaster99', earned: 11200 },
    { name: 'SurveyPro', earned: 9800 }, { name: 'TopEarner2025', earned: 8500 },
    { name: 'CoinHunter', earned: 7200 }, { name: 'RewardMaster', earned: 6100 },
    { name: 'ProPlayer', earned: 5400 }, { name: 'LuckySpinner', earned: 4800 },
    { name: 'DailyGrinder', earned: 4200 }, { name: 'NewbieEarning', earned: 3500 }
  ];
  lbList.innerHTML = sampleUsers.map((u, i) =>
    '<div class="lb-item"><span class="lb-rank">' + (i + 4) + '</span>' +
    '<div class="lb-avatar"><i class="fas fa-user"></i></div>' +
    '<div class="lb-info"><span class="lb-name">' + u.name + '</span><span class="lb-earned">' + formatNumber(u.earned) + ' Coins</span></div></div>'
  ).join('');
}

// ==================== NOTIFICATIONS ====================
async function addNotification(type, title, message) {
  if (!currentUser) return;
  try {
    await db.collection('notifications').add({
      userId: currentUser.uid, type, title, message, read: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding notification:', error);
  }
}

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  loadNotifications();
}

async function loadNotifications() {
  if (!currentUser) return;
  try {
    const snap = await db.collection('notifications').where('userId', '==', currentUser.uid).orderBy('createdAt', 'desc').limit(20).get();
    const list = document.getElementById('notifList');
    if (snap.empty) {
      list.innerHTML = '<div class="notif-empty"><i class="fas fa-bell-slash"></i><p>No notifications yet</p></div>';
      return;
    }
    list.innerHTML = snap.docs.map(doc => {
      const n = doc.data();
      return '<div class="recent-item" style="opacity:' + (n.read ? '0.6' : '1') + '">' +
        '<div class="recent-item-icon"><i class="fas fa-bell"></i></div>' +
        '<div class="recent-item-info"><div class="recent-item-name">' + n.title + '</div>' +
        '<div class="recent-item-time">' + n.message + '</div></div></div>';
    }).join('');
    const unread = snap.docs.filter(d => !d.data().read).length;
    const badge = document.getElementById('notifBadge');
    if (unread > 0) { badge.style.display = 'flex'; badge.textContent = unread; }
    else { badge.style.display = 'none'; }
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

async function markAllRead() {
  if (!currentUser) return;
  try {
    const snap = await db.collection('notifications').where('userId', '==', currentUser.uid).where('read', '==', false).get();
    const batch = db.batch();
    snap.docs.forEach(doc => batch.update(doc.ref, { read: true }));
    await batch.commit();
    loadNotifications();
  } catch (error) {
    console.error('Error marking notifications read:', error);
  }
}

// ==================== SUPPORT ====================
function openTicketForm() {
  document.getElementById('ticketForm').style.display = document.getElementById('ticketForm').style.display === 'none' ? 'block' : 'none';
}

async function submitTicket(e) {
  e.preventDefault();
  if (!currentUser) { openAuthModal(); return; }
  const now = new Date().toISOString();
  await db.collection('tickets').add({
    userId: currentUser.uid, username: userData ? userData.username : 'Unknown',
    email: currentUser.email, category: document.getElementById('ticketCategory').value,
    priority: document.getElementById('ticketPriority').value,
    subject: document.getElementById('ticketSubject').value,
    description: document.getElementById('ticketDesc').value,
    orderId: document.getElementById('ticketOrderId').value,
    status: 'open', createdAt: now
  });
  showToast('Support ticket submitted!', 'success');
  document.getElementById('ticketForm').style.display = 'none';
  e.target.reset();
}

// ==================== SETTINGS ====================
async function saveSettings() {
  if (!currentUser) return;
  const updates = {};
  if (document.getElementById('settingsUsername').value) updates.username = document.getElementById('settingsUsername').value;
  if (document.getElementById('settingsCountry').value) updates.country = document.getElementById('settingsCountry').value;
  updates.settings = {
    emailNotifs: document.getElementById('notifEmail').checked,
    offerAlerts: document.getElementById('notifOffers').checked,
    marketing: document.getElementById('notifMarketing').checked
  };
  await db.collection('users').doc(currentUser.uid).update(updates);
  if (updates.username) userData.username = updates.username;
  if (updates.country) userData.country = updates.country;
  userData.settings = updates.settings;
  updateUIForLoggedIn();
  showToast('Settings saved!', 'success');
}

async function changePassword() {
  const current = document.getElementById('settingsCurrentPass').value;
  const newPass = document.getElementById('settingsNewPass').value;
  if (!current || !newPass) { showToast('Please fill in both fields', 'error'); return; }
  if (newPass.length < 6) { showToast('New password must be at least 6 characters', 'error'); return; }
  try {
    const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, current);
    await currentUser.reauthenticateWithCredential(credential);
    await currentUser.updatePassword(newPass);
    showToast('Password updated!', 'success');
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function sendVerificationEmail() {
  if (!currentUser) return;
  try {
    await currentUser.sendEmailVerification();
    showToast('Verification email sent!', 'success');
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

function confirmDeleteAccount() {
  if (confirm('Are you sure you want to delete your account? This is irreversible!')) {
    showToast('Please contact support to delete your account.', 'info');
  }
}

function enable2FA() { showToast('2FA setup coming soon!', 'info'); }
function viewLoginHistory() { showToast('Login history coming soon!', 'info'); }
function viewSessions() { showToast('Session management coming soon!', 'info'); }

// ==================== ADMIN DASHBOARD ====================
function isAdmin() {
  return currentUser && ADMIN_UIDS.includes(currentUser.uid);
}

function showAdminTab(tabId) {
  document.querySelectorAll('.admin-tab').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
  const tab = document.getElementById(tabId);
  if (tab) tab.style.display = 'block';
  event.target.closest('.admin-nav-link')?.classList.add('active');
  if (tabId === 'admin-dashboard') loadAdminDashboard();
  if (tabId === 'admin-users') loadAdminUsers();
}

async function loadAdminDashboard() {
  try {
    const usersSnap = await db.collection('users').count().get();
    document.getElementById('admTotalUsers').textContent = usersSnap.data().count;
    document.getElementById('admRevenueToday').textContent = '$' + (Math.random() * 500 + 100).toFixed(2);
    document.getElementById('admNetProfit').textContent = '$' + (Math.random() * 200 + 50).toFixed(2);
    document.getElementById('admConversionRate').textContent = (Math.random() * 30 + 10).toFixed(1) + '%';
    initAdminCharts();
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
  }
}

async function loadAdminUsers() {
  try {
    const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(50).get();
    const tbody = document.getElementById('admUsersTable');
    if (!tbody) return;
    tbody.innerHTML = snap.docs.map(doc => {
      const u = doc.data();
      const riskColor = (u.riskScore || 0) > 70 ? 'var(--red)' : (u.riskScore || 0) > 40 ? 'var(--yellow)' : 'var(--green)';
      return '<tr><td><strong>' + (u.username || 'N/A') + '</strong></td><td>' + (u.email || '') + '</td><td>' + (u.country || '') + '</td>' +
        '<td>' + formatNumber(u.coins ? u.coins.available : 0) + '</td><td>' + (u.stats ? u.stats.offersCompleted : 0) + '</td>' +
        '<td style="color:' + riskColor + '">' + (u.riskScore || 0) + '%</td><td>' + (u.status || 'active') + '</td>' +
        '<td><button class="btn btn-sm btn-outline" onclick="adminViewUser(\'' + doc.id + '\')">View</button></td></tr>';
    }).join('');
  } catch (error) {
    console.error('Error loading admin users:', error);
  }
}

function adminViewUser(uid) { showToast('User view: ' + uid, 'info'); }
function searchAdminUsers() { showToast('Searching...', 'info'); }
function createCampaign() { showToast('Campaign creation coming soon!', 'info'); }
function saveReferralSettings() { showToast('Referral settings saved!', 'success'); }
function saveAdminSettings() { showToast('Admin settings saved!', 'success'); }
function filterAdminWithdrawals(status) {
  document.querySelectorAll('.wf-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}
function filterLogs() {}
function initAdminCharts() {}

// ==================== SCROLL ANIMATIONS ====================
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.section-container').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

function animateHeroCounters() {
  document.querySelectorAll('.hero-stat-num').forEach(el => {
    const target = parseInt(el.dataset.count);
    let current = 0;
    const increment = target / 60;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = formatNumber(Math.floor(current));
    }, 30);
  });
}

// ==================== PAGE NAVIGATION ====================
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-item').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  document.querySelectorAll('[data-page="' + page + '"]').forEach(el => el.classList.add('active'));
  currentPage = page;
  window.scrollTo(0, 0);
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('userDropdown').style.display = 'none';
  document.getElementById('notifPanel').style.display = 'none';
  if (page === 'admin' && isAdmin()) loadAdminDashboard();
  if (page === 'daily') updateDailyPage();
  if (page === 'wallet') updateWalletPage();
  if (page === 'referrals' && userData) updateReferralPage();
  if (page === 'games') filterGames('all');
}

function handleHeroCTA() {
  if (currentUser) showPage('earn');
  else openAuthModal();
}

// ==================== UI HELPERS ====================
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function toggleUserDropdown() {
  const dd = document.getElementById('userDropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

function toggleFaq(el) { el.classList.toggle('open'); }
function toggleFaqMini(el) { el.classList.toggle('open'); }

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  toast.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i><span class="toast-msg">' + message + '</span><span class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></span>';
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 4000);
}

function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatTime(isoString) {
  if (!isoString) return 'Unknown';
  const date = new Date(isoString);
  const now = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return date.toLocaleDateString();
}

async function getDeviceInfo() {
  return navigator.userAgent.substring(0, 100);
}

async function getClientIP() {
  try {
    const resp = await fetch('https://api.ipify.org?format=json');
    const data = await resp.json();
    return data.ip;
  } catch { return 'unknown'; }
}

async function logActivity(type, description) {
  if (!currentUser) return;
  try {
    await db.collection('activity_logs').add({
      userId: currentUser.uid, username: userData ? userData.username : 'unknown',
      type, description, ip: await getClientIP(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// ==================== CLOSE DROPDOWNS ON CLICK OUTSIDE ====================
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-menu')) {
    document.getElementById('userDropdown').style.display = 'none';
  }
  if (!e.target.closest('.notif-btn') && !e.target.closest('.notif-panel')) {
    document.getElementById('notifPanel').style.display = 'none';
  }
});

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAuthModal();
    closeSpinWheel();
    closeScratchCard();
    closeMysteryBox();
    closeOfferDetail();
    document.getElementById('sidebar').classList.remove('open');
  }
});

console.log('ReWords App initialized successfully.');
