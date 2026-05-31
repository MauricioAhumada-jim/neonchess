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
