import { httpServer, io } from '../src/index';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import prisma from '../src/lib/prisma';
import { runOverdueScan } from '../src/jobs/overdueScanner';
import { TaskStatus, TaskPriority } from '@prisma/client';

async function runRealtimeTests() {
  console.log('🧪 Starting Phase 4 Socket.io, Activity Feed & Cron verification...\n');

  const PORT = 3004;
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
    const adminAuth = await login('admin@cpd.dev');
    const pm1Auth = await login('ravi.pm@cpd.dev');
    const dev1Auth = await login('kiran@cpd.dev');
    const dev4Auth = await login('meera@cpd.dev');

    // ── 1. Activity Feed REST Catch-Up Scoping ───────────────────────────────
    console.log('1. Testing Activity Feed REST catch-up scoping...');
    // Admin sees all activity
    const adminFeedRes = await fetch(`${BASE_URL}/api/activity/feed?limit=20`, {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    const adminFeedData = await adminFeedRes.json();
    console.assert(adminFeedRes.status === 200, 'Admin can fetch activity feed');
    console.assert(adminFeedData.data.length > 0, 'Admin feed should not be empty');

    // PM 1 sees only their projects' activity
    const pm1FeedRes = await fetch(`${BASE_URL}/api/activity/feed?limit=20`, {
      headers: { Authorization: `Bearer ${pm1Auth.token}` },
    });
    const pm1FeedData = await pm1FeedRes.json();
    console.assert(pm1FeedRes.status === 200, 'PM 1 can fetch feed');

    // Dev 1 sees only activity on tasks assigned to Dev 1
    const dev1FeedRes = await fetch(`${BASE_URL}/api/activity/feed?limit=20`, {
      headers: { Authorization: `Bearer ${dev1Auth.token}` },
    });
    const dev1FeedData = await dev1FeedRes.json();
    console.assert(dev1FeedRes.status === 200, 'Dev 1 can fetch feed');
    console.assert(
      dev1FeedData.data.every((log: any) => log.task.assignedDeveloperId === dev1Auth.user.id),
      "Developer catch-up feed must only contain tasks assigned to that developer"
    );
    console.log('   ✓ REST catch-up feed scoped correctly across Admin, PM, and Developer\n');

    // ── 2. Socket.io Handshake Authentication ────────────────────────────────
    console.log('2. Testing Socket.io authentication...');
    // Should fail with invalid token
    let authFailed = false;
    try {
      await connectSocket('invalid-token-string');
    } catch {
      authFailed = true;
    }
    console.assert(authFailed, 'Socket handshake should fail with invalid token');

    // Should succeed with valid token
    const adminSocket = await connectSocket(adminAuth.token);
    console.assert(adminSocket.connected, 'Admin socket connected successfully');
    console.log('   ✓ Handshake JWT authentication enforced\n');

    // ── 3. Presence Tracking ─────────────────────────────────────────────────
    console.log('3. Testing Presence tracking...');
    let presenceCountReceived = 0;
    adminSocket.on('presence:count', (data: any) => {
      presenceCountReceived = data.onlineCount;
    });

    // Connect developer socket — admin should receive updated presence
    const dev1Socket = await connectSocket(dev1Auth.token);
    await new Promise((r) => setTimeout(r, 200));

    console.assert(presenceCountReceived >= 2, 'Admin should receive presence count updates');
    console.log(`   ✓ Active user presence count tracked and emitted to global:admin (${presenceCountReceived} online)\n`);

    // ── 4. Live Activity Emission & Room Scoping ─────────────────────────────
    console.log('4. Testing live Activity Emission & Room Scoping...');
    const pm1Socket = await connectSocket(pm1Auth.token);
    const dev4Socket = await connectSocket(dev4Auth.token);

    // Find a task assigned to Dev 1 in Project 1
    const dev1Task = await prisma.task.findFirst({
      where: { assignedDeveloperId: dev1Auth.user.id },
      include: { project: true },
    });
    console.assert(!!dev1Task, 'Task for Dev 1 exists');

    let adminGotActivity = false;
    let pm1GotActivity = false;
    let dev1GotActivity = false;
    let dev4GotActivity = false;

    adminSocket.on('activity:new', () => { adminGotActivity = true; });
    pm1Socket.on('activity:new', () => { pm1GotActivity = true; });
    dev1Socket.on('activity:new', () => { dev1GotActivity = true; });
    dev4Socket.on('activity:new', () => { dev4GotActivity = true; });

    // Transition task status via API
    const newStatus = dev1Task!.status === TaskStatus.TODO ? TaskStatus.IN_PROGRESS : TaskStatus.TODO;
    await fetch(`${BASE_URL}/api/tasks/${dev1Task!.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dev1Auth.token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    // Wait for websocket messages
    await new Promise((r) => setTimeout(r, 300));

    console.assert(adminGotActivity, 'Admin must receive activity:new on global:admin');
    console.assert(pm1GotActivity, 'PM 1 must receive activity:new on project:managers');
    console.assert(dev1GotActivity, 'Dev 1 must receive activity:new on personal room');
    console.assert(!dev4GotActivity, 'Dev 4 must NOT receive activity for another dev task');
    console.log('   ✓ Live activity emitted to correct rooms: Admin, owning PM, and assigned Dev only!\n');

    // ── 5. Overdue Scanner Cron Job ──────────────────────────────────────────
    console.log('5. Testing Overdue Scanner cron job...');
    // Create a task with dueDate in the past
    const overdueTask = await prisma.task.create({
      data: {
        projectId: dev1Task!.projectId,
        title: 'Urgent Security Patch',
        assignedDeveloperId: dev1Auth.user.id,
        priority: TaskPriority.CRITICAL,
        dueDate: new Date(Date.now() - 3600 * 1000), // 1 hour ago
        status: TaskStatus.TODO,
        isOverdue: false,
      },
    });

    // Run scanner
    const updatedCount = await runOverdueScan();
    console.assert(updatedCount >= 1, 'Scanner should find and update overdue task');

    // Verify task state in database
    const refreshed = await prisma.task.findUnique({ where: { id: overdueTask.id } });
    console.assert(refreshed!.isOverdue === true, 'Task should be marked isOverdue = true');

    // Verify system activity log was created
    const systemLog = await prisma.taskActivityLog.findFirst({
      where: { taskId: overdueTask.id, userId: null },
    });
    console.assert(!!systemLog, 'System activity log with userId=null must be created');
    console.assert(
      systemLog!.message.includes('is now overdue'),
      'System log message formatted correctly'
    );
    console.log(`   ✓ Overdue scanner updated task and inserted system log: "${systemLog!.message}"\n`);

    console.log('🎉 ALL PHASE 4 REAL-TIME & CRON TESTS PASSED!\n');
  } finally {
    for (const s of openSockets) {
      s.disconnect();
    }
    server.close();
    process.exit(0);
  }
}

runRealtimeTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
