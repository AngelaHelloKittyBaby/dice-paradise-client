import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeApiBaseUrl } from '../src/config/api';
import { normalizeRollDiceData } from '../src/modules/game/gameApi';

assert.equal(
  normalizeApiBaseUrl('http://192.168.21.17:8000'),
  'http://192.168.21.17:8000/api/v1',
  'root backend URL should resolve to the API v1 base URL'
);

assert.equal(
  normalizeApiBaseUrl('http://192.168.21.17:8000/api/v1'),
  'http://192.168.21.17:8000/api/v1',
  'configured API v1 URL should not be duplicated'
);

const lockedFallback = [true, true, false, true, false];
const rollSnapshot = normalizeRollDiceData(
  {
    dice: [6, 6, 4, 3, 1],
    diceLocked: [false, false, false, false, false],
    rollsLeft: 1,
  },
  lockedFallback
);

assert.deepEqual(
  rollSnapshot.diceLocked,
  lockedFallback,
  'roll normalization should preserve local multi-dice locks when backend lock echo is empty'
);

const gamePage = readFileSync('src/app/game/page.tsx', 'utf8');
const gameApi = readFileSync('src/modules/game/gameApi.ts', 'utf8');
const roomApi = readFileSync('src/modules/room/roomApi.ts', 'utf8');
const scoreApi = readFileSync('src/modules/game/scoreApi.ts', 'utf8');
const homePage = readFileSync('src/app/page.tsx', 'utf8');

assert.match(gamePage, /isSubmittingScore/, 'game page should guard score submission while a score request is pending');
assert.match(
  gamePage,
  /const disabled = [^;]*isSubmittingScore;/,
  'score rows should be disabled while score submission is pending'
);
assert.match(
  gamePage,
  /playerScores\[category\] !== undefined/,
  'game page should not submit a score category that already has a local score'
);
assert.doesNotMatch(gamePage, /getPossibleScores/, 'game page should not calculate possible scores on the frontend');
assert.doesNotMatch(gamePage, /calculateScore/, 'game page should not calculate score item values on the frontend');
assert.doesNotMatch(gamePage, /mockSelectScore/, 'game page should not keep frontend score submission logic');
assert.match(
  scoreApi,
  /\/score\/score-panel\/init\/\$\{gameId\}/,
  'score panel players should be loaded from the score panel init API'
);
assert.match(
  scoreApi,
  /\/score\/game\/\$\{gameId\}\/lock-status/,
  'locked and unlocked score rows should be loaded from the score lock-status API'
);
assert.match(
  scoreApi,
  /\/score\/possible\/\$\{gameId\}/,
  'possible scores should be loaded from the backend possible scores API'
);
assert.match(
  scoreApi,
  /\/score\/possible\/\$\{gameId\}[\s\S]*player_id:\s*toBackendPlayerId\(playerId\)/,
  'possible scores should send player_id query parameter'
);
assert.match(
  scoreApi,
  /\/game\/\$\{gameId\}\/score/,
  'score submission should use the backend game score API'
);
assert.match(
  scoreApi,
  /next_player_id/,
  'score submission response should use the backend next_player_id field'
);
assert.match(
  scoreApi,
  /player_id/,
  'score submission response should use the backend player_id field'
);
assert.doesNotMatch(
  scoreApi,
  /submit-score|dice_data|round_number/,
  'score submission should not use the old score item payload'
);
assert.match(
  gamePage,
  /locked_dice: locked/,
  'roll requests should send backend boolean locked_dice state'
);
assert.match(roomApi, /\/room\/create/, 'room creation should use the backend room create API');
assert.match(roomApi, /\/room\/join/, 'room join should use the backend room join API');
assert.match(roomApi, /\/room\/list/, 'waiting room list should use the backend room list API');
assert.match(gameApi, /\/game\/create/, 'game creation should use the backend game create API');
assert.match(gameApi, /\/game\/\$\{gameId\}\/roll/, 'dice rolling should use the backend game roll API');
assert.doesNotMatch(gameApi, /locked_dice\?: number\[\]/, 'roll request type should not use locked dice indexes');
assert.match(
  gamePage,
  /DICE_THROW_ANIMATION_MS/,
  'dice rolling should keep an explicit minimum animation duration'
);
assert.match(
  gamePage,
  /LOWER_CATEGORIES\.includes\(submittedCategory\)/,
  'game events should only record submitted lower-section score items'
);
assert.doesNotMatch(gamePage, /mockFetchGameEvents/, 'game events should no longer be generated from roll hints');
assert.match(
  homePage,
  /router\.prefetch\('\/game'\)/,
  'home page should prefetch the game route to make navigation more responsive'
);

console.log('game API contract checks passed');
