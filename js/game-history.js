let currentReplayGame = null;
let replayMoveIndex = 0;
let replayBoard = null;

function saveGameToHistory(result, opponentInfo, moves, playerCol) {
  const db = getDatabase();
  const user = getCurrentUser();
  
  if (!db || !user) return;
  
  const cleanMoves = (moves || []).map(m => ({
    fromRow: m.fromRow,
    fromCol: m.fromCol,
    toRow: m.toRow,
    toCol: m.toCol,
    piece: m.piece,
    player: m.player,
    capturedPiece: m.capturedPiece !== undefined ? m.capturedPiece : null,
    isCastling: m.isCastling || false,
    isEnPassant: m.isEnPassant || false,
    promotionPiece: m.promotionPiece !== undefined ? m.promotionPiece : null
  }));
  
  const gameRecord = {
    result: result,
    opponent: {
      username: opponentInfo.username || 'Oponente',
      countryFlag: opponentInfo.countryFlag || '',
      wins: opponentInfo.wins || 0
    },
    playerColor: playerCol,
    moves: cleanMoves,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  
  db.ref('users/' + user.uid + '/gameHistory').push(gameRecord)
    .then(() => console.log('Game saved to history'))
    .catch((err) => console.error('Error saving game:', err));
}

function loadGameHistory() {
  const db = getDatabase();
  const user = getCurrentUser();
  
  if (!db || !user) {
    showHistoryEmpty();
    return;
  }
  
  db.ref('users/' + user.uid + '/gameHistory')
    .orderByChild('timestamp')
    .limitToLast(50)
    .once('value')
    .then((snapshot) => {
      const games = [];
      snapshot.forEach((child) => {
        games.unshift({ id: child.key, ...child.val() });
      });
      renderGameHistory(games);
    })
    .catch((err) => {
      console.error('Error loading history:', err);
      showHistoryEmpty();
    });
}

function renderGameHistory(games) {
  const list = document.getElementById('history-list');
  if (!list) return;
  
  if (games.length === 0) {
    showHistoryEmpty();
    return;
  }
  
  list.innerHTML = '';
  
  games.forEach((game, index) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.setAttribute('data-testid', `history-item-${index}`);
    
    const resultClass = game.result === 'win' ? 'result-win' : 
                        game.result === 'loss' ? 'result-loss' : 'result-draw';
    const resultText = game.result === 'win' ? 'Victoria' : 
                       game.result === 'loss' ? 'Derrota' : 'Empate';
    
    const date = new Date(game.timestamp);
    const dateStr = date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit' 
    });
    
    const colorText = game.playerColor === 'white' ? 'Blancas' : 'Negras';
    const movesCount = game.moves ? game.moves.length : 0;
    
    item.innerHTML = `
      <div class="history-info">
        <div class="history-opponent">
          <span class="history-flag">${game.opponent.countryFlag || ''}</span>
          <span class="history-name">${game.opponent.username}</span>
        </div>
        <div class="history-details">
          <span class="history-color">${colorText}</span>
          <span class="history-moves">${movesCount} movimientos</span>
          <span class="history-date">${dateStr}</span>
        </div>
      </div>
      <div class="history-actions">
        <div class="history-result ${resultClass}">${resultText}</div>
        <button class="history-replay-btn" onclick="startReplay('${game.id}')" data-testid="button-replay-${index}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>
      </div>
    `;
    
    list.appendChild(item);
  });
}

function showHistoryEmpty() {
  const list = document.getElementById('history-list');
  if (list) {
    list.innerHTML = '<div class="history-empty">No tienes partidas guardadas todavia</div>';
  }
}

function showHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (modal) {
    modal.classList.add('active');
    loadGameHistory();
  }
}

function hideHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (modal) modal.classList.remove('active');
}

function startReplay(gameId) {
  const db = getDatabase();
  const user = getCurrentUser();
  
  if (!db || !user) return;
  
  db.ref('users/' + user.uid + '/gameHistory/' + gameId)
    .once('value')
    .then((snapshot) => {
      const game = snapshot.val();
      if (game && game.moves && game.moves.length > 0) {
        currentReplayGame = game;
        replayMoveIndex = 0;
        initReplayBoard(game.playerColor);
        hideHistoryModal();
        showReplayModal(game);
      } else {
        addChatMessage('Sistema', 'Esta partida no tiene movimientos para reproducir');
      }
    });
}

function initReplayBoard(playerCol) {
  replayBoard = [
    ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
    ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
    ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
  ];
  renderReplayBoard(playerCol === 'black');
}

function renderReplayBoard(flipped) {
  const boardEl = document.getElementById('replay-board');
  if (!boardEl) return;
  
  const whitePieces = ['♔', '♕', '♖', '♗', '♘', '♙'];
  const blackPieces = ['♚', '♛', '♜', '♝', '♞', '♟'];
  
  boardEl.innerHTML = '';
  
  for (let displayRow = 0; displayRow < 8; displayRow++) {
    for (let displayCol = 0; displayCol < 8; displayCol++) {
      const row = flipped ? 7 - displayRow : displayRow;
      const col = flipped ? 7 - displayCol : displayCol;
      
      const square = document.createElement('div');
      const isLight = (row + col) % 2 === 0;
      square.className = `replay-square ${isLight ? 'light' : 'dark'}`;
      
      const piece = replayBoard[row][col];
      if (piece) {
        square.textContent = piece;
        if (whitePieces.includes(piece)) {
          square.classList.add('white-piece');
        } else if (blackPieces.includes(piece)) {
          square.classList.add('black-piece');
        }
      }
      
      boardEl.appendChild(square);
    }
  }
}

function showReplayModal(game) {
  const modal = document.getElementById('replay-modal');
  if (!modal) return;
  
  const info = document.getElementById('replay-info');
  if (info) {
    const resultText = game.result === 'win' ? 'Victoria' : 
                       game.result === 'loss' ? 'Derrota' : 'Empate';
    info.innerHTML = `
      <span class="replay-vs">vs ${game.opponent.countryFlag} ${game.opponent.username}</span>
      <span class="replay-result">${resultText}</span>
    `;
  }
  
  updateReplayCounter();
  modal.classList.add('active');
}

function hideReplayModal() {
  const modal = document.getElementById('replay-modal');
  if (modal) modal.classList.remove('active');
  currentReplayGame = null;
  replayMoveIndex = 0;
  replayBoard = null;
}

function updateReplayCounter() {
  const counter = document.getElementById('replay-counter');
  if (counter && currentReplayGame) {
    const total = currentReplayGame.moves.length;
    counter.textContent = `${replayMoveIndex} / ${total}`;
  }
}

function replayNext() {
  if (!currentReplayGame || !currentReplayGame.moves) return;
  if (replayMoveIndex >= currentReplayGame.moves.length) return;
  
  const move = currentReplayGame.moves[replayMoveIndex];
  
  if (move.isCastling) {
    replayBoard[move.toRow][move.toCol] = replayBoard[move.fromRow][move.fromCol];
    replayBoard[move.fromRow][move.fromCol] = null;
    
    if (move.toCol === 6) {
      replayBoard[move.toRow][5] = replayBoard[move.toRow][7];
      replayBoard[move.toRow][7] = null;
    } else if (move.toCol === 2) {
      replayBoard[move.toRow][3] = replayBoard[move.toRow][0];
      replayBoard[move.toRow][0] = null;
    }
  } else if (move.isEnPassant) {
    replayBoard[move.toRow][move.toCol] = replayBoard[move.fromRow][move.fromCol];
    replayBoard[move.fromRow][move.fromCol] = null;
    replayBoard[move.fromRow][move.toCol] = null;
  } else {
    replayBoard[move.toRow][move.toCol] = move.promotionPiece || replayBoard[move.fromRow][move.fromCol];
    replayBoard[move.fromRow][move.fromCol] = null;
  }
  
  replayMoveIndex++;
  renderReplayBoard(currentReplayGame.playerColor === 'black');
  updateReplayCounter();
}

function replayPrev() {
  if (!currentReplayGame || replayMoveIndex <= 0) return;
  
  replayMoveIndex--;
  initReplayBoard(currentReplayGame.playerColor);
  
  for (let i = 0; i < replayMoveIndex; i++) {
    const move = currentReplayGame.moves[i];
    
    if (move.isCastling) {
      replayBoard[move.toRow][move.toCol] = replayBoard[move.fromRow][move.fromCol];
      replayBoard[move.fromRow][move.fromCol] = null;
      if (move.toCol === 6) {
        replayBoard[move.toRow][5] = replayBoard[move.toRow][7];
        replayBoard[move.toRow][7] = null;
      } else if (move.toCol === 2) {
        replayBoard[move.toRow][3] = replayBoard[move.toRow][0];
        replayBoard[move.toRow][0] = null;
      }
    } else if (move.isEnPassant) {
      replayBoard[move.toRow][move.toCol] = replayBoard[move.fromRow][move.fromCol];
      replayBoard[move.fromRow][move.fromCol] = null;
      replayBoard[move.fromRow][move.toCol] = null;
    } else {
      replayBoard[move.toRow][move.toCol] = move.promotionPiece || replayBoard[move.fromRow][move.fromCol];
      replayBoard[move.fromRow][move.fromCol] = null;
    }
  }
  
  renderReplayBoard(currentReplayGame.playerColor === 'black');
  updateReplayCounter();
}

function replayFirst() {
  if (!currentReplayGame) return;
  replayMoveIndex = 0;
  initReplayBoard(currentReplayGame.playerColor);
  updateReplayCounter();
}

function replayLast() {
  if (!currentReplayGame || !currentReplayGame.moves) return;
  
  replayFirst();
  while (replayMoveIndex < currentReplayGame.moves.length) {
    replayNext();
  }
}

function backToHistory() {
  hideReplayModal();
  showHistoryModal();
}
