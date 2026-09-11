import { PrismaClient, Role, TaskStatus, TaskPriority, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helper ───────────────────────────────────────────────────────────────────

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function daysAgo(days: number): Date {
  return daysFromNow(-days);
}

// ─── Main Seed ────────────────────────────────────────────────────────────────

export async function seedDatabase(client: PrismaClient = prisma) {
  console.log('🌱 Seeding database...\n');

  // ── Clean existing data ──────────────────────────────────────────────────
  await client.notification.deleteMany();
  await client.taskActivityLog.deleteMany();
  await client.refreshToken.deleteMany();
  await client.task.deleteMany();
  await client.project.deleteMany();
  await client.client.deleteMany();
  await client.user.deleteMany();

  // ── Users ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const users = [
    { name: 'Anika Sharma',   email: 'admin@cpd.dev',     role: Role.ADMIN },
    { name: 'Ravi Mehta',     email: 'ravi.pm@cpd.dev',   role: Role.PM },
    { name: 'Priya Nair',     email: 'priya.pm@cpd.dev',  role: Role.PM },
    { name: 'Kiran Patel',    email: 'kiran@cpd.dev',     role: Role.DEVELOPER },
    { name: 'Sara Malik',     email: 'sara@cpd.dev',      role: Role.DEVELOPER },
    { name: 'Arjun Das',      email: 'arjun@cpd.dev',     role: Role.DEVELOPER },
    { name: 'Meera Iyer',     email: 'meera@cpd.dev',     role: Role.DEVELOPER },
  ];

  const createdUsers = await Promise.all(
    users.map((u) =>
      client.user.create({ data: { ...u, passwordHash } })
    )
  );

  const [admin, pm1, pm2, dev1, dev2, dev3, dev4] = createdUsers;

  console.log('👤 Users created:');
  console.log('─'.repeat(55));
  for (const u of users) {
    console.log(`   ${u.role.padEnd(10)} | ${u.email.padEnd(22)} | Password123!`);
  }
  console.log('─'.repeat(55));

  // ── Clients ──────────────────────────────────────────────────────────────

  const client1 = await client.client.create({
    data: { name: 'Zenith Technologies', contactEmail: 'contact@zenith.co' },
  });
  const client2 = await client.client.create({
    data: { name: 'NovaPulse Labs', contactEmail: 'hello@novapulse.io' },
  });
  const client3 = await client.client.create({
    data: { name: 'Crescendo Digital', contactEmail: 'info@crescendo.dev' },
  });

  console.log(`\n🏢 Clients created: ${client1.name}, ${client2.name}, ${client3.name}`);

  // ── Projects ─────────────────────────────────────────────────────────────
  // PM1 owns 2 projects, PM2 owns 1 project

  const project1 = await client.project.create({
    data: {
      name: 'Zenith Cloud Migration',
      clientId: client1.id,
      createdById: pm1.id,
    },
  });

  const project2 = await client.project.create({
    data: {
      name: 'NovaPulse Mobile App',
      clientId: client2.id,
      createdById: pm1.id,
    },
  });

  const project3 = await client.project.create({
    data: {
      name: 'Crescendo E-Commerce Platform',
      clientId: client3.id,
      createdById: pm2.id,
    },
  });

  console.log(`\n📁 Projects created:`);
  console.log(`   • ${project1.name} (PM: ${pm1.name})`);
  console.log(`   • ${project2.name} (PM: ${pm1.name})`);
  console.log(`   • ${project3.name} (PM: ${pm2.name})`);

  // ── Tasks ────────────────────────────────────────────────────────────────
  // 5+ tasks per project, varied statuses, 2+ overdue

  interface TaskSeed {
    projectId: string;
    title: string;
    description: string;
    assignedDeveloperId: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date;
    isOverdue: boolean;
  }

  const tasks: TaskSeed[] = [
    // ── Project 1: Zenith Cloud Migration (PM1, devs 1 & 2) ──
    {
      projectId: project1.id, title: 'Set up AWS infrastructure',
      description: 'Provision VPC, subnets, and security groups for the cloud environment.',
      assignedDeveloperId: dev1.id, status: TaskStatus.DONE,
      priority: TaskPriority.CRITICAL, dueDate: daysAgo(5), isOverdue: false,
    },
    {
      projectId: project1.id, title: 'Migrate user database',
      description: 'Export PostgreSQL data and import to RDS instance.',
      assignedDeveloperId: dev1.id, status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH, dueDate: daysFromNow(2), isOverdue: false,
    },
    {
      projectId: project1.id, title: 'Configure CI/CD pipeline',
      description: 'Set up GitHub Actions for automated deployments to staging/production.',
      assignedDeveloperId: dev2.id, status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH, dueDate: daysFromNow(5), isOverdue: false,
    },
    {
      projectId: project1.id, title: 'Implement monitoring & alerts',
      description: 'Set up CloudWatch dashboards and PagerDuty integration.',
      assignedDeveloperId: dev2.id, status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM, dueDate: daysFromNow(10), isOverdue: false,
    },
    {
      projectId: project1.id, title: 'Write migration runbook',
      description: 'Document step-by-step migration procedure for ops team.',
      assignedDeveloperId: dev1.id, status: TaskStatus.TODO,
      priority: TaskPriority.LOW, dueDate: daysAgo(2), isOverdue: true,  // OVERDUE
    },

    // ── Project 2: NovaPulse Mobile App (PM1, devs 2 & 3) ──
    {
      projectId: project2.id, title: 'Design app navigation flow',
      description: 'Create wireframes and navigation architecture for the React Native app.',
      assignedDeveloperId: dev3.id, status: TaskStatus.DONE,
      priority: TaskPriority.HIGH, dueDate: daysAgo(10), isOverdue: false,
    },
    {
      projectId: project2.id, title: 'Implement authentication screens',
      description: 'Build login, registration, and forgot password screens with form validation.',
      assignedDeveloperId: dev3.id, status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL, dueDate: daysFromNow(1), isOverdue: false,
    },
    {
      projectId: project2.id, title: 'Build REST API client layer',
      description: 'Create Axios-based API client with interceptors and error handling.',
      assignedDeveloperId: dev2.id, status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH, dueDate: daysFromNow(3), isOverdue: false,
    },
    {
      projectId: project2.id, title: 'Integrate push notifications',
      description: 'Set up Firebase Cloud Messaging for iOS and Android push notifications.',
      assignedDeveloperId: dev3.id, status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM, dueDate: daysFromNow(7), isOverdue: false,
    },
    {
      projectId: project2.id, title: 'Set up analytics tracking',
      description: 'Integrate Mixpanel events for key user actions and screen views.',
      assignedDeveloperId: dev2.id, status: TaskStatus.TODO,
      priority: TaskPriority.LOW, dueDate: daysAgo(1), isOverdue: true,  // OVERDUE
    },

    // ── Project 3: Crescendo E-Commerce Platform (PM2, devs 3 & 4) ──
    {
      projectId: project3.id, title: 'Design product catalog schema',
      description: 'Define data models for products, categories, variants, and inventory.',
      assignedDeveloperId: dev4.id, status: TaskStatus.DONE,
      priority: TaskPriority.CRITICAL, dueDate: daysAgo(7), isOverdue: false,
    },
    {
      projectId: project3.id, title: 'Build shopping cart API',
      description: 'Implement cart CRUD operations with session persistence.',
      assignedDeveloperId: dev4.id, status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH, dueDate: daysFromNow(4), isOverdue: false,
    },
    {
      projectId: project3.id, title: 'Integrate Stripe payments',
      description: 'Set up Stripe checkout flow with webhook handling for order confirmation.',
      assignedDeveloperId: dev3.id, status: TaskStatus.TODO,
      priority: TaskPriority.CRITICAL, dueDate: daysFromNow(8), isOverdue: false,
    },
    {
      projectId: project3.id, title: 'Build order management dashboard',
      description: 'Create admin UI for viewing, filtering, and managing customer orders.',
      assignedDeveloperId: dev4.id, status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM, dueDate: daysFromNow(12), isOverdue: false,
    },
    {
      projectId: project3.id, title: 'Implement search with Elasticsearch',
      description: 'Add full-text product search with faceted filtering and autocomplete.',
      assignedDeveloperId: dev3.id, status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH, dueDate: daysFromNow(2), isOverdue: false,
    },
    {
      projectId: project3.id, title: 'Set up email transactional templates',
      description: 'Create SendGrid templates for order confirmation, shipping, and password reset.',
      assignedDeveloperId: dev4.id, status: TaskStatus.TODO,
      priority: TaskPriority.LOW, dueDate: daysAgo(3), isOverdue: true,  // OVERDUE
    },
  ];

  const createdTasks = await Promise.all(
    tasks.map((t) => client.task.create({ data: t }))
  );

  console.log(`\n📋 Tasks created: ${createdTasks.length} tasks across 3 projects`);
  console.log(`   ⚠️  Overdue tasks: ${createdTasks.filter(t => t.isOverdue).length}`);

  // ── Task Activity Logs ───────────────────────────────────────────────────

  const activityLogs = [
    // Project 1 activity
    {
      taskId: createdTasks[0].id, projectId: project1.id, userId: dev1.id,
      fromStatus: TaskStatus.TODO, toStatus: TaskStatus.IN_PROGRESS,
      message: `${dev1.name} moved "${createdTasks[0].title}" from Todo → In Progress`,
      createdAt: daysAgo(8),
    },
    {
      taskId: createdTasks[0].id, projectId: project1.id, userId: dev1.id,
      fromStatus: TaskStatus.IN_PROGRESS, toStatus: TaskStatus.IN_REVIEW,
      message: `${dev1.name} moved "${createdTasks[0].title}" from In Progress → In Review`,
      createdAt: daysAgo(6),
    },
    {
      taskId: createdTasks[0].id, projectId: project1.id, userId: pm1.id,
      fromStatus: TaskStatus.IN_REVIEW, toStatus: TaskStatus.DONE,
      message: `${pm1.name} moved "${createdTasks[0].title}" from In Review → Done`,
      createdAt: daysAgo(5),
    },
    {
      taskId: createdTasks[1].id, projectId: project1.id, userId: dev1.id,
      fromStatus: TaskStatus.TODO, toStatus: TaskStatus.IN_PROGRESS,
      message: `${dev1.name} moved "${createdTasks[1].title}" from Todo → In Progress`,
      createdAt: daysAgo(4),
    },
    {
      taskId: createdTasks[1].id, projectId: project1.id, userId: dev1.id,
      fromStatus: TaskStatus.IN_PROGRESS, toStatus: TaskStatus.IN_REVIEW,
      message: `${dev1.name} moved "${createdTasks[1].title}" from In Progress → In Review`,
      createdAt: daysAgo(1),
    },
    {
      taskId: createdTasks[2].id, projectId: project1.id, userId: dev2.id,
      fromStatus: TaskStatus.TODO, toStatus: TaskStatus.IN_PROGRESS,
      message: `${dev2.name} moved "${createdTasks[2].title}" from Todo → In Progress`,
      createdAt: daysAgo(3),
    },
    // Overdue system log
    {
      taskId: createdTasks[4].id, projectId: project1.id, userId: null,
      fromStatus: null, toStatus: null,
      message: `System: "${createdTasks[4].title}" is now overdue`,
      createdAt: daysAgo(2),
    },

    // Project 2 activity
    {
      taskId: createdTasks[5].id, projectId: project2.id, userId: dev3.id,
      fromStatus: TaskStatus.TODO, toStatus: TaskStatus.DONE,
      message: `${dev3.name} moved "${createdTasks[5].title}" from Todo → Done`,
      createdAt: daysAgo(10),
    },
    {
      taskId: createdTasks[6].id, projectId: project2.id, userId: dev3.id,
      fromStatus: TaskStatus.TODO, toStatus: TaskStatus.IN_PROGRESS,
      message: `${dev3.name} moved "${createdTasks[6].title}" from Todo → In Progress`,
      createdAt: daysAgo(2),
    },
    {
      taskId: createdTasks[7].id, projectId: project2.id, userId: dev2.id,
      fromStatus: TaskStatus.TODO, toStatus: TaskStatus.IN_REVIEW,
      message: `${dev2.name} moved "${createdTasks[7].title}" from Todo → In Review`,
      createdAt: daysAgo(1),
    },
    // Overdue system log
    {
      taskId: createdTasks[9].id, projectId: project2.id, userId: null,
      fromStatus: null, toStatus: null,
      message: `System: "${createdTasks[9].title}" is now overdue`,
      createdAt: daysAgo(1),
    },

    // Project 3 activity
    {
      taskId: createdTasks[10].id, projectId: project3.id, userId: dev4.id,
      fromStatus: TaskStatus.TODO, toStatus: TaskStatus.DONE,
      message: `${dev4.name} moved "${createdTasks[10].title}" from Todo → Done`,
      createdAt: daysAgo(7),
    },
    {
      taskId: createdTasks[11].id, projectId: project3.id, userId: dev4.id,
      fromStatus: TaskStatus.TODO, toStatus: TaskStatus.IN_PROGRESS,
      message: `${dev4.name} moved "${createdTasks[11].title}" from Todo → In Progress`,
      createdAt: daysAgo(2),
    },
    {
      taskId: createdTasks[14].id, projectId: project3.id, userId: dev3.id,
      fromStatus: TaskStatus.IN_PROGRESS, toStatus: TaskStatus.IN_REVIEW,
      message: `${dev3.name} moved "${createdTasks[14].title}" from In Progress → In Review`,
      createdAt: daysAgo(1),
    },
    // Overdue system log
    {
      taskId: createdTasks[15].id, projectId: project3.id, userId: null,
      fromStatus: null, toStatus: null,
      message: `System: "${createdTasks[15].title}" is now overdue`,
      createdAt: daysAgo(3),
    },
  ];

  await client.taskActivityLog.createMany({ data: activityLogs });
  console.log(`\n📝 Activity logs created: ${activityLogs.length} entries`);

  // ── Notifications ────────────────────────────────────────────────────────

  const notifications = [
    // Task assignment notifications for developers
    {
      userId: dev1.id, type: NotificationType.TASK_ASSIGNED,
      message: `You have been assigned to "${createdTasks[0].title}"`,
      relatedTaskId: createdTasks[0].id, isRead: true, createdAt: daysAgo(10),
    },
    {
      userId: dev1.id, type: NotificationType.TASK_ASSIGNED,
      message: `You have been assigned to "${createdTasks[1].title}"`,
      relatedTaskId: createdTasks[1].id, isRead: true, createdAt: daysAgo(7),
    },
    {
      userId: dev2.id, type: NotificationType.TASK_ASSIGNED,
      message: `You have been assigned to "${createdTasks[2].title}"`,
      relatedTaskId: createdTasks[2].id, isRead: true, createdAt: daysAgo(5),
    },
    {
      userId: dev1.id, type: NotificationType.TASK_ASSIGNED,
      message: `You have been assigned to "${createdTasks[4].title}"`,
      relatedTaskId: createdTasks[4].id, isRead: false, createdAt: daysAgo(4),
    },
    {
      userId: dev3.id, type: NotificationType.TASK_ASSIGNED,
      message: `You have been assigned to "${createdTasks[6].title}"`,
      relatedTaskId: createdTasks[6].id, isRead: false, createdAt: daysAgo(3),
    },
    {
      userId: dev4.id, type: NotificationType.TASK_ASSIGNED,
      message: `You have been assigned to "${createdTasks[11].title}"`,
      relatedTaskId: createdTasks[11].id, isRead: false, createdAt: daysAgo(3),
    },

    // IN_REVIEW notifications for PMs
    {
      userId: pm1.id, type: NotificationType.TASK_IN_REVIEW,
      message: `"${createdTasks[1].title}" has been moved to In Review by ${dev1.name}`,
      relatedTaskId: createdTasks[1].id, isRead: false, createdAt: daysAgo(1),
    },
    {
      userId: pm1.id, type: NotificationType.TASK_IN_REVIEW,
      message: `"${createdTasks[7].title}" has been moved to In Review by ${dev2.name}`,
      relatedTaskId: createdTasks[7].id, isRead: false, createdAt: daysAgo(1),
    },
    {
      userId: pm2.id, type: NotificationType.TASK_IN_REVIEW,
      message: `"${createdTasks[14].title}" has been moved to In Review by ${dev3.name}`,
      relatedTaskId: createdTasks[14].id, isRead: false, createdAt: daysAgo(1),
    },

    // Overdue notifications
    {
      userId: dev1.id, type: NotificationType.TASK_OVERDUE,
      message: `"${createdTasks[4].title}" is now overdue!`,
      relatedTaskId: createdTasks[4].id, isRead: false, createdAt: daysAgo(2),
    },
    {
      userId: dev2.id, type: NotificationType.TASK_OVERDUE,
      message: `"${createdTasks[9].title}" is now overdue!`,
      relatedTaskId: createdTasks[9].id, isRead: false, createdAt: daysAgo(1),
    },
    {
      userId: dev4.id, type: NotificationType.TASK_OVERDUE,
      message: `"${createdTasks[15].title}" is now overdue!`,
      relatedTaskId: createdTasks[15].id, isRead: false, createdAt: daysAgo(3),
    },
  ];

  await client.notification.createMany({ data: notifications });
  console.log(`🔔 Notifications created: ${notifications.length} entries`);

  console.log('\n✅ Seed completed successfully!\n');
}

if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error('❌ Seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
