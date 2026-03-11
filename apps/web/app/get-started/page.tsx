import { auth } from "@/auth";
import GetStartedFlow from "./get-started-flow";

export default async function GetStartedPage() {
    const session = await auth();

    // If user is already authenticated, jump to plan selection
    const initialStep = session ? "plan_selection" : "auth";

    return <GetStartedFlow initialStep={initialStep} userEmail={session?.user?.email} />;
}
