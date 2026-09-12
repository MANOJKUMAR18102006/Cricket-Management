import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=====================================================');
console.log('📐 CRICKPULSE PROFILE DEDUPLICATION & LAYOUT TEST');
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
const playerCardContent = fs.readFileSync(path.join(clientDir, 'components/PlayerCard.jsx'), 'utf-8');
const profilePageContent = fs.readFileSync(path.join(clientDir, 'pages/ProfilePage.jsx'), 'utf-8');
const playerDetailPageContent = fs.readFileSync(path.join(clientDir, 'pages/PlayerDetailPage.jsx'), 'utf-8');

// 1. Check PlayerCard has header actions when isOwner is true
assert(
  playerCardContent.includes('Edit Account') &&
  playerCardContent.includes('Edit Player Profile') &&
  playerCardContent.includes('to="/settings/privacy"') &&
  playerCardContent.includes('<Settings className="w-4 h-4 text-amber-400'),
  'PlayerCard (Profile Header) contains Edit Account, Edit Player Profile, and compact Settings ⚙ icon for owner'
);

// 2. Check PlayerCard guards actions with isOwner
assert(
  playerCardContent.includes('{/* Action buttons if owner */}') &&
  playerCardContent.includes('{isOwner && ('),
  'PlayerCard guards profile-management actions strictly behind isOwner check'
);

// 3. Check ProfilePage tab navigation bar has removed duplicate actions
const profileTabBarSection = profilePageContent.substring(
  profilePageContent.indexOf('{/* 2. Sub-Navigation Tabs Bar'),
  profilePageContent.indexOf('{/* 3. INSTAGRAM-STYLE SOCIAL CONNECTIONS')
);

assert(
  !profileTabBarSection.includes('Edit Account') &&
  !profileTabBarSection.includes('Edit Player Profile') &&
  !profileTabBarSection.includes('Settings</span>'),
  'ProfilePage tab bar no longer contains duplicate Edit Account, Edit Player Profile, or Settings buttons'
);

// 4. Check ProfilePage tab bar contains ONLY the four navigation tabs
assert(
  profileTabBarSection.includes('Overview & Network') &&
  profileTabBarSection.includes('My Statistics') &&
  profileTabBarSection.includes('My Matches') &&
  profileTabBarSection.includes('My Teams'),
  'ProfilePage tab bar contains all four dedicated navigation tabs'
);

// 5. Check PlayerDetailPage does not duplicate Edit Account/Edit Player Profile in top bar
const playerDetailTopBar = playerDetailPageContent.substring(
  playerDetailPageContent.indexOf('/* Share Profile Link */'),
  playerDetailPageContent.indexOf('/* Main Reusable Player Card */')
);

assert(
  !playerDetailTopBar.includes('Edit Account') &&
  !playerDetailTopBar.includes('Edit Player Profile') &&
  !playerDetailTopBar.includes('to="/settings/privacy"'),
  'PlayerDetailPage top bar does not duplicate owner editing or settings buttons'
);

// 6. Check PlayerDetailPage passes isOwnProfile to PlayerCard
assert(
  playerDetailPageContent.includes('<PlayerCard player={player} isOwner={isOwnProfile} />'),
  'PlayerDetailPage delegates header actions strictly to PlayerCard with isOwner={isOwnProfile}'
);

// 7. Check ProfilePage passes isOwner={true} to PlayerCard
assert(
  profilePageContent.includes('<PlayerCard') &&
  profilePageContent.includes('isOwner={true}'),
  'ProfilePage delegates header actions strictly to PlayerCard with isOwner={true}'
);
// 8. Check SettingsPrivacyPage does not have an Account tab
const settingsPrivacyContent = fs.readFileSync(path.join(clientDir, 'pages/SettingsPrivacyPage.jsx'), 'utf-8');
assert(
  !settingsPrivacyContent.includes('to="/settings/account"') &&
  settingsPrivacyContent.includes('Privacy Settings'),
  'SettingsPrivacyPage is dedicated solely to Privacy with no cross-tab'
);

// 9. Check SettingsAccountPage does not have a Privacy tab
const settingsAccountContent = fs.readFileSync(path.join(clientDir, 'pages/SettingsAccountPage.jsx'), 'utf-8');
assert(
  !settingsAccountContent.includes('to="/settings/privacy"'),
  'SettingsAccountPage is dedicated solely to Account & Security with no cross-tab'
);

// 10. Check AppRoutes redirects /settings to /settings/privacy
const appRoutesContent = fs.readFileSync(path.join(clientDir, 'routes/AppRoutes.jsx'), 'utf-8');
assert(
  appRoutesContent.includes('<Route\n              path="settings"\n              element={<Navigate to="/settings/privacy" replace />}') ||
  appRoutesContent.includes('path="settings"') && appRoutesContent.includes('to="/settings/privacy"'),
  'AppRoutes redirects /settings directly to /settings/privacy'
);

console.log('\n=====================================================');
console.log(`SUMMARY: ${passed} / ${total} TESTS PASSED`);
console.log('=====================================================\n');

if (passed !== total) {
  process.exit(1);
}
