let chatRef = null;

function initOnlineChat() {
  const db = getDatabase();
  const gameId = getCurrentGameId();
  
  if (!db || !gameId) return;
  
  loadBlockedUsers();
  syncBlockedUsersFromFirebase();
  
  chatRef = db.ref('games/' + gameId + '/chat');
  
  chatRef.on('child_added', (snapshot) => {
    const msg = snapshot.val();
    if (msg) {
      displayChatMessage(msg.sender, msg.text, msg.timestamp, msg.senderUid);
    }
  });
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  
  const text = input.value.trim();
  if (!text) return;
  
  input.value = '';
  
  if (gameMode === 'online' && chatRef) {
    const profile = getUserProfile();
    const user = getCurrentUser();
    chatRef.push({
      sender: profile ? profile.username : 'Jugador',
      senderUid: user ? user.uid : null,
      text: text,
      timestamp: Date.now()
    });
  } else {
    addChatMessage('Tu', text);
  }
}

function addChatMessage(sender, text) {
  displayChatMessage(sender, text, Date.now());
}

function displayChatMessage(sender, text, timestamp, senderUid = null) {
  if (isUserBlocked(sender, senderUid)) {
    console.log('Mensaje omitido de usuario bloqueado:', sender);
    return;
  }
  
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) return;
  
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-message';
  
  const time = new Date(timestamp);
  const timeStr = time.getHours().toString().padStart(2, '0') + ':' + 
                  time.getMinutes().toString().padStart(2, '0');
  
  msgDiv.innerHTML = `
    <div class="timestamp">${timeStr} - <span class="player">${sender}</span></div>
    <div>${text}</div>
  `;
  
  chatContainer.appendChild(msgDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  // Show non-intrusive cyberpunk notification toast for incoming opponent messages
  if (typeof getUserProfile === 'function') {
    const profile = getUserProfile();
    const isMe = (profile && sender === profile.username) || sender === 'Sistema' || sender === 'Tu';
    if (!isMe) {
      showChatNotification(sender, text);
    }
  }
}

function showChatNotification(sender, text) {
  let container = document.getElementById('chat-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'chat-toast-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    container.style.width = '90%';
    container.style.maxWidth = '360px';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.style.background = 'rgba(0, 0, 0, 0.95)';
  toast.style.border = '2px solid #ff00ff';
  toast.style.boxShadow = '0 0 15px rgba(255, 0, 255, 0.6), inset 0 0 8px rgba(255, 0, 255, 0.3)';
  toast.style.borderRadius = '8px';
  toast.style.padding = '12px 16px';
  toast.style.color = '#fff';
  toast.style.fontFamily = "'Orbitron', monospace";
  toast.style.fontSize = '0.85rem';
  toast.style.pointerEvents = 'auto';
  toast.style.cursor = 'pointer';
  toast.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  toast.style.transform = 'translateY(-20px)';
  toast.style.opacity = '0';
  
  toast.innerHTML = `
    <div style="color: #ff00ff; font-weight: bold; font-size: 0.85rem; text-shadow: 0 0 8px rgba(255, 0, 255, 0.5); display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
      <span>💬 NUEVO MENSAJE</span>
      <span style="font-size: 0.75rem; color: rgba(255,255,255,0.6); font-weight: normal;">${sender}</span>
    </div>
    <div style="color: #00ffff; text-shadow: 0 0 5px rgba(0, 255, 255, 0.3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px;">
      ${text}
    </div>
  `;
  
  toast.onclick = () => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      chatContainer.scrollIntoView({ behavior: 'smooth' });
      const chatInput = document.getElementById('chat-input');
      if (chatInput) chatInput.focus();
    }
    toast.style.transform = 'translateY(-20px) scale(0.9)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  };
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  }, 50);
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.transform = 'translateY(-20px) scale(0.9)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }
  }, 4500);
}

function cleanupChat() {
  if (chatRef) {
    chatRef.off();
    chatRef = null;
  }
  
  const chatContainer = document.getElementById('chat-messages');
  if (chatContainer) {
    chatContainer.innerHTML = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadBlockedUsers();
  
  // Exponer funciones globales
  window.blockOpponent = blockOpponent;
  window.submitReport = submitReport;
  window.isUserBlocked = isUserBlocked;
  window.loadBlockedUsers = loadBlockedUsers;

  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }
});

// Lógica de moderación UGC
let blockedUsers = [];

function loadBlockedUsers() {
  try {
    const saved = localStorage.getItem('neonchess_blocked_users');
    blockedUsers = saved ? JSON.parse(saved) : [];
  } catch (e) {
    blockedUsers = [];
  }
}

function isUserBlocked(username, uid) {
  if (!blockedUsers) return false;
  return blockedUsers.includes(username) || (uid && blockedUsers.includes(uid));
}

function syncBlockedUsersFromFirebase() {
  const db = getDatabase();
  const user = getCurrentUser();
  if (!db || !user) return;
  
  db.ref('blocks/' + user.uid).once('value').then((snapshot) => {
    if (snapshot.exists()) {
      const fbBlocks = snapshot.val();
      loadBlockedUsers();
      
      let updated = false;
      for (let blockedUid in fbBlocks) {
        if (!blockedUsers.includes(blockedUid)) {
          blockedUsers.push(blockedUid);
          updated = true;
        }
      }
      
      if (updated) {
        localStorage.setItem('neonchess_blocked_users', JSON.stringify(blockedUsers));
      }
    }
  }).catch(err => console.warn('Error al sincronizar bloqueos de Firebase:', err));
}

function blockOpponent() {
  let opponentName = 'Oponente';
  const nameSpan = document.getElementById('reported-player-name');
  if (nameSpan) {
    opponentName = nameSpan.textContent;
  }
  
  const oppUid = typeof opponentUid !== 'undefined' ? opponentUid : null;
  
  loadBlockedUsers();
  
  const isAlreadyBlocked = isUserBlocked(opponentName, oppUid);
  
  if (isAlreadyBlocked) {
    // Desbloquear
    blockedUsers = blockedUsers.filter(item => item !== opponentName && item !== oppUid);
    localStorage.setItem('neonchess_blocked_users', JSON.stringify(blockedUsers));
    
    // Quitar de Firebase de forma segura
    const db = getDatabase();
    const user = getCurrentUser();
    if (db && user && oppUid) {
      db.ref('blocks/' + user.uid + '/' + oppUid).remove();
    }
    
    addChatMessage('Sistema', `Has desbloqueado a ${opponentName}.`);
  } else {
    // Bloquear
    if (!blockedUsers.includes(opponentName)) {
      blockedUsers.push(opponentName);
    }
    if (oppUid && !blockedUsers.includes(oppUid)) {
      blockedUsers.push(oppUid);
    }
    localStorage.setItem('neonchess_blocked_users', JSON.stringify(blockedUsers));
    
    // Guardar en Firebase de forma segura
    const db = getDatabase();
    const user = getCurrentUser();
    if (db && user && oppUid) {
      db.ref('blocks/' + user.uid + '/' + oppUid).set(true);
    }
    
    addChatMessage('Sistema', `Has bloqueado a ${opponentName}. No verás sus mensajes.`);
    
    // Limpiar mensajes existentes en pantalla
    removeChatMessagesFromSender(opponentName);
  }
  
  if (typeof hideReportModal === 'function') {
    hideReportModal();
  }
}

function removeChatMessagesFromSender(sender) {
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) return;
  
  const messages = chatContainer.querySelectorAll('.chat-message');
  messages.forEach(msg => {
    const playerSpan = msg.querySelector('.player');
    if (playerSpan && playerSpan.textContent === sender) {
      msg.remove();
    }
  });
}

function submitReport() {
  const db = getDatabase();
  const user = getCurrentUser();
  const reasonSelect = document.getElementById('report-reason-select');
  const reason = reasonSelect ? reasonSelect.value : 'desconocido';
  
  let opponentName = 'Oponente';
  const nameSpan = document.getElementById('reported-player-name');
  if (nameSpan) {
    opponentName = nameSpan.textContent;
  }
  
  const oppUid = typeof opponentUid !== 'undefined' ? opponentUid : 'unknown';
  
  if (!db) {
    alert('Error: No se pudo conectar al servidor de reportes.');
    return;
  }
  
  const reportRef = db.ref('reports').push();
  reportRef.set({
    reporterUid: user ? user.uid : 'anonimo',
    reporterName: (user && userProfile) ? userProfile.username : 'Invitado',
    reportedUid: oppUid,
    reportedUsername: opponentName,
    reason: reason,
    gameId: typeof currentGameId !== 'undefined' ? currentGameId : 'none',
    timestamp: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    alert('Reporte enviado correctamente. Nuestro equipo de soporte revisará el caso.');
    if (typeof hideReportModal === 'function') {
      hideReportModal();
    }
  }).catch((err) => {
    console.error('Error al enviar reporte:', err);
    alert('Error al enviar el reporte. Por favor inténtalo de nuevo.');
  });
}
