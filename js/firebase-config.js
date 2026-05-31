let app = null;
let auth = null;
let database = null;
let firebaseConfig = null;

async function loadFirebaseConfig() {
  firebaseConfig = {
    apiKey: "AIzaSyByKnMFznQ4YlTc5RBVgNM40r6PKO8SHjY",  // Tu VITE_FIREBASE_API_KEY
    authDomain: "neonchess-8da7f.firebaseapp.com",  // Tu PROJECT_ID + .firebaseapp.com
    projectId: "neonchess-8da7f",  // Tu VITE_FIREBASE_PROJECT_ID
    storageBucket: "neonchess-8da7f.firebasestorage.app",
    appId: "1:457210921348:web:ec467dd7e2b401e8b79dd1",  // Tu VITE_FIREBASE_APP_ID
    databaseURL: "https://neonchess-8da7f-default-rtdb.firebaseio.com/"  // Tu VITE_FIREBASE_DATABASE_URL
  };
  
  return firebaseConfig;
}
async function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK not loaded');
    return false;
  }
  
  const config = await loadFirebaseConfig();
  
  if (!config || !config.apiKey || !config.projectId) {
    console.warn('Firebase config missing - running in demo mode');
    return false;
  }
  
  try {
    app = firebase.initializeApp(config);
    auth = firebase.auth();
    
    try {
      database = firebase.database();
      await database.ref('.info/connected').once('value');
      console.log('Firebase initialized with database');
    } catch (dbError) {
      console.warn('Database not available, auth-only mode:', dbError);
      database = null;
    }
    
    console.log('Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('Firebase init error:', error);
    return false;
  }
}

function getAuth() {
  return auth;
}

function getDatabase() {
  return database;
}

function isFirebaseReady() {
  return app !== null && auth !== null && database !== null;
}
