/**
 * Rewards - Main User-Side Application
 * Firebase-powered rewards & earning platform
 * ============================================================
 */

// ============================================================
// 1. FIREBASE INITIALIZATION & SERVICE REFERENCES
// ============================================================

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

db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  console.warn("Firestore persistence error:", err.code);
});

// ============================================================
// 2. APP STATE
// ============================================================

const AppState = {
  currentUser: null,
  userProfile: null,
  wallet: {
    available: 0,
    pending: 0,
    locked: 0,
    lifetimeEarned: 0,
    lifetimeSpent: 0
  },
  offers: [],
  filteredOffers: [],
  rewards: [],
  transactions: [],
  notifications: [],
  settings: {
    theme: "light",
    language: "en",
    pushEnabled: false,
    emailNotifications: true,
    twoFactorEnabled: false
  },
  referralStats: {
    totalReferrals: 0,
    totalEarnings: 0,
    milestones: []
  },
  leaderboard: {
    daily: [],
    weekly: [],
    monthly: []
  },
  dailyRewards: {
    streak: 0,
    lastClaim: null,
    claimedDays: [],
    streakFreeze: false
  },
  tasks: {
    daily: [],
    weekly: []
  },
  challenges: {
    daily: [],
    weekly: [],
    monthly: []
  },
  surveys: [],
  ads: {
    watchedToday: 0,
    dailyLimit: 10,
    lastWatch: null
  },
  tickets: [],
  sessionHistory: [],
  devices: [],
  currentOfferPage: 0,
  offersPerPage: 20,
  isLoading: false,
  currentPage: "home",
  previousPage: null,
  searchQuery: "",
  activeFilters: {
    provider: "all",
    category: "all",
    country: "all",
    device: "all",
    sortBy: "popular",
    minReward: 0,
    maxReward: Infinity
  },
  pendingPostbacks: [],
  fraudScore: 0,
  deviceFingerprint: null,
  ip: null,
  initialized: false,
  modals: {},
  toasts: [],
  infiniteScrollOffset: 0,
  pullRefreshActive: false,
  adminEmail: "kenven@admin.com",
  COIN_RATE: 10000
};

// ============================================================
// 3. AUTHENTICATION MODULE
// ============================================================

const AuthModule = {
  initAuth() {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        AppState.currentUser = user;
        try {
          await this.loadUserProfile(user.uid);
          if (this.checkAdminStatus()) {
            document.body.classList.add("admin-user");
          }
          await WalletModule.loadWallet(user.uid);
          await NotificationsModule.loadNotifications(user.uid);
          await DailyRewardsModule.loadDailyRewards(user.uid);
          await TasksModule.loadTasks();
          await ChallengesModule.loadChallenges();
          UIHelpers.hideLoading();
          this.onAuthenticated();
        } catch (error) {
          console.error("Auth state error:", error);
          UIHelpers.showToast("error", "Error", "Failed to load user data.");
        }
      } else {
        AppState.currentUser = null;
        AppState.wallet = {
          available: 0, pending: 0, locked: 0,
          lifetimeEarned: 0, lifetimeSpent: 0
        };
        this.onUnauthenticated();
      }
    });
  },

  async login(email, password) {
    try {
      UIHelpers.showLoading();
      if (!email || !password) {
        throw new Error("Email and password are required.");
      }
      if (!this.validateEmail(email)) {
        throw new Error("Please enter a valid email address.");
      }
      const result = await auth.signInWithEmailAndPassword(email, password);
      await AntiFraudModule.logFraudEvent("login_attempt", {
        uid: result.user.uid,
        success: true,
        timestamp: Date.now()
      });
      UIHelpers.hideLoading();
      UIHelpers.showToast("success", "Welcome back!",
        "You have been logged in successfully.");
      NavigationModule.navigateTo("home");
      return result.user;
    } catch (error) {
      UIHelpers.hideLoading();
      await AntiFraudModule.logFraudEvent("login_attempt", {
        email: email,
        success: false,
        error: error.code,
        timestamp: Date.now()
      });
      const msg = this.getAuthErrorMessage(error.code);
      UIHelpers.showToast("error", "Login Failed", msg);
      throw error;
    }
  },

  async register(email, password, username, referralCode = "") {
    try {
      UIHelpers.showLoading();
      if (!email || !password || !username) {
        throw new Error("Email, password, and username are required.");
      }
      if (!this.validateEmail(email)) {
        throw new Error("Please enter a valid email address.");
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }
      if (username.length < 3 || username.length > 20) {
        throw new Error("Username must be between 3 and 20 characters.");
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error("Username can only contain letters, numbers, and underscores.");
      }

      const usernameCheck = await db.collection("users")
        .where("username", "==", username.toLowerCase())
        .limit(1).get();
      if (!usernameCheck.empty) {
        throw new Error("This username is already taken.");
      }

      const result = await auth.createUserWithEmailAndPassword(email, password);
      const userId = result.user.uid;
      const referredBy = referralCode
        ? await this.resolveReferralCode(referralCode)
        : null;

      await this.createUserProfile(result.user, {
        username: username.toLowerCase(),
        email: email,
        referredBy: referredBy,
        referralCode: this.generateReferralCode(userId),
        role: "user",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await WalletModule.addCoins(500, "bonus", "Welcome bonus", null);
      if (referredBy) {
        await ReferralsModule.processReferral(referredBy, userId);
      }
      await this.sendVerificationEmail();
      await AntiFraudModule.logFraudEvent("registration", {
        uid: userId,
        timestamp: Date.now(),
        fingerprint: AntiFraudModule.getDeviceFingerprint()
      });

      UIHelpers.hideLoading();
      UIHelpers.showToast("success", "Account Created!",
        "Welcome to Rewards! You received 500 coins.");
      return result.user;
    } catch (error) {
      UIHelpers.hideLoading();
      const msg = this.getAuthErrorMessage(error.code || "unknown");
      UIHelpers.showToast("error", "Registration Failed", msg);
      throw error;
    }
  },

  async logout() {
    try {
      const userId = AppState.currentUser ? AppState.currentUser.uid : null;
      await AntiFraudModule.logFraudEvent("logout", {
        uid: userId, timestamp: Date.now()
      });
      await auth.signOut();
      AppState.userProfile = null;
      AppState.wallet = {
        available: 0, pending: 0, locked: 0,
        lifetimeEarned: 0, lifetimeSpent: 0
      };
      AppState.notifications = [];
      UIHelpers.showToast("info", "Logged Out", "You have been logged out.");
      NavigationModule.navigateTo("home");
    } catch (error) {
      console.error("Logout error:", error);
      UIHelpers.showToast("error", "Error", "Failed to log out.");
    }
  },

  async resetPassword(email) {
    try {
      if (!email) throw new Error("Please enter your email address.");
      if (!this.validateEmail(email)) {
        throw new Error("Please enter a valid email address.");
      }
      await auth.sendPasswordResetEmail(email);
      UIHelpers.showToast("success", "Email Sent",
        "Password reset email sent. Check your inbox.");
    } catch (error) {
      UIHelpers.showToast("error", "Reset Failed",
        this.getAuthErrorMessage(error.code));
      throw error;
    }
  },

  async loadUserProfile(userId) {
    try {
      const doc = await db.collection("users").doc(userId).get();
      if (doc.exists) {
        AppState.userProfile = { id: doc.id, ...doc.data() };
        return AppState.userProfile;
      }
      console.warn("User profile not found, creating one...");
      await this.createUserProfile(auth.currentUser, {});
      return await this.loadUserProfile(userId);
    } catch (error) {
      console.error("Error loading user profile:", error);
      throw error;
    }
  },

  async createUserProfile(user, data) {
    try {
      const profileData = {
        uid: user.uid,
        email: user.email || data.email || "",
        username: data.username || user.displayName || "",
        displayName: data.username || user.displayName || "",
        photoURL: user.photoURL || null,
        role: data.role || "user",
        referredBy: data.referredBy || null,
        referralCode: data.referralCode || this.generateReferralCode(user.uid),
        totalEarned: 0,
        totalSpent: 0,
        totalReferrals: 0,
        level: 1,
        xp: 0,
        badges: [],
        country: "",
        device: "",
        isVerified: false,
        isBanned: false,
        createdAt: data.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        ip: await AntiFraudModule.getIP(),
        fingerprint: AntiFraudModule.getDeviceFingerprint()
      };
      await db.collection("users").doc(user.uid).set(profileData, { merge: true });
      AppState.userProfile = { id: user.uid, ...profileData };
      return AppState.userProfile;
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  },

  async updateUserProfile(data) {
    try {
      if (!AppState.currentUser) throw new Error("Not authenticated.");
      const updateData = {
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection("users")
        .doc(AppState.currentUser.uid).update(updateData);
      AppState.userProfile = { ...AppState.userProfile, ...updateData };
      UIHelpers.showToast("success", "Updated", "Profile updated successfully.");
      return AppState.userProfile;
    } catch (error) {
      console.error("Error updating profile:", error);
      UIHelpers.showToast("error", "Error", "Failed to update profile.");
      throw error;
    }
  },

  async verifyEmail() {
    try {
      if (!AppState.currentUser) throw new Error("Not authenticated.");
      await AppState.currentUser.sendEmailVerification();
      UIHelpers.showToast("success", "Email Sent",
        "Verification email sent. Check your inbox.");
    } catch (error) {
      UIHelpers.showToast("error", "Error",
        "Failed to send verification email.");
      throw error;
    }
  },

  async sendVerificationEmail() {
    try {
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        await auth.currentUser.sendEmailVerification();
      }
    } catch (error) {
      console.warn("Could not send verification email:", error);
    }
  },

  checkAdminStatus() {
    if (AppState.currentUser &&
      AppState.currentUser.email === AppState.adminEmail) {
      return true;
    }
    return false;
  },

  async resolveReferralCode(code) {
    try {
      const snapshot = await db.collection("users")
        .where("referralCode", "==", code).limit(1).get();
      return snapshot.empty ? null : snapshot.docs[0].id;
    } catch (error) {
      console.error("Error resolving referral code:", error);
      return null;
    }
  },

  generateReferralCode(uid) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  getAuthErrorMessage(code) {
    const messages = {
      "auth/email-already-in-use": "This email is already registered.",
      "auth/invalid-email": "Invalid email address.",
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/weak-password": "Password is too weak.",
      "auth/too-many-requests": "Too many attempts. Try again later.",
      "auth/network-request-failed": "Network error. Check your connection.",
      "auth/user-disabled": "This account has been disabled.",
      "auth/operation-not-allowed": "Sign-in method not enabled.",
      "auth/invalid-credential": "Invalid credentials. Check email and password."
    };
    return messages[code] || "An error occurred. Please try again.";
  },

  onAuthenticated() {
    document.body.classList.add("authenticated");
    document.body.classList.remove("unauthenticated");
    this.updateUIForAuth(true);
  },

  onUnauthenticated() {
    document.body.classList.remove("authenticated");
    document.body.classList.add("unauthenticated");
    this.updateUIForAuth(false);
  },

  updateUIForAuth(isAuth) {
    document.querySelectorAll("[data-auth]").forEach((el) => {
      el.style.display = isAuth ? "" : "none";
    });
    document.querySelectorAll("[data-guest]").forEach((el) => {
      el.style.display = isAuth ? "none" : "";
    });
  }
};
// ============================================================
// 5. WALLET MODULE
// ============================================================

const WalletModule = {
  async loadWallet(userId) {
    try {
      if (!userId) return;
      const doc = await db.collection("wallets").doc(userId).get();
      if (doc.exists) {
        AppState.wallet = doc.data();
      } else {
        const defaultWallet = {
          available: 0, pending: 0, locked: 0,
          lifetimeEarned: 0, lifetimeSpent: 0,
          currency: "USD",
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection("wallets").doc(userId).set(defaultWallet);
        AppState.wallet = defaultWallet;
      }
      this.updateWalletUI();
      return AppState.wallet;
    } catch (error) {
      console.error("Error loading wallet:", error);
      throw error;
    }
  },

  getBalance(type = "available") {
    return AppState.wallet[type] || 0;
  },

  async addCoins(amount, type, description, reference) {
    try {
      if (!AppState.currentUser) throw new Error("Not authenticated.");
      if (amount <= 0) throw new Error("Amount must be positive.");
      const userId = AppState.currentUser.uid;
      const walletRef = db.collection("wallets").doc(userId);
      const ledgerRef = db.collection("ledger").doc();
      await db.runTransaction(async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        const currentData = walletDoc.exists ? walletDoc.data() : {
          available: 0, pending: 0, locked: 0,
          lifetimeEarned: 0, lifetimeSpent: 0
        };
        let newAvailable = currentData.available || 0;
        let newPending = currentData.pending || 0;
        let newLifetimeEarned = currentData.lifetimeEarned || 0;
        if (type === "pending") { newPending += amount; }
        else { newAvailable += amount; }
        newLifetimeEarned += amount;
        const updateData = {
          available: newAvailable, pending: newPending,
          lifetimeEarned: newLifetimeEarned,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (walletDoc.exists) {
          transaction.update(walletRef, updateData);
        } else {
          transaction.set(walletRef, { ...currentData, ...updateData });
        }
        transaction.set(ledgerRef, {
          userId, type: "credit", amount, balanceType: type,
          description, reference,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      await this.loadWallet(userId);
      UIHelpers.updateCoinDisplay();
      return true;
    } catch (error) {
      console.error("Error adding coins:", error);
      throw error;
    }
  },

  async deductCoins(amount, type, description, reference) {
    try {
      if (!AppState.currentUser) throw new Error("Not authenticated.");
      if (amount <= 0) throw new Error("Amount must be positive.");
      const userId = AppState.currentUser.uid;
      const walletRef = db.collection("wallets").doc(userId);
      const ledgerRef = db.collection("ledger").doc();
      await db.runTransaction(async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        if (!walletDoc.exists) throw new Error("Wallet not found.");
        const currentData = walletDoc.data();
        const currentBalance = currentData[type] || 0;
        if (currentBalance < amount) {
          throw new Error("Insufficient balance.");
        }
        const updateData = {};
        updateData[type] = currentBalance - amount;
        updateData.lifetimeSpent = (currentData.lifetimeSpent || 0) + amount;
        updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        transaction.update(walletRef, updateData);
        transaction.set(ledgerRef, {
          userId, type: "debit", amount, balanceType: type,
          description, reference,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      await this.loadWallet(userId);
      UIHelpers.updateCoinDisplay();
      return true;
    } catch (error) {
      console.error("Error deducting coins:", error);
      throw error;
    }
  },

  async freezeCoins(amount, reference) {
    try {
      if (!AppState.currentUser) throw new Error("Not authenticated.");
      const userId = AppState.currentUser.uid;
      const walletRef = db.collection("wallets").doc(userId);
      await db.runTransaction(async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        if (!walletDoc.exists) throw new Error("Wallet not found.");
        const data = walletDoc.data();
        if ((data.available || 0) < amount) {
          throw new Error("Insufficient available balance.");
        }
        transaction.update(walletRef, {
          available: (data.available || 0) - amount,
          locked: (data.locked || 0) + amount,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      await this.loadWallet(userId);
      return true;
    } catch (error) {
      console.error("Error freezing coins:", error);
      throw error;
    }
  },

  async unfreezeCoins(amount, reference) {
    try {
      if (!AppState.currentUser) throw new Error("Not authenticated.");
      const userId = AppState.currentUser.uid;
      const walletRef = db.collection("wallets").doc(userId);
      await db.runTransaction(async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        if (!walletDoc.exists) throw new Error("Wallet not found.");
        const data = walletDoc.data();
        if ((data.locked || 0) < amount) {
          throw new Error("Insufficient locked balance.");
        }
        transaction.update(walletRef, {
          available: (data.available || 0) + amount,
          locked: (data.locked || 0) - amount,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      await this.loadWallet(userId);
      return true;
    } catch (error) {
      console.error("Error unfreezing coins:", error);
      throw error;
    }
  },

  async getLedgerEntries(userId, limit = 20, startAfter = null) {
    try {
      let query = db.collection("ledger")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(limit);
      if (startAfter) { query = query.startAfter(startAfter); }
      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({
        id: doc.id, ...doc.data()
      }));
    } catch (error) {
      console.error("Error fetching ledger entries:", error);
      return [];
    }
  },

  async calculateLifetimeEarned() {
    return AppState.wallet ? (AppState.wallet.lifetimeEarned || 0) : 0;
  },

  async calculateLifetimeSpent() {
    return AppState.wallet ? (AppState.wallet.lifetimeSpent || 0) : 0;
  },

  updateWalletUI() {
    const availableEl = document.getElementById("balance-available");
    const pendingEl = document.getElementById("balance-pending");
    const lockedEl = document.getElementById("balance-locked");
    if (availableEl) {
      UIHelpers.animateNumber(availableEl, AppState.wallet.available);
    }
    if (pendingEl) {
      UIHelpers.animateNumber(pendingEl, AppState.wallet.pending);
    }
    if (lockedEl) {
      UIHelpers.animateNumber(lockedEl, AppState.wallet.locked);
    }
    document.querySelectorAll(".coin-balance").forEach((el) => {
      el.textContent = UIHelpers.formatCoins(AppState.wallet.available);
    });
    const usdEl = document.getElementById("balance-usd");
    if (usdEl) {
      usdEl.textContent = UIHelpers.formatUSD(
        AppState.wallet.available / AppState.COIN_RATE
      );
    }
  }
};

// ============================================================
// 6. OFFERS MODULE
// ============================================================

const OffersModule = {
  async loadOffers(options = {}) {
    try {
      const limit = options.limit || AppState.offersPerPage;
      const append = options.append || false;
      let query = db.collection("offers").where("active", "==", true);
      if (AppState.activeFilters.category !== "all") {
        query = query.where("category", "==",
          AppState.activeFilters.category);
      }
      if (AppState.activeFilters.provider !== "all") {
        query = query.where("provider", "==",
          AppState.activeFilters.provider);
      }
      query = query.orderBy("reward", "desc").limit(limit);
      const snapshot = await query.get();
      const offers = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() })
      );
      if (append) {
        AppState.offers = [...AppState.offers, ...offers];
      } else {
        AppState.offers = offers;
      }
      AppState.filteredOffers = [...AppState.offers];
      this.renderOffers(AppState.filteredOffers, "offers-grid");
      await this.loadOfferProviders();
      return AppState.offers;
    } catch (error) {
      console.error("Error loading offers:", error);
      UIHelpers.showToast("error", "Error", "Failed to load offers.");
      return [];
    }
  },

  renderOffers(offers, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (offers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i data-feather="inbox"></i>
          <h3>No offers found</h3>
          <p>Try adjusting your filters.</p>
        </div>`;
      return;
    }
    container.innerHTML = offers
      .map((offer) => this.createOfferCard(offer)).join("");
    UIHelpers.initTooltips();
  },

  createOfferCard(offer) {
    const rewardCoins = offer.reward || 0;
    const rewardUSD = (rewardCoins / AppState.COIN_RATE).toFixed(2);
    const categoryIcon = this.getCategoryIcon(offer.category);
    const estimatedTime = offer.estimatedTime || "5-10 min";
    const provider = offer.provider || "Unknown";
    return `
      <div class="offer-card" data-offer-id="${offer.id}"
        data-category="${offer.category || ""}">
        <div class="offer-card-header">
          <div class="offer-category-badge">
            <i data-feather="${categoryIcon}"></i>
            <span>${offer.category || "General"}</span>
          </div>
          <div class="offer-provider">${provider}</div>
        </div>
        <div class="offer-card-body">
          <div class="offer-icon">
            ${offer.icon
              ? '<img src="' + offer.icon + '" alt="" loading="lazy" />'
              : '<i data-feather="gift"></i>'}
          </div>
          <h3 class="offer-title">${offer.title || "Untitled Offer"}</h3>
          <p class="offer-description">
            ${(offer.description || "").substring(0, 100)}
            ${(offer.description || "").length > 100 ? "..." : ""}
          </p>
          <div class="offer-meta">
            <span class="offer-time">
              <i data-feather="clock"></i> ${estimatedTime}</span>
            <span class="offer-difficulty badge-${offer.difficulty || "easy"}">
              ${(offer.difficulty || "easy").charAt(0).toUpperCase() +
                (offer.difficulty || "easy").slice(1)}
            </span>
          </div>
        </div>
        <div class="offer-card-footer">
          <div class="offer-reward">
            <span class="reward-coins">
              ${UIHelpers.formatCoins(rewardCoins)}</span>
            <span class="reward-usd">($${rewardUSD})</span>
          </div>
          <button class="btn btn-primary btn-sm start-offer-btn"
            data-offer-id="${offer.id}">Earn Now</button>
        </div>
      </div>`;
  },

  getCategoryIcon(category) {
    const icons = {
      "app-install": "download", "sign-up": "user-plus",
      "survey": "bar-chart-2", "shopping": "shopping-cart",
      "finance": "dollar-sign", "gaming": "gamepad",
      "entertainment": "play", "education": "book-open",
      "health": "heart", "travel": "map",
      "social": "share-2", "food": "coffee"
    };
    return icons[category] || "gift";
  },

  async startOffer(offerId) {
    try {
      if (!AppState.currentUser) {
        UIHelpers.showToast("warning", "Login Required",
          "Please log in to start offers.");
        NavigationModule.navigateTo("login");
        return;
      }
      const offer = AppState.offers.find((o) => o.id === offerId);
      if (!offer) {
        UIHelpers.showToast("error", "Error", "Offer not found.");
        return;
      }
      await db.collection("offer_clicks").add({
        userId: AppState.currentUser.uid,
        offerId: offerId,
        clickRef: "click_" + offerId + "_" + Date.now(),
        provider: offer.provider,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ip: await AntiFraudModule.getIP(),
        fingerprint: AntiFraudModule.getDeviceFingerprint()
      });
      if (offer.provider === "lootably" && offer.iframeUrl) {
        this.openOfferIframe(offer);
      } else if (offer.url) {
        window.open(offer.url, "_blank", "noopener,noreferrer");
      }
      UIHelpers.showToast("info", "Offer Started",
        "Complete the offer to earn rewards!");
    } catch (error) {
      console.error("Error starting offer:", error);
      UIHelpers.showToast("error", "Error", "Failed to start offer.");
    }
  },

  openOfferIframe(offer) {
    const modal = document.createElement("div");
    modal.className = "modal offer-iframe-modal active";
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content modal-fullscreen">
        <div class="modal-header">
          <h3>${offer.title}</h3>
          <button class="modal-close" id="close-offer-iframe">
            &times;</button>
        </div>
        <div class="modal-body">
          <iframe src="${offer.iframeUrl}" class="offer-iframe"
            allowfullscreen></iframe>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById("close-offer-iframe")
      .addEventListener("click", () => {
        modal.classList.remove("active");
        setTimeout(() => modal.remove(), 300);
      });
  },

  async completeOffer(offerId, trackingId) {
    try {
      if (!AppState.currentUser) return;
      const existingClaim = await db.collection("offer_claims")
        .where("offerId", "==", offerId)
        .where("userId", "==", AppState.currentUser.uid)
        .limit(1).get();
      if (!existingClaim.empty) return;
      const offerDoc = await db.collection("offers").doc(offerId).get();
      if (!offerDoc.exists) return;
      const offer = offerDoc.data();
      const rewardAmount = offer.reward || 0;
      await db.collection("offer_claims").add({
        userId: AppState.currentUser.uid,
        offerId: offerId,
        trackingId: trackingId,
        reward: rewardAmount,
        provider: offer.provider,
        status: "pending",
        claimedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await WalletModule.addCoins(
        rewardAmount, "pending",
        "Offer: " + offer.title, offerId
      );
      UIHelpers.showToast("success", "Offer Completed!",
        "You earned " + UIHelpers.formatCoins(rewardAmount) +
        " coins. Pending verification.");
      await NotificationsModule.createNotification(
        AppState.currentUser.uid,
        "offer_completed",
        "Offer Completed!",
        "You earned " + UIHelpers.formatCoins(rewardAmount) +
        ' coins from "' + offer.title + '".',
        { offerId: offerId, reward: rewardAmount }
      );
    } catch (error) {
      console.error("Error completing offer:", error);
    }
  },

  async loadOfferProviders() {
    try {
      const providersSet = new Set();
      AppState.offers.forEach((offer) => {
        if (offer.provider) providersSet.add(offer.provider);
      });
      const select = document.getElementById("filter-provider");
      if (select) {
        const currentVal = select.value;
        select.innerHTML =
          '<option value="all">All Providers</option>';
        providersSet.forEach((provider) => {
          const sel = currentVal === provider ? "selected" : "";
          select.innerHTML += '<option value="' + provider +
            '" ' + sel + '>' + provider + '</option>';
        });
      }
    } catch (error) {
      console.error("Error loading providers:", error);
    }
  },

  filterOffers(filters) {
    let filtered = [...AppState.offers];
    if (filters.category !== "all") {
      filtered = filtered.filter(
        (o) => o.category === filters.category
      );
    }
    if (filters.provider !== "all") {
      filtered = filtered.filter(
        (o) => o.provider === filters.provider
      );
    }
    if (filters.country !== "all") {
      filtered = filtered.filter(
        (o) => o.countries && o.countries.includes(filters.country)
      );
    }
    if (filters.device !== "all") {
      filtered = filtered.filter(
        (o) => o.devices && o.devices.includes(filters.device)
      );
    }
    if (filters.minReward > 0) {
      filtered = filtered.filter(
        (o) => (o.reward || 0) >= filters.minReward
      );
    }
    if (filters.maxReward < Infinity) {
      filtered = filtered.filter(
        (o) => (o.reward || 0) <= filters.maxReward
      );
    }
    AppState.filteredOffers = filtered;
    this.renderOffers(filtered, "offers-grid");
  },

  sortOffers(sortBy) {
    let sorted = [...AppState.filteredOffers];
    switch (sortBy) {
      case "reward-high":
        sorted.sort((a, b) => (b.reward || 0) - (a.reward || 0));
        break;
      case "reward-low":
        sorted.sort((a, b) => (a.reward || 0) - (b.reward || 0));
        break;
      case "newest":
        sorted.sort(
          (a, b) => (b.createdAt?.seconds || 0) -
            (a.createdAt?.seconds || 0)
        );
        break;
      case "popular":
        sorted.sort(
          (a, b) => (b.popularity || 0) - (a.popularity || 0)
        );
        break;
      case "easiest":
        sorted.sort(
          (a, b) => (a.difficultyScore || 1) -
            (b.difficultyScore || 1)
        );
        break;
      default:
        sorted.sort((a, b) => (b.reward || 0) - (a.reward || 0));
    }
    AppState.filteredOffers = sorted;
    this.renderOffers(sorted, "offers-grid");
  },

  searchOffers(query) {
    if (!query || query.trim() === "") {
      AppState.filteredOffers = [...AppState.offers];
    } else {
      const q = query.toLowerCase();
      AppState.filteredOffers = AppState.offers.filter((offer) => {
        return (offer.title || "").toLowerCase().includes(q) ||
          (offer.description || "").toLowerCase().includes(q) ||
          (offer.category || "").toLowerCase().includes(q);
      });
    }
    this.renderOffers(AppState.filteredOffers, "offers-grid");
  }
};

// ============================================================
// 7. OFFERWALL PROVIDERS MODULE
// ============================================================

const OfferwallProviders = {
  providers: {
    lootably: {
      name: "Lootably",
      baseUrl: "https://www.lootably.com/api/v1",
      init(config) {
        this.appId = config.appId || "";
        this.userId = config.userId || "";
        this.color = config.color || "#4F46E5";
      },
      async fetchOffers() {
        try {
          const url = this.baseUrl + "/offers?appid=" +
            this.appId + "&user_id=" + this.userId;
          const response = await fetch(url);
          if (!response.ok) throw new Error("Failed");
          const data = await response.json();
          return (data.offers || []).map(
            (o) => this.normalizeOffer(o)
          );
        } catch (error) {
          console.error("Lootably error:", error);
          return [];
        }
      },
      normalizeOffer(raw) {
        return {
          id: "loot_" + raw.id,
          title: raw.name || "Lootably Offer",
          description: raw.description || "",
          reward: Math.round(
            (raw.payout || 0) * AppState.COIN_RATE
          ),
          url: raw.url || "",
          icon: raw.icon_url || "",
          category: raw.category || "general",
          provider: "lootably",
          estimatedTime: raw.time || "5-10 min",
          difficulty: (raw.payout || 0) < 0.5 ? "easy" :
            (raw.payout || 0) < 2 ? "medium" : "hard",
          countries: raw.countries || [],
          devices: raw.platforms || ["all"],
          difficultyScore: raw.difficulty || 1,
          popularity: raw.clicks || 0,
          active: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
      },
      renderIframe(containerId, userId) {
        const c = document.getElementById(containerId);
        if (!c) return;
        const f = document.createElement("iframe");
        f.src = "https://www.lootably.com/offers/" +
          this.appId + "?user_id=" + userId +
          "&color=" + encodeURIComponent(this.color);
        f.className = "offerwall-iframe";
        f.style.cssText =
          "width:100%;height:800px;border:none;border-radius:12px";
        c.innerHTML = "";
        c.appendChild(f);
      },
      async handlePostback(params) {
        const { user_id, offer_id, tx_id } = params;
        if (!user_id || !offer_id) return false;
        await OffersModule.completeOffer(
          "loot_" + offer_id, tx_id
        );
        return true;
      }
    },
    adgem: {
      name: "AdGem",
      baseUrl: "https://www.adgem.com/api/v1",
      init(config) {
        this.appId = config.appId || "";
        this.userId = config.userId || "";
        this.apiKey = config.apiKey || "";
      },
      async fetchOffers() {
        try {
          const url = this.baseUrl + "/offers?appid=" +
            this.appId + "&user_id=" + this.userId;
          const response = await fetch(url);
          if (!response.ok) throw new Error("Failed");
          const data = await response.json();
          return (data.data || data.offers || []).map(
            (o) => this.normalizeOffer(o)
          );
        } catch (error) {
          console.error("AdGem error:", error);
          return [];
        }
      },
      normalizeOffer(raw) {
        return {
          id: "adgem_" + raw.id,
          title: raw.name || "AdGem Offer",
          description: raw.description || "",
          reward: Math.round(
            (raw.payout || 0) * AppState.COIN_RATE
          ),
          url: raw.tracking_url || raw.url || "",
          icon: raw.icon_url || "",
          category: raw.category || "general",
          provider: "adgem",
          estimatedTime: raw.time || "5-10 min",
          difficulty: "medium",
          countries: raw.countries || [],
          devices: raw.platforms || ["all"],
          difficultyScore: raw.difficulty || 2,
          popularity: 0,
          active: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
      },
      renderIframe(containerId, userId) {
        const c = document.getElementById(containerId);
        if (!c) return;
        const f = document.createElement("iframe");
        f.src = "https://wall.adgem.com/api/v1?appid=" +
          this.appId + "&user_id=" + userId;
        f.className = "offerwall-iframe";
        f.style.cssText = "width:100%;height:800px;border:none";
        c.innerHTML = "";
        c.appendChild(f);
      },
      async handlePostback(params) {
        const { user_id, offer_id, transaction_id } = params;
        if (!user_id || !offer_id) return false;
        await OffersModule.completeOffer(
          "adgem_" + offer_id, transaction_id
        );
        return true;
      }
    },
    adgate: {
      name: "AdGate",
      baseUrl: "https://www.adgaterewards.com/api/v1",
      init(config) {
        this.appId = config.appId || "";
        this.userId = config.userId || "";
        this.apiKey = config.apiKey || "";
      },
      async fetchOffers() {
        try {
          const url = this.baseUrl + "/offers?app_id=" +
            this.appId + "&user_id=" + this.userId +
            "&api_key=" + this.apiKey;
          const response = await fetch(url);
          if (!response.ok) throw new Error("Failed");
          const data = await response.json();
          return (data.offers || []).map(
            (o) => this.normalizeOffer(o)
          );
        } catch (error) {
          console.error("AdGate error:", error);
          return [];
        }
      },
      normalizeOffer(raw) {
        return {
          id: "adgate_" + raw.id,
          title: raw.name || "AdGate Offer",
          description: raw.description || "",
          reward: Math.round(
            (raw.cpe || raw.cpa || 0) * AppState.COIN_RATE
          ),
          url: raw.url || "",
          icon: raw.icon_url || "",
          category: raw.category || "general",
          provider: "adgate",
          estimatedTime: raw.time || "5-10 min",
          difficulty: "medium",
          countries: raw.countries || [],
          devices: raw.platforms || ["all"],
          difficultyScore: 2,
          popularity: 0,
          active: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
      },
      renderIframe(containerId, userId) {
        const c = document.getElementById(containerId);
        if (!c) return;
        const f = document.createElement("iframe");
        f.src = "https://www.adgaterewards.com/iframe/" +
          this.appId + "/" + userId;
        f.className = "offerwall-iframe";
        f.style.cssText = "width:100%;height:800px;border:none";
        c.innerHTML = "";
        c.appendChild(f);
      },
      async handlePostback(params) {
        const { user_id, offer_id, sub_id } = params;
        if (!user_id || !offer_id) return false;
        await OffersModule.completeOffer(
          "adgate_" + offer_id, sub_id
        );
        return true;
      }
    },
    offertoro: {
      name: "OfferToro",
      baseUrl: "https://www.offertoro.com/api/v1",
      init(config) {
        this.appId = config.appId || "";
        this.userId = config.userId || "";
        this.apiKey = config.apiKey || "";
      },
      async fetchOffers() {
        try {
          const url = this.baseUrl + "/feed?app_id=" +
            this.appId + "&user_id=" + this.userId +
            "&api_key=" + this.apiKey + "&format=json";
          const response = await fetch(url);
          if (!response.ok) throw new Error("Failed");
          const data = await response.json();
          return (data.data || data.offers || []).map(
            (o) => this.normalizeOffer(o)
          );
        } catch (error) {
          console.error("OfferToro error:", error);
          return [];
        }
      },
      normalizeOffer(raw) {
        return {
          id: "offertoro_" + (raw.offer_id || raw.id),
          title: raw.name || "OfferToro Offer",
          description: raw.description || "",
          reward: Math.round(
            (raw.payout || 0) * AppState.COIN_RATE
          ),
          url: raw.url || "",
          icon: raw.image_url || "",
          category: raw.category || "general",
          provider: "offertoro",
          estimatedTime: raw.time || "5-10 min",
          difficulty: "medium",
          countries: raw.countries || [],
          devices: raw.platforms || ["all"],
          difficultyScore: 2,
          popularity: 0,
          active: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
      },
      renderIframe(containerId, userId) {
        const c = document.getElementById(containerId);
        if (!c) return;
        const f = document.createElement("iframe");
        f.src = "https://www.offertoro.com/iframe/" +
          this.appId + "/" + userId;
        f.className = "offerwall-iframe";
        f.style.cssText = "width:100%;height:800px;border:none";
        c.innerHTML = "";
        c.appendChild(f);
      },
      async handlePostback(params) {
        const { user_id, offer_id, transaction_id } = params;
        if (!user_id || !offer_id) return false;
        await OffersModule.completeOffer(
          "offertoro_" + offer_id, transaction_id
        );
        return true;
      }
    },
    peanutlabs: {
      name: "PeanutLabs",
      baseUrl: "https://www.peanutlabs.com/api/v1",
      init(config) {
        this.siteId = config.siteId || "";
        this.userId = config.userId || "";
        this.apiKey = config.apiKey || "";
      },
      async fetchOffers() {
        try {
          const url = this.baseUrl + "/offers?site_id=" +
            this.siteId + "&user_id=" + this.userId +
            "&api_key=" + this.apiKey + "&format=json";
          const response = await fetch(url);
          if (!response.ok) throw new Error("Failed");
          const data = await response.json();
          return (data.offers || []).map(
            (o) => this.normalizeOffer(o)
          );
        } catch (error) {
          console.error("PeanutLabs error:", error);
          return [];
        }
      },
      normalizeOffer(raw) {
        return {
          id: "peanutlabs_" + raw.id,
          title: raw.name || "PeanutLabs Offer",
          description: raw.description || "",
          reward: Math.round(
            (raw.payout || 0) * AppState.COIN_RATE
          ),
          url: raw.url || "",
          icon: raw.icon_url || "",
          category: raw.category || "general",
          provider: "peanutlabs",
          estimatedTime: raw.time || "5-10 min",
          difficulty: "medium",
          countries: raw.countries || [],
          devices: raw.platforms || ["all"],
          difficultyScore: 2,
          popularity: 0,
          active: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
      },
      renderIframe(containerId, userId) {
        const c = document.getElementById(containerId);
        if (!c) return;
        const f = document.createElement("iframe");
        f.src = "https://www.peanutlabs.com/offers/" +
          this.siteId + "/" + userId;
        f.className = "offerwall-iframe";
        f.style.cssText = "width:100%;height:800px;border:none";
        c.innerHTML = "";
        c.appendChild(f);
      },
      async handlePostback(params) {
        const { user_id, offer_id, transaction_id } = params;
        if (!user_id || !offer_id) return false;
        await OffersModule.completeOffer(
          "peanutlabs_" + offer_id, transaction_id
        );
        return true;
      }
    }
  },
  initAll(configs) {
    Object.keys(configs).forEach((provider) => {
      if (this.providers[provider]) {
        this.providers[provider].init(configs[provider]);
      }
    });
  },
  async fetchAllOffers() {
    const allOffers = [];
    await Promise.allSettled(
      Object.values(this.providers).map(async (provider) => {
        try {
          const offers = await provider.fetchOffers();
          allOffers.push(...offers);
        } catch (error) {
          console.error("Error fetching " + provider.name, error);
        }
      })
    );
    return allOffers;
  },
  async handlePostback(providerName, params) {
    const provider = this.providers[providerName];
    if (provider && provider.handlePostback) {
      return await provider.handlePostback(params);
    }
    return false;
  }
};

// ============================================================
// 8. GAME OFFERS MODULE
// ============================================================

const GameOffersModule = {
  async loadGameOffers() {
    try {
      const snapshot = await db.collection("game_offers")
        .where("active", "==", true)
        .orderBy("reward", "desc").limit(30).get();
      const games = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() })
      );
      const container =
        document.getElementById("main-content") ||
        document.querySelector(".main-content");
      if (container) {
        container.innerHTML = `
          <div class="games-page">
            <div class="page-header">
              <h1>Game Offers</h1>
              <p>Play games and earn rewards!</p>
            </div>
            <div class="games-grid" id="games-grid">
              ${games.length > 0
                ? games.map((g) => this.renderGameCard(g)).join("")
                : '<div class="empty-state"><h3>No games available</h3></div>'}
            </div>
          </div>`;
        UIHelpers.initTooltips();
      }
      return games;
    } catch (error) {
      console.error("Error loading game offers:", error);
      return [];
    }
  },
  renderGameCard(game) {
    const rewardUSD =
      ((game.reward || 0) / AppState.COIN_RATE).toFixed(2);
    const progress = game.progress || 0;
    return `
      <div class="game-card" data-game-id="${game.id}">
        <div class="game-card-image">
          ${game.image
            ? '<img src="' + game.image + '" alt="" loading="lazy" />'
            : '<i data-feather="gamepad"></i>'}
        </div>
        <div class="game-card-body">
          <h3 class="game-title">${game.title || "Unknown Game"}</h3>
          <p class="game-description">
            ${(game.description || "").substring(0, 80)}...</p>
          <div class="game-meta">
            <span>${game.platform || "All"}</span>
            <span>${game.estimatedTime || "10-20 min"}</span>
          </div>
          <div class="game-progress-bar">
            <div class="game-progress-fill"
              style="width:${progress}%"></div>
            <span class="game-progress-text">${progress}%</span>
          </div>
        </div>
        <div class="game-card-footer">
          <div class="game-reward">
            <span>${UIHelpers.formatCoins(game.reward || 0)}</span>
            <span>$${rewardUSD}</span>
          </div>
          <button class="btn btn-primary btn-sm start-game-btn"
            data-game-id="${game.id}">Play Now</button>
        </div>
      </div>`;
  },
  async startGameOffer(gameId) {
    try {
      if (!AppState.currentUser) {
        UIHelpers.showToast("warning", "Login Required",
          "Please log in to play games.");
        return;
      }
      const gameDoc =
        await db.collection("game_offers").doc(gameId).get();
      if (!gameDoc.exists) {
        UIHelpers.showToast("error", "Error", "Game not found.");
        return;
      }
      const game = gameDoc.data();
      await db.collection("game_progress").add({
        userId: AppState.currentUser.uid,
        gameId: gameId,
        status: "started",
        progress: 0,
        startedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      if (game.url) {
        window.open(game.url, "_blank", "noopener,noreferrer");
      }
      UIHelpers.showToast("info", "Game Started",
        'Playing "' + game.title + '".');
    } catch (error) {
      console.error("Error starting game:", error);
    }
  },
  async trackMilestone(gameId, milestone) {
    try {
      if (!AppState.currentUser) return;
      const snapshot = await db.collection("game_progress")
        .where("userId", "==", AppState.currentUser.uid)
        .where("gameId", "==", gameId).limit(1).get();
      if (snapshot.empty) return;
      const docRef = snapshot.docs[0].ref;
      const milestones =
        snapshot.docs[0].data().completedMilestones || [];
      if (milestones.includes(milestone)) return;
      milestones.push(milestone);
      await docRef.update({
        completedMilestones: milestones,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      const gameDoc =
        await db.collection("game_offers").doc(gameId).get();
      if (gameDoc.exists) {
        const game = gameDoc.data();
        const reward =
          (game.milestoneRewards &&
            game.milestoneRewards[milestone]) || 0;
        if (reward > 0) {
          await WalletModule.addCoins(
            reward, "bonus",
            "Milestone: " + milestone, gameId
          );
        }
      }
    } catch (error) {
      console.error("Error tracking milestone:", error);
    }
  },
  async updateGameProgress(gameId, progress) {
    try {
      if (!AppState.currentUser) return;
      const snapshot = await db.collection("game_progress")
        .where("userId", "==", AppState.currentUser.uid)
        .where("gameId", "==", gameId).limit(1).get();
      if (snapshot.empty) return;
      await snapshot.docs[0].ref.update({
        progress: Math.min(100, Math.max(0, progress)),
        status: progress >= 100 ? "completed" : "in_progress",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      if (progress >= 100) {
        const gameDoc =
          await db.collection("game_offers").doc(gameId).get();
        if (gameDoc.exists) {
          const game = gameDoc.data();
          await WalletModule.addCoins(
            game.reward || 0, "bonus",
            "Completed: " + game.title, gameId
          );
          UIHelpers.showToast("success", "Game Completed!",
            "You earned " +
            UIHelpers.formatCoins(game.reward || 0) +
            " coins!");
        }
      }
    } catch (error) {
      console.error("Error updating game progress:", error);
    }
  }
};

// ============================================================
// 9. DAILY REWARDS MODULE
// ============================================================

const DailyRewardsModule = {
  dailyRewards: [
    { day: 1, coins: 100, label: "Day 1" },
    { day: 2, coins: 150, label: "Day 2" },
    { day: 3, coins: 200, label: "Day 3" },
    { day: 4, coins: 250, label: "Day 4" },
    { day: 5, coins: 300, label: "Day 5" },
    { day: 6, coins: 400, label: "Day 6" },
    { day: 7, coins: 1000, label: "Day 7 - MEGA BONUS" }
  ],
  async loadDailyRewards(userId) {
    try {
      if (!userId) return;
      const doc =
        await db.collection("daily_rewards").doc(userId).get();
      if (doc.exists) {
        const data = doc.data();
        AppState.dailyRewards = {
          streak: data.streak || 0,
          lastClaim: data.lastClaim
            ? data.lastClaim.toDate() : null,
          claimedDays: data.claimedDays || [],
          streakFreeze: data.streakFreeze || false,
          currentCycle: data.currentCycle || 1
        };
      } else {
        AppState.dailyRewards = {
          streak: 0, lastClaim: null,
          claimedDays: [], streakFreeze: false,
          currentCycle: 1
        };
        await db.collection("daily_rewards")
          .doc(userId).set(AppState.dailyRewards);
      }
      this.renderDailyRewards();
      return AppState.dailyRewards;
    } catch (error) {
      console.error("Error loading daily rewards:", error);
      return null;
    }
  },
  renderDailyRewards() {
    const container =
      document.getElementById("daily-rewards-container") ||
      document.getElementById("home-daily-rewards");
    if (!container) return;
    const streak = AppState.dailyRewards.streak;
    const claimedDays =
      AppState.dailyRewards.claimedDays || [];
    const canClaimToday = this.canClaimToday();
    const bonus = this.getStreakBonus(streak);
    container.innerHTML = `
      <div class="daily-rewards-card">
        <div class="streak-info">
          <div class="streak-display">
            <i data-feather="flame"></i>
            <span class="streak-count">${streak}</span>
            <span class="streak-label">Day Streak</span>
          </div>
          <div class="streak-bonus">
            <span>Bonus: ${bonus}%</span>
          </div>
        </div>
        <div class="daily-calendar">
          ${this.dailyRewards.map((reward) => {
            const isClaimed =
              claimedDays.includes(reward.day);
            const todayDay = (streak % 7) || 7;
            const isToday = canClaimToday &&
              reward.day === todayDay;
            const bc = Math.round(
              reward.coins * (1 + bonus / 100));
            return `
              <div class="daily-item ${isClaimed ? "claimed" : ""}
                ${isToday ? "today" : ""}">
                <div class="daily-item-day">
                  ${reward.label}</div>
                <div class="daily-item-coins">
                  ${UIHelpers.formatCoins(bc)}</div>
                ${isClaimed
                  ? '<div class="daily-item-check"><i data-feather="check"></i></div>'
                  : ""}
                ${isToday && !isClaimed
                  ? '<button class="btn btn-primary btn-xs claim-daily-btn" data-day="' +
                    reward.day + '">Claim</button>'
                  : ""}
              </div>`;
          }).join("")}
        </div>
        <div class="daily-actions">
          <button class="btn btn-outline btn-sm claim-streak-reward-btn"
            ${!canClaimToday ? "disabled" : ""}>
            ${canClaimToday
              ? "Claim Today's Reward"
              : "Come Back Tomorrow!"}
          </button>
        </div>
      </div>`;
    UIHelpers.initTooltips();
  },
  async claimDailyReward(day) {
    try {
      if (!AppState.currentUser) {
        UIHelpers.showToast("warning", "Login Required",
          "Please log in to claim daily rewards.");
        return;
      }
      if (!this.canClaimToday()) {
        UIHelpers.showToast("warning", "Already Claimed",
          "Come back tomorrow!");
        return;
      }
      const userId = AppState.currentUser.uid;
      const streak = AppState.dailyRewards.streak;
      const dayReward =
        this.dailyRewards.find((r) => r.day === day);
      if (!dayReward) return;
      const bonus = this.getStreakBonus(streak);
      const rewardCoins =
        Math.round(dayReward.coins * (1 + bonus / 100));
      const claimedDays = [
        ...(AppState.dailyRewards.claimedDays || []), day
      ];
      const newStreak = streak + 1;
      await db.collection("daily_rewards").doc(userId).update({
        streak: newStreak,
        lastClaim: firebase.firestore.FieldValue.serverTimestamp(),
        claimedDays: claimedDays.length >= 7 ? [] : claimedDays,
        currentCycle: claimedDays.length >= 7
          ? (AppState.dailyRewards.currentCycle || 1) + 1
          : AppState.dailyRewards.currentCycle || 1
      });
      await WalletModule.addCoins(
        rewardCoins, "bonus",
        "Daily Reward - Day " + day +
        " (Streak: " + newStreak + ")",
        "daily_" + day + "_" + newStreak
      );
      await NotificationsModule.createNotification(
        userId, "daily_reward",
        "Daily Reward Claimed!",
        "You earned " + UIHelpers.formatCoins(rewardCoins) +
        " coins for Day " + day + ".",
        { day: day, reward: rewardCoins, streak: newStreak }
      );
      AppState.dailyRewards.streak = newStreak;
      AppState.dailyRewards.lastClaim = new Date();
      AppState.dailyRewards.claimedDays = claimedDays;
      UIHelpers.showToast("success", "Reward Claimed!",
        "You earned " + UIHelpers.formatCoins(rewardCoins) +
        " coins!");
      UIHelpers.confetti();
      this.renderDailyRewards();
    } catch (error) {
      console.error("Error claiming daily reward:", error);
      UIHelpers.showToast("error", "Error",
        "Failed to claim daily reward.");
    }
  },
  async calculateStreak(userId) {
    try {
      const doc =
        await db.collection("daily_rewards").doc(userId).get();
      return doc.exists ? (doc.data().streak || 0) : 0;
    } catch (error) {
      return 0;
    }
  },
  getStreakBonus(streakDays) {
    if (streakDays >= 30) return 50;
    if (streakDays >= 21) return 40;
    if (streakDays >= 14) return 30;
    if (streakDays >= 7) return 20;
    if (streakDays >= 3) return 10;
    return 0;
  },
  canClaimToday() {
    const lastClaim = AppState.dailyRewards.lastClaim;
    if (!lastClaim) return true;
    const now = new Date();
    const lastDate = new Date(lastClaim);
    return now.toDateString() !== lastDate.toDateString();
  },
  async claimStreakReward() {
    try {
      const streak = AppState.dailyRewards.streak;
      const todayDay = (streak % 7) + 1;
      await this.claimDailyReward(todayDay);
    } catch (error) {
      console.error("Error claiming streak reward:", error);
    }
  },
  async checkStreakFreeze() {
    try {
      if (!AppState.currentUser) return;
      const lastClaim = AppState.dailyRewards.lastClaim;
      if (!lastClaim) return;
      const now = new Date();
      const lastDate = new Date(lastClaim);
      const diffDays =
        Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 2 &&
        AppState.dailyRewards.streakFreeze) {
        await db.collection("daily_rewards")
          .doc(AppState.currentUser.uid).update({
          streakFreeze: false,
          lastClaim: firebase.firestore.FieldValue.serverTimestamp()
        });
        AppState.dailyRewards.streakFreeze = false;
        UIHelpers.showToast("info", "Streak Freeze Used",
          "Your streak was protected!");
      } else if (diffDays > 2) {
        await db.collection("daily_rewards")
          .doc(AppState.currentUser.uid).update({
          streak: 0, claimedDays: [], streakFreeze: false
        });
        AppState.dailyRewards.streak = 0;
        AppState.dailyRewards.claimedDays = [];
      }
    } catch (error) {
      console.error("Error checking streak freeze:", error);
    }
  }
};

// ============================================================
// 10. SURVEYS MODULE
// ============================================================

const SurveysModule = {
  async loadSurveys() {
    try {
      const snapshot = await db.collection("surveys")
        .where("active", "==", true)
        .orderBy("reward", "desc").limit(20).get();
      AppState.surveys = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() })
      );
      const container =
        document.getElementById("main-content") ||
        document.querySelector(".main-content");
      if (container) {
        container.innerHTML = `
          <div class="surveys-page">
            <div class="page-header">
              <h1>Surveys</h1>
              <p>Share your opinions and earn rewards!</p>
            </div>
            <div class="surveys-grid">
              ${AppState.surveys.length > 0
                ? AppState.surveys.map(
                    (s) => this.renderSurveyCard(s)
                  ).join("")
                : '<div class="empty-state"><h3>No surveys available</h3></div>'}
            </div>
          </div>`;
      }
      return AppState.surveys;
    } catch (error) {
      console.error("Error loading surveys:", error);
      return [];
    }
  },
  renderSurveyCard(survey) {
    const rewardUSD =
      ((survey.reward || 0) / AppState.COIN_RATE).toFixed(2);
    return `
      <div class="survey-card" data-survey-id="${survey.id}">
        <div class="survey-icon">
          <i data-feather="bar-chart-2"></i>
        </div>
        <div class="survey-info">
          <h3>${survey.title || "Survey"}</h3>
          <p>${survey.description || "Complete this survey to earn rewards."}</p>
          <div class="survey-meta">
            <span><i data-feather="clock"></i>
              ${survey.estimatedTime || "5-10 min"}</span>
            <span>${survey.questionCount || "?"} questions</span>
          </div>
        </div>
        <div class="survey-reward">
          <span>${UIHelpers.formatCoins(survey.reward || 0)}</span>
          <span>$${rewardUSD}</span>
          <button class="btn btn-primary btn-sm start-survey-btn"
            data-survey-id="${survey.id}">Start Survey</button>
        </div>
      </div>`;
  },
  async startSurvey(surveyId) {
    try {
      if (!AppState.currentUser) {
        UIHelpers.showToast("warning", "Login Required",
          "Please log in to take surveys.");
        return;
      }
      const survey =
        AppState.surveys.find((s) => s.id === surveyId);
      if (!survey) return;
      await db.collection("survey_attempts").add({
        userId: AppState.currentUser.uid,
        surveyId: surveyId,
        status: "started",
        startedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      if (survey.url) {
        window.open(survey.url, "_blank", "noopener,noreferrer");
      }
      UIHelpers.showToast("info", "Survey Started",
        "Complete the survey to earn your reward!");
    } catch (error) {
      console.error("Error starting survey:", error);
    }
  },
  async completeSurvey(surveyId) {
    try {
      if (!AppState.currentUser) return;
      const survey =
        AppState.surveys.find((s) => s.id === surveyId);
      if (!survey) return;
      const attempt = await db.collection("survey_attempts")
        .where("userId", "==", AppState.currentUser.uid)
        .where("surveyId", "==", surveyId)
        .where("status", "==", "started")
        .limit(1).get();
      if (attempt.empty) return;
      await attempt.docs[0].ref.update({
        status: "completed",
        completedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await WalletModule.addCoins(
        survey.reward || 0, "pending",
        "Survey: " + survey.title, surveyId
      );
      UIHelpers.showToast("success", "Survey Completed!",
        "You earned " +
        UIHelpers.formatCoins(survey.reward || 0) +
        " coins.");
    } catch (error) {
      console.error("Error completing survey:", error);
    }
  }
};

// ============================================================
// 11. WATCH ADS MODULE
// ============================================================

const WatchAdsModule = {
  async loadRewardedAds() {
    try {
      const snapshot = await db.collection("rewarded_ads")
        .where("active", "==", true)
        .orderBy("reward", "desc").limit(20).get();
      const ads = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() })
      );
      const container =
        document.getElementById("main-content") ||
        document.querySelector(".main-content");
      if (container) {
        const dailyLimit = AppState.ads.dailyLimit;
        const watched = AppState.ads.watchedToday;
        container.innerHTML = `
          <div class="watch-page">
            <div class="page-header">
              <h1>Watch & Earn</h1>
              <p>Watch ads and earn coins!</p>
            </div>
            <div class="daily-limit-bar">
              <div class="limit-info">
                <span>Ads today: <strong>${watched}</strong>
                  / ${dailyLimit}</span>
              </div>
              <div class="limit-progress">
                <div class="limit-progress-fill"
                  style="width:${(watched / dailyLimit) * 100}%">
                </div>
              </div>
            </div>
            <div class="ads-grid">
              ${ads.length > 0
                ? ads.map((a) => this.renderAdCard(a)).join("")
                : '<div class="empty-state"><h3>No ads available</h3></div>'}
            </div>
          </div>`;
      }
      return ads;
    } catch (error) {
      console.error("Error loading ads:", error);
      return [];
    }
  },
  renderAdCard(ad) {
    const rewardUSD =
      ((ad.reward || 0) / AppState.COIN_RATE).toFixed(2);
    const canWatch =
      AppState.ads.watchedToday < AppState.ads.dailyLimit;
    return `
      <div class="ad-card" data-ad-id="${ad.id}">
        <div class="ad-thumbnail">
          ${ad.thumbnail
            ? '<img src="' + ad.thumbnail + '" alt="" loading="lazy" />'
            : '<div class="ad-placeholder"><i data-feather="play-circle"></i></div>'}
        </div>
        <div class="ad-info">
          <h3>${ad.title || "Rewarded Ad"}</h3>
          <p>${ad.description || "Watch this ad to earn coins."}</p>
          <div class="ad-meta">
            <span><i data-feather="clock"></i>
              ${ad.duration || "30 sec"}</span>
            <span class="ad-reward">
              ${UIHelpers.formatCoins(ad.reward || 0)}
              ($${rewardUSD})</span>
          </div>
        </div>
        <button class="btn btn-primary watch-ad-btn"
          data-ad-id="${ad.id}"
          ${!canWatch ? "disabled" : ""}>
          ${canWatch ? "Watch Now" : "Limit Reached"}
        </button>
      </div>`;
  },
  async watchAd(adId) {
    try {
      if (!AppState.currentUser) {
        UIHelpers.showToast("warning", "Login Required",
          "Please log in to watch ads.");
        return;
      }
      if (!this.checkDailyLimit()) {
        UIHelpers.showToast("info", "Daily Limit",
          "You've reached your daily limit.");
        return;
      }
      const adDoc =
        await db.collection("rewarded_ads").doc(adId).get();
      if (!adDoc.exists) {
        UIHelpers.showToast("error", "Error", "Ad not found.");
        return;
      }
      this.showAdPlayer(adDoc.data(), adId);
    } catch (error) {
      console.error("Error watching ad:", error);
    }
  },
  showAdPlayer(ad, adId) {
    const modal = document.createElement("div");
    modal.className = "modal ad-player-modal active";
    const duration = parseInt(ad.duration) || 30;
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content modal-md">
        <div class="modal-header">
          <h3>Watch Ad</h3>
          <button class="modal-close"
            id="close-ad-player">&times;</button>
        </div>
        <div class="modal-body ad-player-body">
          <div class="ad-video-container">
            <div class="ad-placeholder-video">
              <i data-feather="play-circle"></i>
              <p>Ad playing...</p>
            </div>
            <div class="ad-timer" id="ad-timer">
              ${duration}s</div>
            <div class="ad-progress-bar">
              <div class="ad-progress-fill"
                id="ad-progress-fill"></div>
            </div>
          </div>
          <p class="ad-skip-text">
            Please watch the entire ad.</p>
          <button class="btn btn-primary" id="ad-complete-btn"
            disabled>Claim Reward</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    let seconds = duration;
    const timerEl = modal.querySelector("#ad-timer");
    const progressFill =
      modal.querySelector("#ad-progress-fill");
    const completeBtn =
      modal.querySelector("#ad-complete-btn");
    const interval = setInterval(() => {
      seconds--;
      if (timerEl) timerEl.textContent = seconds + "s";
      if (progressFill) {
        progressFill.style.width =
          ((duration - seconds) / duration * 100) + "%";
      }
      if (seconds <= 0) {
        clearInterval(interval);
        if (completeBtn) {
          completeBtn.disabled = false;
          completeBtn.textContent = "Claim Reward";
        }
        if (timerEl) timerEl.textContent = "Complete!";
      }
    }, 1000);
    completeBtn.addEventListener("click", async () => {
      clearInterval(interval);
      modal.remove();
      await this.onAdComplete(adId);
    });
    modal.querySelector("#close-ad-player")
      .addEventListener("click", () => {
        clearInterval(interval);
        modal.remove();
      });
  },
  async onAdComplete(adId) {
    try {
      if (!AppState.currentUser) return;
      const adDoc =
        await db.collection("rewarded_ads").doc(adId).get();
      if (!adDoc.exists) return;
      const ad = adDoc.data();
      const rewardAmount = ad.reward || 50;
      await WalletModule.addCoins(
        rewardAmount, "bonus",
        "Watched ad: " + ad.title, adId
      );
      await this.trackAdImpression(adId);
      AppState.ads.watchedToday++;
      AppState.ads.lastWatch = new Date();
      await NotificationsModule.createNotification(
        AppState.currentUser.uid,
        "ad_watched", "Ad Reward!",
        "You earned " +
          UIHelpers.formatCoins(rewardAmount) +
          " coins.",
        { adId: adId, reward: rewardAmount }
      );
      UIHelpers.showToast("success", "Reward Earned!",
        "You earned " +
        UIHelpers.formatCoins(rewardAmount) + " coins!");
      UIHelpers.coinAnimation(
        document.querySelector(".coin-balance"),
        rewardAmount
      );
    } catch (error) {
      console.error("Error completing ad:", error);
    }
  },
  async trackAdImpression(adId) {
    try {
      if (!AppState.currentUser) return;
      await db.collection("ad_impressions").add({
        userId: AppState.currentUser.uid,
        adId: adId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ip: await AntiFraudModule.getIP(),
        fingerprint: AntiFraudModule.getDeviceFingerprint()
      });
    } catch (error) {
      console.error("Error tracking impression:", error);
    }
  },
  checkDailyLimit() {
    const now = new Date();
    const lastWatch = AppState.ads.lastWatch
      ? new Date(AppState.ads.lastWatch) : null;
    if (!lastWatch ||
      now.toDateString() !== lastWatch.toDateString()) {
      AppState.ads.watchedToday = 0;
      return true;
    }
    return AppState.ads.watchedToday < AppState.ads.dailyLimit;
  }
};

// ============================================================
// 12. TASKS MODULE
// ============================================================

const TasksModule = {
  async loadTasks() {
    try {
      if (!AppState.currentUser) return;
      const dailySnap = await db.collection("tasks")
        .where("type", "==", "daily")
        .where("active", "==", true).get();
      const weeklySnap = await db.collection("tasks")
        .where("type", "==", "weekly")
        .where("active", "==", true).get();
      const userTaskSnap = await db.collection("user_tasks")
        .where("userId", "==", AppState.currentUser.uid).get();
      const userTaskMap = {};
      userTaskSnap.docs.forEach((doc) => {
        userTaskMap[doc.data().taskId] = {
          id: doc.id, ...doc.data()
        };
      });
      AppState.tasks.daily = dailySnap.docs.map((doc) => ({
        id: doc.id, ...doc.data(),
        userProgress: userTaskMap[doc.id] || null
      }));
      AppState.tasks.weekly = weeklySnap.docs.map((doc) => ({
        id: doc.id, ...doc.data(),
        userProgress: userTaskMap[doc.id] || null
      }));
      this.renderTasks();
      return AppState.tasks;
    } catch (error) {
      console.error("Error loading tasks:", error);
      return { daily: [], weekly: [] };
    }
  },
  renderTasks() {
    const container =
      document.getElementById("main-content") ||
      document.querySelector(".main-content");
    if (!container) return;
    container.innerHTML = `
      <div class="tasks-page">
        <div class="page-header">
          <h1>Tasks</h1>
          <p>Complete tasks to earn extra coins!</p>
        </div>
        <div class="tasks-section">
          <h2><i data-feather="sun"></i> Daily Tasks</h2>
          <div class="tasks-list">
            ${AppState.tasks.daily.length > 0
              ? AppState.tasks.daily.map(
                  (t) => this.renderTaskCard(t)
                ).join("")
              : '<div class="empty-state"><p>No daily tasks</p></div>'}
          </div>
        </div>
        <div class="tasks-section">
          <h2><i data-feather="calendar"></i> Weekly Tasks</h2>
          <div class="tasks-list">
            ${AppState.tasks.weekly.length > 0
              ? AppState.tasks.weekly.map(
                  (t) => this.renderTaskCard(t)
                ).join("")
              : '<div class="empty-state"><p>No weekly tasks</p></div>'}
          </div>
        </div>
      </div>`;
    UIHelpers.initTooltips();
  },
  renderTaskCard(task) {
    const progress = task.userProgress
      ? (task.userProgress.progress || 0) : 0;
    const completed = task.userProgress
      ? task.userProgress.completed : false;
    const claimed = task.userProgress
      ? task.userProgress.claimed : false;
    const required = task.requiredCount || 1;
    const pct = Math.min(100, (progress / required) * 100);
    return `
      <div class="task-card ${completed ? "completed" : ""}
        ${claimed ? "claimed" : ""}"
        data-task-id="${task.id}">
        <div class="task-icon">
          <i data-feather="${task.icon || "check-circle"}"></i>
        </div>
        <div class="task-info">
          <h3>${task.title || "Task"}</h3>
          <p>${task.description || ""}</p>
          <div class="task-progress">
            <div class="task-progress-bar">
              <div class="task-progress-fill"
                style="width:${pct}%"></div>
            </div>
            <span>${progress} / ${required}</span>
          </div>
        </div>
        <div class="task-reward">
          <span>${UIHelpers.formatCoins(task.reward || 0)}</span>
          ${claimed
            ? '<span class="task-claimed-badge">Claimed</span>'
            : completed
              ? '<button class="btn btn-primary btn-sm claim-task-btn" data-task-id="' + task.id + '">Claim</button>'
              : '<span>In Progress</span>'}
        </div>
      </div>`;
  },
  async claimTask(taskId) {
    try {
      if (!AppState.currentUser) return;
      const snap = await db.collection("user_tasks")
        .where("userId", "==", AppState.currentUser.uid)
        .where("taskId", "==", taskId)
        .where("completed", "==", true)
        .where("claimed", "==", false)
        .limit(1).get();
      if (snap.empty) {
        UIHelpers.showToast("warning", "Not Ready",
          "Task not yet completed.");
        return;
      }
      const taskDoc =
        await db.collection("tasks").doc(taskId).get();
      if (!taskDoc.exists) return;
      const task = taskDoc.data();
      await snap.docs[0].ref.update({
        claimed: true,
        claimedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await WalletModule.addCoins(
        task.reward || 0, "bonus",
        "Task: " + task.title, taskId
      );
      UIHelpers.showToast("success", "Task Claimed!",
        "You earned " +
        UIHelpers.formatCoins(task.reward || 0) + " coins!");
      await this.loadTasks();
    } catch (error) {
      console.error("Error claiming task:", error);
    }
  },
  async generateDailyTasks() {
    try {
      const today = new Date().toDateString();
      const existing = await db.collection("tasks")
        .where("type", "==", "daily")
        .where("date", "==", today).get();
      if (!existing.empty) return;
      const templates = [
        { title: "Complete 3 Offers", description: "Complete any 3 offers",
          requiredCount: 3, reward: 200, icon: "tasks" },
        { title: "Watch 5 Ads", description: "Watch 5 rewarded ads",
          requiredCount: 5, reward: 150, icon: "play-circle" },
        { title: "Log In", description: "Log in to your account",
          requiredCount: 1, reward: 50, icon: "log-in" },
        { title: "Earn 1000 Coins", description: "Earn 1000 coins",
          requiredCount: 1000, reward: 500, icon: "coins" }
      ];
      for (const t of templates) {
        await db.collection("tasks").add({
          ...t, type: "daily", date: today, active: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error generating daily tasks:", error);
    }
  },
  async generateWeeklyTasks() {
    try {
      const ws = new Date();
      ws.setDate(ws.getDate() - ws.getDay());
      const weekKey = ws.toISOString().split("T")[0];
      const existing = await db.collection("tasks")
        .where("type", "==", "weekly")
        .where("weekKey", "==", weekKey).get();
      if (!existing.empty) return;
      const templates = [
        { title: "Complete 20 Offers", description: "20 offers this week",
          requiredCount: 20, reward: 2000, icon: "tasks" },
        { title: "Watch 30 Ads", description: "30 ads this week",
          requiredCount: 30, reward: 1000, icon: "play-circle" },
        { title: "Refer a Friend", description: "1 referral",
          requiredCount: 1, reward: 500, icon: "users" },
        { title: "Earn 5000 Coins", description: "5000 coins this week",
          requiredCount: 5000, reward: 1500, icon: "coins" }
      ];
      for (const t of templates) {
        await db.collection("tasks").add({
          ...t, type: "weekly", weekKey: weekKey, active: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error generating weekly tasks:", error);
    }
  },
  async checkTaskCompletion(userId) {
    try {
      const allTasks =
        [...AppState.tasks.daily, ...AppState.tasks.weekly];
      for (const task of allTasks) {
        if (task.userProgress &&
          (task.userProgress.completed ||
            task.userProgress.claimed)) continue;
        const progress = await this.getTaskProgress(
          userId, task.id, task.type
        );
        if (progress >= (task.requiredCount || 1)) {
          const existing = await db.collection("user_tasks")
            .where("userId", "==", userId)
            .where("taskId", "==", task.id)
            .limit(1).get();
          if (existing.empty) {
            await db.collection("user_tasks").add({
              userId: userId, taskId: task.id,
              progress: progress, completed: true,
              claimed: false,
              completedAt:
                firebase.firestore.FieldValue.serverTimestamp()
            });
          } else {
            await existing.docs[0].ref.update({
              progress: progress, completed: true
            });
          }
        }
      }
    } catch (error) {
      console.error("Error checking task completion:", error);
    }
  },
  async getTaskProgress(userId, taskId, type) {
    try {
      const now = new Date();
      let startDate;
      if (type === "daily") {
        startDate = new Date(
          now.getFullYear(), now.getMonth(), now.getDate()
        );
      } else {
        startDate = new Date(now);
        startDate.setDate(
          startDate.getDate() - startDate.getDay()
        );
      }
      const snap = await db.collection("offer_claims")
        .where("userId", "==", userId)
        .where("claimedAt", ">=",
          firebase.firestore.Timestamp.fromDate(startDate))
        .get();
      return snap.size;
    } catch (error) {
      return 0;
    }
  }
};

// ============================================================
// 13. CHALLENGES MODULE
// ============================================================

const ChallengesModule = {
  async loadChallenges() {
    try {
      if (!AppState.currentUser) return;
      const dailySnap = await db.collection("challenges")
        .where("type", "==", "daily")
        .where("active", "==", true).limit(5).get();
      const weeklySnap = await db.collection("challenges")
        .where("type", "==", "weekly")
        .where("active", "==", true).limit(5).get();
      const monthlySnap = await db.collection("challenges")
        .where("type", "==", "monthly")
        .where("active", "==", true).limit(5).get();
      AppState.challenges.daily =
        dailySnap.docs.map(
          (d) => ({ id: d.id, ...d.data() })
        );
      AppState.challenges.weekly =
        weeklySnap.docs.map(
          (d) => ({ id: d.id, ...d.data() })
        );
      AppState.challenges.monthly =
        monthlySnap.docs.map(
          (d) => ({ id: d.id, ...d.data() })
        );
      this.renderChallenges();
      return AppState.challenges;
    } catch (error) {
      console.error("Error loading challenges:", error);
      return { daily: [], weekly: [], monthly: [] };
    }
  },
  renderChallenges() {
    const container =
      document.getElementById("main-content") ||
      document.querySelector(".main-content");
    if (!container) return;
    container.innerHTML = `
      <div class="challenges-page">
        <div class="page-header">
          <h1>Challenges</h1>
          <p>Take on challenges for bigger rewards!</p>
        </div>
        <div class="challenges-tabs">
          <button class="tab-btn active"
            data-tab="daily-challenges">Daily</button>
          <button class="tab-btn"
            data-tab="weekly-challenges">Weekly</button>
          <button class="tab-btn"
            data-tab="monthly-challenges">Monthly</button>
        </div>
        <div class="challenges-content">
          <div class="tab-panel active"
            id="daily-challenges">
            ${this.renderChallengeList(
              AppState.challenges.daily
            )}
          </div>
          <div class="tab-panel" id="weekly-challenges">
            ${this.renderChallengeList(
              AppState.challenges.weekly
            )}
          </div>
          <div class="tab-panel" id="monthly-challenges">
            ${this.renderChallengeList(
              AppState.challenges.monthly
            )}
          </div>
        </div>
      </div>`;
    UIHelpers.initTabs();
  },
  renderChallengeList(challenges) {
    if (challenges.length === 0) {
      return '<div class="empty-state"><p>No challenges available</p></div>';
    }
    return challenges.map((c) => `
      <div class="challenge-card"
        data-challenge-id="${c.id}">
        <div class="challenge-icon">
          <i data-feather="${c.icon || "trophy"}"></i>
        </div>
        <div class="challenge-info">
          <h3>${c.title || "Challenge"}</h3>
          <p>${c.description || ""}</p>
          <div class="challenge-reward">
            <span>Reward: ${UIHelpers.formatCoins(c.reward || 0)}</span>
            <span>XP: ${c.xpReward || 0}</span>
          </div>
        </div>
        <div class="challenge-action">
          <button class="btn btn-primary btn-sm claim-challenge-btn"
            data-challenge-id="${c.id}">Claim</button>
        </div>
      </div>`).join("");
  },
  async claimChallengeReward(challengeId) {
    try {
      if (!AppState.currentUser) return;
      const all = [
        ...AppState.challenges.daily,
        ...AppState.challenges.weekly,
        ...AppState.challenges.monthly
      ];
      const challenge = all.find((c) => c.id === challengeId);
      if (!challenge) {
        UIHelpers.showToast("error", "Error",
          "Challenge not found.");
        return;
      }
      const existing = await db.collection("challenge_claims")
        .where("userId", "==", AppState.currentUser.uid)
        .where("challengeId", "==", challengeId)
        .limit(1).get();
      if (!existing.empty) {
        UIHelpers.showToast("info", "Already Claimed",
          "You've already claimed this reward.");
        return;
      }
      await db.collection("challenge_claims").add({
        userId: AppState.currentUser.uid,
        challengeId: challengeId,
        reward: challenge.reward || 0,
        claimedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await WalletModule.addCoins(
        challenge.reward || 0, "bonus",
        "Challenge: " + challenge.title, challengeId
      );
      UIHelpers.showToast("success", "Challenge Complete!",
        "You earned " +
        UIHelpers.formatCoins(challenge.reward || 0) +
        " coins!");
      UIHelpers.confetti();
    } catch (error) {
      console.error("Error claiming challenge:", error);
    }
  }
};

// ============================================================
// 14. REWARDS STORE MODULE
// ============================================================

const RewardsStoreModule = {
  async loadRewards(category = "all") {
    try {
      let query = db.collection("store_items")
        .where("active", "==", true);
      if (category !== "all") {
        query = query.where("category", "==", category);
      }
      const snapshot = await query
        .orderBy("price", "asc").limit(50).get();
      AppState.rewards = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() })
      );
      const container =
        document.getElementById("main-content") ||
        document.querySelector(".main-content");
      if (container) {
        const balance = AppState.wallet.available;
        container.innerHTML = `
          <div class="store-page">
            <div class="page-header">
              <h1>Rewards Store</h1>
              <p>Redeem your coins for awesome rewards!</p>
            </div>
            <div class="store-balance">
              <span>Balance:
                <strong>${UIHelpers.formatCoins(balance)}</strong>
                (${UIHelpers.formatUSD(
                  balance / AppState.COIN_RATE
                )})
              </span>
            </div>
            <div class="store-categories" id="store-categories">
              <button class="tab-btn active"
                data-category="all">All</button>
              <button class="tab-btn"
                data-category="gift-card">Gift Cards</button>
              <button class="tab-btn"
                data-category="gaming">Gaming</button>
              <button class="tab-btn"
                data-category="cash">Cash</button>
              <button class="tab-btn"
                data-category="crypto">Crypto</button>
            </div>
            <div class="store-grid" id="store-grid">
              ${AppState.rewards.length > 0
                ? AppState.rewards.map(
                    (r) => this.renderRewardItem(r)
                  ).join("")
                : '<div class="empty-state"><p>No rewards available</p></div>'}
            </div>
          </div>`;
      }
      return AppState.rewards;
    } catch (error) {
      console.error("Error loading rewards:", error);
      return [];
    }
  },
  renderRewardItem(reward) {
    const canAfford =
      AppState.wallet.available >= (reward.price || 0);
    return `
      <div class="store-item ${!canAfford ? "unaffordable" : ""}"
        data-reward-id="${reward.id}">
        <div class="store-item-image">
          ${reward.image
            ? '<img src="' + reward.image + '" alt="" loading="lazy" />'
            : '<div class="store-item-placeholder"><i data-feather="gift"></i></div>'}
        </div>
        <div class="store-item-info">
          <h3>${reward.name || "Reward"}</h3>
          <p>${(reward.description || "").substring(0, 60)}</p>
          <div class="store-item-price">
            <span class="price-coins">
              ${UIHelpers.formatCoins(reward.price || 0)}</span>
            <span class="price-usd">
              $${((reward.price || 0) /
                AppState.COIN_RATE).toFixed(2)}</span>
          </div>
        </div>
        <button class="btn ${canAfford
          ? "btn-primary"
          : "btn-disabled"} btn-sm purchase-reward-btn"
          data-reward-id="${reward.id}"
          ${!canAfford ? "disabled" : ""}>
          ${canAfford ? "Redeem" : "Not Enough"}
        </button>
      </div>`;
  },
  async openRewardDetail(rewardId) {
    try {
      const reward =
        AppState.rewards.find((r) => r.id === rewardId);
      if (!reward) return;
      const modal = document.createElement("div");
      modal.className =
        "modal reward-detail-modal active";
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content modal-md">
          <div class="modal-header">
            <h3>${reward.name}</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="reward-detail-image">
              ${reward.image
                ? '<img src="' + reward.image +
                  '" alt="" />' : ""}
            </div>
            <p>${reward.description || ""}</p>
            <div class="reward-detail-price">
              <strong>${UIHelpers.formatCoins(reward.price || 0)}</strong>
              (${UIHelpers.formatUSD(
                (reward.price || 0) / AppState.COIN_RATE
              )})
            </div>
            <button class="btn btn-primary btn-block purchase-confirm-btn"
              data-reward-id="${reward.id}">
              Confirm Redemption
            </button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector(".modal-overlay")
        .addEventListener("click", () => modal.remove());
      modal.querySelector(".modal-close")
        .addEventListener("click", () => modal.remove());
      modal.querySelector(".purchase-confirm-btn")
        .addEventListener("click", async () => {
          modal.remove();
          await this.purchaseReward(rewardId);
        });
    } catch (error) {
      console.error("Error opening reward detail:", error);
    }
  },
  async purchaseReward(rewardId) {
    try {
      if (!AppState.currentUser) {
        UIHelpers.showToast("warning", "Login Required",
          "Please log in to redeem rewards.");
        return;
      }
      const reward =
        AppState.rewards.find((r) => r.id === rewardId);
      if (!reward) return;
      if (AppState.wallet.available < (reward.price || 0)) {
        UIHelpers.showToast("error", "Insufficient Balance",
          "You don't have enough coins.");
        return;
      }
      await AntiFraudModule.checkDuplicateAccount();
      const riskScore = await AntiFraudModule.getRiskScore(
        AppState.currentUser.uid
      );
      if (riskScore > 80) {
        UIHelpers.showToast("error", "Restricted",
          "Your account is under review.");
        return;
      }
      await WalletModule.freezeCoins(
        reward.price,
        "store_purchase_" + rewardId
      );
      const orderRef =
        await db.collection("store_orders").add({
        userId: AppState.currentUser.uid,
        rewardId: rewardId,
        rewardName: reward.name,
        price: reward.price,
        status: "processing",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      UIHelpers.showToast("info", "Processing",
        "Your redemption is being processed!");
      await NotificationsModule.createNotification(
        AppState.currentUser.uid, "purchase",
        "Order Placed",
        'Your redemption of "' + reward.name +
          '" is being processed.',
        { orderId: orderRef.id, rewardId: rewardId }
      );
    } catch (error) {
      console.error("Error purchasing reward:", error);
      UIHelpers.showToast("error", "Error",
        "Failed to process redemption.");
    }
  }
};

// ============================================================
// 15. TOP-UP MODULE
// ============================================================

const TopUpModule = {
  games: [],
  selectedGame: null,
  selectedPackage: null,
  async loadGameList() {
    try {
      const snapshot = await db.collection("topup_games")
        .where("active", "==", true)
        .orderBy("name").get();
      this.games = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() })
      );
      const container =
        document.getElementById("main-content") ||
        document.querySelector(".main-content");
      if (container) {
        container.innerHTML = `
          <div class="topup-page">
            <div class="page-header">
              <h1>Game Top-Up</h1>
              <p>Top up your favorite games!</p>
            </div>
            <div class="game-list" id="topup-game-list">
              ${this.games.length > 0
                ? this.games.map((g) => `
                  <div class="topup-game-card"
                    data-game-id="${g.id}">
                    <div class="topup-game-icon">
                      ${g.icon
                        ? '<img src="' + g.icon + '" alt="" />'
                        : '<i data-feather="gamepad"></i>'}
                    </div>
                    <div class="topup-game-info">
                      <h3>${g.name}</h3>
                      <p>${g.description || ""}</p>
                    </div>
                    <i data-feather="chevron-right"></i>
                  </div>`).join("")
                : '<div class="empty-state"><p>No games available</p></div>'}
            </div>
            <div id="topup-details"
              style="display:none;"></div>
          </div>`;
      }
      return this.games;
    } catch (error) {
      console.error("Error loading game list:", error);
      return [];
    }
  },
  async selectGame(gameId) {
    try {
      const game = this.games.find((g) => g.id === gameId);
      if (!game) return;
      this.selectedGame = game;
      const snapshot = await db.collection("topup_packages")
        .where("gameId", "==", gameId)
        .where("active", "==", true)
        .orderBy("price").get();
      const packages = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() })
      );
      const detailsEl =
        document.getElementById("topup-details");
      if (detailsEl) {
        detailsEl.style.display = "block";
        detailsEl.innerHTML = `
          <div class="topup-detail-card">
            <button class="btn btn-ghost btn-sm"
              id="topup-back-btn">
              <i data-feather="arrow-left"></i> Back</button>
            <div class="topup-game-header">
              <h2>${game.name}</h2>
            </div>
            <div class="topup-step">
              <h3>1. Select Package</h3>
              <div class="package-list" id="package-list">
                ${packages.map((pkg) => `
                  <div class="package-card"
                    data-package-id="${pkg.id}">
                    <div class="package-value">
                      ${pkg.value || pkg.coins}</div>
                    <div class="package-label">
                      ${pkg.label || ""}</div>
                    <div class="package-price">
                      ${UIHelpers.formatCoins(pkg.price)}
                      ($${(pkg.price /
                        AppState.COIN_RATE).toFixed(2)})
                    </div>
                  </div>`).join("")}
              </div>
            </div>
            <div class="topup-step">
              <h3>2. Enter Player ID</h3>
              <div class="form-group">
                <input type="text" id="player-id-input"
                  placeholder="Enter your game Player ID"
                  class="form-input" />
                <span class="form-hint">
                  ${game.playerIdHint ||
                    "Check your in-game profile"}</span>
              </div>
            </div>
            <div class="topup-step">
              <h3>3. Confirm</h3>
              <button class="btn btn-primary btn-block"
                id="confirm-topup-btn" disabled>
                Confirm Top-Up</button>
            </div>
          </div>`;
        document.getElementById("topup-back-btn")
          .addEventListener("click", () => {
            detailsEl.style.display = "none";
            this.selectedGame = null;
            this.selectedPackage = null;
          });
      }
    } catch (error) {
      console.error("Error selecting game:", error);
    }
  },
  async confirmTopUp(gameId, packageId, playerId) {
    try {
      if (!AppState.currentUser) {
        UIHelpers.showToast("warning", "Login Required",
          "Please log in to top up.");
        return;
      }
      if (!playerId || playerId.trim().length < 3) {
        UIHelpers.showToast("error", "Invalid Player ID",
          "Please enter a valid Player ID.");
        return;
      }
      const game = this.games.find((g) => g.id === gameId);
      if (!game) return;
      const packages = await this.loadPackages(gameId);
      const pkg = packages.find((p) => p.id === packageId);
      if (!pkg) return;
      if (AppState.wallet.available < pkg.price) {
        UIHelpers.showToast("error", "Insufficient Balance",
          "You don't have enough coins.");
        return;
      }
      const orderRef =
        await db.collection("topup_orders").add({
        userId: AppState.currentUser.uid,
        gameId: gameId,
        gameName: game.name,
        packageId: packageId,
        amount: pkg.value || pkg.coins,
        price: pkg.price,
        playerId: playerId.trim(),
        status: "processing",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await WalletModule.deductCoins(
        pkg.price, "available",
        "Top-up: " + game.name, orderRef.id
      );
      UIHelpers.showToast("info", "Processing Top-Up",
        "Your " + game.name + " top-up is being processed!");
      return orderRef.id;
    } catch (error) {
      console.error("Error processing top-up:", error);
    }
  },
  async trackOrderStatus(orderId) {
    try {
      return new Promise((resolve) => {
        const unsubscribe =
          db.collection("topup_orders")
            .doc(orderId).onSnapshot((doc) => {
            if (doc.exists) {
              const data = doc.data();
              if (data.status === "completed") {
                UIHelpers.showToast("success",
                  "Top-Up Complete!", "Your order is done!");
                unsubscribe();
                resolve(data);
              } else if (data.status === "failed") {
                UIHelpers.showToast("error",
                  "Top-Up Failed", "Order failed.");
                unsubscribe();
                resolve(data);
              }
            }
          });
      });
    } catch (error) {
      console.error("Error tracking order:", error);
    }
  }
};

// ============================================================
// 16. WITHDRAWAL MODULE
// ============================================================

const WithdrawalModule = {
  methods: [
    { id: "paypal", name: "PayPal", minWithdrawal: 50000,
      fee: 0.05, icon: "credit-card" },
    { id: "bitcoin", name: "Bitcoin", minWithdrawal: 100000,
      fee: 0.10, icon: "bitcoin" },
    { id: "ethereum", name: "Ethereum", minWithdrawal: 75000,
      fee: 0.08, icon: "hexagon" },
    { id: "litecoin", name: "Litecoin", minWithdrawal: 50000,
      fee: 0.05, icon: "hexagon" },
    { id: "giftcard", name: "Gift Card", minWithdrawal: 25000,
      fee: 0, icon: "gift" },
    { id: "mobile", name: "Mobile Credit", minWithdrawal: 30000,
      fee: 0.03, icon: "smartphone" }
  ],
  async loadWithdrawalMethods() {
    try {
      const container =
        document.getElementById("main-content") ||
        document.querySelector(".main-content");
      if (!container) return;
      const balance = AppState.wallet.available;
      const minWD = this.getMinWithdrawal();
      container.innerHTML = `
        <div class="withdraw-page">
          <div class="page-header">
            <h1>Withdraw</h1>
            <p>Convert your coins to real rewards!</p>
          </div>
          <div class="withdraw-balance">
            <span>Available:
              <strong>${UIHelpers.formatCoins(balance)}</strong>
              (${UIHelpers.formatUSD(
                balance / AppState.COIN_RATE
              )})</span>
          </div>
          <div class="withdraw-minimum">
            <span>Minimum: ${minWD.toLocaleString()} coins
              ($${(minWD / AppState.COIN_RATE).toFixed(2)})</span>
          </div>
          <div class="withdraw-methods" id="withdraw-methods">
            ${this.methods.map((m) => `
              <div class="withdraw-method-card"
                data-method="${m.id}"
                ${balance < m.minWithdrawal
                  ? "data-locked" : ""}>
                <i data-feather="${m.icon}"></i>
                <h3>${m.name}</h3>
                <p>Min: ${m.minWithdrawal.toLocaleString()} coins</p>
                <p>Fee: ${(m.fee * 100).toFixed(0)}%</p>
                ${balance < m.minWithdrawal
                  ? '<span class="method-locked">Insufficient</span>'
                  : ""}
              </div>`).join("")}
          </div>
          <div id="withdraw-form-container"
            style="display:none;"></div>
          <div class="withdraw-history">
            <h2>Withdrawal History</h2>
            <div id="withdrawal-history-list"></div>
          </div>
        </div>`;
      await this.getWithdrawalHistory();
    } catch (error) {
      console.error("Error loading withdrawal methods:", error);
    }
  },
  async requestWithdrawal(method, amount, details) {
    try {
      if (!AppState.currentUser) {
        throw new Error("Not authenticated.");
      }
      const methodInfo =
        this.methods.find((m) => m.id === method);
      if (!methodInfo) throw new Error("Invalid method.");
      if (amount < methodInfo.minWithdrawal) {
        throw new Error("Minimum withdrawal for " +
          methodInfo.name + " is " +
          methodInfo.minWithdrawal.toLocaleString() +
          " coins.");
      }
      if (AppState.wallet.available < amount) {
        throw new Error("Insufficient balance.");
      }
      const fee = this.calculateFee(amount, method);
      const total = amount + fee;
      if (AppState.wallet.available < total) {
        throw new Error("Insufficient balance with fee.");
      }
      await AntiFraudModule.checkDuplicateAccount();
      const riskScore = await AntiFraudModule.getRiskScore(
        AppState.currentUser.uid
      );
      if (riskScore > 80) {
        throw new Error("Account under review.");
      }
      await WalletModule.freezeCoins(
        total, "withdrawal_" + method
      );
      const orderRef =
        await db.collection("withdrawals").add({
        userId: AppState.currentUser.uid,
        method: method,
        methodName: methodInfo.name,
        amount: amount,
        fee: fee,
        total: total,
        details: details,
        status: "pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      UIHelpers.showToast("info", "Withdrawal Submitted",
        "Your withdrawal is being processed.");
      return orderRef.id;
    } catch (error) {
      console.error("Error requesting withdrawal:", error);
      UIHelpers.showToast("error", "Withdrawal Failed",
        error.message);
      throw error;
    }
  },
  getMinWithdrawal() {
    return Math.min(...this.methods.map((m) => m.minWithdrawal));
  },
  calculateFee(amount, method) {
    const m = this.methods.find((m) => m.id === method);
    return m ? Math.ceil(amount * m.fee) : 0;
  },
  async getWithdrawalHistory() {
    try {
      if (!AppState.currentUser) return [];
      const snapshot = await db.collection("withdrawals")
        .where("userId", "==", AppState.currentUser.uid)
        .orderBy("createdAt", "desc").limit(20).get();
      const withdrawals = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() })
      );
      const container =
        document.getElementById("withdrawal-history-list");
      if (container) {
        if (withdrawals.length === 0) {
          container.innerHTML =
            '<div class="empty-state"><p>No history</p></div>';
        } else {
          container.innerHTML = withdrawals.map((w) => `
            <div class="withdrawal-item"
              data-withdrawal-id="${w.id}">
              <div class="withdrawal-info">
                <span class="withdrawal-method">
                  ${w.methodName || w.method}</span>
                <span class="withdrawal-date">
                  ${UIHelpers.formatDate(w.createdAt)}</span>
              </div>
              <div class="withdrawal-amount">
                ${w.amount.toLocaleString()} coins</div>
              <div class="withdrawal-status status-${w.status}">
                ${w.status}</div>
              ${w.status === "pending"
                ? '<button class="btn btn-danger btn-xs cancel-withdrawal-btn" data-withdrawal-id="' + w.id + '">Cancel</button>'
                : ""}
            </div>`).join("");
        }
      }
      return withdrawals;
    } catch (error) {
      console.error("Error loading withdrawal history:", error);
      return [];
    }
  },
  async cancelWithdrawal(withdrawalId) {
    try {
      if (!AppState.currentUser) return;
      const doc = await db.collection("withdrawals")
        .doc(withdrawalId).get();
      if (!doc.exists) return;
      const w = doc.data();
      if (w.userId !== AppState.currentUser.uid) return;
      if (w.status !== "pending") {
        UIHelpers.showToast("warning", "Cannot Cancel",
          "This withdrawal cannot be cancelled.");
        return;
      }
      await db.collection("withdrawals")
        .doc(withdrawalId).update({
        status: "cancelled",
        cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await WalletModule.unfreezeCoins(
        w.total,
        "withdrawal_cancel_" + withdrawalId
      );
      UIHelpers.showToast("success", "Cancelled",
        "Withdrawal cancelled. Coins refunded.");
      await this.getWithdrawalHistory();
    } catch (error) {
      console.error("Error cancelling withdrawal:", error);
    }
  }
};

// ============================================================
// 17. TRANSACTIONS MODULE
// ============================================================

const TransactionsModule = {
  lastDoc: null,
  pageSize: 20,
  async loadTransactions(append = false) {
    try {
      if (!AppState.currentUser) return [];
      let query = db.collection("transactions")
        .where("userId", "==", AppState.currentUser.uid)
        .orderBy("createdAt", "desc")
        .limit(this.pageSize);
      if (append && this.lastDoc) {
        query = query.startAfter(this.lastDoc);
      }
      const snapshot = await query.get();
      if (snapshot.empty) {
        if (!append) {
          const el = document.getElementById(
            "transactions-list"
          );
          if (el) el.innerHTML =
            '<div class="empty-state"><p>No transactions yet.</p></div>';
        }
        return [];
      }
      this.lastDoc =
        snapshot.docs[snapshot.docs.length - 1];
      const txns = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() })
      );
      if (!append) AppState.transactions = [];
      AppState.transactions.push(...txns);
      const el =
        document.getElementById("transactions-list");
      if (el) {
        if (!append) el.innerHTML = "";
        txns.forEach((t) => {
          el.insertAdjacentHTML(
            "beforeend",
            this.renderTransaction(t)
          );
        });
      }
      UIHelpers.initTooltips();
      return txns;
    } catch (error) {
      console.error("Error loading transactions:", error);
      return [];
    }
  },
  renderTransaction(txn) {
    const isCredit = (txn.type === "credit");
    const icon = isCredit ? "arrow-up-left" : "arrow-down-right";
    const cls = isCredit ? "txn-credit" : "txn-debit";
    return `
      <div class="transaction-item ${cls}">
        <div class="txn-icon">
          <i data-feather="${icon}"></i>
        </div>
        <div class="txn-details">
          <span class="txn-desc">
            ${txn.description || txn.source || "Transaction"}
          </span>
          <span class="txn-date">
            ${UIHelpers.formatDate(txn.createdAt)}</span>
          <span class="txn-status status-${txn.status || "completed"}">
            ${txn.status || "completed"}</span>
        </div>
        <div class="txn-amount ${isCredit
          ? "credit" : "debit"}">
          ${isCredit ? "+" : "-"}
          ${UIHelpers.formatCoins(Math.abs(txn.amount || 0))}
        </div>
      </div>`;
  },
  async getTransactionsPage(filter = "all") {
    try {
      if (!AppState.currentUser) return [];
      let query = db.collection("transactions")
        .where("userId", "==", AppState.currentUser.uid);
      if (filter !== "all") {
        query = query.where("type", "==", filter);
      }
      const snapshot = await query
        .orderBy("createdAt", "desc").limit(50).get();
      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() })
      );
    } catch (error) {
      console.error("Error getting transactions page:", error);
      return [];
    }
  },
  renderTransactionsPage() {
    const container =
      document.getElementById("main-content") ||
      document.querySelector(".main-content");
    if (!container) return;
    container.innerHTML = `
      <div class="transactions-page">
        <div class="page-header">
          <h1>Transaction History</h1>
        </div>
        <div class="txn-filters" id="txn-filters">
          <button class="tab-btn active"
            data-filter="all">All</button>
          <button class="tab-btn"
            data-filter="credit">Credits</button>
          <button class="tab-btn"
            data-filter="debit">Debits</button>
        </div>
        <div class="transactions-list"
          id="transactions-list"></div>
        <button class="btn btn-ghost btn-block load-more-txn-btn"
          id="load-more-txn-btn">
          Load More
        </button>
      </div>`;
    this.lastDoc = null;
    this.loadTransactions();
    UIHelpers.initTabs();
  }
};

// ============================================================
// 18. REFERRALS MODULE
// ============================================================

const ReferralsModule = {
  async loadReferrals() {
    try {
      if (!AppState.currentUser) return null;
      const userDoc = await db.collection("users")
        .doc(AppState.currentUser.uid).get();
      if (!userDoc.exists) return null;
      const userData = userDoc.data();
      const referralsSnap = await db.collection("referrals")
        .where("referrerId", "==",
          AppState.currentUser.uid)
        .orderBy("createdAt", "desc").get();
      const referrals = referralsSnap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() })
      );
      const stats = {
        totalReferrals: referrals.length,
        activeReferrals: referrals.filter(
          (r) => r.status === "active"
        ).length,
        totalEarned: referrals.reduce(
          (sum, r) => sum + (r.earned || 0), 0
        ),
        pending: referrals.filter(
          (r) => r.status === "pending"
        ).length
      };
      return {
        code: userData.referralCode || "",
        link: this.generateReferralLink(
          userData.referralCode || ""
        ),
        stats: stats,
        referrals: referrals,
        referralEarning: userData.referralEarning || 0,
        referralCount: userData.referralCount || 0
      };
    } catch (error) {
      console.error("Error loading referrals:", error);
      return null;
    }
  },
  generateReferralCode() {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(
        Math.floor(Math.random() * chars.length)
      );
    }
    return code;
  },
  generateReferralLink(code) {
    if (!code) return "";
    const base = window.location.origin +
      window.location.pathname;
    return base + "?ref=" + code;
  },
  async createReferralCode(userId) {
    try {
      const userDoc =
        await db.collection("users").doc(userId).get();
      if (!userDoc.exists) return "";
      const existing = userDoc.data().referralCode;
      if (existing) return existing;
      let code;
      let unique = false;
      while (!unique) {
        code = this.generateReferralCode();
        const existingRef = await db.collection("users")
          .where("referralCode", "==", code).limit(1).get();
        unique = existingRef.empty;
      }
      await db.collection("users").doc(userId).update({
        referralCode: code
      });
      return code;
    } catch (error) {
      console.error("Error creating referral code:", error);
      return "";
    }
  },
  async applyReferral(newUserId, referralCode) {
    try {
      if (!referralCode) return;
      const referrerSnap = await db.collection("users")
        .where("referralCode", "==", referralCode)
        .limit(1).get();
      if (referrerSnap.empty) return;
      const referrer = referrerSnap.docs[0];
      if (referrer.id === newUserId) return;
      await db.collection("referrals").add({
        referrerId: referrer.id,
        referredId: newUserId,
        referralCode: referralCode,
        status: "active",
        earned: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await db.collection("users").doc(referrer.id).update({
        referralCount: firebase.firestore.FieldValue.increment(1)
      });
      const bonusAmount = 2000;
      await WalletModule.addCoins(
        bonusAmount, "bonus",
        "Referral bonus for inviting a friend!",
        newUserId
      );
      await NotificationsModule.createNotification(
        referrer.id,
        "referral", "New Referral!",
        "Someone joined using your code! You earned " +
          UIHelpers.formatCoins(bonusAmount) + " coins.",
        { referredId: newUserId }
      );
    } catch (error) {
      console.error("Error applying referral:", error);
    }
  },
  async claimReferralEarnings() {
    try {
      if (!AppState.currentUser) return;
      const pendingRef = await db.collection("referrals")
        .where("referrerId", "==",
          AppState.currentUser.uid)
        .where("earningsPending", ">", 0).get();
      let totalPending = 0;
      for (const doc of pendingRef.docs) {
        const data = doc.data();
        totalPending += data.earningsPending || 0;
        await doc.ref.update({
          earned: firebase.firestore.FieldValue.increment(
            data.earningsPending
          ),
          earningsPending: 0,
          lastClaimAt:
            firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      if (totalPending > 0) {
        await WalletModule.addCoins(
          totalPending, "bonus",
          "Referral earnings claim",
          "referral_claim_" +
            firebase.firestore.FieldValue.serverTimestamp()
        );
        UIHelpers.showToast("success", "Earnings Claimed!",
          "You earned " +
          UIHelpers.formatCoins(totalPending) + " coins!");
      }
    } catch (error) {
      console.error("Error claiming referral earnings:", error);
    }
  }
};

// ============================================================
// 19. LEADERBOARD MODULE
// ============================================================

const LeaderboardModule = {
  async loadLeaderboard(period = "weekly") {
    try {
      const now = new Date();
      let startDate;
      if (period === "daily") {
        startDate = new Date(
          now.getFullYear(), now.getMonth(), now.getDate()
        );
      } else if (period === "weekly") {
        startDate = new Date(now);
        startDate.setDate(
          startDate.getDate() - startDate.getDay()
        );
      } else {
        startDate = new Date(
          now.getFullYear(), now.getMonth(), 1
        );
      }
      const snapshot = await db.collection("leaderboard")
        .where("period", "==", period)
        .where("date", ">=",
          firebase.firestore.Timestamp.fromDate(startDate))
        .orderBy("coinsEarned", "desc").limit(100).get();
      const entries = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() })
      );
      const container =
        document.getElementById("main-content") ||
        document.querySelector(".main-content");
      if (container) {
        container.innerHTML = `
          <div class="leaderboard-page">
            <div class="page-header">
              <h1>Leaderboard</h1>
            </div>
            <div class="lb-tabs" id="lb-tabs">
              <button class="tab-btn ${period === "daily" ? "active" : ""}"
                data-period="daily">Daily</button>
              <button class="tab-btn ${period === "weekly" ? "active" : ""}"
                data-period="weekly">Weekly</button>
              <button class="tab-btn ${period === "monthly" ? "active" : ""}"
                data-period="monthly">Monthly</button>
            </div>
            <div class="lb-table" id="lb-table">
              ${entries.length > 0
                ? '<div class="lb-row lb-header"><div class="lb-rank">#</div><div class="lb-user">User</div><div class="lb-coins">Coins Earned</div><div class="lb-offers">Offers</div></div>' +
                  entries.map((e, i) =>
                    this.renderLeaderboardEntry(e, i + 1)
                  ).join("")
                : '<div class="empty-state"><p>No entries yet.</p></div>'}
            </div>
          </div>`;
        UIHelpers.initTabs();
      }
      return entries;
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      return [];
    }
  },
  renderLeaderboardEntry(entry, rank) {
    const medals = ["", "first", "second", "third"];
    const medalCls = rank <= 3 ? " medal-" + medals[rank] : "";
    const isUser =
      AppState.currentUser &&
      entry.userId === AppState.currentUser.uid;
    return `
      <div class="lb-row ${isUser ? "lb-row-current" : ""}${medalCls}">
        <div class="lb-rank">${rank}</div>
        <div class="lb-user">
          <img src="${entry.avatar || "https://ui-avatars.com/api/?name=" +
            encodeURIComponent(entry.displayName || "User") +
            "&background=random&size=40"}"
            alt="" class="lb-avatar" loading="lazy" />
          <span>${entry.displayName || "Anonymous"}</span>
        </div>
        <div class="lb-coins">
          ${(entry.coinsEarned || 0).toLocaleString()}</div>
        <div class="lb-offers">
          ${entry.offersCompleted || 0}</div>
      </div>`;
  },
  async updateLeaderboardEntry(userId, coins, offers) {
    try {
      const now = new Date();
      const periods = ["daily", "weekly", "monthly"];
      for (const period of periods) {
        let dateKey;
        if (period === "daily") {
          dateKey = now.toISOString().split("T")[0];
        } else if (period === "weekly") {
          const ws = new Date(now);
          ws.setDate(ws.getDate() - ws.getDay());
          dateKey = ws.toISOString().split("T")[0];
        } else {
          dateKey = now.getFullYear() + "-" +
            String(now.getMonth() + 1).padStart(2, "0");
        }
        const userDoc = await db.collection("users")
          .doc(userId).get();
        const userData = userDoc.exists
          ? userDoc.data() : {};
        const existing = await db.collection("leaderboard")
          .where("userId", "==", userId)
          .where("period", "==", period)
          .where("dateKey", "==", dateKey).limit(1).get();
        const entryData = {
          userId: userId,
          displayName: userData.displayName || "Anonymous",
          avatar: userData.avatarURL || "",
          period: period,
          dateKey: dateKey,
          date: firebase.firestore.Timestamp.fromDate(now),
          coinsEarned: firebase.firestore.FieldValue.increment(coins),
          offersCompleted:
            firebase.firestore.FieldValue.increment(offers || 0),
          lastUpdated:
            firebase.firestore.FieldValue.serverTimestamp()
        };
        if (existing.empty) {
          await db.collection("leaderboard").add(entryData);
        } else {
          await existing.docs[0].ref.update(entryData);
        }
      }
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }
  }
};

// ============================================================
// 20. NOTIFICATIONS MODULE
// ============================================================

const NotificationsModule = {
  listener: null,
  async loadNotifications() {
    try {
      if (!AppState.currentUser) return [];
      const snapshot = await db.collection("notifications")
        .where("userId", "==", AppState.currentUser.uid)
        .orderBy("createdAt", "desc").limit(50).get();
      AppState.notifications = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() })
      );
      return AppState.notifications;
    } catch (error) {
      console.error("Error loading notifications:", error);
      return [];
    }
  },
  renderNotificationsPage() {
    const container =
      document.getElementById("main-content") ||
      document.querySelector(".main-content");
    if (!container) return;
    container.innerHTML = `
      <div class="notifications-page">
        <div class="page-header">
          <h1>Notifications</h1>
          <button class="btn btn-ghost"
            id="mark-all-read-btn">
            Mark all as read
          </button>
        </div>
        <div class="notifications-list"
          id="notifications-list">
          ${AppState.notifications.length > 0
            ? AppState.notifications.map(
                (n) => this.renderNotification(n)
              ).join("")
            : '<div class="empty-state"><p>No notifications.</p></div>'}
        </div>
      </div>`;
  },
  renderNotification(notif) {
    const readCls = notif.read ? "notif-read" : "notif-unread";
    const iconMap = {
      "coin_earned": "dollar-sign",
      "withdrawal": "credit-card",
      "referral": "users",
      "ad_watched": "play-circle",
      "purchase": "gift",
      "promo": "percent",
      "system": "info",
      "order_update": "package"
    };
    return `
      <div class="notification-item ${readCls}"
        data-notif-id="${notif.id}">
        <div class="notif-icon">
          <i data-feather="${iconMap[notif.type] || "bell"}"></i>
        </div>
        <div class="notif-content">
          <h4>${notif.title || "Notification"}</h4>
          <p>${notif.message || ""}</p>
          <span class="notif-time">
            ${UIHelpers.formatDate(notif.createdAt)}</span>
        </div>
        ${!notif.read
          ? '<button class="notif-read-btn" data-notif-id="' + notif.id + '"><i data-feather="check"></i></button>'
          : ""}
      </div>`;
  },
  async createNotification(userId, type, title, message, data) {
    try {
      await db.collection("notifications").add({
        userId: userId,
        type: type,
        title: title,
        message: message,
        data: data || {},
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  },
  async markAsRead(notifId) {
    try {
      await db.collection("notifications")
        .doc(notifId).update({
        read: true,
        readAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      const item = document.querySelector(
        '[data-notif-id="' + notifId + '"]'
      );
      if (item) {
        item.classList.remove("notif-unread");
        item.classList.add("notif-read");
        const btn =
          item.querySelector(".notif-read-btn");
        if (btn) btn.remove();
      }
    } catch (error) {
      console.error("Error marking notification:", error);
    }
  },
  async markAllAsRead() {
    try {
      if (!AppState.currentUser) return;
      const unread = AppState.notifications.filter(
        (n) => !n.read
      );
      const batch = db.batch();
      unread.forEach((n) => {
        const ref =
          db.collection("notifications").doc(n.id);
        batch.update(ref, { read: true });
      });
      await batch.commit();
      AppState.notifications.forEach(
        (n) => (n.read = true)
      );
      this.renderNotificationsPage();
      UIHelpers.showToast("success", "Done",
        "All notifications marked as read.");
    } catch (error) {
      console.error("Error marking all read:", error);
    }
  },
  startListener() {
    if (!AppState.currentUser) return;
    if (this.listener) this.listener();
    this.listener = db.collection("notifications")
      .where("userId", "==", AppState.currentUser.uid)
      .where("read", "==", false)
      .orderBy("createdAt", "desc")
      .limit(10)
      .onSnapshot((snapshot) => {
        const count = snapshot.size;
        this.updateBadge(count);
        if (count > 0 && !snapshot.metadata.fromCache) {
          const latest = snapshot.docs[0].data();
          UIHelpers.showToast(
            "info", latest.title, latest.message
          );
        }
      });
  },
  stopListener() {
    if (this.listener) {
      this.listener();
      this.listener = null;
    }
  },
  updateBadge(count) {
    const badges = document.querySelectorAll(
      ".notif-badge, .notification-badge"
    );
    badges.forEach((badge) => {
      badge.textContent = count;
      badge.style.display = count > 0 ? "flex" : "none";
    });
    const navBadge =
      document.getElementById("nav-notif-badge");
    if (navBadge) {
      navBadge.textContent = count;
      navBadge.style.display = count > 0 ? "flex" : "none";
    }
  },
  getUnreadCount() {
    return AppState.notifications.filter(
      (n) => !n.read
    ).length;
  }
};

// ============================================================
// 21. PROFILE MODULE
// ============================================================

const ProfileModule = {
  async loadProfilePage() {
    try {
      if (!AppState.currentUser) return null;
      const userDoc = await db.collection("users")
        .doc(AppState.currentUser.uid).get();
      if (!userDoc.exists) return null;
      const userData = userDoc.data();
      const container =
        document.getElementById("main-content") ||
        document.querySelector(".main-content");
      if (container) {
        container.innerHTML = `
          <div class="profile-page">
            <div class="profile-header">
              <div class="profile-avatar-container">
                <img src="${userData.avatarURL ||
                  "https://ui-avatars.com/api/?name=" +
                    encodeURIComponent(
                      userData.displayName || "U"
                    ) + "&background=random&size=128"}"
                  alt="" class="profile-avatar"
                  id="profile-avatar" />
                <label class="avatar-upload-btn"
                  for="avatar-upload-input">
                  <i data-feather="camera"></i>
                </label>
                <input type="file" id="avatar-upload-input"
                  accept="image/*" style="display:none;" />
              </div>
              <h2>${userData.displayName || "User"}</h2>
              <p class="profile-email">
                ${AppState.currentUser.email}</p>
              <span class="profile-member-since">
                Member since ${UIHelpers.formatDate(
                  userData.createdAt
                )}</span>
            </div>
            <form class="profile-form" id="profile-form">
              <div class="form-group">
                <label for="profile-name">Display Name</label>
                <input type="text" id="profile-name"
                  class="form-input"
                  value="${userData.displayName || ""}"
                  placeholder="Your name" />
              </div>
              <div class="form-group">
                <label for="profile-bio">Bio</label>
                <textarea id="profile-bio" class="form-textarea"
                  placeholder="Tell us about yourself"
                  rows="3">${userData.bio || ""}</textarea>
              </div>
              <div class="form-group">
                <label for="profile-country">Country</label>
                <select id="profile-country" class="form-select">
                  <option value="">Select country</option>
                  <option value="US" ${userData.country === "US"
                    ? "selected" : ""}>United States</option>
                  <option value="GB" ${userData.country === "GB"
                    ? "selected" : ""}>United Kingdom</option>
                  <option value="CA" ${userData.country === "CA"
                    ? "selected" : ""}>Canada</option>
                  <option value="DE" ${userData.country === "DE"
                    ? "selected" : ""}>Germany</option>
                  <option value="FR" ${userData.country === "FR"
                    ? "selected" : ""}>France</option>
                  <option value="MA" ${userData.country === "MA"
                    ? "selected" : ""}>Morocco</option>
                  <option value="OTHER" ${userData.country === "OTHER"
                    ? "selected" : ""}>Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Date of Birth</label>
                <input type="date" id="profile-dob"
                  class="form-input"
                  value="${userData.dateOfBirth || ""}" />
              </div>
              <div class="form-actions">
                <button type="submit"
                  class="btn btn-primary">
                  Save Changes
                </button>
                <button type="button"
                  class="btn btn-ghost"
                  id="change-password-btn">
                  Change Password
                </button>
              </div>
            </form>
          </div>`;
        this.setupProfileListeners(userData);
      }
      return userData;
    } catch (error) {
      console.error("Error loading profile:", error);
      return null;
    }
  },
  setupProfileListeners(currentData) {
    const form =
      document.getElementById("profile-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name =
          document.getElementById("profile-name").value;
        const bio =
          document.getElementById("profile-bio").value;
        const country =
          document.getElementById("profile-country").value;
        const dob =
          document.getElementById("profile-dob").value;
        await this.updateProfile(
          { displayName: name, bio, country,
            dateOfBirth: dob }
        );
      });
    }
    const avatarInput =
      document.getElementById("avatar-upload-input");
    if (avatarInput) {
      avatarInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (file) await this.uploadAvatar(file);
      });
    }
    const pwdBtn =
      document.getElementById("change-password-btn");
    if (pwdBtn) {
      pwdBtn.addEventListener("click", () => {
        this.showChangePasswordModal();
      });
    }
  },
  async updateProfile(updates) {
    try {
      if (!AppState.currentUser) return;
      const safeUpdates = {};
      const allowed = [
        "displayName", "bio", "country", "dateOfBirth"
      ];
      allowed.forEach((key) => {
        if (updates[key] !== undefined) {
          safeUpdates[key] = updates[key];
        }
      });
      await db.collection("users")
        .doc(AppState.currentUser.uid).update(safeUpdates);
      if (safeUpdates.displayName) {
        await AppState.currentUser.updateProfile({
          displayName: safeUpdates.displayName
        });
      }
      UIHelpers.showToast("success", "Profile Updated",
        "Your profile has been saved.");
    } catch (error) {
      console.error("Error updating profile:", error);
      UIHelpers.showToast("error", "Error",
        "Failed to update profile.");
    }
  },
  async uploadAvatar(file) {
    try {
      if (!AppState.currentUser) return;
      if (file.size > 5 * 1024 * 1024) {
        UIHelpers.showToast("warning", "File Too Large",
          "Max 5MB allowed.");
        return;
      }
      const path =
        "avatars/" + AppState.currentUser.uid +
        "/" + file.name;
      const ref = storage.ref().child(path);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      await db.collection("users")
        .doc(AppState.currentUser.uid)
        .update({ avatarURL: url });
      const avatarImg =
        document.getElementById("profile-avatar");
      if (avatarImg) avatarImg.src = url;
      UIHelpers.showToast("success", "Avatar Updated",
        "Your avatar has been changed.");
    } catch (error) {
      console.error("Error uploading avatar:", error);
    }
  },
  showChangePasswordModal() {
    const modal = document.createElement("div");
    modal.className = "modal active";
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h3>Change Password</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="change-pwd-form">
            <div class="form-group">
              <label>New Password</label>
              <input type="password" id="new-pwd-input"
                class="form-input" minlength="6" />
            </div>
            <div class="form-group">
              <label>Confirm Password</label>
              <input type="password" id="confirm-pwd-input"
                class="form-input" minlength="6" />
            </div>
            <button type="submit"
              class="btn btn-primary btn-block">
              Update Password</button>
          </form>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector(".modal-overlay")
      .addEventListener("click", () => modal.remove());
    modal.querySelector(".modal-close")
      .addEventListener("click", () => modal.remove());
    modal.querySelector("#change-pwd-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const pwd =
          document.getElementById("new-pwd-input").value;
        const confirm =
          document.getElementById("confirm-pwd-input").value;
        if (pwd !== confirm) {
          UIHelpers.showToast("error", "Mismatch",
            "Passwords don't match.");
          return;
        }
        try {
          await AppState.currentUser.updatePassword(pwd);
          modal.remove();
          UIHelpers.showToast("success", "Password Changed",
            "Your password has been updated.");
        } catch (error) {
          UIHelpers.showToast("error", "Error",
            error.message);
        }
      });
  }
};

// ============================================================
// 22. SUPPORT MODULE
// ============================================================

const SupportModule = {
  async submitTicket(subject, message, category) {
    try {
      if (!AppState.currentUser) {
        UIHelpers.showToast("warning", "Login Required",
          "Please log in to submit a ticket.");
        return;
      }
      await db.collection("support_tickets").add({
        userId: AppState.currentUser.uid,
        email: AppState.currentUser.email,
        subject: subject,
        message: message,
        category: category || "general",
        status: "open",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      UIHelpers.showToast("success", "Ticket Submitted",
        "We'll get back to you soon!");
      await NotificationsModule.createNotification(
        AppState.currentUser.uid, "system",
        "Support Ticket", "Your ticket has been received.",
        {}
      );
    } catch (error) {
      console.error("Error submitting ticket:", error);
      UIHelpers.showToast("error", "Error",
        "Failed to submit ticket.");
    }
  },
  async loadMyTickets() {
    try {
      if (!AppState.currentUser) return [];
      const snapshot = await db.collection("support_tickets")
        .where("userId", "==", AppState.currentUser.uid)
        .orderBy("createdAt", "desc").limit(20).get();
      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() })
      );
    } catch (error) {
      console.error("Error loading tickets:", error);
      return [];
    }
  },
  renderSupportPage() {
    const container =
      document.getElementById("main-content") ||
      document.querySelector(".main-content");
    if (!container) return;
    container.innerHTML = `
      <div class="support-page">
        <div class="page-header">
          <h1>Support</h1>
        </div>
        <div class="support-options">
          <div class="support-card" id="new-ticket-card">
            <i data-feather="message-circle"></i>
            <h3>Submit a Ticket</h3>
            <p>Get help from our support team.</p>
          </div>
          <div class="support-card" id="my-tickets-card">
            <i data-feather="list"></i>
            <h3>My Tickets</h3>
            <p>View your support tickets.</p>
          </div>
          <div class="support-card" id="faq-link-card">
            <i data-feather="help-circle"></i>
            <h3>FAQ</h3>
            <p>Find answers to common questions.</p>
          </div>
        </div>
        <div id="support-content"></div>
      </div>`;
    document.getElementById("new-ticket-card")
      ?.addEventListener("click", () => {
        this.renderTicketForm();
      });
    document.getElementById("my-tickets-card")
      ?.addEventListener("click", async () => {
        await this.renderMyTickets();
      });
    document.getElementById("faq-link-card")
      ?.addEventListener("click", () => {
        window.location.hash = "#/faq";
      });
  },
  renderTicketForm() {
    const el =
      document.getElementById("support-content");
    if (!el) return;
    el.innerHTML = `
      <form id="ticket-form" class="ticket-form">
        <div class="form-group">
          <label>Category</label>
          <select id="ticket-category" class="form-select">
            <option value="general">General</option>
            <option value="payment">Payment</option>
            <option value="account">Account</option>
            <option value="offer">Offers</option>
            <option value="bug">Bug Report</option>
          </select>
        </div>
        <div class="form-group">
          <label>Subject</label>
          <input type="text" id="ticket-subject"
            class="form-input" required />
        </div>
        <div class="form-group">
          <label>Message</label>
          <textarea id="ticket-message"
            class="form-textarea" rows="5" required></textarea>
        </div>
        <button type="submit"
          class="btn btn-primary btn-block">
          Submit Ticket</button>
      </form>`;
    document.getElementById("ticket-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.submitTicket(
          document.getElementById("ticket-subject").value,
          document.getElementById("ticket-message").value,
          document.getElementById("ticket-category").value
        );
      });
  },
  async renderMyTickets() {
    const el =
      document.getElementById("support-content");
    if (!el) return;
    const tickets = await this.loadMyTickets();
    el.innerHTML = `
      <div class="tickets-list">
        ${tickets.length > 0
          ? tickets.map((t) => `
            <div class="ticket-item"
              data-ticket-id="${t.id}">
              <div class="ticket-info">
                <h4>${t.subject}</h4>
                <span class="ticket-category">${t.category}</span>
                <span class="ticket-date">
                  ${UIHelpers.formatDate(t.createdAt)}</span>
              </div>
              <span class="ticket-status status-${t.status}">
                ${t.status}</span>
            </div>`).join("")
          : '<div class="empty-state"><p>No tickets yet.</p></div>'}
      </div>`;
  }
};

// ============================================================
// 23. ANTI-FRAUD MODULE
// ============================================================

const AntiFraudModule = {
  async checkDuplicateAccount() {
    try {
      if (!AppState.currentUser) return false;
      const ip = await this.getIP();
      const fp = this.getDeviceFingerprint();
      const ipSnap = await db.collection("user_fingerprints")
        .where("ip", "==", ip).limit(5).get();
      if (ipSnap.size > 3) {
        await this.flagSuspicious(
          AppState.currentUser.uid,
          "multiple_accounts_ip"
        );
        return true;
      }
      const fpSnap = await db.collection("user_fingerprints")
        .where("fingerprint", "==", fp).limit(5).get();
      if (fpSnap.size > 2) {
        await this.flagSuspicious(
          AppState.currentUser.uid,
          "multiple_accounts_fp"
        );
        return true;
      }
      await this.recordFingerprint(
        AppState.currentUser.uid, ip, fp
      );
      return false;
    } catch (error) {
      console.error("Error checking duplicate:", error);
      return false;
    }
  },
  async recordFingerprint(userId, ip, fingerprint) {
    try {
      await db.collection("user_fingerprints").add({
        userId: userId,
        ip: ip,
        fingerprint: fingerprint,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error("Error recording fingerprint:", error);
    }
  },
  async getIP() {
    try {
      const resp = await fetch(
        "https://api.ipify.org?format=json"
      );
      const data = await resp.json();
      return data.ip;
    } catch {
      return "unknown";
    }
  },
  getDeviceFingerprint() {
    const c = [];
    c.push(navigator.userAgent);
    c.push(screen.width + "x" + screen.height);
    c.push(navigator.language);
    c.push(new Date().getTimezoneOffset());
    let hash = 0;
    const str = c.join("|");
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return "fp_" + Math.abs(hash).toString(36);
  },
  async flagSuspicious(userId, reason) {
    try {
      await db.collection("fraud_flags").add({
        userId: userId,
        reason: reason,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        reviewed: false
      });
      await db.collection("users").doc(userId).update({
        suspended: true,
        suspendedReason: reason,
        suspendedAt:
          firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error("Error flagging account:", error);
    }
  },
  async getRiskScore(userId) {
    try {
      const flags = await db.collection("fraud_flags")
        .where("userId", "==", userId)
        .where("reviewed", "==", false).get();
      let score = 0;
      flags.forEach((doc) => {
        const r = doc.data().reason;
        if (r === "multiple_accounts_ip") score += 30;
        else if (r === "multiple_accounts_fp") score += 40;
        else if (r === "rapid_claims") score += 25;
        else if (r === "vpn_detected") score += 20;
        else score += 15;
      });
      return Math.min(100, score);
    } catch {
      return 0;
    }
  },
  async checkRapidClaims(userId) {
    try {
      const fiveMinAgo = new Date(
        Date.now() - 5 * 60 * 1000
      );
      const snap = await db.collection("offer_claims")
        .where("userId", "==", userId)
        .where("claimedAt", ">=",
          firebase.firestore.Timestamp.fromDate(fiveMinAgo))
        .get();
      if (snap.size >= 10) {
        await this.flagSuspicious(
          userId, "rapid_claims"
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
};

// ============================================================
// 24. UI HELPERS (additional)
// ============================================================

const UIHelpersExtended = {
  async initLazyImages() {
    const imgs = document.querySelectorAll("img[data-src]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
            observer.unobserve(img);
          }
        });
      }
    );
    imgs.forEach((img) => observer.observe(img));
  },
  setupInfiniteScroll(callback, sentinelId) {
    const sentinel =
      document.getElementById(sentinelId);
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callback();
        }
      }, { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return observer;
  },
  setupPullToRefresh(container, callback) {
    let startY = 0;
    let pulling = false;
    let indicator = null;
    const el = container || document.body;
    el.addEventListener("touchstart", (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].pageY;
        pulling = true;
      }
    });
    el.addEventListener("touchmove", (e) => {
      if (!pulling) return;
      const diff = e.touches[0].pageY - startY;
      if (diff > 0 && diff < 150) {
        if (!indicator) {
          indicator = document.createElement("div");
          indicator.className = "pull-refresh-indicator";
          indicator.innerHTML =
            '<i data-feather="refresh-cw"></i><span>Pull to refresh</span>';
          el.prepend(indicator);
          if (typeof feather !== "undefined")
            feather.replace();
        }
        indicator.style.transform =
          "translateY(" + (diff - 50) + "px)";
        indicator.style.opacity = diff / 120;
      }
    });
    el.addEventListener("touchend", async () => {
      if (indicator) {
        indicator.innerHTML =
          '<div class="spinner"></div><span>Refreshing...</span>';
        indicator.style.opacity = 1;
        indicator.style.transform = "translateY(0)";
        await callback();
        indicator.remove();
        indicator = null;
      }
      pulling = false;
    });
  },
  setupSearchBar(inputId, callback) {
    const input = document.getElementById(inputId);
    if (!input) return;
    let timeout;
    input.addEventListener("input", () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        callback(input.value.trim());
      }, 300);
    });
  },
  setupFilterButtons(containerId, callback) {
    const container =
      document.getElementById(containerId);
    if (!container) return;
    container.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-filter]");
      if (!btn) return;
      container.querySelectorAll(".tab-btn, .filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      callback(btn.dataset.filter);
    });
  },
  animateValue(element, start, end, duration) {
    const startTime = performance.now();
    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(
        start + (end - start) * eased
      );
      element.textContent = current.toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  },
  createToastContainer() {
    if (document.getElementById("toast-container")) return;
    const container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText =
      "position:fixed;top:20px;right:20px;z-index:10000;";
    document.body.appendChild(container);
  },
  async renderNotificationsDropdown() {
    const notifs = await NotificationsModule.loadNotifications();
    const unread = notifs.filter((n) => !n.read);
    return `
      <div class="notifications-dropdown">
        <div class="notif-dropdown-header">
          <h4>Notifications</h4>
          <button class="btn btn-ghost btn-xs"
            id="mark-all-read-top">
            Mark all read</button>
        </div>
        <div class="notif-dropdown-list">
          ${unread.length > 0
            ? unread.slice(0, 5).map(
                (n) => NotificationsModule.renderNotification(n)
              ).join("")
            : '<div class="empty-state"><p>No new notifications</p></div>'}
        </div>
        <a href="#/notifications"
          class="notif-dropdown-footer">
          View All Notifications</a>
      </div>`;
  },
  setupMobileNav() {
    const toggle =
      document.getElementById("mobile-nav-toggle");
    const nav =
      document.getElementById("mobile-nav") ||
      document.querySelector(".mobile-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        nav.classList.toggle("active");
        toggle.classList.toggle("active");
      });
    }
    const overlay =
      document.querySelector(".nav-overlay");
    if (overlay) {
      overlay.addEventListener("click", () => {
        nav?.classList.remove("active");
        toggle?.classList.remove("active");
      });
    }
  }
};

// ============================================================
// 25-27. EVENT LISTENERS & INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  UIHelpersExtended.createToastContainer();
  UIHelpersExtended.setupMobileNav();
  await initApp();
});

async function initApp() {
  try {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        AppState.currentUser = user;
        await AuthModule.checkAdminStatus();
        await AuthModule.loadUserProfile();
        await WalletModule.loadWallet();
        NotificationsModule.startListener();
        NotificationsModule.updateBadge(
          await NotificationsModule.getUnreadCount()
        );
      } else {
        AppState.currentUser = null;
        AppState.userProfile = null;
        AppState.isAdmin = false;
        NotificationsModule.stopListener();
      }
      await NavigationModule.init();
      UIHelpers.initFeatherIcons();
      UIHelpersExtended.initLazyImages();
    });
    window.addEventListener("hashchange", async () => {
      await NavigationModule.init();
      UIHelpers.initFeatherIcons();
    });
    document.addEventListener("click", (e) => {
      if (e.target.closest(".nav-link")) {
        const mobileNav =
          document.getElementById("mobile-nav") ||
          document.querySelector(".mobile-nav");
        if (mobileNav)
          mobileNav.classList.remove("active");
      }
      handleGlobalClick(e);
    });
  } catch (error) {
    console.error("App initialization error:", error);
  }
}

function handleGlobalClick(e) {
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id ||
    target.dataset.surveyId ||
    target.dataset.adId ||
    target.dataset.taskId ||
    target.dataset.challengeId ||
    target.dataset.rewardId ||
    target.dataset.gameId ||
    target.dataset.notifId ||
    target.dataset.withdrawalId;
  const actions = {
    "start-survey": () =>
      SurveysModule.startSurvey(id),
    "watch-ad": () => WatchAdsModule.watchAd(id),
    "claim-task": () => TasksModule.claimTask(id),
    "claim-challenge": () =>
      ChallengesModule.claimChallengeReward(id),
    "open-reward": () =>
      RewardsStoreModule.openRewardDetail(id),
    "purchase-reward": () =>
      RewardsStoreModule.purchaseReward(id),
    "select-game": () =>
      TopUpModule.selectGame(id),
    "cancel-withdrawal": () =>
      WithdrawalModule.cancelWithdrawal(id),
    "mark-notif-read": () =>
      NotificationsModule.markAsRead(id),
    "toggle-dropdown": (el) => {
      const dropdown = el.querySelector(
        ".dropdown-menu, .notifications-dropdown"
      );
      if (dropdown) dropdown.classList.toggle("active");
    }
  };
  if (actions[action]) {
    e.preventDefault();
    actions[action](target);
  }
}
