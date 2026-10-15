// ===== storage.js — Match history persistence via localStorage =====

const STORAGE_KEY = 'othello_match_history';

const Storage = {
  /** @returns {Array} all matches, newest first */
  getHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Save a completed match.
   * @param {{ difficulty: string, playerScore: number, cpuScore: number, result: string, durationSec: number }} match
   */
  saveMatch(match) {
    const history = this.getHistory();
    history.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      ...match,
    });
    // Keep at most 200 entries
    if (history.length > 200) history.length = 200;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  },

  /** Clear all history */
  clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Compute aggregate stats, optionally filtered by difficulty.
   * @param {string} [difficultyFilter]
   * @returns {{ total: number, wins: number, losses: number, draws: number, winRate: number }}
   */
  getStats(difficultyFilter) {
    let history = this.getHistory();
    if (difficultyFilter) {
      history = history.filter(m => m.difficulty === difficultyFilter);
    }
    const total  = history.length;
    const wins   = history.filter(m => m.result === 'win').length;
    const losses = history.filter(m => m.result === 'lose').length;
    const draws  = history.filter(m => m.result === 'draw').length;
    const winRate = total > 0 ? Math.round(wins / total * 100) : 0;
    return { total, wins, losses, draws, winRate };
  },

  /** Difficulty key → display label */
  diffLabel(key) {
    return { easy: '易しい', normal: '普通', hard: '強い' }[key] || key;
  },

  /** Result key → display label */
  resultLabel(key) {
    return { win: '勝ち', lose: '負け', draw: '引分' }[key] || key;
  },
};

