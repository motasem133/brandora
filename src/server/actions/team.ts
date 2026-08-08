"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { AppError } from "@/lib/errors";
import {
  authedAction,
  orgAdminAction,
  orgOwnerAction,
} from "@/server/actions/safe-action";
import { auth } from "@/server/auth";
import { getInvitation } from "@/server/db/queries/members";
import { seatUsage } from "@/server/db/queries/plans";

/**
 * Team membership.
 *
 * The organization plugin already implements every mutation here; these
 * actions call it rather than reimplementing it, and exist for what the plugin
 * does not do: this app's own role rules, `AppError` messages a person can
 * read, and cache invalidation.
 *
 * `auth.api.*` is used rather than `authClient.organization.*` from a
 * component, so the browser never talks to the auth endpoints directly and
 * every mutation goes through one place that can refuse it.
 */

const ROLES = ["admin", "member"] as const;

export const inviteMember = orgAdminAction
  .metadata({ name: "invite-member" })
  .inputSchema(
    z.object({
      email: z.email().max(200),
      role: z.enum(ROLES).default("member"),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    /*
     * Checked here as well as in the plugin's own hook. The hook is the gate
     * that cannot be bypassed; this one exists so the owner reads a sentence
     * about their plan instead of an error code.
     */
    const { seats, taken } = await seatUsage(ctx.orgId);
    if (taken >= seats) {
      throw new AppError(
        "FEATURE_LOCKED",
        seats === 1
          ? "Your plan includes one seat, and it is taken. Remove a member, cancel a pending invitation, or upgrade."
          : `Your plan includes ${seats} seats, and they are all taken. Remove a member, cancel a pending invitation, or upgrade.`,
      );
    }

    await auth.api.createInvitation({
      headers: await headers(),
      body: {
        email: parsedInput.email,
        role: parsedInput.role,
        organizationId: ctx.orgId,
        resend: true,
      },
    });

    revalidatePath("/[locale]/dashboard", "layout");
    return { invited: parsedInput.email };
  });

export const cancelInvitation = orgAdminAction
  .metadata({ name: "cancel-invitation" })
  .inputSchema(z.object({ invitationId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    /* The plugin scopes by the caller's active organization, but an id is
       guessable, so the tenant is checked before it is passed on. */
    const invitation = await getInvitation(parsedInput.invitationId);
    if (!invitation || invitation.organizationId !== ctx.orgId) {
      throw new AppError("NOT_FOUND", "That invitation no longer exists.");
    }

    await auth.api.cancelInvitation({
      headers: await headers(),
      body: { invitationId: parsedInput.invitationId },
    });

    revalidatePath("/[locale]/dashboard", "layout");
    return { cancelled: true };
  });

export const removeMember = orgAdminAction
  .metadata({ name: "remove-member" })
  .inputSchema(z.object({ memberId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    await auth.api.removeMember({
      headers: await headers(),
      body: {
        memberIdOrEmail: parsedInput.memberId,
        organizationId: ctx.orgId,
      },
    });

    revalidatePath("/[locale]/dashboard", "layout");
    return { removed: true };
  });

/** Only an owner reshapes who else can administer the workspace. */
export const updateMemberRole = orgOwnerAction
  .metadata({ name: "update-member-role" })
  .inputSchema(z.object({ memberId: z.string().min(1), role: z.enum(ROLES) }))
  .action(async ({ parsedInput, ctx }) => {
    await auth.api.updateMemberRole({
      headers: await headers(),
      body: {
        memberId: parsedInput.memberId,
        role: parsedInput.role,
        organizationId: ctx.orgId,
      },
    });

    revalidatePath("/[locale]/dashboard", "layout");
    return { updated: true };
  });

/*
 * Accepting is `authedAction`, not `orgAction`.
 *
 * The person accepting is signed in to their *own* workspace — `orgAction`
 * would resolve that one and check membership of it, which is the wrong tenant
 * and would refuse every invitation there is.
 */
export const acceptInvitation = authedAction
  .metadata({ name: "accept-invitation" })
  .inputSchema(z.object({ invitationId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    await auth.api.acceptInvitation({
      headers: await headers(),
      body: { invitationId: parsedInput.invitationId },
    });

    revalidatePath("/[locale]/dashboard", "layout");
    return { accepted: true };
  });

export const rejectInvitation = authedAction
  .metadata({ name: "reject-invitation" })
  .inputSchema(z.object({ invitationId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    await auth.api.rejectInvitation({
      headers: await headers(),
      body: { invitationId: parsedInput.invitationId },
    });

    return { rejected: true };
  });
