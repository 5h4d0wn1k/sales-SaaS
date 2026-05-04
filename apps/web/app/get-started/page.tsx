import { auth } from "@/auth";
import GetStartedFlow from "./get-started-flow";
import {
    normalizePlanKey,
    normalizeRequestedStep,
    resolveInitialGetStartedStep,
} from "./flow-state";

type GetStartedPageProps = {
    searchParams?: Promise<{
        plan?: string;
        step?: string;
        checkout?: string;
        reset?: string;
        verifyEmail?: string;
        invite?: string;
        inviteStatus?: string;
        inviteEmail?: string;
        inviteWorkspace?: string;
        inviteOrganization?: string;
        inviteMessage?: string;
    }>;
};

export default async function GetStartedPage({ searchParams }: GetStartedPageProps) {
    const session = await auth();
    const params = await searchParams;
    const googleAuthEnabled =
        Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET);
    const initialSelectedPlan = normalizePlanKey(params?.plan);
    const initialCheckoutState = params?.checkout === "canceled" ? "canceled" : null;
    const initialNotice =
        params?.reset === "success"
            ? "reset-success"
            : params?.verifyEmail === "sent"
                ? "verify-email-sent"
                : null;
    const initialStep = resolveInitialGetStartedStep({
        hasSession: Boolean(session),
        planKey: initialSelectedPlan,
        requestedStep: normalizeRequestedStep(params?.step),
        checkoutState: initialCheckoutState,
    });

    return (
        <GetStartedFlow
            initialStep={initialStep}
            userEmail={session?.user?.email}
            googleAuthEnabled={googleAuthEnabled}
            initialSelectedPlan={initialSelectedPlan}
            initialCheckoutState={initialCheckoutState}
            userEmailVerified={Boolean(session?.user?.emailVerified)}
            initialNotice={initialNotice}
            inviteContext={
                params?.invite
                    ? {
                        token: params.invite,
                        email: params.inviteEmail?.trim() || null,
                        workspaceName: params.inviteWorkspace?.trim() || null,
                        organizationName: params.inviteOrganization?.trim() || null,
                        message: params.inviteMessage?.trim() || null,
                        status: params.inviteStatus?.trim() || null,
                    }
                    : null
            }
        />
    );
}
