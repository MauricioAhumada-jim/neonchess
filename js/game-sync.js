let gameSyncRef = null;
let opponentPresenceRef = null;
let isApplyingOpponentMove = false;
let hasRecordedOutcome = false;
let gameMoves = [];

// Chess Timer Global State
let serverTimeOffset = 0;
let whiteTimeLimit = 600;
let blackTimeLimit = 600;
let lastTurnTimestamp = 0;
let gameTimeControl = 600;
let timerIntervalId = null;
let localOutcomeClaimed = false;

function initServerTimeOffset() {
  const db = getDatabase();
  if (!db) return;
  db.ref('.info/serverTimeOffset').on('value', (snapshot) => {
    serverTimeOffset = snapshot.val() || 0;
    console.log('Firebase server time offset:', serverTimeOffset);
  });
}

function getSyncedTimestamp() {
  return Date.now() + serverTimeOffset;
}

function startLocalTimer() {
  if (timerIntervalId) return; // Already running
  
  // Show timer elements in UI
  const myTimer = document.getElementById('my-timer');
  const oppTimer = document.getElementById('opponent-timer');
  if (myTimer) myTimer.style.display = 'block';
  if (oppTimer) oppTimer.style.display = 'block';
  
  localOutcomeClaimed = false;
  
  timerIntervalId = setInterval(() => {
    if (gameMode !== 'online' || !currentGameId) {
      stopLocalTimer();
      return;
    }
    
    const now = getSyncedTimestamp();
    const elapsedSeconds = Math.max(0, Math.floor((now - lastTurnTimestamp) / 1000));
    
    let whiteTimeRemaining = whiteTimeLimit;
    let blackTimeRemaining = blackTimeLimit;
    
    if (currentPlayer === 'white') {
      whiteTimeRemaining = Math.max(0, whiteTimeLimit - elapsedSeconds);
    } else {
      blackTimeRemaining = Math.max(0, blackTimeLimit - elapsedSeconds);
    }
    
    // Update UI clocks
    updateClockUI('white', whiteTimeRemaining);
    updateClockUI('black', blackTimeRemaining);
    
    // Check for timeout
    if (currentPlayer === 'white' && whiteTimeRemaining <= 0) {
      handleTimeout('white');
    } else if (currentPlayer === 'black' && blackTimeRemaining <= 0) {
      handleTimeout('black');
    }
  }, 250);
}

function updateClockUI(color, seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  const timeString = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  
  const myColor = getPlayerColor();
  if (color === myColor) {
    const el = document.getElementById('my-timer');
    if (el) {
      el.textContent = timeString;
      if (seconds <= 10) {
        el.style.color = '#ff3333';
        el.style.borderColor = '#ff3333';
        el.style.boxShadow = '0 0 12px rgba(255, 51, 51, 0.7)';
      } else {
        el.style.color = '#00ffff';
        el.style.borderColor = 'rgba(0, 255, 255, 0.4)';
        el.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.2)';
      }
    }
  } else {
    const el = document.getElementById('opponent-timer');
    if (el) {
      el.textContent = timeString;
      if (seconds <= 10) {
        el.style.color = '#ff3333';
        el.style.borderColor = '#ff3333';
        el.style.boxShadow = '0 0 12px rgba(255, 51, 51, 0.7)';
      } else {
        el.style.color = '#ff00ff';
        el.style.borderColor = 'rgba(255, 0, 255, 0.4)';
        el.style.boxShadow = '0 0 10px rgba(255, 0, 255, 0.2)';
      }
    }
  }
}

function handleTimeout(losingColor) {
  if (localOutcomeClaimed) return;
  localOutcomeClaimed = true;
  
  stopLocalTimer();
  
  const db = getDatabase();
  const gameId = getCurrentGameId();
  if (!db || !gameId) return;
  
  console.log('Timeout loss detected for:', losingColor);
  
  const gameRef = db.ref('games/' + gameId);
  gameRef.update({
    status: 'timeout',
    winner: losingColor === 'white' ? 'black' : 'white'
  });
}

function stopLocalTimer() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  const myTimer = document.getElementById('my-timer');
  const oppTimer = document.getElementById('opponent-timer');
  if (myTimer) myTimer.style.display = 'none';
  if (oppTimer) oppTimer.style.display = 'none';
}

function isReceivingOpponentMove() {
  return isApplyingOpponentMove;
}

function setOutcomeRecorded(value) {
  hasRecordedOutcome = value;
}

function getGameMoves() {
  return gameMoves;
}

function clearGameMoves() {
  gameMoves = [];
}

function addGameMove(move) {
  gameMoves.push(move);
}

function initGameSync() {
  const db = getDatabase();
  const gameId = getCurrentGameId();
  
  if (!db || !gameId) return;
  
  initServerTimeOffset();
  
  gameSyncRef = db.ref('games/' + gameId);
  
  // Listen to game properties for clock sync
  gameSyncRef.on('value', (snapshot) => {
    const game = snapshot.val();
    if (!game || game.status === 'waiting_for_player' || game.status === 'waiting_private') return;
    
    whiteTimeLimit = game.whiteTime !== undefined ? game.whiteTime : (game.timeControl || 600);
    blackTimeLimit = game.blackTime !== undefined ? game.blackTime : (game.timeControl || 600);
    lastTurnTimestamp = game.lastTurnTimestamp || getSyncedTimestamp();
    gameTimeControl = game.timeControl || 600;
    
    // Start local timer when the game goes active
    if (game.status === 'active') {
      startLocalTimer();
    }
  });
  
  gameSyncRef.child('moves').on('child_added', (snapshot) => {
    const move = snapshot.val();
    if (move && move.player !== getPlayerColor()) {
      applyOpponentMove(move);
    }
  });
  
  gameSyncRef.child('status').on('value', (snapshot) => {
    const status = snapshot.val();
    if (status === 'resigned' || status === 'disconnected' || status === 'abandoned' || status === 'checkmate' || status === 'timeout') {
      if (hasRecordedOutcome) return;
      
      gameSyncRef.child('winner').once('value', (winnerSnap) => {
        const winner = winnerSnap.val();
        if (!winner) return;
        
        const isWinner = winner === getPlayerColor();
        hasRecordedOutcome = true;
        
        stopLocalTimer();
        
        const oppData = {
          username: document.getElementById('opponent-name')?.textContent || 'Oponente',
          countryFlag: document.getElementById('opponent-flag')?.textContent || ''
        };
        
        const opponentProfile = getOpponentData();
        const oppElo = opponentProfile ? (opponentProfile.elo || 1200) : 1200;
        
        if (isWinner) {
          updateUserWins(oppElo);
          saveGameToHistory('win', oppData, getGameMoves(), getPlayerColor());
          
          if (status === 'resigned') {
            addChatMessage('Sistema', 'Tu oponente se rindio. Ganaste!');
          } else if (status === 'disconnected') {
            addChatMessage('Sistema', 'Tu oponente se desconecto. Ganaste!');
          } else if (status === 'abandoned') {
            addChatMessage('Sistema', 'Tu oponente abandono. Ganaste!');
          } else if (status === 'checkmate') {
            addChatMessage('Sistema', 'JAQUE MATE! Ganaste!');
          } else if (status === 'timeout') {
            addChatMessage('Sistema', 'Victoria por tiempo! El oponente se quedo sin tiempo.');
          }
          
          showGameEndModal(true, status);
        } else {
          updateUserLosses(oppElo);
          saveGameToHistory('loss', oppData, getGameMoves(), getPlayerColor());
          
          if (status === 'resigned') {
            addChatMessage('Sistema', 'Te has rendido. Perdiste la partida.');
          } else if (status === 'disconnected') {
            addChatMessage('Sistema', 'Te has desconectado. Perdiste la partida.');
          } else if (status === 'abandoned') {
            addChatMessage('Sistema', 'Has abandonado. Perdiste la partida.');
          } else if (status === 'checkmate') {
            addChatMessage('Sistema', 'JAQUE MATE! El oponente gana.');
          } else if (status === 'timeout') {
            addChatMessage('Sistema', 'Derrota por tiempo! Se te acabo el tiempo.');
          }
          
          showGameEndModal(false, status);
        }
      });
    }
  });
  
  setupPresence();
}

function setupPresence() {
  const db = getDatabase();
  const user = getCurrentUser();
  const gameId = getCurrentGameId();
  
  if (!db || !user || !gameId) return;
  
  const presenceRef = db.ref('games/' + gameId + '/presence/' + user.uid);
  
  presenceRef.set(true);
  presenceRef.onDisconnect().set(false);
  
  const opponentUid = getOpponentUid();
  if (opponentUid) {
    opponentPresenceRef = db.ref('games/' + gameId + '/presence/' + opponentUid);
    opponentPresenceRef.on('value', (snapshot) => {
      if (snapshot.val() === false) {
        setTimeout(() => {
          opponentPresenceRef.once('value').then((snap) => {
            if (snap.val() === false && gameMode === 'online') {
              const gameRef = db.ref('games/' + gameId);
              gameRef.child('status').set('disconnected');
              gameRef.child('winner').set(getPlayerColor());
            }
          });
        }, 5000);
      }
    });
  }
}


function syncMove(fromRow, fromCol, toRow, toCol, piece, metadata = {}) {
  const db = getDatabase();
  const gameId = getCurrentGameId();
  const color = getPlayerColor();
  
  if (!db || !gameId || gameMode !== 'online') return;
  
  // Calculate elapsed time spent by this player
  const now = getSyncedTimestamp();
  const elapsedSeconds = Math.max(0, Math.floor((now - lastTurnTimestamp) / 1000));
  
  // Calculate their new remaining time
  const myCurrentTimeLimit = color === 'white' ? whiteTimeLimit : blackTimeLimit;
  const newRemainingTime = Math.max(0, myCurrentTimeLimit - elapsedSeconds);
  
  const moveData = {
    fromRow,
    fromCol,
    toRow,
    toCol,
    piece,
    player: color,
    capturedPiece: metadata.capturedPiece || null,
    isCastling: metadata.isCastling || false,
    isEnPassant: metadata.isEnPassant || false,
    promotionPiece: metadata.promotionPiece || null,
    enPassantTarget: gameState.enPassantTarget,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  
  addGameMove({
    fromRow,
    fromCol,
    toRow,
    toCol,
    piece,
    player: color,
    capturedPiece: metadata.capturedPiece || null,
    isCastling: metadata.isCastling || false,
    isEnPassant: metadata.isEnPassant || false,
    promotionPiece: metadata.promotionPiece || null
  });
  
  const nextTurn = color === 'white' ? 'black' : 'white';
  const newMoveRef = gameSyncRef.child('moves').push();
  
  const updates = {};
  updates['moves/' + newMoveRef.key] = moveData;
  updates['currentTurn'] = nextTurn;
  updates['lastTurnTimestamp'] = firebase.database.ServerValue.TIMESTAMP;
  
  if (color === 'white') {
    updates['whiteTime'] = newRemainingTime;
  } else {
    updates['blackTime'] = newRemainingTime;
  }
  
  gameSyncRef.update(updates);
}

function applyOpponentMove(move) {
  if (!move) return;
  
  isApplyingOpponentMove = true;
  
  selectedSquare = null;
  
  const piece = move.piece;
  const fromRow = move.fromRow;
  const fromCol = move.fromCol;
  const toRow = move.toRow;
  const toCol = move.toCol;
  const isWhite = whitePieces.includes(piece);
  
  boardHistory.push(JSON.parse(JSON.stringify(currentBoard)));
  const prevGameState = JSON.parse(JSON.stringify(gameState));
  const prevCapturedPieces = JSON.parse(JSON.stringify(capturedPieces));
  
  if (move.isCastling) {
    currentBoard[toRow][toCol] = piece;
    currentBoard[fromRow][fromCol] = null;
    if (toCol === 6) {
      currentBoard[toRow][5] = currentBoard[toRow][7];
      currentBoard[toRow][7] = null;
    } else if (toCol === 2) {
      currentBoard[toRow][3] = currentBoard[toRow][0];
      currentBoard[toRow][0] = null;
    }
  } else if (move.isEnPassant) {
    currentBoard[toRow][toCol] = piece;
    currentBoard[fromRow][fromCol] = null;
    const capturedRow = isWhite ? toRow + 1 : toRow - 1;
    const enPassantPiece = currentBoard[capturedRow][toCol];
    currentBoard[capturedRow][toCol] = null;
    if (enPassantPiece) {
      if (whitePieces.includes(enPassantPiece)) capturedPieces.white.push(enPassantPiece);
      else capturedPieces.black.push(enPassantPiece);
    }
  } else {
    if (move.capturedPiece) {
      if (whitePieces.includes(move.capturedPiece)) capturedPieces.white.push(move.capturedPiece);
      else capturedPieces.black.push(move.capturedPiece);
    }
    const finalPiece = move.promotionPiece || piece;
    currentBoard[toRow][toCol] = finalPiece;
    currentBoard[fromRow][fromCol] = null;
  }
  
  if (piece === '♔') gameState.whiteKingMoved = true;
  if (piece === '♚') gameState.blackKingMoved = true;
  if (piece === '♖' && fromRow === 7 && fromCol === 7) gameState.whiteRookKingsideMoved = true;
  if (piece === '♖' && fromRow === 7 && fromCol === 0) gameState.whiteRookQueensideMoved = true;
  if (piece === '♜' && fromRow === 0 && fromCol === 7) gameState.blackRookKingsideMoved = true;
  if (piece === '♜' && fromRow === 0 && fromCol === 0) gameState.blackRookQueensideMoved = true;
  
  if ((piece === '♙' && fromRow === 6 && toRow === 4) || (piece === '♟' && fromRow === 1 && toRow === 3)) {
    gameState.enPassantTarget = { row: isWhite ? 5 : 2, col: toCol };
  } else {
    gameState.enPassantTarget = null;
  }
  
  gameState.lastMove = { fromRow, fromCol, toRow, toCol };
  
  const moveNotation = `${piece} ${String.fromCharCode(97 + fromCol)}${8 - fromRow} -> ${String.fromCharCode(97 + toCol)}${8 - toRow}`;
  moveHistory.push({ notation: moveNotation, gameState: prevGameState, capturedPieces: prevCapturedPieces });
  
  addGameMove({
    fromRow: move.fromRow,
    fromCol: move.fromCol,
    toRow: move.toRow,
    toCol: move.toCol,
    piece: move.piece,
    player: move.player,
    capturedPiece: move.capturedPiece || null,
    isCastling: move.isCastling || false,
    isEnPassant: move.isEnPassant || false,
    promotionPiece: move.promotionPiece || null
  });
  
  currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
  
  createBoard();
  updateStatus();
  updateMoveHistory();
  updateCapturedPieces();
  
  const opponentColor = isWhite ? 'black' : 'white';
  if (isInCheck(opponentColor)) {
    if (isCheckmate(opponentColor)) {
      const winner = isWhite ? 'Blancas' : 'Negras';
      const winnerColor = isWhite ? 'white' : 'black';
      addChatMessage('Sistema', `JAQUE MATE! ${winner} ganan`);
      syncCheckmate(winnerColor);
      showCheckmateModal(winner);
    } else {
      addChatMessage('Sistema', `JAQUE a ${opponentColor === 'white' ? 'Blancas' : 'Negras'}!`);
    }
  } else if (isStalemate(opponentColor)) {
    addChatMessage('Sistema', 'Tablas por ahogado!');
    showStalemateModal();
  }
  
  isApplyingOpponentMove = false;
}

function syncAbandon() {
  const db = getDatabase();
  const gameId = getCurrentGameId();
  
  if (!db || !gameId) return;
  
  const gameRef = db.ref('games/' + gameId);
  gameRef.update({
    status: 'abandoned',
    winner: getPlayerColor() === 'white' ? 'black' : 'white'
  });
}

function syncCheckmate(winnerColor) {
  const db = getDatabase();
  const gameId = getCurrentGameId();
  
  if (!db || !gameId) return;
  
  const gameRef = db.ref('games/' + gameId);
  gameRef.update({
    status: 'checkmate',
    winner: winnerColor
  });
}

function cleanupGameSync() {
  if (gameSyncRef) {
    gameSyncRef.off();
    gameSyncRef = null;
  }
  
  clearGameMoves();
  
  if (opponentPresenceRef) {
    opponentPresenceRef.off();
    opponentPresenceRef = null;
  }
  
  hasRecordedOutcome = false;
  
  stopLocalTimer();
}
