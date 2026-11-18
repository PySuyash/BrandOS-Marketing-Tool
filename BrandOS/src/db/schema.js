import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  toneProfile: text('tone_profile').notNull(),
  requiredMessaging: text('required_messaging').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    departmentId: integer('department_id').references(() => departments.id),
    role: text('role').notNull().default('Creator'),
    title: text('title').notNull().default('Team Member'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_users_department').on(table.departmentId),
    index('idx_users_role').on(table.role),
  ]
);

export const guidelines = pgTable(
  'guidelines',
  {
    id: serial('id').primaryKey(),
    departmentId: integer('department_id')
      .references(() => departments.id, { onDelete: 'cascade' })
      .notNull(),
    ruleCode: text('rule_code').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    ruleType: text('rule_type').notNull(),
    severity: text('severity').notNull().default('Major'),
    preferredTerm: text('preferred_term'),
    bannedTerm: text('banned_term'),
    toneProfile: text('tone_profile'),
    requiredPhrase: text('required_phrase'),
    status: text('status').notNull().default('Active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_guidelines_department').on(table.departmentId),
    index('idx_guidelines_type').on(table.ruleType),
  ]
);

export const knowledgeItems = pgTable(
  'knowledge_items',
  {
    id: serial('id').primaryKey(),
    departmentId: integer('department_id')
      .references(() => departments.id, { onDelete: 'cascade' })
      .notNull(),
    factCode: text('fact_code').notNull().unique(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    factType: text('fact_type').notNull(),
    owner: text('owner').notNull(),
    expiryDate: text('expiry_date').notNull(),
    status: text('status').notNull().default('Approved'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_knowledge_department').on(table.departmentId),
    index('idx_knowledge_type').on(table.factType),
  ]
);

export const submissions = pgTable(
  'submissions',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    creatorId: integer('creator_id')
      .references(() => users.id)
      .notNull(),
    departmentId: integer('department_id')
      .references(() => departments.id)
      .notNull(),
    contentType: text('content_type').notNull(),
    channel: text('channel').notNull(),
    status: text('status').notNull().default('Draft'),
    currentVersion: integer('current_version').notNull().default(1),
    aiModeUsed: text('ai_mode_used').notNull().default('pending'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_submissions_department').on(table.departmentId),
    index('idx_submissions_creator').on(table.creatorId),
    index('idx_submissions_status').on(table.status),
  ]
);

export const versions = pgTable(
  'versions',
  {
    id: serial('id').primaryKey(),
    submissionId: integer('submission_id')
      .references(() => submissions.id, { onDelete: 'cascade' })
      .notNull(),
    versionNumber: integer('version_number').notNull(),
    content: text('content').notNull(),
    createdBy: integer('created_by')
      .references(() => users.id)
      .notNull(),
    changeSummary: text('change_summary').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_versions_submission').on(table.submissionId)]
);

export const findings = pgTable(
  'findings',
  {
    id: serial('id').primaryKey(),
    submissionId: integer('submission_id')
      .references(() => submissions.id, { onDelete: 'cascade' })
      .notNull(),
    versionId: integer('version_id')
      .references(() => versions.id, { onDelete: 'cascade' })
      .notNull(),
    ruleId: integer('rule_id').references(() => guidelines.id, {
      onDelete: 'set null',
    }),
    ruleCode: text('rule_code').notNull(),
    findingCode: text('finding_code').notNull(),
    category: text('category').notNull(),
    highlightedText: text('highlighted_text').notNull(),
    explanation: text('explanation').notNull(),
    severity: text('severity').notNull(),
    confidence: integer('confidence').notNull().default(100),
    evidence: text('evidence').notNull(),
    suggestion: text('suggestion').notNull(),
    unchangedNote: text('unchanged_note')
      .notNull()
      .default('Core message and writer intent remain intact.'),
    status: text('status').notNull().default('Open'),
    dismissReason: text('dismiss_reason'),
    addressedBy: integer('addressed_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_findings_submission').on(table.submissionId),
    index('idx_findings_version').on(table.versionId),
    index('idx_findings_status').on(table.status),
  ]
);

export const claims = pgTable(
  'claims',
  {
    id: serial('id').primaryKey(),
    submissionId: integer('submission_id')
      .references(() => submissions.id, { onDelete: 'cascade' })
      .notNull(),
    versionId: integer('version_id')
      .references(() => versions.id, { onDelete: 'cascade' })
      .notNull(),
    claimText: text('claim_text').notNull(),
    category: text('category').notNull(),
    verdict: text('verdict').notNull(),
    sourceId: integer('source_id').references(() => knowledgeItems.id, {
      onDelete: 'set null',
    }),
    sourceQuote: text('source_quote'),
    confidence: integer('confidence').notNull().default(50),
    explanation: text('explanation').notNull(),
    suggestion: text('suggestion'),
    reviewerStatus: text('reviewer_status').notNull().default('Pending Review'),
    reviewerNote: text('reviewer_note'),
    verifiedBy: integer('verified_by').references(() => users.id),
    verifiedAt: timestamp('verified_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_claims_submission').on(table.submissionId),
    index('idx_claims_version').on(table.versionId),
    index('idx_claims_verdict').on(table.verdict),
  ]
);

export const comments = pgTable(
  'comments',
  {
    id: serial('id').primaryKey(),
    submissionId: integer('submission_id')
      .references(() => submissions.id, { onDelete: 'cascade' })
      .notNull(),
    versionId: integer('version_id')
      .references(() => versions.id, { onDelete: 'cascade' })
      .notNull(),
    findingId: integer('finding_id').references(() => findings.id, {
      onDelete: 'set null',
    }),
    parentId: integer('parent_id'),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    commentText: text('comment_text').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_comments_submission').on(table.submissionId),
    index('idx_comments_version').on(table.versionId),
  ]
);

export const approvals = pgTable(
  'approvals',
  {
    id: serial('id').primaryKey(),
    submissionId: integer('submission_id')
      .references(() => submissions.id, { onDelete: 'cascade' })
      .notNull(),
    versionId: integer('version_id')
      .references(() => versions.id, { onDelete: 'cascade' })
      .notNull(),
    reviewerId: integer('reviewer_id')
      .references(() => users.id)
      .notNull(),
    decision: text('decision').notNull(),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_approvals_submission').on(table.submissionId)]
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    submissionId: integer('submission_id').references(() => submissions.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    details: text('details').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_submission').on(table.submissionId),
    index('idx_audit_user').on(table.userId),
  ]
);

export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
  guidelines: many(guidelines),
  knowledgeItems: many(knowledgeItems),
  submissions: many(submissions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  submissions: many(submissions),
  comments: many(comments),
  approvals: many(approvals),
}));

export const guidelinesRelations = relations(guidelines, ({ one }) => ({
  department: one(departments, {
    fields: [guidelines.departmentId],
    references: [departments.id],
  }),
}));

export const knowledgeItemsRelations = relations(knowledgeItems, ({ one }) => ({
  department: one(departments, {
    fields: [knowledgeItems.departmentId],
    references: [departments.id],
  }),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  creator: one(users, {
    fields: [submissions.creatorId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [submissions.departmentId],
    references: [departments.id],
  }),
  versions: many(versions),
  findings: many(findings),
  claims: many(claims),
  comments: many(comments),
  approvals: many(approvals),
}));

export const versionsRelations = relations(versions, ({ one, many }) => ({
  submission: one(submissions, {
    fields: [versions.submissionId],
    references: [submissions.id],
  }),
  author: one(users, {
    fields: [versions.createdBy],
    references: [users.id],
  }),
  findings: many(findings),
  claims: many(claims),
  comments: many(comments),
}));

export const findingsRelations = relations(findings, ({ one }) => ({
  submission: one(submissions, {
    fields: [findings.submissionId],
    references: [submissions.id],
  }),
  version: one(versions, {
    fields: [findings.versionId],
    references: [versions.id],
  }),
  rule: one(guidelines, {
    fields: [findings.ruleId],
    references: [guidelines.id],
  }),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  submission: one(submissions, {
    fields: [claims.submissionId],
    references: [submissions.id],
  }),
  version: one(versions, {
    fields: [claims.versionId],
    references: [versions.id],
  }),
  source: one(knowledgeItems, {
    fields: [claims.sourceId],
    references: [knowledgeItems.id],
  }),
  verifier: one(users, {
    fields: [claims.verifiedBy],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  submission: one(submissions, {
    fields: [comments.submissionId],
    references: [submissions.id],
  }),
  version: one(versions, {
    fields: [comments.versionId],
    references: [versions.id],
  }),
  author: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const approvalsRelations = relations(approvals, ({ one }) => ({
  submission: one(submissions, {
    fields: [approvals.submissionId],
    references: [submissions.id],
  }),
  version: one(versions, {
    fields: [approvals.versionId],
    references: [versions.id],
  }),
  reviewer: one(users, {
    fields: [approvals.reviewerId],
    references: [users.id],
  }),
}));
