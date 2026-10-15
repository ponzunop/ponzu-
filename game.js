// ===== game.js — Othello engine & AI =====

const BLACK = 1;
const WHITE = -1;
const EMPTY = 0;
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

// Positional weights for evaluation
const POS_WEIGHT = [
  [120, -20,  20,   5,   5,  20, -20, 120],
  [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
  [ 20,  -5,  15,   3,   3,  15,  -5,  20],
  [  5,  -5,   3,   3,   3,   3,  -5,   5],
  [  5,  -5,   3,   3,   3,   3,  -5,   5],
  [ 20,  -5,  15,   3,   3,  15,  -5,  20],
  [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
  [120, -20,  20,   5,   5,  20, -20, 120],
];

// ===== Board Logic =====

function createBoard() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(EMPTY));
  b[3][3] = WHITE; b[3][4] = BLACK;
  b[4][3] = BLACK; b[4][4] = WHITE;
  return b;
}

function cloneBoard(b) {
  return b.map(row => [...row]);
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getFlips(b, r, c, player) {
  if (b[r][c] !== EMPTY) return [];
  const opp = -player;
  const flips = [];
  for (const [dr, dc] of DIRS) {
    const line = [];
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc) && b[nr][nc] === opp) {
      line.push([nr, nc]);
      nr += dr;
      nc += dc;
    }
    if (line.length > 0 && inBounds(nr, nc) && b[nr][nc] === player) {
      flips.push(...line);
    }
  }
  return flips;
}

function getValidMoves(b, player) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const flips = getFlips(b, r, c, player);
      if (flips.length > 0) moves.push({ r, c, flips });
    }
  }
  return moves;
}

function applyMove(b, r, c, player) {
  const nb = cloneBoard(b);
  const flips = getFlips(nb, r, c, player);
  nb[r][c] = player;
  for (const [fr, fc] of flips) nb[fr][fc] = player;
  return { board: nb, flips };
}

function countPieces(b) {
  let black = 0, white = 0;
  for (const row of b)
    for (const cell of row) {
      if (cell === BLACK) black++;
      else if (cell === WHITE) white++;
    }
  return { black, white };
}

// ===== AI Evaluation =====

function evaluate(b, aiPlayer) {
  let posScore = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      posScore += b[r][c] * POS_WEIGHT[r][c];

  const myMoves  = getValidMoves(b, aiPlayer).length;
  const oppMoves = getValidMoves(b, -aiPlayer).length;
  const mobilityScore = (myMoves - oppMoves) * 10;

  const corners = [[0,0],[0,7],[7,0],[7,7]];
  let cornerScore = 0;
  for (const [cr, cc] of corners) cornerScore += b[cr][cc] * 30;

  const { black, white } = countPieces(b);
  const total = black + white;
  let pieceScore = 0;
  if (total > 54) {
    pieceScore = (aiPlayer === WHITE ? white - black : black - white) * 8;
  }

  return (posScore + mobilityScore + cornerScore) * aiPlayer + pieceScore;
}

function minimax(b, depth, alpha, beta, maximizing, aiPlayer) {
  const player = maximizing ? aiPlayer : -aiPlayer;
  const moves = getValidMoves(b, player);

  if (depth === 0) return evaluate(b, aiPlayer);

  if (moves.length === 0) {
    const oppMoves = getValidMoves(b, -player);
    if (oppMoves.length === 0) {
      const { black, white } = countPieces(b);
      const diff = aiPlayer === WHITE ? white - black : black - white;
      return diff * 10000;
    }
    return minimax(b, depth - 1, alpha, beta, !maximizing, aiPlayer);
  }

  if (maximizing) {
    let val = -Infinity;
    for (const m of moves) {
      const { board: nb } = applyMove(b, m.r, m.c, player);
      val = Math.max(val, minimax(nb, depth - 1, alpha, beta, false, aiPlayer));
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return val;
  } else {
    let val = Infinity;
    for (const m of moves) {
      const { board: nb } = applyMove(b, m.r, m.c, player);
      val = Math.min(val, minimax(nb, depth - 1, alpha, beta, true, aiPlayer));
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return val;
  }
}

// ===== AI Move Selection =====

function aiMoveEasy(b) {
  const moves = getValidMoves(b, WHITE);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

function aiMoveNormal(b) {
  const moves = getValidMoves(b, WHITE);
  if (moves.length === 0) return null;
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    const score = POS_WEIGHT[m.r][m.c] + m.flips.length * 3;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}

function aiMoveHard(b) {
  const moves = getValidMoves(b, WHITE);
  if (moves.length === 0) return null;

  const { black, white } = countPieces(b);
  const total = black + white;
  const depth = total > 52 ? 8 : total > 46 ? 6 : 5;

  let bestMove = moves[0], bestVal = -Infinity;
  for (const m of moves) {
    const { board: nb } = applyMove(b, m.r, m.c, WHITE);
    const val = minimax(nb, depth - 1, -Infinity, Infinity, false, WHITE);
    if (val > bestVal) { bestVal = val; bestMove = m; }
  }
  return bestMove;
}

function getAiMove(b, difficulty) {
  switch (difficulty) {
    case 'easy':   return aiMoveEasy(b);
    case 'normal': return aiMoveNormal(b);
    case 'hard':   return aiMoveHard(b);
    default:       return aiMoveNormal(b);
  }
}

