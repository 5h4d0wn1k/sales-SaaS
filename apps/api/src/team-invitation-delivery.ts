import { Resend } from "resend";

export type InvitationEmailDelivery = {
  mode: "email" | "preview" | "unavailable";
  previewUrl?: string;
};

function buildFrontendUrl(pathname: string, params: Record<string, string>) {
  const baseUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const url = new URL(pathname, baseUrl);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function isInvitationEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY) && Boolean(process.env.RESEND_FROM_EMAIL);
}

export async function sendWorkspaceInvitationEmail({
  email,
  rawToken,
  workspaceName,
  organizationName,
  invitedByName,
}: {
  email: string;
  rawToken: string;
  workspaceName: string;
  organizationName: string;
  invitedByName: string;
}): Promise<InvitationEmailDelivery> {
  const previewUrl = buildFrontendUrl("/get-started", {
    invite: rawToken,
    inviteEmail: email,
    inviteWorkspace: workspaceName,
    inviteOrganization: organizationName,
  });

  if (!isInvitationEmailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return { mode: "unavailable" };
    }

    return {
      mode: "preview",
      previewUrl,
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const subject = `Join ${organizationName} in Winrate`;
  const text =
    `${invitedByName} invited you to join ${workspaceName} in ${organizationName}.\n\n` +
    `Open this link to continue: ${previewUrl}\n\n` +
    `Sign in or create your account with ${email} to accept the invite.`;
  const html =
    `<p><strong>${invitedByName}</strong> invited you to join <strong>${workspaceName}</strong> in ${organizationName}.</p>` +
    `<p><a href="${previewUrl}">Open the invite</a></p>` +
    `<p>Sign in or create your account with <strong>${email}</strong> to accept the invite.</p>`;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject,
    text,
    html,
  });

  return { mode: "email" };
}
