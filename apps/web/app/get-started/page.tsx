import { auth } from "@/auth";
import GetStartedFlow from "./get-started-flow";
import type { Metadata } from "next";
import {
    normalizePlanKey,
    normalizeRequestedStep,
    readAcquisitionQueryContext,
    resolveInitialGetStartedStep,
} from "./flow-state";
import { parseGetStartedAcquisitionContext } from "@/lib/acquisition-context";

export const metadata: Metadata = {
    title: "Get Started",
    description:
        "Create a salesxgrowth workspace, capture your business context, and start the beta onboarding flow.",
    robots: {
        index: false,
        follow: true,
    },
};

type GetStartedSearchParams = Record<string, string | string[] | undefined> & {
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
};

type GetStartedPageProps = {
    searchParams?: Promise<GetStartedSearchParams>;
};

function firstSearchParam(value: string | string[] | undefined) {
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
}

export default async function GetStartedPage({ searchParams }: GetStartedPageProps) {
    const session = await auth();
    const params = await searchParams;
    const googleAuthEnabled =
        Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET);
    const initialSelectedPlan = normalizePlanKey(firstSearchParam(params?.plan));
    const acquisitionQuery = readAcquisitionQueryContext(params);
    const acquisitionContext = parseGetStartedAcquisitionContext(params);
    const initialCheckoutState = firstSearchParam(params?.checkout) === "canceled" ? "canceled" : null;
    const initialNotice =
        firstSearchParam(params?.reset) === "success"
            ? "reset-success"
            : firstSearchParam(params?.verifyEmail) === "sent"
                ? "verify-email-sent"
                : null;
    const initialStep = resolveInitialGetStartedStep({
        hasSession: Boolean(session),
        planKey: initialSelectedPlan,
        requestedStep: normalizeRequestedStep(firstSearchParam(params?.step)),
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
            acquisitionContext={acquisitionContext}
            acquisitionQuery={acquisitionQuery ?? null}
            inviteContext={
                firstSearchParam(params?.invite)
                    ? {
                        token: firstSearchParam(params?.invite) ?? "",
                        email: firstSearchParam(params?.inviteEmail)?.trim() || null,
                        workspaceName: firstSearchParam(params?.inviteWorkspace)?.trim() || null,
                        organizationName: firstSearchParam(params?.inviteOrganization)?.trim() || null,
                        message: firstSearchParam(params?.inviteMessage)?.trim() || null,
                        status: firstSearchParam(params?.inviteStatus)?.trim() || null,
                    }
                    : null
            }
        />
    );
}
