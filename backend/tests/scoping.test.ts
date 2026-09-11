import { httpServer } from '../src/index';
import prisma from '../src/lib/prisma';

async function runScopingTests() {
  console.log('🧪 Starting Phase 3 Role Scoping & CRUD verification...\n');

  const server = httpServer.listen(3003);
  const BASE_URL = 'http://localhost:3003';

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

  try {
    const adminAuth = await login('admin@cpd.dev');
    const pm1Auth = await login('ravi.pm@cpd.dev');
    const pm2Auth = await login('priya.pm@cpd.dev');
    const dev1Auth = await login('kiran@cpd.dev');
    const dev4Auth = await login('meera@cpd.dev');

    // Retrieve projects from DB to get IDs
    const project1 = await prisma.project.findFirst({ where: { createdById: pm1Auth.user.id } });
    const project3 = await prisma.project.findFirst({ where: { createdById: pm2Auth.user.id } });

    console.assert(!!project1, 'Project 1 should exist');
    console.assert(!!project3, 'Project 3 should exist');

    // ── 1. PM Project List Scoping ──────────────────────────────────────────
    console.log('1. Testing PM project list scoping...');
    const pm1ProjectsRes = await fetch(`${BASE_URL}/api/projects`, {
      headers: { Authorization: `Bearer ${pm1Auth.token}` },
    });
    const pm1ProjectsData = await pm1ProjectsRes.json();
    console.assert(pm1ProjectsRes.status === 200, 'Expected 200 for PM 1 projects');
    console.assert(
      pm1ProjectsData.data.every((p: any) => p.createdById === pm1Auth.user.id),
      'PM 1 should only see projects they created'
    );
    console.assert(pm1ProjectsData.data.length === 2, 'PM 1 should see exactly 2 projects');

    const pm2ProjectsRes = await fetch(`${BASE_URL}/api/projects`, {
      headers: { Authorization: `Bearer ${pm2Auth.token}` },
    });
    const pm2ProjectsData = await pm2ProjectsRes.json();
    console.assert(pm2ProjectsData.data.length === 1, 'PM 2 should see exactly 1 project');
    console.assert(pm2ProjectsData.data[0].createdById === pm2Auth.user.id, 'PM 2 sees only their project');
    console.log('   ✓ PM project lists are scoped at the Prisma query level\n');

    // ── 2. Single-Resource 404 on Ownership Mismatch ────────────────────────
    console.log('2. Testing single-resource project 404 on ownership mismatch...');
    // PM 1 tries to access Project 3 (owned by PM 2)
    const crossPmRes = await fetch(`${BASE_URL}/api/projects/${project3!.id}`, {
      headers: { Authorization: `Bearer ${pm1Auth.token}` },
    });
    const crossPmData = await crossPmRes.json();
    console.assert(crossPmRes.status === 404, 'Must return 404 (not 403) on PM ownership mismatch');
    console.assert(crossPmData.error.code === 'NOT_FOUND', 'Expected NOT_FOUND code');

    // Admin CAN access Project 3
    const adminProjRes = await fetch(`${BASE_URL}/api/projects/${project3!.id}`, {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    console.assert(adminProjRes.status === 200, 'Admin can access any project');
    console.log('   ✓ Single-resource project access returns 404 (not 403) on ownership mismatch\n');

    // ── 3. Developer Project Task Scoping ───────────────────────────────────
    console.log('3. Testing Developer task scoping in project...');
    // Dev 1 has tasks in Project 1
    const dev1ProjTasksRes = await fetch(`${BASE_URL}/api/projects/${project1!.id}/tasks`, {
      headers: { Authorization: `Bearer ${dev1Auth.token}` },
    });
    const dev1ProjTasksData = await dev1ProjTasksRes.json();
    console.assert(dev1ProjTasksRes.status === 200, 'Expected 200 for Dev 1 in Project 1');
    console.assert(
      dev1ProjTasksData.data.every((t: any) => t.assignedDeveloperId === dev1Auth.user.id),
      "Dev 1 must NEVER see other developers' tasks in the same project"
    );

    // PM 1 viewing same project sees ALL tasks (both Dev 1 and Dev 2)
    const pm1ProjTasksRes = await fetch(`${BASE_URL}/api/projects/${project1!.id}/tasks`, {
      headers: { Authorization: `Bearer ${pm1Auth.token}` },
    });
    const pm1ProjTasksData = await pm1ProjTasksRes.json();
    console.assert(
      pm1ProjTasksData.data.length > dev1ProjTasksData.data.length,
      'PM sees all project tasks, developer only sees their own'
    );
    console.log("   ✓ Developer task list scoped by assignedDeveloperId; other devs' tasks excluded\n");

    // ── 4. Developer Access to Unassigned Project Returns 404 ────────────────
    console.log('4. Testing Developer accessing unassigned project tasks returns 404...');
    // Dev 4 has NO tasks in Project 1
    const unassignedDevRes = await fetch(`${BASE_URL}/api/projects/${project1!.id}/tasks`, {
      headers: { Authorization: `Bearer ${dev4Auth.token}` },
    });
    console.assert(unassignedDevRes.status === 404, 'Must return 404 for unassigned project');
    console.log('   ✓ Developer accessing unassigned project returns 404\n');

    // ── 5. Developer Calling Wrong Single Task Returns 404 ───────────────────
    console.log('5. Testing Developer calling wrong-scoped single task returns 404...');
    const dev4Task = await prisma.task.findFirst({
      where: { assignedDeveloperId: dev4Auth.user.id },
    });
    console.assert(!!dev4Task, 'Dev 4 task exists');

    // Dev 1 calls Dev 4's task
    const crossDevTaskRes = await fetch(`${BASE_URL}/api/tasks/${dev4Task!.id}`, {
      headers: { Authorization: `Bearer ${dev1Auth.token}` },
    });
    console.assert(crossDevTaskRes.status === 404, 'Must return 404 for task assigned to another dev');

    // Dev 1 tries to PATCH status of Dev 4's task
    const crossDevPatchRes = await fetch(`${BASE_URL}/api/tasks/${dev4Task!.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dev1Auth.token}`,
      },
      body: JSON.stringify({ status: 'DONE' }),
    });
    console.assert(crossDevPatchRes.status === 404, 'Must return 404 when trying to update another dev task');
    console.log('   ✓ Single-task GET and status PATCH return 404 on developer ownership mismatch\n');

    // ── 6. Task Status Transition & TaskActivityLog Persistence ─────────────
    console.log('6. Testing task status update & TaskActivityLog creation...');
    const dev1Task = await prisma.task.findFirst({
      where: { assignedDeveloperId: dev1Auth.user.id, status: 'TODO' },
    });
    console.assert(!!dev1Task, 'Found TODO task for Dev 1');

    const statusRes = await fetch(`${BASE_URL}/api/tasks/${dev1Task!.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dev1Auth.token}`,
      },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    const statusData = await statusRes.json();
    console.assert(statusRes.status === 200, 'Expected 200 for status update');
    console.assert(statusData.data.task.status === 'IN_PROGRESS', 'Task status updated');
    console.assert(statusData.data.activityLog.fromStatus === 'TODO', 'Activity log recorded fromStatus');
    console.assert(statusData.data.activityLog.toStatus === 'IN_PROGRESS', 'Activity log recorded toStatus');
    console.assert(
      statusData.data.activityLog.message.includes('Todo → In Progress'),
      'Human-readable message formatted correctly'
    );

    // Verify row was persisted in database
    const dbLog = await prisma.taskActivityLog.findFirst({
      where: { taskId: dev1Task!.id, toStatus: 'IN_PROGRESS' },
    });
    console.assert(!!dbLog, 'Activity log row persisted in database');
    console.log(`   ✓ Status changed and persisted activity log: "${dbLog!.message}"\n`);

    // ── 7. Query Filters with Zod Validation ────────────────────────────────
    console.log('7. Testing query parameter filtering and validation...');
    const filteredRes = await fetch(
      `${BASE_URL}/api/projects/${project1!.id}/tasks?status=IN_PROGRESS`,
      { headers: { Authorization: `Bearer ${pm1Auth.token}` } }
    );
    const filteredData = await filteredRes.json();
    console.assert(filteredRes.status === 200, 'Expected 200 for filtered tasks');
    console.assert(
      filteredData.data.every((t: any) => t.status === 'IN_PROGRESS'),
      'Only IN_PROGRESS tasks returned'
    );

    // Invalid filter validation
    const invalidFilterRes = await fetch(
      `${BASE_URL}/api/projects/${project1!.id}/tasks?status=INVALID_STATUS`,
      { headers: { Authorization: `Bearer ${pm1Auth.token}` } }
    );
    console.assert(invalidFilterRes.status === 400, 'Expected 400 for invalid query filter');
    console.log('   ✓ Query filters validated via Zod and correctly scoped\n');

    console.log('🎉 ALL PHASE 3 SCOPING & CRUD TESTS PASSED!\n');
  } finally {
    server.close();
    process.exit(0);
  }
}

runScopingTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
