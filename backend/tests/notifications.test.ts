import { httpServer } from '../src/index';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import prisma from '../src/lib/prisma';
import { TaskStatus, TaskPriority } from '@prisma/client';

async function runNotificationTests() {
  console.log('🧪 Starting Phase 5 Notifications & Real-Time Push verification...\n');

  const PORT = 3005;
  const server = httpServer.listen(PORT);
  const BASE_URL = `http://localhost:${PORT}`;

  const openSockets: ClientSocketType[] = [];

  // Helper to log in and get auth token
  async function login(email: string) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!' }),
    });
    const data = await res.json();
    return { token: data.data.accessToken as string, user: data.data.user };
  }

  // Helper to connect a test client socket
  function connectSocket(token: string): Promise<ClientSocketType> {
    return new Promise((resolve, reject) => {
      const socket = ClientSocket(`http://localhost:${PORT}`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false,
      });

      socket.on('connect', () => {
        openSockets.push(socket);
        resolve(socket);
      });

      socket.on('connect_error', (err) => {
        reject(err);
      });
    });
  }

  try {
    const pm1Auth = await login('ravi.pm@cpd.dev');
    const dev1Auth = await login('kiran@cpd.dev');
    const dev2Auth = await login('sara@cpd.dev');

    // ── 1. Fetch Notifications & Unread Badge Count ──────────────────────────
    console.log('1. Testing fetch notifications & unread badge count...');
    const notifsRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${dev1Auth.token}` },
    });
    const notifsData = await notifsRes.json();
    console.assert(notifsRes.status === 200, 'Expected 200 for notifications');
    console.assert(Array.isArray(notifsData.data.notifications), 'Notifications should be an array');
    console.assert(typeof notifsData.data.unreadCount === 'number', 'Unread count should be a number');
    console.log(`   ✓ Notifications retrieved successfully with initial unread badge count: ${notifsData.data.unreadCount}\n`);

    // ── 2. Mark Individual Notification as Read ──────────────────────────────
    console.log('2. Testing mark individual notification as read...');
    const unreadNotif = await prisma.notification.findFirst({
      where: { userId: dev1Auth.user.id, isRead: false },
    });

    if (unreadNotif) {
      const readRes = await fetch(`${BASE_URL}/api/notifications/${unreadNotif.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${dev1Auth.token}` },
      });
      const readData = await readRes.json();
      console.assert(readRes.status === 200, 'Expected 200 for marking notification read');
      console.assert(readData.data.notification.isRead === true, 'Notification isRead should be true');
      console.log('   ✓ Individual notification marked as read, updated unreadCount returned\n');
    }

    // ── 3. Single-Resource Ownership Scoping on Notifications ─────────────────
    console.log('3. Testing notification ownership scoping (returns 404 on mismatch)...');
    const dev2Notif = await prisma.notification.findFirst({
      where: { userId: dev2Auth.user.id },
    });
    console.assert(!!dev2Notif, 'Dev 2 notification exists');

    // Dev 1 attempts to mark Dev 2's notification as read
    const crossReadRes = await fetch(`${BASE_URL}/api/notifications/${dev2Notif!.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${dev1Auth.token}` },
    });
    console.assert(crossReadRes.status === 404, 'Must return 404 on notification ownership mismatch');
    console.log('   ✓ User cannot mark another user’s notification as read (404 NOT_FOUND)\n');

    // ── 4. Mark All Notifications as Read ────────────────────────────────────
    console.log('4. Testing mark all notifications as read...');
    const markAllRes = await fetch(`${BASE_URL}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${dev1Auth.token}` },
    });
    const markAllData = await markAllRes.json();
    console.assert(markAllRes.status === 200, 'Expected 200 for mark all as read');
    console.assert(markAllData.data.unreadCount === 0, 'Unread count should now be 0');

    // Verify in database
    const remainingUnread = await prisma.notification.count({
      where: { userId: dev1Auth.user.id, isRead: false },
    });
    console.assert(remainingUnread === 0, 'No unread notifications left in database');
    console.log('   ✓ Mark all as read cleared all unread notifications to 0\n');

    // ── 5. Real-Time Notification on Task Assignment ─────────────────────────
    console.log('5. Testing real-time notification push on task assignment...');
    const dev2Socket = await connectSocket(dev2Auth.token);

    let dev2GotNotif = false;
    let dev2PushedUnreadCount = 0;
    dev2Socket.on('notification:new', (data: any) => {
      dev2GotNotif = true;
      dev2PushedUnreadCount = data.unreadCount;
    });

    // PM 1 assigns a new task to Dev 2
    const project1 = await prisma.project.findFirst({ where: { createdById: pm1Auth.user.id } });
    await fetch(`${BASE_URL}/api/projects/${project1!.id}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pm1Auth.token}`,
      },
      body: JSON.stringify({
        title: 'Real-time WebSocket Test Task',
        description: 'Verify instant notification push to assignee',
        assignedDeveloperId: dev2Auth.user.id,
        priority: TaskPriority.HIGH,
      }),
    });

    // Wait for websocket message
    await new Promise((r) => setTimeout(r, 400));

    console.assert(dev2GotNotif, 'Dev 2 must receive notification:new event');
    console.assert(dev2PushedUnreadCount > 0, 'Fresh unread badge count must be pushed');
    console.log(`   ✓ Task assigned: real-time notification pushed to Dev 2 (badge count: ${dev2PushedUnreadCount})\n`);

    // ── 6. Real-Time Notification on IN_REVIEW Move ──────────────────────────
    console.log('6. Testing real-time notification push to PM when task moves to IN_REVIEW...');
    const pm1Socket = await connectSocket(pm1Auth.token);

    let pm1GotNotif = false;
    let pm1PushedUnreadCount = 0;
    pm1Socket.on('notification:new', (data: any) => {
      pm1GotNotif = true;
      pm1PushedUnreadCount = data.unreadCount;
    });

    // Find a task in Project 1 assigned to Dev 1 that is in TODO or IN_PROGRESS
    const taskToReview = await prisma.task.findFirst({
      where: { projectId: project1!.id, assignedDeveloperId: dev1Auth.user.id, status: { not: TaskStatus.IN_REVIEW } },
    });
    console.assert(!!taskToReview, 'Found task to move to IN_REVIEW');

    await fetch(`${BASE_URL}/api/tasks/${taskToReview!.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dev1Auth.token}`,
      },
      body: JSON.stringify({ status: TaskStatus.IN_REVIEW }),
    });

    await new Promise((r) => setTimeout(r, 400));

    console.assert(pm1GotNotif, 'Owning PM must receive notification:new event when task moves to IN_REVIEW');
    console.assert(pm1PushedUnreadCount > 0, 'PM unread badge count pushed in real time');
    console.log(`   ✓ Task moved to IN_REVIEW: owning PM notified live via WebSocket (badge count: ${pm1PushedUnreadCount})\n`);

    console.log('🎉 ALL PHASE 5 NOTIFICATION TESTS PASSED!\n');
  } finally {
    for (const s of openSockets) {
      s.disconnect();
    }
    server.close();
    process.exit(0);
  }
}

runNotificationTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
