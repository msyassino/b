// ==========================================
// 1. Configuration & Constants
// ==========================================
const CONFIG = {
    COIN_TO_USD_RATE: 10000, // 10,000 Coins = $1.00
    MIN_WITHDRAWAL_COINS: 10000,
    ADMIN_UIDS: ['bxDznYJPD1el1wotLvzTUYynM873'], // استبدل هذا بـ UID الخاص بك كمدير
    SITE_URL: window.location.origin
};

// Destructure Firebase modules for cleaner code
const { 
    onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
    collection, doc, setDoc, getDoc, getDocs, updateDoc, increment, query, where, orderBy, limit, addDoc, serverTimestamp, runTransaction
} = window.firebaseModules;

const db = window.firebaseDb;
const auth = window.firebaseAuth;

// ==========================================
// 2. Utility Functions
// ==========================================
const formatCoins = (coins) => new Intl.NumberFormat('en-US').format(coins);
const formatUSD = (coins) => `$${(coins / CONFIG.COIN_TO_USD_RATE).toFixed(2)}`;
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    toast.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => { toast.remove(); }, 3000);
}

// ==========================================
// 3. Authentication Module
// ==========================================
let currentUser = null;
let userData = null;
let isAdmin = false;

const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authExtraFields = document.getElementById('auth-extra-fields');
let isLoginMode = true;

authToggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').textContent = isLoginMode ? 'تسجيل الدخول' : 'إنشاء حساب جديد';
    document.getElementById('auth-submit-btn').textContent = isLoginMode ? 'دخول' : 'تسجيل';
    authExtraFields.style.display = isLoginMode ? 'none' : 'block';
    authToggleBtn.textContent = isLoginMode ? 'سجل الآن' : 'لديك حساب بالفعل؟';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const submitBtn = document.getElementById('auth-submit-btn');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري المعالجة...';

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
            showToast('تم تسجيل الدخول بنجاح', 'success');
        } else {
            const username = document.getElementById('auth-username').value;
            const referralCode = document.getElementById('auth-referral').value;
            
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;
            
            const newUserRef = doc(db, 'users', uid);
            
            let referredBy = null;
            if (referralCode) {
                const refQuery = query(collection(db, 'users'), where('referralCode', '==', referralCode));
                const refSnapshot = await getDocs(refQuery);
                if (!refSnapshot.empty) {
                    referredBy = refSnapshot.docs[0].id;
                }
            }

            const userDoc = {
                uid,
                email,
                username: username || email.split('@')[0],
                role: 'user',
                status: 'verified', // verified, pending, restricted
                coins: {
                    available: 0,
                    pending: 0,
                    locked: 0,
                    lifetimeEarned: 0,
                    lifetimeSpent: 0
                },
                streak: { current: 0, lastClaim: null },
                referralCode: generateId().substring(0, 8).toUpperCase(),
                referredBy,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            };

            // Initial Ledger Entry
            const newLedgerRef = doc(collection(db, 'ledger'));
            await runTransaction(db, async (transaction) => {
                transaction.set(newUserRef, userDoc);
                transaction.set(newLedgerRef, {
                    uid, type: 'system', description: 'إنشاء حساب', amount: 0,
                    balanceBefore: 0, balanceAfter: 0, timestamp: serverTimestamp()
                });
            });

            showToast('تم إنشاء الحساب بنجاح', 'success');
        }
        authModal.classList.remove('active');
    } catch (error) {
        console.error(error);
        showToast(error.message.replace('Firebase:', ''), 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isLoginMode ? 'دخول' : 'تسجيل';
    }
});

document.getElementById('nav-logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        showToast('تم تسجيل الخروج', 'info');
        window.location.reload();
    });
});

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            isAdmin = userData.role === 'admin' || CONFIG.ADMIN_UIDS.includes(user.uid);
            
            document.getElementById('app-container').style.display = 'block';
            document.getElementById('nav-username').textContent = userData.username;
            document.getElementById('home-username').textContent = userData.username;
            
            const statusEl = document.getElementById('account-status');
            statusEl.textContent = userData.status.charAt(0).toUpperCase() + userData.status.slice(1);
            statusEl.className = `status-${userData.status}`;

            if (userData.status === 'restricted') {
                showToast('حسابك مقيد حالياً. يرجى التواصل مع الدعم.', 'error');
            }

            if (isAdmin) {
                document.querySelector('.admin-only').style.display = 'flex';
            }

            updateWalletUI();
            loadReferralData();
            
            await updateDoc(doc(db, 'users', user.uid), { lastLogin: serverTimestamp() });
        }
    } else {
        currentUser = null;
        userData = null;
        document.getElementById('app-container').style.display = 'none';
        authModal.classList.add('active');
    }
});

// ==========================================
// 4. Navigation & UI Module
// ==========================================
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (item.classList.contains('admin-only') && !isAdmin) return;
        
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        const viewId = item.getAttribute('data-view');
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');

        if (viewId === 'view-wallet') loadLedger();
        if (viewId === 'view-rewards') loadRewardsStore();
        if (viewId === 'view-daily') loadDailyStreak();
        if (viewId === 'view-admin' && isAdmin) loadAdminDashboard();
    });
});

function updateWalletUI() {
    if (!userData) return;
    const c = userData.coins;
    document.getElementById('nav-available-coins').textContent = formatCoins(c.available);
    document.getElementById('nav-pending-coins').textContent = formatCoins(c.pending);
    
    document.getElementById('home-available').textContent = `${formatCoins(c.available)} Coins`;
    document.getElementById('home-usd-available').textContent = formatUSD(c.available);
    document.getElementById('home-lifetime').textContent = `${formatCoins(c.lifetimeEarned)} Coins`;
    
    document.getElementById('w-available').textContent = formatCoins(c.available);
    document.getElementById('w-pending').textContent = formatCoins(c.pending);
    document.getElementById('w-locked').textContent = formatCoins(c.locked);
    document.getElementById('w-earned').textContent = formatCoins(c.lifetimeEarned);
    document.getElementById('w-spent').textContent = formatCoins(c.lifetimeSpent);
    
    document.getElementById('withdraw-available').textContent = formatCoins(c.available);
}

// ==========================================
// 5. Wallet & Ledger System (Core - Transactional)
// ==========================================
async function addLedgerEntry(uid, type, description, amount) {
    const userRef = doc(db, 'users', uid);
    const ledgerRef = doc(collection(db, 'ledger'));

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User does not exist!");
            
            const currentCoins = userDoc.data().coins;
            const balanceBefore = currentCoins.available;
            
            if (amount < 0 && balanceBefore + amount < 0) {
                throw new Error("رصيد غير كافٍ لإتمام هذه العملية");
            }

            let newAvailable = balanceBefore + amount;
            let newLifetimeEarned = currentCoins.lifetimeEarned + (amount > 0 ? amount : 0);
            let newLifetimeSpent = currentCoins.lifetimeSpent + (amount < 0 ? Math.abs(amount) : 0);

            transaction.update(userRef, {
                'coins.available': newAvailable,
                'coins.lifetimeEarned': newLifetimeEarned,
                'coins.lifetimeSpent': newLifetimeSpent
            });

            transaction.set(ledgerRef, {
                uid, type, description, amount,
                balanceBefore, balanceAfter: newAvailable,
                timestamp: serverTimestamp()
            });
        });
        
        const updatedDoc = await getDoc(userRef);
        userData = updatedDoc.data();
        updateWalletUI();
        return true;
    } catch (error) {
        console.error("Ledger transaction failed:", error);
        showToast(error.message, 'error');
        return false;
    }
}

async function loadLedger() {
    const tbody = document.querySelector('#ledger-table tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">جاري التحميل...</td></tr>';
    
    const q = query(collection(db, 'ledger'), where('uid', '==', currentUser.uid), orderBy('timestamp', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    
    tbody.innerHTML = '';
    if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا توجد معاملات حتى الآن</td></tr>';
        return;
    }

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString('ar-EG') : 'قيد المعالجة';
        const amountClass = data.amount > 0 ? 'text-success' : 'text-danger';
        const amountSign = data.amount > 0 ? '+' : '';
        
        tbody.innerHTML += `
            <tr>
                <td>${date}</td>
                <td>${data.type}</td>
                <td>${data.description}</td>
                <td class="${amountClass}">${amountSign}${formatCoins(data.amount)}</td>
                <td>${formatCoins(data.balanceBefore)}</td>
                <td>${formatCoins(data.balanceAfter)}</td>
                <td><span class="status-verified">مكتمل</span></td>
            </tr>
        `;
    });
}

// ==========================================
// 6. Features: Daily Rewards & Streaks
// ==========================================
function loadDailyStreak() {
    const calendar = document.getElementById('streak-calendar');
    calendar.innerHTML = '';
    const currentStreak = userData.streak.current || 0;
    
    for (let i = 1; i <= 7; i++) {
        const isClaimed = i <= (currentStreak % 7 === 0 ? 7 : currentStreak % 7);
        const isCurrent = i === (currentStreak % 7) + 1;
        const reward = i * 100;
        
        const div = document.createElement('div');
        div.className = `streak-day ${isClaimed ? 'claimed' : ''} ${isCurrent ? 'current' : ''}`;
        div.innerHTML = `
            <span class="day-num">${i}</span>
            <span class="day-reward">+${reward}</span>
            ${isClaimed ? '<i class="fas fa-check-circle text-success"></i>' : ''}
        `;
        calendar.appendChild(div);
    }
}

document.getElementById('claim-daily-btn').addEventListener('click', claimDailyReward);
document.getElementById('daily-claim-main-btn').addEventListener('click', claimDailyReward);

async function claimDailyReward() {
    if (userData.status === 'restricted') return showToast('الحساب مقيد', 'error');

    const now = new Date();
    const lastClaim = userData.streak.lastClaim ? userData.streak.lastClaim.toDate() : null;
    
    if (lastClaim && (now - lastClaim) < 86400000) {
        return showToast('لقد استلمت مكافأة اليوم بالفعل', 'warning');
    }

    const newStreak = (userData.streak.current || 0) + 1;
    const rewardAmount = newStreak * 100;

    const success = await addLedgerEntry(currentUser.uid, 'daily', `مكافأة يومية - يوم ${newStreak}`, rewardAmount);
    
    if (success) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            'streak.current': newStreak,
            'streak.lastClaim': serverTimestamp()
        });
        showToast(`تم إضافة ${rewardAmount} Coins إلى رصيدك!`, 'success');
        loadDailyStreak();
    }
}

// ==========================================
// 7. Features: Withdrawals & Anti-Fraud
// ==========================================
document.getElementById('withdraw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const method = document.getElementById('withdraw-method').value;
    const address = document.getElementById('withdraw-address').value;
    const amount = parseInt(document.getElementById('withdraw-amount').value);

    if (amount < CONFIG.MIN_WITHDRAWAL_COINS) {
        return showToast(`الحد الأدنى للسحب هو ${formatCoins(CONFIG.MIN_WITHDRAWAL_COINS)} Coins`, 'error');
    }
    if (amount > userData.coins.available) {
        return showToast('رصيدك غير كافٍ لهذا السحب', 'error');
    }

    const recentWithdrawalsQuery = query(collection(db, 'withdrawals'), where('uid', '==', currentUser.uid), where('status', '==', 'pending'));
    const recentSnap = await getDocs(recentWithdrawalsQuery);
    if (!recentSnap.empty) {
        return showToast('لديك طلب سحب قيد المراجعة بالفعل', 'warning');
    }

    if (!confirm(`هل أنت متأكد من سحب ${formatCoins(amount)} Coins (${formatUSD(amount)}) عبر ${method}؟`)) return;

    const success = await addLedgerEntry(currentUser.uid, 'withdrawal_hold', `طلب سحب معلق: ${method}`, -amount);
    
    if (success) {
        await addDoc(collection(db, 'withdrawals'), {
            uid: currentUser.uid,
            username: userData.username,
            method, address,
            amountCoins: amount,
            amountUSD: amount / CONFIG.COIN_TO_USD_RATE,
            status: 'pending',
            riskScore: calculateRiskScore(userData),
            createdAt: serverTimestamp()
        });
        showToast('تم إرسال طلب السحب وهو قيد المراجعة', 'success');
        document.getElementById('withdraw-form').reset();
        updateWalletUI();
    }
});

function calculateRiskScore(user) {
    let score = 0;
    if (user.createdAt && (new Date() - user.createdAt.toDate()) < 86400000) score += 30;
    if (user.coins.lifetimeEarned > 50000 && user.coins.lifetimeSpent === 0) score += 20;
    return Math.min(score, 100);
}

// ==========================================
// 8. Features: Referrals & Rewards Store
// ==========================================
function loadReferralData() {
    const refLink = `${CONFIG.SITE_URL}?ref=${userData.referralCode}`;
    document.getElementById('referral-link').value = refLink;
    document.getElementById('referral-code').textContent = userData.referralCode;
}

document.getElementById('copy-referral-btn').addEventListener('click', () => {
    const copyText = document.getElementById('referral-link');
    copyText.select();
    document.execCommand('copy');
    showToast('تم نسخ رابط الإحالة', 'success');
});

const rewardsData = [
    { id: 'r1', name: 'شحن Free Fire (100 Diamond)', category: 'topup', cost: 10000, icon: 'fa-fire' },
    { id: 'r2', name: 'شحن PUBG Mobile (60 UC)', category: 'topup', cost: 15000, icon: 'fa-crosshairs' },
    { id: 'r3', name: 'بطاقة Google Play $5', category: 'giftcard', cost: 50000, icon: 'fa-google-play' },
    { id: 'r4', name: 'USDT (TRC20) $1', category: 'crypto', cost: 10000, icon: 'fa-bitcoin' },
    { id: 'r5', name: 'اشتراك Netflix شهر', category: 'giftcard', cost: 120000, icon: 'fa-film' }
];

function loadRewardsStore() {
    const container = document.getElementById('rewards-store-list');
    container.innerHTML = '';
    rewardsData.forEach(reward => {
        const div = document.createElement('div');
        div.className = 'reward-card';
        div.innerHTML = `
            <i class="fas ${reward.icon}" style="font-size: 2.5rem; color: var(--accent-primary); margin-bottom: 12px;"></i>
            <h4>${reward.name}</h4>
            <span class="reward-tag">${formatCoins(reward.cost)} Coins</span>
            <button class="btn-sm" style="margin-top: 12px; width: 100%;" onclick="requestReward('${reward.id}', ${reward.cost})">طلب</button>
        `;
        container.appendChild(div);
    });
}

window.requestReward = async (rewardId, cost) => {
    if (userData.coins.available < cost) return showToast('رصيدك غير كافٍ', 'error');
    
    const reward = rewardsData.find(r => r.id === rewardId);
    if (!confirm(`هل تريد استبدال ${formatCoins(cost)} Coins مقابل: ${reward.name}؟`)) return;

    const success = await addLedgerEntry(currentUser.uid, 'reward_redemption', `استبدال: ${reward.name}`, -cost);
    if (success) {
        await addDoc(collection(db, 'orders'), {
            uid: currentUser.uid, username: userData.username,
            rewardId, rewardName: reward.name, costCoins: cost,
            costUSD: cost / CONFIG.COIN_TO_USD_RATE,
            status: 'pending', createdAt: serverTimestamp()
        });
        showToast('تم إرسال طلب المكافأة بنجاح', 'success');
        updateWalletUI();
    }
};

// ==========================================
// 9. Admin Dashboard Module
// ==========================================
async function loadAdminDashboard() {
    if (!isAdmin) return;
    
    const usersSnap = await getDocs(collection(db, 'users'));
    document.getElementById('adm-total-users').textContent = usersSnap.size;
    
    const wQuery = query(collection(db, 'withdrawals'), where('status', '==', 'pending'));
    const wSnap = await getDocs(wQuery);
    const wTable = document.querySelector('#admin-withdrawals-table tbody');
    wTable.innerHTML = '';
    
    if (wSnap.empty) {
        wTable.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد طلبات معلقة</td></tr>';
    } else {
        wSnap.forEach(docSnap => {
            const w = docSnap.data();
            wTable.innerHTML += `
                <tr>
                    <td>${docSnap.id.substring(0,8)}</td>
                    <td>${w.username}</td>
                    <td>${formatCoins(w.amountCoins)} ($${w.amountUSD})</td>
                    <td>${w.method}</td>
                    <td><span class="${w.riskScore > 50 ? 'text-danger' : 'text-success'}">${w.riskScore}/100</span></td>
                    <td>
                        <button class="btn-sm text-success" onclick="processWithdrawal('${docSnap.id}', 'approved')"><i class="fas fa-check"></i></button>
                        <button class="btn-sm text-danger" onclick="processWithdrawal('${docSnap.id}', 'rejected')"><i class="fas fa-times"></i></button>
                    </td>
                </tr>
            `;
        });
    }
}

document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
        document.getElementById(tab.getAttribute('data-admin-view')).classList.add('active');
    });
});

window.processWithdrawal = async (withdrawalId, action) => {
    if (!confirm(`هل أنت متأكد من ${action === 'approved' ? 'موافقة' : 'رفض'} هذا الطلب؟`)) return;
    
    const wRef = doc(db, 'withdrawals', withdrawalId);
    const wDoc = await getDoc(wRef);
    if (!wDoc.exists()) return;
    const wData = wDoc.data();
    
    await runTransaction(db, async (transaction) => {
        if (action === 'approved') {
            transaction.update(wRef, { status: 'approved', processedAt: serverTimestamp() });
            await addDoc(collection(db, 'admin_logs'), {
                action: 'withdrawal_approved', targetId: withdrawalId,
                adminUid: currentUser.uid, timestamp: serverTimestamp()
            });
            showToast('تمت الموافقة على السحب', 'success');
        } else {
            transaction.update(wRef, { status: 'rejected', processedAt: serverTimestamp() });
            const userRef = doc(db, 'users', wData.uid);
            const userDoc = await transaction.get(userRef);
            const currentCoins = userDoc.data().coins;
            
            transaction.update(userRef, {
                'coins.available': currentCoins.available + wData.amountCoins
            });
            
            await addDoc(collection(db, 'ledger'), {
                uid: wData.uid, type: 'withdrawal_refund',
                description: `استرداد بسبب رفض السحب: ${wData.method}`,
                amount: wData.amountCoins,
                balanceBefore: currentCoins.available,
                balanceAfter: currentCoins.available + wData.amountCoins,
                timestamp: serverTimestamp()
            });
            showToast('تم رفض السحب وإعادة الرصيد للمستخدم', 'warning');
        }
    });
    loadAdminDashboard();
};

// ==========================================
// 10. Offerwall Integration & Support
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ref')) {
        document.getElementById('auth-referral').value = urlParams.get('ref');
    }

    const checkAuthForIframe = setInterval(() => {
        if (currentUser) {
            const iframe = document.getElementById('offerwall-iframe');
            if (iframe) {
                // ملاحظة: في البيئة الإنتاجية، يجب توليد التوقيع (Signature) من خلال Firebase Cloud Function
                // لمنع تزوير المعرفات. هذا الرابط هو هيكل توضيحي.
                iframe.src = `https://freecash.com/api/wall?user_id=${currentUser.uid}`; 
            }
            clearInterval(checkAuthForIframe);
        }
    }, 1000);
});

document.getElementById('support-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'support_tickets'), {
        uid: currentUser.uid, username: userData.username,
        category: document.getElementById('support-category').value,
        message: document.getElementById('support-message').value,
        status: 'open', createdAt: serverTimestamp()
    });
    showToast('تم إرسال التذكرة بنجاح', 'success');
    document.getElementById('support-form').reset();
});
