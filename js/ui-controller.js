let boardFlipped = false;

function setBoardFlip(flipped) {
  boardFlipped = flipped;
  updateCoordinates();
  createBoard();
}

function updateCoordinates() {
  const files = boardFlipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = boardFlipped ? ['1', '2', '3', '4', '5', '6', '7', '8'] : ['8', '7', '6', '5', '4', '3', '2', '1'];
  
  const coordRows = document.querySelectorAll('.coords-row');
  coordRows.forEach(row => {
    const spans = row.querySelectorAll('span');
    spans.forEach((span, i) => {
      span.textContent = files[i];
    });
  });
  
  const coordCols = document.querySelectorAll('.coords-col');
  coordCols.forEach(col => {
    const spans = col.querySelectorAll('span');
    spans.forEach((span, i) => {
      span.textContent = ranks[i];
    });
  });
}

function createBoard() {
  const board = document.getElementById('board');
  if (!board) return;
  board.innerHTML = '';

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const row = boardFlipped ? 7 - i : i;
      const col = boardFlipped ? 7 - j : j;
      const displayRow = i;
      const displayCol = j;
      
      const square = document.createElement('div');
      const algebraic = files[col] + ranks[row];
      square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
      square.dataset.row = row;
      square.dataset.col = col;
      square.setAttribute('data-testid', `square-${algebraic}`);
      square.setAttribute('data-square', algebraic);
      square.addEventListener('click', handleSquareClick);

      const piece = currentBoard[row][col];
      if (piece) {
        const pieceElement = document.createElement('div');
        pieceElement.className = `piece ${whitePieces.includes(piece) ? 'white' : 'black'}`;
        pieceElement.textContent = piece;
        pieceElement.style.pointerEvents = 'none';
        square.appendChild(pieceElement);
      }
      board.appendChild(square);
    }
  }

  updateBoard();
}

function updateBoard() {
  const squares = document.querySelectorAll('.square');
  squares.forEach(sq => {
    sq.classList.remove('selected', 'possible-move');
  });

  if (selectedSquare) {
    const sel = document.querySelector(`[data-row="${selectedSquare.row}"][data-col="${selectedSquare.col}"]`);
    if (sel) sel.classList.add('selected');
  }
}

function highlightMoves(moves) {
  moves.forEach(([r, c]) => {
    const sq = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    if (sq) sq.classList.add('possible-move');
  });
}

function showPossibleMoves(row, col) {
  const piece = currentBoard[row][col];
  if (!piece) return;
  const moves = getPossibleMoves(row, col, piece);
  highlightMoves(moves);
}

function handleSquareClick(e) {
  if (isAIThinking) return;
  
  if (gameMode === 'online') {
    const playerCol = getPlayerColor();
    if (playerCol && currentPlayer !== playerCol) return;
  }
  
  const row = parseInt(e.currentTarget.dataset.row);
  const col = parseInt(e.currentTarget.dataset.col);

  if (selectedSquare) {
    if (selectedSquare.row === row && selectedSquare.col === col) {
      clearSelection();
      return;
    }

    if (isValidMove(selectedSquare.row, selectedSquare.col, row, col)) {
      makeMove(selectedSquare.row, selectedSquare.col, row, col);
      clearSelection();
      currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
      updateStatus();

      if (gameMode === 'ai' && currentPlayer === 'black' && !pendingPromotion) {
        setTimeout(() => makeAIMove(), 250);
      }
    } else {
      clearSelection();
      selectSquare(row, col);
    }
  } else {
    selectSquare(row, col);
  }
}

function selectSquare(row, col) {
  const piece = currentBoard[row][col];
  if (!piece) return;
  const isWhitePiece = whitePieces.includes(piece);
  const isBlackPiece = blackPieces.includes(piece);

  if ((currentPlayer === 'white' && !isWhitePiece) || (currentPlayer === 'black' && !isBlackPiece)) {
    return;
  }

  selectedSquare = { row, col };
  updateBoard();
  showPossibleMoves(row, col);
}

function clearSelection() {
  selectedSquare = null;
  updateBoard();
}

function updateStatus() {
  const status = document.getElementById('status');
  if (status) {
    let text = `Turno: ${currentPlayer === 'white' ? 'Blancas' : 'Negras'}`;
    if (isInCheck(currentPlayer)) {
      text += ' - JAQUE!';
    }
    status.textContent = text;
  }
}

function updateMoveHistory() {
  const movesList = document.getElementById('moves-list');
  if (!movesList) return;
  movesList.innerHTML = '';
  moveHistory.forEach((move, index) => {
    const moveDiv = document.createElement('div');
    moveDiv.className = 'move-item';
    moveDiv.textContent = `${index + 1}. ${move.notation}`;
    movesList.appendChild(moveDiv);
  });
  movesList.scrollTop = movesList.scrollHeight;
}

function updateCapturedPieces() {
  const whiteCaptured = document.getElementById('white-captured');
  const blackCaptured = document.getElementById('black-captured');
  
  if (whiteCaptured) {
    whiteCaptured.innerHTML = '';
    capturedPieces.white.forEach(p => {
      const span = document.createElement('span');
      span.className = 'captured-piece';
      span.style.color = '#00ffff';
      span.textContent = p;
      whiteCaptured.appendChild(span);
    });
  }
  
  if (blackCaptured) {
    blackCaptured.innerHTML = '';
    capturedPieces.black.forEach(p => {
      const span = document.createElement('span');
      span.className = 'captured-piece';
      span.style.color = '#ff00ff';
      span.textContent = p;
      blackCaptured.appendChild(span);
    });
  }
}

function showPromotionModal(isWhite) {
  const modal = document.getElementById('promotion-modal');
  const piecesContainer = document.getElementById('promotion-pieces');
  if (!modal || !piecesContainer) return;

  const promotionOptions = isWhite
    ? [{ piece: '♕', name: 'Reina' }, { piece: '♖', name: 'Torre' }, { piece: '♗', name: 'Alfil' }, { piece: '♘', name: 'Caballo' }]
    : [{ piece: '♛', name: 'Reina' }, { piece: '♜', name: 'Torre' }, { piece: '♝', name: 'Alfil' }, { piece: '♞', name: 'Caballo' }];

  piecesContainer.innerHTML = '';
  promotionOptions.forEach(opt => {
    const div = document.createElement('div');
    div.className = 'promotion-piece';
    div.innerHTML = `<div class="piece ${isWhite ? 'white' : 'black'}">${opt.piece}</div>`;
    div.title = opt.name;
    div.onclick = () => selectPromotionPiece(opt.piece);
    piecesContainer.appendChild(div);
  });

  modal.classList.add('active');
}

function selectPromotionPiece(selectedPiece) {
  const validPieces = ['♕', '♖', '♗', '♘', '♛', '♜', '♝', '♞'];
  if (!validPieces.includes(selectedPiece)) return;
  const modal = document.getElementById('promotion-modal');
  if (modal) modal.classList.remove('active');

  if (pendingPromotion) {
    const { fromRow, fromCol, toRow, toCol, piece, capturedPiece, isWhite, prevGameState, prevCapturedPieces } = pendingPromotion;
    addChatMessage('Sistema', `Peon promocionado a ${selectedPiece}`);
    completeMoveLogic(fromRow, fromCol, toRow, toCol, piece, capturedPiece, isWhite, prevGameState, prevCapturedPieces, selectedPiece);
    pendingPromotion = null;
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    updateStatus();
    if (gameMode === 'ai' && currentPlayer === 'black') {
      setTimeout(() => makeAIMove(), 250);
    }
  }
}

function showCheckmateModal(winner) {
  const modal = document.getElementById('checkmate-modal');
  const winnerText = document.getElementById('checkmate-winner');
  if (!modal || !winnerText) return;
  winnerText.textContent = `${winner} Ganan!`;
  modal.classList.add('active');
  
  if (gameMode === 'online') {
    setOutcomeRecorded(true);
    const playerCol = getPlayerColor();
    const isWin = (winner === 'Blancas' && playerCol === 'white') || (winner === 'Negras' && playerCol === 'black');
    
    if (isWin) {
      updateUserWins();
      saveGameToHistory('win', getOpponentDataForHistory(), getGameMoves(), playerCol);
    } else {
      updateUserLosses();
      saveGameToHistory('loss', getOpponentDataForHistory(), getGameMoves(), playerCol);
    }
  }
}

function getOpponentDataForHistory() {
  const oppName = document.getElementById('opponent-name');
  const oppFlag = document.getElementById('opponent-flag');
  return {
    username: oppName ? oppName.textContent : 'Oponente',
    countryFlag: oppFlag ? oppFlag.textContent : ''
  };
}

function showStalemateModal() {
  const modal = document.getElementById('checkmate-modal');
  const winnerText = document.getElementById('checkmate-winner');
  const title = document.getElementById('checkmate-title');
  if (!modal || !winnerText) return;
  if (title) title.textContent = 'TABLAS';
  winnerText.textContent = 'La partida termino en empate';
  modal.classList.add('active');
  
  if (gameMode === 'online') {
    setOutcomeRecorded(true);
    updateUserDraws();
    const playerCol = getPlayerColor();
    saveGameToHistory('draw', getOpponentDataForHistory(), getGameMoves(), playerCol);
  }
}

function closeCheckmateModal() {
  const modal = document.getElementById('checkmate-modal');
  if (modal) modal.classList.remove('active');
  
  const title = document.getElementById('checkmate-title');
  if (title) title.textContent = 'JAQUE MATE';
  
  if (gameMode === 'online') {
    endOnlineGame(true);
  } else {
    resetGame();
  }
}

function closeCheckmateModalOnly() {
  const modal = document.getElementById('checkmate-modal');
  if (modal) modal.classList.remove('active');
}

function showGameModeModal() {
  const gm = document.getElementById('game-mode-modal');
  if (!gm) return;
  gm.classList.remove('hidden');
  gm.style.display = 'flex';
}

function hideGameModeModal() {
  const gm = document.getElementById('game-mode-modal');
  if (!gm) return;
  gm.classList.add('hidden');
  gm.style.display = 'none';
}

function goToOnlineMode() {
  const user = getCurrentUser();
  const profile = getUserProfile();
  
  if (user && profile) {
    hideGameModeModal();
    showLobbyModal();
  } else if (user && !profile) {
    hideGameModeModal();
    showProfileModal();
  } else {
    showLoginModal();
  }
}

function showLoginModal() {
  const m = document.getElementById('login-modal');
  if (m) m.classList.add('active');
}

function hideLoginModal() {
  const m = document.getElementById('login-modal');
  if (m) m.classList.remove('active');
}

function showProfileModal() {
  const m = document.getElementById('profile-modal');
  if (m) {
    m.classList.add('active');
    renderCountryGrid();
    if (typeof prefillProfileModal === 'function') {
      prefillProfileModal();
    }
  }
}

function hideProfileModal() {
  const m = document.getElementById('profile-modal');
  if (m) m.classList.remove('active');
}

function showLobbyModal() {
  const m = document.getElementById('lobby-modal');
  const profile = getUserProfile();
  
  if (profile) {
    const flagEl = document.getElementById('player-flag');
    const nameEl = document.getElementById('player-name');
    const winsEl = document.getElementById('player-wins');
    
    if (flagEl) flagEl.textContent = profile.countryFlag || '';
    if (nameEl) nameEl.textContent = profile.username || 'Jugador';
    if (winsEl) winsEl.textContent = profile.wins || 0;
  }
  
  if (m) m.classList.add('active');
  updateOnlineCount();
}

function hideLobbyModal() {
  const m = document.getElementById('lobby-modal');
  if (m) m.classList.remove('active');
}

function showWaitingModal() {
  const m = document.getElementById('waiting-modal');
  if (m) m.classList.add('active');
}

function hideWaitingModal() {
  const m = document.getElementById('waiting-modal');
  if (m) m.classList.remove('active');
}

function showOpponentFoundModal(opponent, opponentColor) {
  const m = document.getElementById('opponent-found-modal');
  const profile = getUserProfile();
  
  if (profile) {
    const myFlag = document.getElementById('my-match-flag');
    const myName = document.getElementById('my-match-name');
    const myColor = document.getElementById('my-match-color');
    if (myFlag) myFlag.textContent = profile.countryFlag || '';
    if (myName) myName.textContent = profile.username || 'Tu';
    if (myColor) myColor.textContent = opponentColor === 'black' ? 'Blancas' : 'Negras';
  }
  
  if (opponent) {
    const oppFlag = document.getElementById('opponent-match-flag');
    const oppName = document.getElementById('opponent-match-name');
    const oppColor = document.getElementById('opponent-match-color');
    if (oppFlag) oppFlag.textContent = opponent.countryFlag || '';
    if (oppName) oppName.textContent = opponent.username || 'Oponente';
    if (oppColor) oppColor.textContent = opponentColor === 'black' ? 'Negras' : 'Blancas';
  }
  
  if (m) m.classList.add('active');
}

function hideOpponentFoundModal() {
  const m = document.getElementById('opponent-found-modal');
  if (m) m.classList.remove('active');
}

function showDisconnectModal() {
  const m = document.getElementById('disconnect-modal');
  if (m) m.classList.add('active');
}

function hideDisconnectModal() {
  const m = document.getElementById('disconnect-modal');
  if (m) m.classList.remove('active');
}

function showOpponentAbandonedModal() {
  const modal = document.getElementById('checkmate-modal');
  const winnerText = document.getElementById('checkmate-winner');
  const title = document.getElementById('checkmate-title');
  if (!modal || !winnerText) return;
  if (title) title.textContent = 'VICTORIA';
  winnerText.textContent = 'Tu oponente abandono la partida';
  modal.classList.add('active');
}

function hideAllModals() {
  hideGameModeModal();
  hideLoginModal();
  hideProfileModal();
  hideLobbyModal();
  hideWaitingModal();
  hideOpponentFoundModal();
  hideDisconnectModal();
}

function updateOnlineCount() {
  const db = getDatabase();
  if (!db) {
    const el = document.getElementById('online-count');
    if (el) el.textContent = Math.floor(Math.random() * 100) + 50;
    return;
  }
  
  db.ref('online_count').on('value', (snapshot) => {
    const count = snapshot.val() || 0;
    const el = document.getElementById('online-count');
    if (el) el.textContent = count;
  });
}

function showDonateModal() {
  const modal = document.getElementById('donate-modal');
  if (modal) modal.classList.add('active');
}

function hideDonateModal() {
  const modal = document.getElementById('donate-modal');
  if (modal) modal.classList.remove('active');
}

function showTermsModal() {
  const modal = document.getElementById('terms-modal');
  if (modal) modal.classList.add('active');
}

function hideTermsModal() {
  const modal = document.getElementById('terms-modal');
  if (modal) modal.classList.remove('active');
}
