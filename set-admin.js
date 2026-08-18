// set-admin.js
// شغّل: npm install firebase-admin
// ثم: node set-admin.js

const admin = require('firebase-admin');

// حمّل service account key من Firebase Console:
// Project Settings → Service Accounts → Generate new private key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const ADMIN_EMAIL = 'kenven@admin.com';

async function setAdmin() {
  try {
    console.log('🔍 البحث عن المستخدم:', ADMIN_EMAIL);
    
    const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    console.log('✅ المستخدم موجود:', user.uid);
    
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      adminRole: 'super'
    });
    
    console.log('✅ تم إضافة admin claims بنجاح!');
    console.log('📋 UID:', user.uid);
    console.log('');
    console.log('⚠️  ملاحظة: المستخدم يحتاج تسجيل الخروج والدخول مرة أخرى');
    console.log('   لتفعيل الـ claims الجديدة');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log('');
      console.log('💡 افتح bootstrap.html أولاً لإنشاء الحساب');
    }
  }
}

setAdmin();
