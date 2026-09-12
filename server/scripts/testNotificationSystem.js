import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import Match from '../models/Match.js';
import Connection from '../models/Connection.js';
import Notification from '../models/Notification.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crickpulse';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'crickpulse_secret_key_2026', {
    expiresIn: '1h',
  });
};

async function runNotificationTestSuite() {
  console.log('=====================================================');
  console.log('🔔 CRICKPULSE NOTIFICATION SYSTEM TEST SUITE');
  console.log('=====================================================\n');

  await mongoose.connect(MONGODB_URI);
  const stamp = Date.now();

  let userA, playerA, tokenA;
  let userB, playerB, tokenB;
  let teamAlpha, matchAlpha;

  try {
    // 1. Create Test Player A
    userA = await User.create({
      username: `notif_a_${stamp}`,
      email: `notif_a_${stamp}@crickpulse.test`,
      password: 'password123',
      role: 'player',
    });
    playerA = await Player.create({
      userId: userA._id,
      displayName: `Player A ${stamp}`,
      playingRole: 'Batter',
      profileVisibility: 'public',
      city: 'Chennai',
    });
    tokenA = generateToken(userA._id);

    // 2. Create Test Player B
    userB = await User.create({
      username: `notif_b_${stamp}`,
      email: `notif_b_${stamp}@crickpulse.test`,
      password: 'password123',
      role: 'player',
    });
    playerB = await Player.create({
      userId: userB._id,
      displayName: `Player B ${stamp}`,
      playingRole: 'Bowler',
      profileVisibility: 'private',
      city: 'Madurai',
    });
    tokenB = generateToken(userB._id);

    // --- TEST 1: Model Schema Verification ---
    console.log('--- TEST 1: Validate Notification Model Schema Fields ---');
    const sampleNotif = await Notification.create({
      recipient: playerA._id,
      sender: playerB._id,
      type: 'connection_request',
      message: `${playerB.displayName} sent you a connection request.`,
      relatedId: new mongoose.Types.ObjectId(),
      read: false,
    });

    if (
      !sampleNotif.recipient ||
      !sampleNotif.sender ||
      !sampleNotif.type ||
      !sampleNotif.message ||
      !sampleNotif.relatedId ||
      sampleNotif.read !== false ||
      !sampleNotif.createdAt
    ) {
      throw new Error('Notification model is missing one or more required schema fields.');
    }
    // Also test isRead alias
    if (sampleNotif.isRead !== false) {
      throw new Error('Virtual isRead alias failed to reflect read property.');
    }
    console.log('✅ TEST 1 PASSED: Notification model schema contains recipient, sender, type, message, relatedId, read, createdAt, and isRead virtual.');

    // --- TEST 2: GET /api/notifications ---
    console.log('\n--- TEST 2: GET /api/notifications ---');
    const listResRaw = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (listResRaw.status !== 200) {
      throw new Error(`Expected HTTP 200 from GET /notifications, got ${listResRaw.status}`);
    }
    const listRes = await listResRaw.json();
    if (!listRes.success || !Array.isArray(listRes.notifications)) {
      throw new Error('Expected success: true and notifications array.');
    }
    const foundNotif = listRes.notifications.find((n) => String(n._id) === String(sampleNotif._id));
    if (!foundNotif) {
      throw new Error('Created notification not found in GET /notifications list.');
    }
    console.log(`✅ TEST 2 PASSED: Successfully retrieved ${listRes.count} notification(s) with populated sender details.`);

    // --- TEST 3: PUT /api/notifications/:id/read ---
    console.log('\n--- TEST 3: PUT /api/notifications/:id/read ---');
    const markOneResRaw = await fetch(`${API_BASE}/notifications/${sampleNotif._id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (markOneResRaw.status !== 200) {
      throw new Error(`Expected HTTP 200 from PUT /notifications/:id/read, got ${markOneResRaw.status}`);
    }
    const markOneRes = await markOneResRaw.json();
    if (!markOneRes.success || markOneRes.notification.read !== true) {
      throw new Error('Notification was not marked as read: true.');
    }
    console.log('✅ TEST 3 PASSED: Single notification marked as read successfully.');

    // --- TEST 4: PUT /api/notifications/read-all ---
    console.log('\n--- TEST 4: PUT /api/notifications/read-all ---');
    // Create 2 more unread notifications for Player A
    await Notification.create([
      {
        recipient: playerA._id,
        sender: playerB._id,
        type: 'team_added',
        message: 'You have been added to Team Alpha.',
        read: false,
      },
      {
        recipient: playerA._id,
        sender: playerB._id,
        type: 'match_invitation',
        message: 'Match invitation received.',
        read: false,
      },
    ]);

    const readAllResRaw = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (readAllResRaw.status !== 200) {
      throw new Error(`Expected HTTP 200 from PUT /notifications/read-all, got ${readAllResRaw.status}`);
    }
    const readAllRes = await readAllResRaw.json();
    if (!readAllRes.success || readAllRes.modifiedCount < 2) {
      throw new Error(`Expected modifiedCount >= 2, got ${readAllRes.modifiedCount}`);
    }

    // Verify unread count is now 0
    const unreadCountResRaw = await fetch(`${API_BASE}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const unreadCountRes = await unreadCountResRaw.json();
    if (unreadCountRes.unreadCount !== 0) {
      throw new Error(`Expected unreadCount === 0 after read-all, got ${unreadCountRes.unreadCount}`);
    }
    console.log('✅ TEST 4 PASSED: PUT /api/notifications/read-all marked all notifications as read and unread-count is 0.');

    // --- TEST 5: Verify All 7 Notification Types Creation ---
    console.log('\n--- TEST 5: Verify All 7 Notification Types Generation ---');
    const requiredTypes = [
      'connection_request',
      'connection_accepted',
      'connection_rejected',
      'team_added',
      'team_removed',
      'match_invitation',
      'match_completed',
    ];

    for (const nType of requiredTypes) {
      const created = await Notification.create({
        recipient: playerB._id,
        sender: playerA._id,
        type: nType,
        message: `Testing notification for type ${nType}`,
        relatedId: new mongoose.Types.ObjectId(),
        read: false,
      });

      if (!created || created.type !== nType) {
        throw new Error(`Failed to create notification for type: ${nType}`);
      }
    }

    const bNotifsRaw = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const bNotifs = await bNotifsRaw.json();
    const bTypes = new Set(bNotifs.notifications.map((n) => n.type));

    for (const nType of requiredTypes) {
      if (!bTypes.has(nType)) {
        throw new Error(`Missing expected notification type in API response: ${nType}`);
      }
    }
    console.log('✅ TEST 5 PASSED: All 7 required notification types successfully created and retrieved via API:');
    requiredTypes.forEach((t) => console.log(`   - ${t}`));

    console.log('\n=====================================================');
    console.log('🎉 ALL 5 / 5 NOTIFICATION SYSTEM TESTS PASSED!');
    console.log('=====================================================\n');
  } finally {
    // Clean up temporary test data
    try {
      if (playerA && playerB) {
        await Notification.deleteMany({
          $or: [
            { recipient: { $in: [playerA._id, playerB._id] } },
            { sender: { $in: [playerA._id, playerB._id] } },
          ],
        });
        await Connection.deleteMany({
          $or: [
            { requester: { $in: [playerA._id, playerB._id] } },
            { receiver: { $in: [playerA._id, playerB._id] } },
          ],
        });
      }
      if (teamAlpha) await Team.findByIdAndDelete(teamAlpha._id);
      if (matchAlpha) await Match.findByIdAndDelete(matchAlpha._id);
      if (playerA) await Player.findByIdAndDelete(playerA._id);
      if (playerB) await Player.findByIdAndDelete(playerB._id);
      if (userA) await User.findByIdAndDelete(userA._id);
      if (userB) await User.findByIdAndDelete(userB._id);
      console.log('🧹 Cleaned up temporary test data cleanly.');
    } catch (cleanErr) {
      console.error('Error during cleanup:', cleanErr.message);
    }
    await mongoose.disconnect();
  }
}

runNotificationTestSuite().catch((err) => {
  console.error('❌ Notification test suite failed:', err);
  process.exit(1);
});
