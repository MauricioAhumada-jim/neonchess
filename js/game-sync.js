let gameSyncRef = null;
let opponentPresenceRef = null;
let isApplyingOpponentMove = false;
let hasRecordedOutcome = false;
let gameMoves = [];

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
  
  gameSyncRef = db.ref('games/' + gameId);
  
  gameSyncRef.child('moves').on('child_added', (snapshot) => {
    const move = snapshot.val();
    if (move && move.player !== getPlayerColor()) {
      applyOpponentMove(move);
    }
  });
  
  gameSyncRef.child('status').on('value', (snapshot) => {
    const status = snapshot.val();
    if (status === 'resigned' || status === 'disconnected' || status === 'abandoned' || status === 'checkmate') {
      if (hasRecordedOutcome) return;
      
      gameSyncRef.child('winner').once('value', (winnerSnap) => {
        const winner = winnerSnap.val();
        const isWinner = winner === getPlayerColor();
        
        if (isWinner && !hasRecordedOutcome) {
          hasRecordedOutcome = true;
          updateUserWins();
          
          const oppData = {
            username: document.getElementById('opponent-name')?.textContent || 'Oponente',
            countryFlag: document.getElementById('opponent-flag')?.textContent || ''
          };
          saveGameToHistory('win', oppData, getGameMoves(), getPlayerColor());
          
          if (status === 'resigned') {
            addChatMessage('Sistema', 'Tu oponente se rindio. Ganaste!');
          } else if (status === 'disconnected') {
            addChatMessage('Sistema', 'Tu oponente se desconecto. Ganaste!');
          } else if (status === 'abandoned') {
            addChatMessage('Sistema', 'Tu oponente abandono. Ganaste!');
          } else if (status === 'checkmate') {
            addChatMessage('Sistema', 'JAQUE MATE! Ganaste!');
          }
          showOpponentAbandonedModal();
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
  
  gameSyncRef.child('moves').push(moveData);
  gameSyncRef.child('currentTurn').set(color === 'white' ? 'black' : 'white');
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
  gameRef.child('status').set('abandoned');
  gameRef.child('winner').set(getPlayerColor() === 'white' ? 'black' : 'white');
}

function syncCheckmate(winnerColor) {
  const db = getDatabase();
  const gameId = getCurrentGameId();
  
  if (!db || !gameId) return;
  
  const gameRef = db.ref('games/' + gameId);
  gameRef.child('status').set('checkmate');
  gameRef.child('winner').set(winnerColor);
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
}
