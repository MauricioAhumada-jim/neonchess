let gameMode = null;
let aiDifficulty = null;
let isAIThinking = false;

const simulationStack = [];

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function simulateMoveObject(move) {
  simulationStack.push({
    board: deepClone(currentBoard),
    gameState: deepClone(gameState),
    capturedPieces: deepClone(capturedPieces),
    currentPlayer,
    moveHistoryLen: moveHistory.length
  });

  const fr = move.fromRow, fc = move.fromCol, tr = move.toRow, tc = move.toCol;
  const piece = currentBoard[fr][fc];
  if (!piece) return;

  const capturedPiece = currentBoard[tr][tc];
  const isWhite = whitePieces.includes(piece);

  const isKing = piece === '♔' || piece === '♚';
  const isCastling = isKing && Math.abs(tc - fc) === 2;

  if (isCastling) {
    currentBoard[tr][tc] = piece;
    currentBoard[fr][fc] = null;
    if (tc === 6) {
      currentBoard[tr][5] = currentBoard[tr][7];
      currentBoard[tr][7] = null;
    } else if (tc === 2) {
      currentBoard[tr][3] = currentBoard[tr][0];
      currentBoard[tr][0] = null;
    }
  } else {
    if ((piece === '♙' || piece === '♟') && tc !== fc && !capturedPiece) {
      const capturedRow = isWhite ? tr + 1 : tr - 1;
      const enPassantPiece = currentBoard[capturedRow][tc];
      if (enPassantPiece) {
        currentBoard[capturedRow][tc] = null;
        if (whitePieces.includes(enPassantPiece)) capturedPieces.white.push(enPassantPiece);
        else capturedPieces.black.push(enPassantPiece);
      }
    }

    if (capturedPiece) {
      if (whitePieces.includes(capturedPiece)) capturedPieces.white.push(capturedPiece);
      else capturedPieces.black.push(capturedPiece);
    }

    let finalPiece = piece;
    if (piece === '♙' && tr === 0) finalPiece = '♕';
    if (piece === '♟' && tr === 7) finalPiece = '♛';

    currentBoard[tr][tc] = finalPiece;
    currentBoard[fr][fc] = null;
  }

  if (piece === '♔') gameState.whiteKingMoved = true;
  if (piece === '♚') gameState.blackKingMoved = true;
  if (piece === '♖' && fr === 7 && fc === 7) gameState.whiteRookKingsideMoved = true;
  if (piece === '♖' && fr === 7 && fc === 0) gameState.whiteRookQueensideMoved = true;
  if (piece === '♜' && fr === 0 && fc === 7) gameState.blackRookKingsideMoved = true;
  if (piece === '♜' && fr === 0 && fc === 0) gameState.blackRookQueensideMoved = true;

  if ((piece === '♙' && fr === 6 && tr === 4) || (piece === '♟' && fr === 1 && tr === 3)) {
    gameState.enPassantTarget = { row: isWhite ? 5 : 2, col: tc };
  } else {
    gameState.enPassantTarget = null;
  }

  gameState.lastMove = { fromRow: fr, fromCol: fc, toRow: tr, toCol: tc };
  currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
}

function undoSimulatedMove() {
  if (simulationStack.length === 0) return;
  const snap = simulationStack.pop();
  currentBoard = snap.board;
  gameState = snap.gameState;
  capturedPieces = snap.capturedPieces;
  currentPlayer = snap.currentPlayer;
  while (moveHistory.length > snap.moveHistoryLen) moveHistory.pop();
}

function getAllPossibleMoves(color) {
  const moves = [];
  const pieces = color === 'white' ? whitePieces : blackPieces;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = currentBoard[r][c];
      if (p && pieces.includes(p)) {
        const pm = getPossibleMoves(r, c, p);
        pm.forEach(([tr, tc]) => moves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc, piece: p }));
      }
    }
  }
  return moves;
}

function evaluateBoard() {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = currentBoard[r][c];
      if (!p) continue;
      score += pieceValues[p] || 0;
      if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
        score += blackPieces.includes(p) ? 0.08 : -0.08;
      }
      if (blackPieces.includes(p) && r > 1) score += 0.03;
    }
  }
  return score;
}

function moveScoreForOrdering(move) {
  const target = currentBoard[move.toRow][move.toCol];
  if (!target) return 0;
  return Math.abs(pieceValues[target] || 0);
}

function getOnlyCaptureMoves(color) {
  return getAllPossibleMoves(color).filter(m => currentBoard[m.toRow][m.toCol] !== null);
}

function quiescenceSearch(alpha, beta, color = 'black') {
  let standPat = evaluateBoard();
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;

  const captureMoves = getOnlyCaptureMoves(color);
  captureMoves.sort((a, b) => moveScoreForOrdering(b) - moveScoreForOrdering(a));

  for (let mv of captureMoves) {
    simulateMoveObject(mv);
    const score = -quiescenceSearch(-beta, -alpha, color === 'black' ? 'white' : 'black');
    undoSimulatedMove();

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function alphaBeta(depth, alpha, beta, maximizingPlayer, color, branchingLimit = 30) {
  if (depth === 0) {
    return quiescenceSearch(alpha, beta, color);
  }

  let moves = getAllPossibleMoves(color);
  moves.sort((a, b) => moveScoreForOrdering(b) - moveScoreForOrdering(a));

  if (moves.length > branchingLimit) moves = moves.slice(0, branchingLimit);

  if (moves.length === 0) {
    if (isInCheck(color)) return -9999;
    return 0;
  }

  if (color === 'black') {
    let value = -Infinity;
    for (let mv of moves) {
      simulateMoveObject(mv);
      const score = alphaBeta(depth - 1, -beta, -alpha, !maximizingPlayer, 'white', branchingLimit);
      undoSimulatedMove();
      if (score > value) value = score;
      if (value > alpha) alpha = value;
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (let mv of moves) {
      simulateMoveObject(mv);
      const score = alphaBeta(depth - 1, -beta, -alpha, !maximizingPlayer, 'black', branchingLimit);
      undoSimulatedMove();
      if (score < value) value = score;
      if (value < beta) beta = value;
      if (alpha >= beta) break;
    }
    return value;
  }
}

function aiMoveEasy(allMoves) {
  const safe = allMoves.filter(m => {
    simulateMoveObject(m);
    const lost = wouldBeMaterialLossPostMove();
    undoSimulatedMove();
    return !lost;
  });
  if (safe.length > 0) return safe[Math.floor(Math.random() * safe.length)];
  return allMoves[Math.floor(Math.random() * allMoves.length)];
}

function aiMoveMedium(allMoves) {
  let best = null;
  let bestScore = -Infinity;
  for (let mv of allMoves) {
    simulateMoveObject(mv);
    const score = -evaluateBoard();
    undoSimulatedMove();
    if (score > bestScore) {
      bestScore = score;
      best = mv;
    }
  }
  return best || allMoves[Math.floor(Math.random() * allMoves.length)];
}

function aiMoveHard(allMoves) {
  let best = null;
  let bestScore = -Infinity;
  const depth = 2;
  for (let mv of allMoves) {
    simulateMoveObject(mv);
    const score = -alphaBeta(depth - 1, -Infinity, Infinity, false, 'white', 40);
    undoSimulatedMove();
    if (score > bestScore) {
      bestScore = score;
      best = mv;
    }
  }
  return best || allMoves[Math.floor(Math.random() * allMoves.length)];
}

function aiMoveExtreme(allMoves) {
  let best = null;
  let bestScore = -Infinity;
  const depth = 3;
  allMoves.sort((a, b) => moveScoreForOrdering(b) - moveScoreForOrdering(a));
  const searchMoves = allMoves.slice(0, 80);
  for (let mv of searchMoves) {
    simulateMoveObject(mv);
    const score = -alphaBeta(depth - 1, -99999, 99999, false, 'white', 60);
    undoSimulatedMove();
    if (score > bestScore) {
      bestScore = score;
      best = mv;
    }
  }
  return best || allMoves[Math.floor(Math.random() * allMoves.length)];
}

function wouldBeMaterialLossPostMove() {
  const cur = evaluateBoard();
  const oppMoves = getAllPossibleMoves('white');
  for (let m of oppMoves) {
    if (currentBoard[m.toRow][m.toCol] !== null) {
      simulateMoveObject(m);
      const after = evaluateBoard();
      undoSimulatedMove();
      if (after > cur + 0.9) return true;
    }
  }
  return false;
}

function getBestAIMove() {
  const allMoves = getAllPossibleMoves('black');
  if (allMoves.length === 0) return null;

  if (aiDifficulty === 'easy') return aiMoveEasy(allMoves);
  if (aiDifficulty === 'medium') return aiMoveMedium(allMoves);
  if (aiDifficulty === 'hard') return aiMoveHard(allMoves);
  if (aiDifficulty === 'extreme') return aiMoveExtreme(allMoves);
  return allMoves[Math.floor(Math.random() * allMoves.length)];
}

function makeAIMove() {
  if (isAIThinking || currentPlayer !== 'black') return;
  isAIThinking = true;
  addChatMessage('IA', 'Pensando...');

  const thinkingTimeMap = { easy: 200, medium: 400, hard: 900, extreme: 1400 };
  const wait = thinkingTimeMap[aiDifficulty] || 500;

  setTimeout(() => {
    const mv = getBestAIMove();
    if (mv) {
      makeMove(mv.fromRow, mv.fromCol, mv.toRow, mv.toCol);
      currentPlayer = 'white';
      updateStatus();
    }
    isAIThinking = false;
  }, wait);
}
