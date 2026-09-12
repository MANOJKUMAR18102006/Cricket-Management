import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=====================================================');
console.log('🏏 CRICKPULSE TEAM PAGE OWN PROFILE LINK TEST');
console.log('=====================================================\n');

let total = 0;
let passed = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`✅ TEST ${total} PASSED: ${message}`);
    passed++;
  } else {
    console.error(`❌ TEST ${total} FAILED: ${message}`);
    process.exitCode = 1;
  }
}

const clientDir = path.resolve(__dirname, '../../client/src');
const teamDetailContent = fs.readFileSync(path.join(clientDir, 'pages/TeamDetailPage.jsx'), 'utf-8');

// 1. Check helper functions exist
assert(
  teamDetailContent.includes('const isOwnPlayer = useCallback(') &&
  teamDetailContent.includes('const getPlayerLink = useCallback('),
  'TeamDetailPage implements isOwnPlayer and getPlayerLink helpers'
);

// 2. Check getPlayerLink routes to /profile for own player
assert(
  teamDetailContent.includes("return isOwnPlayer(p) ? '/profile' : `/players/${p._id || p}`;"),
  'getPlayerLink returns /profile when isOwnPlayer is true and /players/:id otherwise'
);

// 3. Check Captain card uses getPlayerLink
assert(
  teamDetailContent.includes('to={getPlayerLink(captain)}') &&
  teamDetailContent.includes("title={isOwnPlayer(captain) ? 'View Your Profile' : 'View Player Profile'}"),
  'Captain card links directly to getPlayerLink(captain) and labels with "View Your Profile" for owner'
);

// 4. Check Vice Captain card uses getPlayerLink
assert(
  teamDetailContent.includes('to={getPlayerLink(viceCaptain)}') &&
  teamDetailContent.includes("title={isOwnPlayer(viceCaptain) ? 'View Your Profile' : 'View Player Profile'}"),
  'Vice Captain card links directly to getPlayerLink(viceCaptain)'
);

// 5. Check Squad Snapshot uses getPlayerLink
assert(
  teamDetailContent.includes('to={getPlayerLink(player)}') &&
  teamDetailContent.includes("title={isMe ? 'View Your Profile' : `View ${player.displayName}'s Profile`}"),
  'Squad Snapshot links player cards using getPlayerLink(player)'
);

// 6. Check Squad Roster uses getPlayerLink
assert(
  teamDetailContent.includes('to={getPlayerLink(player)}') &&
  teamDetailContent.includes('{isMe && (') &&
  teamDetailContent.includes('You'),
  'Squad Roster links player cards using getPlayerLink(player) and highlights user with a "You" badge'
);

// 7. Check isOwnPlayer compares player ID and user ID
assert(
  teamDetailContent.includes('myPlayerId && String(p._id || p) === String(myPlayerId)') &&
  teamDetailContent.includes('user?._id && pUserId && String(pUserId) === String(user._id)'),
  'isOwnPlayer validates against both authenticated player._id and authenticated user._id'
);

console.log('\n=====================================================');
console.log(`SUMMARY: ${passed} / ${total} TESTS PASSED`);
console.log('=====================================================\n');

if (passed !== total) {
  process.exit(1);
}
