import { HomeExperience } from "@/components/home-experience";
import { profiles } from "@/data/mock-data";
import { hasConfiguredFamily, loadConfiguredProfiles } from "@/lib/neon/family";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const liveMode = hasConfiguredFamily();
  const configuredProfiles = liveMode ? await loadConfiguredProfiles() : null;
  return <HomeExperience profiles={configuredProfiles ?? profiles} demoMode={!liveMode} />;
}
