let currentUser = null;
let userProfile = null;
let authInitialized = false;

function initAuthListener() {
  const auth = getAuth();
  
  if (!auth) {
    restoreDemoSession();
    return;
  }
  
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
      auth.onAuthStateChanged((user) => {
        authInitialized = true;
        if (user) {
          console.log('Auth restored for user:', user.uid);
          currentUser = user;
          checkUserProfile();
        } else {
          restoreDemoSession();
        }
      });
    })
    .catch((error) => {
      console.error('Persistence error:', error);
      restoreDemoSession();
    });
}

function restoreDemoSession() {
  authInitialized = true;
  const savedDemoUid = localStorage.getItem('neonchess_demo_uid');
  
  if (savedDemoUid) {
    currentUser = {
      uid: savedDemoUid,
      displayName: 'DemoPlayer',
      email: 'demo@neochess.com',
      photoURL: null
    };
    console.log('Demo session restored:', savedDemoUid);
    checkUserProfile();
  }
}

function isAuthReady() {
  return authInitialized;
}

function loginWithGoogle() {
  const auth = getAuth();
  
  if (!auth) {
    alert('Firebase no está inicializado. Se iniciará en modo de demostración.');
    simulateGoogleLogin();
    return;
  }
  
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  auth.signInWithPopup(provider)
    .then((result) => {
      currentUser = result.user;
      hideLoginModal();
      checkUserProfile();
    })
    .catch((error) => {
      console.error('Google login error:', error);
      
      let message = 'Ocurrió un error al iniciar sesión con Google.';
      if (error.code === 'auth/unauthorized-domain') {
        message = 'Este dominio no está autorizado en la configuración de Firebase de este proyecto. Si eres el administrador, añade este dominio a la lista de dominios autorizados de Firebase.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = 'El inicio de sesión fue cancelado (cerraste la ventana emergente).';
      } else if (error.code === 'auth/cancelled-popup-request') {
        message = 'La solicitud de inicio de sesión fue cancelada.';
      } else if (error.message) {
        message += '\nDetalle: ' + error.message;
      }
      
      alert(message);
    });
}

function loginAsGuest() {
  hideLoginModal();
  simulateGoogleLogin();
}

function simulateGoogleLogin() {
  let savedDemoUid = localStorage.getItem('neonchess_demo_uid');
  if (!savedDemoUid) {
    savedDemoUid = 'demo_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('neonchess_demo_uid', savedDemoUid);
  }
  
  currentUser = {
    uid: savedDemoUid,
    displayName: 'DemoPlayer',
    email: 'demo@neochess.com',
    photoURL: null
  };
  hideLoginModal();
  checkUserProfile();
}

function checkUserProfile() {
  const db = getDatabase();
  
  if (!db || !currentUser) {
    console.log('No database or user, showing profile modal');
    showProfileModal();
    return;
  }
  
  const userRef = db.ref('users/' + currentUser.uid);
  userRef.once('value').then((snapshot) => {
    if (snapshot.exists()) {
      userProfile = snapshot.val();
      console.log('User profile found, showing lobby');
      showLobbyModal();
    } else {
      console.log('No user profile, showing profile modal');
      showProfileModal();
    }
  }).catch((error) => {
    console.error('Database error:', error);
    showProfileModal();
  });
}

function prefillProfileModal() {
  if (!userProfile) return;
  
  const usernameInput = document.getElementById('profile-username');
  if (usernameInput && userProfile.username) {
    usernameInput.value = userProfile.username;
  }
  
  if (userProfile.country) {
    selectCountry(userProfile.country);
  }
}

function refreshLobbyStats() {
  if (!userProfile) return;
  
  const winsEl = document.getElementById('player-wins');
  const lossesEl = document.getElementById('player-losses');
  const drawsEl = document.getElementById('player-draws');
  const flagEl = document.getElementById('player-flag');
  const nameEl = document.getElementById('player-name');
  
  if (winsEl) winsEl.textContent = userProfile.wins || 0;
  if (lossesEl) lossesEl.textContent = userProfile.losses || 0;
  if (drawsEl) drawsEl.textContent = userProfile.draws || 0;
  if (flagEl) flagEl.textContent = userProfile.countryFlag || '';
  if (nameEl) nameEl.textContent = userProfile.username || 'Jugador';
}

function saveProfile() {
  const usernameInput = document.getElementById('profile-username');
  const username = usernameInput ? usernameInput.value.trim() : '';
  const country = getSelectedCountry();
  
  if (!username) {
    addChatMessage('Sistema', 'Por favor ingresa un nombre de usuario');
    return;
  }
  
  if (!country) {
    addChatMessage('Sistema', 'Por favor selecciona tu pais');
    return;
  }
  
  userProfile = {
    username: username,
    country: country.code,
    countryFlag: country.flag,
    wins: 0,
    losses: 0,
    draws: 0,
    createdAt: Date.now()
  };
  
  const db = getDatabase();
  if (db && currentUser) {
    db.ref('users/' + currentUser.uid).set(userProfile)
      .then(() => {
        hideProfileModal();
        showLobbyModal();
      })
      .catch((error) => {
        console.error('Save profile error:', error);
        hideProfileModal();
        showLobbyModal();
      });
  } else {
    hideProfileModal();
    showLobbyModal();
  }
}

function logout() {
  const auth = getAuth();
  
  // Limpiar sesión de invitado de la memoria local
  localStorage.removeItem('neonchess_demo_uid');
  
  if (auth) {
    auth.signOut().then(() => {
      currentUser = null;
      userProfile = null;
      hideLobbyModal();
      showGameModeModal();
    }).catch((error) => {
      console.error('Logout error:', error);
    });
  } else {
    currentUser = null;
    userProfile = null;
    hideLobbyModal();
    showGameModeModal();
  }
}

function getCurrentUser() {
  return currentUser;
}

function getUserProfile() {
  return userProfile;
}

function updateUserWins() {
  if (!userProfile) return;
  userProfile.wins = (userProfile.wins || 0) + 1;
  
  const db = getDatabase();
  if (db && currentUser) {
    db.ref('users/' + currentUser.uid + '/wins').set(userProfile.wins);
  }
  refreshLobbyStats();
}

function updateUserLosses() {
  if (!userProfile) return;
  userProfile.losses = (userProfile.losses || 0) + 1;
  
  const db = getDatabase();
  if (db && currentUser) {
    db.ref('users/' + currentUser.uid + '/losses').set(userProfile.losses);
  }
  refreshLobbyStats();
}

function updateUserDraws() {
  if (!userProfile) return;
  userProfile.draws = (userProfile.draws || 0) + 1;
  
  const db = getDatabase();
  if (db && currentUser) {
    db.ref('users/' + currentUser.uid + '/draws').set(userProfile.draws);
  }
  refreshLobbyStats();
}

// Lógica de Autenticación por Correo/Contraseña
let currentAuthMode = 'login';

function switchAuthTab(mode) {
  currentAuthMode = mode;
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const btnSubmit = document.getElementById('btn-email-auth');
  
  if (!tabLogin || !tabRegister || !btnSubmit) return;
  
  if (mode === 'login') {
    tabLogin.style.color = '#00ffff';
    tabLogin.style.borderBottom = '2px solid #00ffff';
    tabRegister.style.color = 'rgba(0, 255, 255, 0.5)';
    tabRegister.style.borderBottom = '2px solid transparent';
    btnSubmit.textContent = 'Iniciar Sesión';
  } else {
    tabRegister.style.color = '#00ffff';
    tabRegister.style.borderBottom = '2px solid #00ffff';
    tabLogin.style.color = 'rgba(0, 255, 255, 0.5)';
    tabLogin.style.borderBottom = '2px solid transparent';
    btnSubmit.textContent = 'Registrarse';
  }
}

function handleEmailAuth() {
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  
  if (!email || !password) {
    alert('Por favor ingresa tu correo y contraseña.');
    return;
  }
  
  const auth = getAuth();
  if (!auth) {
    alert('El servicio de autenticación no está disponible en este momento.');
    return;
  }
  
  if (currentAuthMode === 'login') {
    auth.signInWithEmailAndPassword(email, password)
      .then((result) => {
        currentUser = result.user;
        hideLoginModal();
        checkUserProfile();
      })
      .catch((error) => {
        console.error('Email login error:', error);
        let message = 'Error al iniciar sesión.';
        if (error.code === 'auth/wrong-password') {
          message = 'Contraseña incorrecta.';
        } else if (error.code === 'auth/user-not-found') {
          message = 'No se encontró ningún usuario con este correo.';
        } else if (error.code === 'auth/invalid-email') {
          message = 'El formato del correo electrónico no es válido.';
        } else if (error.code === 'auth/user-disabled') {
          message = 'Esta cuenta ha sido inhabilitada.';
        } else if (error.message) {
          message += '\nDetalle: ' + error.message;
        }
        alert(message);
      });
  } else {
    auth.createUserWithEmailAndPassword(email, password)
      .then((result) => {
        currentUser = result.user;
        hideLoginModal();
        checkUserProfile();
      })
      .catch((error) => {
        console.error('Email registration error:', error);
        let message = 'Error al registrar el usuario.';
        if (error.code === 'auth/email-already-in-use') {
          message = 'Este correo electrónico ya está registrado.';
        } else if (error.code === 'auth/invalid-email') {
          message = 'El formato del correo electrónico no es válido.';
        } else if (error.code === 'auth/weak-password') {
          message = 'La contraseña es demasiado débil (debe tener al menos 6 caracteres).';
        } else if (error.message) {
          message += '\nDetalle: ' + error.message;
        }
        alert(message);
      });
  }
}
