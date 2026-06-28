const initialBoard = [
  ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
  ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
  ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
];

let currentBoard = JSON.parse(JSON.stringify(initialBoard));
let currentPlayer = 'white';
let selectedSquare = null;
let moveHistory = [];
let boardHistory = [];
let capturedPieces = { white: [], black: [] };
let pendingPromotion = null;

let gameState = {
  whiteKingMoved: false,
  blackKingMoved: false,
  whiteRookKingsideMoved: false,
  whiteRookQueensideMoved: false,
  blackRookKingsideMoved: false,
  blackRookQueensideMoved: false,
  enPassantTarget: null,
  lastMove: null
};

const whitePieces = ['♔', '♕', '♖', '♗', '♘', '♙'];
const blackPieces = ['♚', '♛', '♜', '♝', '♞', '♟'];

const pieceValues = {
  '♟': 1, '♙': -1,
  '♞': 3, '♘': -3,
  '♝': 3, '♗': -3,
  '♜': 5, '♖': -5,
  '♛': 9, '♕': -9,
  '♚': 0, '♔': 0
};

function getPossibleMoves(row, col, piece) {
  const moves = [];
  if (!piece) return moves;
  const isWhite = whitePieces.includes(piece);

  switch (piece) {
    case '♙':
      if (row > 0 && !currentBoard[row - 1][col]) {
        moves.push([row - 1, col]);
        if (row === 6 && !currentBoard[row - 2][col]) moves.push([row - 2, col]);
      }
      if (row > 0 && col > 0 && currentBoard[row - 1][col - 1] && blackPieces.includes(currentBoard[row - 1][col - 1]))
        moves.push([row - 1, col - 1]);
      if (row > 0 && col < 7 && currentBoard[row - 1][col + 1] && blackPieces.includes(currentBoard[row - 1][col + 1]))
        moves.push([row - 1, col + 1]);
      if (gameState.enPassantTarget && row === 3) {
        if (Math.abs(col - gameState.enPassantTarget.col) === 1 && gameState.enPassantTarget.row === 2) {
          moves.push([2, gameState.enPassantTarget.col]);
        }
      }
      break;

    case '♟':
      if (row < 7 && !currentBoard[row + 1][col]) {
        moves.push([row + 1, col]);
        if (row === 1 && !currentBoard[row + 2][col]) moves.push([row + 2, col]);
      }
      if (row < 7 && col > 0 && currentBoard[row + 1][col - 1] && whitePieces.includes(currentBoard[row + 1][col - 1]))
        moves.push([row + 1, col - 1]);
      if (row < 7 && col < 7 && currentBoard[row + 1][col + 1] && whitePieces.includes(currentBoard[row + 1][col + 1]))
        moves.push([row + 1, col + 1]);
      if (gameState.enPassantTarget && row === 4) {
        if (Math.abs(col - gameState.enPassantTarget.col) === 1 && gameState.enPassantTarget.row === 5) {
          moves.push([5, gameState.enPassantTarget.col]);
        }
      }
      break;

    case '♖':
    case '♜': {
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [dr, dc] of dirs) {
        for (let i = 1; i < 8; i++) {
          const nr = row + dr * i, nc = col + dc * i;
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) break;
          if (!currentBoard[nr][nc]) moves.push([nr, nc]);
          else {
            if (isWhite ? blackPieces.includes(currentBoard[nr][nc]) : whitePieces.includes(currentBoard[nr][nc]))
              moves.push([nr, nc]);
            break;
          }
        }
      }
      break;
    }

    case '♗':
    case '♝': {
      const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const [dr, dc] of dirs) {
        for (let i = 1; i < 8; i++) {
          const nr = row + dr * i, nc = col + dc * i;
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) break;
          if (!currentBoard[nr][nc]) moves.push([nr, nc]);
          else {
            if (isWhite ? blackPieces.includes(currentBoard[nr][nc]) : whitePieces.includes(currentBoard[nr][nc]))
              moves.push([nr, nc]);
            break;
          }
        }
      }
      break;
    }

    case '♘':
    case '♞': {
      const km = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
      for (const [dr, dc] of km) {
        const nr = row + dr, nc = col + dc;
        if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
        if (!currentBoard[nr][nc] || (isWhite ? blackPieces.includes(currentBoard[nr][nc]) : whitePieces.includes(currentBoard[nr][nc])))
          moves.push([nr, nc]);
      }
      break;
    }

    case '♕':
    case '♛': {
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const [dr, dc] of dirs) {
        for (let i = 1; i < 8; i++) {
          const nr = row + dr * i, nc = col + dc * i;
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) break;
          if (!currentBoard[nr][nc]) moves.push([nr, nc]);
          else {
            if (isWhite ? blackPieces.includes(currentBoard[nr][nc]) : whitePieces.includes(currentBoard[nr][nc]))
              moves.push([nr, nc]);
            break;
          }
        }
      }
      break;
    }

    case '♔':
    case '♚': {
      const km = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      for (const [dr, dc] of km) {
        const nr = row + dr, nc = col + dc;
        if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
        if (!currentBoard[nr][nc] || (isWhite ? blackPieces.includes(currentBoard[nr][nc]) : whitePieces.includes(currentBoard[nr][nc])))
          moves.push([nr, nc]);
      }

      if (piece === '♔' && !gameState.whiteKingMoved && row === 7 && col === 4) {
        if (!gameState.whiteRookKingsideMoved && currentBoard[7][7] === '♖' && !currentBoard[7][5] && !currentBoard[7][6] &&
            !isSquareUnderAttack(7, 4, 'white') && !isSquareUnderAttack(7, 5, 'white') && !isSquareUnderAttack(7, 6, 'white')) {
          moves.push([7, 6]);
        }
        if (!gameState.whiteRookQueensideMoved && currentBoard[7][0] === '♖' && !currentBoard[7][1] && !currentBoard[7][2] && !currentBoard[7][3] &&
            !isSquareUnderAttack(7, 4, 'white') && !isSquareUnderAttack(7, 3, 'white') && !isSquareUnderAttack(7, 2, 'white')) {
          moves.push([7, 2]);
        }
      }
      if (piece === '♚' && !gameState.blackKingMoved && row === 0 && col === 4) {
        if (!gameState.blackRookKingsideMoved && currentBoard[0][7] === '♜' && !currentBoard[0][5] && !currentBoard[0][6] &&
            !isSquareUnderAttack(0, 4, 'black') && !isSquareUnderAttack(0, 5, 'black') && !isSquareUnderAttack(0, 6, 'black')) {
          moves.push([0, 6]);
        }
        if (!gameState.blackRookQueensideMoved && currentBoard[0][0] === '♜' && !currentBoard[0][1] && !currentBoard[0][2] && !currentBoard[0][3] &&
            !isSquareUnderAttack(0, 4, 'black') && !isSquareUnderAttack(0, 3, 'black') && !isSquareUnderAttack(0, 2, 'black')) {
          moves.push([0, 2]);
        }
      }
      break;
    }
  }

  return moves.filter(([tr, tc]) => !wouldBeInCheck(row, col, tr, tc, whitePieces.includes(piece) ? 'white' : 'black'));
}

function isValidMove(fr, fc, tr, tc) {
  const piece = currentBoard[fr][fc];
  if (!piece) return false;
  const possible = getPossibleMoves(fr, fc, piece);
  return possible.some(([r, c]) => r === tr && c === tc);
}

function findKing(color) {
  const king = color === 'white' ? '♔' : '♚';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (currentBoard[r][c] === king) return [r, c];
    }
  }
  return null;
}

function isSquareUnderAttack(row, col, defendingColor) {
  const attackingPieces = defendingColor === 'white' ? blackPieces : whitePieces;
  
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = currentBoard[r][c];
      if (piece && attackingPieces.includes(piece)) {
        const attacks = getAttackMoves(r, c, piece);
        if (attacks.some(([ar, ac]) => ar === row && ac === col)) {
          return true;
        }
      }
    }
  }
  return false;
}

function getAttackMoves(row, col, piece) {
  const moves = [];
  const isWhite = whitePieces.includes(piece);

  switch (piece) {
    case '♙':
      if (row > 0 && col > 0) moves.push([row - 1, col - 1]);
      if (row > 0 && col < 7) moves.push([row - 1, col + 1]);
      break;
    case '♟':
      if (row < 7 && col > 0) moves.push([row + 1, col - 1]);
      if (row < 7 && col < 7) moves.push([row + 1, col + 1]);
      break;
    case '♖':
    case '♜': {
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [dr, dc] of dirs) {
        for (let i = 1; i < 8; i++) {
          const nr = row + dr * i, nc = col + dc * i;
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) break;
          moves.push([nr, nc]);
          if (currentBoard[nr][nc]) break;
        }
      }
      break;
    }
    case '♗':
    case '♝': {
      const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const [dr, dc] of dirs) {
        for (let i = 1; i < 8; i++) {
          const nr = row + dr * i, nc = col + dc * i;
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) break;
          moves.push([nr, nc]);
          if (currentBoard[nr][nc]) break;
        }
      }
      break;
    }
    case '♘':
    case '♞': {
      const km = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
      for (const [dr, dc] of km) {
        const nr = row + dr, nc = col + dc;
        if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) moves.push([nr, nc]);
      }
      break;
    }
    case '♕':
    case '♛': {
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const [dr, dc] of dirs) {
        for (let i = 1; i < 8; i++) {
          const nr = row + dr * i, nc = col + dc * i;
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) break;
          moves.push([nr, nc]);
          if (currentBoard[nr][nc]) break;
        }
      }
      break;
    }
    case '♔':
    case '♚': {
      const km = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      for (const [dr, dc] of km) {
        const nr = row + dr, nc = col + dc;
        if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) moves.push([nr, nc]);
      }
      break;
    }
  }
  return moves;
}

function wouldBeInCheck(fromRow, fromCol, toRow, toCol, color) {
  const originalPiece = currentBoard[toRow][toCol];
  const movingPiece = currentBoard[fromRow][fromCol];

  // Identificar si es una captura al paso (en passant)
  const isPawn = movingPiece === '♙' || movingPiece === '♟';
  const isEnPassantCapture = isPawn && (toCol !== fromCol) && !originalPiece && 
                             gameState.enPassantTarget && (toRow === gameState.enPassantTarget.row) && (toCol === gameState.enPassantTarget.col);
                             
  let enPassantCapturedPiece = null;
  const enPassantRow = fromRow; // El peón capturado al paso está en la misma fila de origen del peón atacante

  if (isEnPassantCapture) {
    enPassantCapturedPiece = currentBoard[enPassantRow][toCol];
    currentBoard[enPassantRow][toCol] = null; // Quitar temporalmente el peón capturado al paso
  }

  currentBoard[toRow][toCol] = movingPiece;
  currentBoard[fromRow][fromCol] = null;

  const inCheck = isInCheck(color);

  currentBoard[fromRow][fromCol] = movingPiece;
  currentBoard[toRow][toCol] = originalPiece;
  
  if (isEnPassantCapture) {
    currentBoard[enPassantRow][toCol] = enPassantCapturedPiece; // Restaurar el peón capturado al paso
  }
  
  return inCheck;
}

function isInCheck(color) {
  const kp = findKing(color);
  if (!kp) return false;
  return isSquareUnderAttack(kp[0], kp[1], color);
}

function isCheckmate(color) {
  if (!isInCheck(color)) return false;
  const pieces = color === 'white' ? whitePieces : blackPieces;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = currentBoard[r][c];
      if (p && pieces.includes(p)) {
        const moves = getPossibleMoves(r, c, p);
        if (moves.length > 0) return false;
      }
    }
  }
  return true;
}

function isStalemate(color) {
  if (isInCheck(color)) return false;
  const pieces = color === 'white' ? whitePieces : blackPieces;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = currentBoard[r][c];
      if (p && pieces.includes(p)) {
        const moves = getPossibleMoves(r, c, p);
        if (moves.length > 0) return false;
      }
    }
  }
  return true;
}

function makeMove(fromRow, fromCol, toRow, toCol) {
  boardHistory.push(JSON.parse(JSON.stringify(currentBoard)));
  const prevGameState = JSON.parse(JSON.stringify(gameState));
  const prevCapturedPieces = JSON.parse(JSON.stringify(capturedPieces));

  const piece = currentBoard[fromRow][fromCol];
  const capturedPiece = currentBoard[toRow][toCol];
  const isWhite = whitePieces.includes(piece);

  const isPromotion = (piece === '♙' && toRow === 0) || (piece === '♟' && toRow === 7);

  if (isPromotion) {
    pendingPromotion = { fromRow, fromCol, toRow, toCol, piece, capturedPiece, isWhite, prevGameState, prevCapturedPieces };
    showPromotionModal(isWhite);
    return;
  }

  completeMoveLogic(fromRow, fromCol, toRow, toCol, piece, capturedPiece, isWhite, prevGameState, prevCapturedPieces, null);
}

function completeMoveLogic(fromRow, fromCol, toRow, toCol, piece, capturedPiece, isWhite, prevGameState, prevCapturedPieces, promotionPiece) {
  const isKing = piece === '♔' || piece === '♚';
  const isCastling = isKing && Math.abs(toCol - fromCol) === 2;
  let isEnPassant = false;

  if (isCastling) {
    currentBoard[toRow][toCol] = piece;
    currentBoard[fromRow][fromCol] = null;
    if (toCol === 6) {
      currentBoard[toRow][5] = currentBoard[toRow][7];
      currentBoard[toRow][7] = null;
      addChatMessage('Sistema', `${isWhite ? 'Blancas' : 'Negras'} realizo enroque corto`);
    } else if (toCol === 2) {
      currentBoard[toRow][3] = currentBoard[toRow][0];
      currentBoard[toRow][0] = null;
      addChatMessage('Sistema', `${isWhite ? 'Blancas' : 'Negras'} realizo enroque largo`);
    }
  } else {
    if ((piece === '♙' || piece === '♟') && toCol !== fromCol && !capturedPiece) {
      const capturedRow = isWhite ? toRow + 1 : toRow - 1;
      const enPassantPiece = currentBoard[capturedRow][toCol];
      if (enPassantPiece) {
        isEnPassant = true;
        currentBoard[capturedRow][toCol] = null;
        if (whitePieces.includes(enPassantPiece)) capturedPieces.white.push(enPassantPiece);
        else capturedPieces.black.push(enPassantPiece);
        addChatMessage('Sistema', `${isWhite ? 'Blancas' : 'Negras'} capturo al paso: ${enPassantPiece}`);
        updateCapturedPieces();
      }
    }

    if (capturedPiece) {
      if (whitePieces.includes(capturedPiece)) capturedPieces.white.push(capturedPiece);
      else capturedPieces.black.push(capturedPiece);
      updateCapturedPieces();
      addChatMessage('Sistema', `${isWhite ? 'Blancas' : 'Negras'} capturo: ${capturedPiece}`);
    }

    const finalPiece = promotionPiece || piece;
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
  updateMoveHistory();

  if (gameMode === 'online' && !isReceivingOpponentMove()) {
    syncMove(fromRow, fromCol, toRow, toCol, piece, {
      capturedPiece: capturedPiece,
      isCastling: isCastling,
      isEnPassant: isEnPassant,
      promotionPiece: promotionPiece
    });
  }

  createBoard();
  if (typeof playMoveSound === 'function') {
    playMoveSound(!!capturedPiece);
  }

  const opponentColor = isWhite ? 'black' : 'white';
  if (isInCheck(opponentColor)) {
    if (isCheckmate(opponentColor)) {
      const winner = isWhite ? 'Blancas' : 'Negras';
      const winnerColor = isWhite ? 'white' : 'black';
      addChatMessage('Sistema', `JAQUE MATE! ${winner} ganan`);
      if (gameMode === 'online' && !isReceivingOpponentMove()) {
        syncCheckmate(winnerColor);
      }
      showCheckmateModal(winner);
    } else {
      addChatMessage('Sistema', `JAQUE a ${opponentColor === 'white' ? 'Blancas' : 'Negras'}!`);
    }
  } else if (isStalemate(opponentColor)) {
    addChatMessage('Sistema', 'Tablas por ahogado!');
    showStalemateModal();
  }
}

function undoMove() {
  if (boardHistory.length > 0 && moveHistory.length > 0) {
    currentBoard = boardHistory.pop();
    const lastMove = moveHistory.pop();
    if (lastMove.gameState) gameState = lastMove.gameState;
    if (lastMove.capturedPieces) capturedPieces = lastMove.capturedPieces;
    else capturedPieces = { white: [], black: [] };
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    selectedSquare = null;
    createBoard();
    if (typeof playMoveSound === 'function') {
      playMoveSound(false);
    }
    updateStatus();
    updateMoveHistory();
    updateCapturedPieces();
    addChatMessage('Sistema', 'Movimiento deshecho');
  }
}
