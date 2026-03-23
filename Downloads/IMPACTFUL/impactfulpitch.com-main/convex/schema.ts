import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  contacts: defineTable({
    submissionId: v.optional(v.number()), // Make it optional for backward compatibility
    name: v.string(),
    email: v.string(),
    reason: v.string(),
    message: v.string(),
    submittedAt: v.number(),
    status: v.union(
      v.literal('new'),
      v.literal('reviewed'),
      v.literal('responded')
    ),
  })
    .index('by_submission_id', ['submissionId'])
    .index('by_email', ['email'])
    .index('by_status', ['status'])
    .index('by_submitted_at', ['submittedAt']),
});
