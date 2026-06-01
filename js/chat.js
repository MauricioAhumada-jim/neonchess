let chatRef = null;

function initOnlineChat() {
  const db = getDatabase();
  const gameId = getCurrentGameId();
  
  if (!db || !gameId) return;
  
  chatRef = db.ref('games/' + gameId + '/chat');
  
  chatRef.on('child_added', (snapshot) => {
    const msg = snapshot.val();
    if (msg) {
      displayChatMessage(msg.sender, msg.text, msg.timestamp);
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
    chatRef.push({
      sender: profile ? profile.username : 'Jugador',
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

function displayChatMessage(sender, text, timestamp) {
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
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }
});
