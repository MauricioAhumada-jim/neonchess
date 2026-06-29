function selectPvP() {
  gameMode = 'pvp';
  aiDifficulty = null;
  hideGameModeModal();
  if (typeof admobService !== 'undefined') {
    admobService.hideBanner();
  }
  const diff = document.getElementById('difficulty-section');
  if (diff) diff.classList.remove('active');
  addChatMessage('Sistema', 'Modo Jugador vs Jugador seleccionado');
  updateStatus();
  isAIThinking = false;
}

function showDifficulty() {
  const diff = document.getElementById('difficulty-section');
  if (!diff) return;
  diff.classList.add('active');
  const gm = document.getElementById('game-mode-modal');
  if (gm) {
    gm.classList.remove('hidden');
    gm.style.display = 'flex';
  }
  if (typeof admobService !== 'undefined') {
    admobService.showBanner('difficulty');
  }
}

function hideDifficulty() {
  const diff = document.getElementById('difficulty-section');
  if (!diff) return;
  diff.classList.remove('active');
  if (typeof admobService !== 'undefined') {
    admobService.showBanner('main-menu');
  }
}

function selectAI(difficulty) {
  gameMode = 'ai';
  aiDifficulty = difficulty;
  hideGameModeModal();
  if (typeof admobService !== 'undefined') {
    admobService.hideBanner();
  }
  const diff = document.getElementById('difficulty-section');
  if (diff) diff.classList.remove('active');
  
  if (typeof setupAIHeaders === 'function') {
    setupAIHeaders();
  }
  
  addChatMessage('Sistema', `Modo vs IA seleccionado - Dificultad: ${difficulty}`);
  if (currentPlayer === 'black') setTimeout(() => makeAIMove(), 300);
}

function resetGame(showModeSelector = true) {
  if (gameMode === 'online' && showModeSelector) {
    showAbandonModal();
    return;
  }
  
  if (gameMode && showModeSelector) {
    if (typeof admobService !== 'undefined') {
      admobService.showInterstitial(() => {
        doResetGame(showModeSelector);
      });
    } else {
      doResetGame(showModeSelector);
    }
  } else {
    doResetGame(showModeSelector);
  }
}

function doResetGame(showModeSelector = true) {
  currentBoard = JSON.parse(JSON.stringify(initialBoard));
  currentPlayer = 'white';
  selectedSquare = null;
  moveHistory = [];
  boardHistory = [];
  capturedPieces = { white: [], black: [] };
  pendingPromotion = null;
  isAIThinking = false;
  
  aiDifficulty = null;
  gameMode = null;

  gameState = {
    whiteKingMoved: false,
    blackKingMoved: false,
    whiteRookKingsideMoved: false,
    whiteRookQueensideMoved: false,
    blackRookKingsideMoved: false,
    blackRookQueensideMoved: false,
    enPassantTarget: null,
    lastMove: null
  };

  createBoard();
  updateCapturedPieces();
  updateStatus();
  updateMoveHistory();
  updateControlButtons(false);

  const chatEl = document.getElementById('chat-messages');
  if (chatEl) {
    chatEl.innerHTML = `
      <div class="chat-message">
        <div class="timestamp">Sistema</div>
        <div>Buena suerte a ambos jugadores!</div>
      </div>
    `;
  }

  if (showModeSelector) {
    const gm = document.getElementById('game-mode-modal');
    if (gm) {
      gm.classList.remove('hidden');
      gm.style.display = 'flex';
    }
    const diff = document.getElementById('difficulty-section');
    if (diff) diff.classList.remove('active');
  }
}

function showAbandonModal() {
  const modal = document.getElementById('abandon-modal');
  if (modal) modal.classList.add('active');
}

function hideAbandonModal() {
  const modal = document.getElementById('abandon-modal');
  if (modal) modal.classList.remove('active');
}

function cancelAbandon() {
  hideAbandonModal();
}

function confirmAbandon() {
  hideAbandonModal();
  setOutcomeRecorded(true);
  updateUserLosses();
  addChatMessage('Sistema', 'Has abandonado la partida.');
  syncAbandon();
  endOnlineGame(true);
}

function updateControlButtons(isOnline = null) {
  const undoBtn = document.querySelector('[data-testid="button-undo"]');
  const resignBtn = document.getElementById('resign-btn');
  
  const onlineMode = isOnline !== null ? isOnline : (gameMode === 'online');
  
  if (onlineMode) {
    if (undoBtn) undoBtn.style.display = 'none';
    if (resignBtn) resignBtn.style.display = 'inline-block';
  } else {
    if (undoBtn) undoBtn.style.display = 'inline-block';
    if (resignBtn) resignBtn.style.display = 'none';
  }
}

function backToMainMenu() {
  hideLobbyModal();
  hideGameModeModal();
  if (typeof showGameModeModal === 'function') {
    showGameModeModal();
  } else {
    const gm = document.getElementById('game-mode-modal');
    if (gm) {
      gm.classList.remove('hidden');
      gm.style.display = 'flex';
    }
  }
}

async function init() {
  createBoard();
  updateStatus();
  updateCapturedPieces();
  
  if (typeof admobService !== 'undefined') {
    admobService.init();
    admobService.showBanner('main-menu');
  }
  
  const firebaseReady = await initFirebase();
  
  if (firebaseReady) {
    initAuthListener();
  } else {
    restoreDemoSession();
  }
}

document.addEventListener('DOMContentLoaded', init);
