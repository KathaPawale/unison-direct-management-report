import { mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

// Submit contact form
export const submitContact = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    reason: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const { name, email, reason, message } = args;

    // Validate required fields
    if (!name.trim()) {
      throw new Error('Name is required');
    }
    if (!email.trim()) {
      throw new Error('Email is required');
    }
    if (!reason.trim()) {
      throw new Error('Reason is required');
    }
    if (!message.trim()) {
      throw new Error('Message is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate message length (minimum 10 characters)
    if (message.trim().length < 3) {
      throw new Error('Message must be at least 3 characters long');
    }

    // Get the last submission ID to generate the next one
    const lastContact = await ctx.db
      .query('contacts')
      .withIndex('by_submission_id')
      .order('desc')
      .first();

    const nextSubmissionId = (lastContact?.submissionId ?? 0) + 1;

    // Create contact submission
    await ctx.db.insert('contacts', {
      submissionId: nextSubmissionId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      reason: reason.trim(),
      message: message.trim(),
      submittedAt: Date.now(),
      status: 'new',
    });

    // Schedule email notification to be sent in the background
    await ctx.scheduler.runAfter(0, internal.email.sendContactNotification, {
      submissionId: nextSubmissionId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      reason: reason.trim(),
      message: message.trim(),
    });

    return {
      success: true,
      message:
        "Thank you for reaching out! We'll get back to you within 24 hours.",
    };
  },
});

// Get all contacts (admin function)
export const getAllContacts = query({
  handler: async (ctx) => {
    return await ctx.db
      .query('contacts')
      .withIndex('by_submitted_at')
      .order('desc')
      .collect();
  },
});

// Get contacts by status (admin function)
export const getContactsByStatus = query({
  args: {
    status: v.union(
      v.literal('new'),
      v.literal('reviewed'),
      v.literal('responded')
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('contacts')
      .withIndex('by_status', (q) => q.eq('status', args.status))
      .order('desc')
      .collect();
  },
});

// Update contact status (admin function)
export const updateContactStatus = mutation({
  args: {
    contactId: v.id('contacts'),
    status: v.union(
      v.literal('new'),
      v.literal('reviewed'),
      v.literal('responded')
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.contactId, {
      status: args.status,
    });

    return { success: true, message: 'Contact status updated successfully' };
  },
});

// Get contact stats (admin function)
export const getContactStats = query({
  handler: async (ctx) => {
    const allContacts = await ctx.db.query('contacts').collect();

    const stats = {
      total: allContacts.length,
      new: allContacts.filter((contact) => contact.status === 'new').length,
      reviewed: allContacts.filter((contact) => contact.status === 'reviewed')
        .length,
      responded: allContacts.filter((contact) => contact.status === 'responded')
        .length,
    };

    return stats;
  },
});

// Get recent contacts (admin function)
export const getRecentContacts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    return await ctx.db
      .query('contacts')
      .withIndex('by_submitted_at')
      .order('desc')
      .take(limit);
  },
});
