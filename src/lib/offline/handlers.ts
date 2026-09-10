import {
  addTimeLogAction,
  addWorkOrderCommentAction,
  closeWorkOrderAction,
  toggleWorkOrderTaskAction,
  updateWorkOrderStatusAction,
} from "@/lib/actions/work-orders";

import type { PendingActionHandlers } from "./queue";

/**
 * Maps each queued action type to the real server action that applies it.
 * This is the only file that couples the generic offline queue
 * (src/lib/offline/queue.ts) to the work-orders actions module — the
 * server actions themselves are untouched.
 */
export const pendingActionHandlers: PendingActionHandlers = {
  "wo-status-change": async (action) => {
    const result = await updateWorkOrderStatusAction(action.orgSlug, action.workOrderId, action.payload.status);
    if (result.error) throw new Error(result.error);
  },
  "wo-close": async (action) => {
    const result = await closeWorkOrderAction(action.orgSlug, action.workOrderId, action.payload);
    if (result.error) throw new Error(result.error);
  },
  "wo-task-toggle": async (action) => {
    const result = await toggleWorkOrderTaskAction(action.orgSlug, action.payload.taskId, action.payload.isDone);
    if (result.error) throw new Error(result.error);
  },
  "wo-time-log": async (action) => {
    const result = await addTimeLogAction(action.orgSlug, action.payload.orgId, action.workOrderId, {
      startedAt: action.payload.startedAt,
      endedAt: action.payload.endedAt,
      note: action.payload.note,
    });
    if (result.error) throw new Error(result.error);
  },
  "wo-comment": async (action) => {
    const result = await addWorkOrderCommentAction(action.orgSlug, action.payload.orgId, action.workOrderId, action.payload.body);
    if (result.error) throw new Error(result.error);
  },
};
