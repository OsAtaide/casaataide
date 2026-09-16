"use client";

import { useState } from "react";
import { ChildDashboard } from "@/components/child-dashboard";
import { ParentDashboard } from "@/components/parent-dashboard";
import { ProfileAccess } from "@/components/profile-access";
import { ProfileSelector } from "@/components/profile-selector";
import { ApprovalPanel } from "@/components/approval-panel";
import { MissionComposer } from "@/components/mission-composer";
import { MissionHistory } from "@/components/mission-history";
import { RewardManager } from "@/components/reward-store";
import { ReportPanel } from "@/components/report-panel";
import { PenaltySettlement } from "@/components/penalty-settlement";
import { RecoveryMissionComposer } from "@/components/recovery-mission-composer";
import type { Mission } from "@/types/domain";
import { progressForLevel } from "@/lib/domain/levels";
import { childSnapshots } from "@/data/mock-data";
import type { ParentOverviewMetrics, Profile } from "@/types/domain";
import { parentOverview } from "@/data/mock-data";

export function HomeExperience({ profiles, demoMode }: { profiles: Profile[]; demoMode: boolean }) {
  const [selected, setSelected] = useState<Profile | null>(null);
  const [accessProfile, setAccessProfile] = useState<Profile | null>(null);
  const [liveChildren, setLiveChildren] = useState<typeof childSnapshots | null>(null);
  const [liveSummary, setLiveSummary] = useState<ParentOverviewMetrics | null>(null);
  async function refreshChildren() {
    const response = await fetch("/api/family/overview");
    if (!response.ok) return;
    const body = (await response.json()) as { children?: typeof childSnapshots; summary?: ParentOverviewMetrics };
    setLiveChildren(body.children ?? []);
    setLiveSummary(body.summary ?? null);
  }
  async function enterProfile() {
    if (!accessProfile) return;
    if (!demoMode) await refreshChildren();
    setSelected(accessProfile);
    setAccessProfile(null);
  }
  async function handleMissionCreated(mission?: Mission & { childProfileIds: string[] }) {
    if (!mission) {
      await refreshChildren();
      return;
    }
    setLiveChildren((current) => (current ?? childSnapshots).map((child) => mission.childProfileIds.includes(child.id) ? { ...child, missions: [...child.missions, mission] } : child));
  }
  function handleDemoMissionResolved(childId: string, mission: Mission, status: "waiting_approval" | "approved") {
    setLiveChildren((current) => (current ?? childSnapshots).map((child) => {
      if (child.id !== childId) return child;
      const existingMission = child.missions.find((item) => item.id === mission.id);
      if (!existingMission || existingMission.status === "approved") return child;
      const missions = child.missions.map((item) => item.id === mission.id ? { ...item, status } : item);
      if (status === "waiting_approval") return { ...child, missions };
      const totalXp = child.totalXp + mission.xp;
      const progress = progressForLevel(totalXp);
      const approvedCount = missions.filter((item) => ["completed", "approved"].includes(item.status)).length;
      return {
        ...child,
        missions,
        totalXp,
        level: progress.level,
        xpInLevel: progress.current,
        xpToNextLevel: progress.required - progress.current,
        coins: child.coins + mission.coins,
        dailyProgress: missions.length ? Math.round((approvedCount / missions.length) * 100) : 0,
      };
    }));
  }
  const snapshots = liveChildren ?? childSnapshots;
  if (!selected) return <><ProfileSelector profiles={profiles} onSelect={setAccessProfile} />{accessProfile && <ProfileAccess profile={accessProfile} demoMode={demoMode} onCancel={() => setAccessProfile(null)} onSuccess={enterProfile} />}</>;
  const summary: ParentOverviewMetrics = liveSummary ?? (demoMode ? {
    dailyCompletion: parentOverview.completionRate,
    weeklyCompletion: parentOverview.completionRate,
    activeMissions: parentOverview.totalMissions,
    pendingApprovals: parentOverview.pendingApprovals,
    overdueMissions: parentOverview.overdue,
    totalMissions: parentOverview.totalMissions,
  } : { dailyCompletion: 0, weeklyCompletion: 0, activeMissions: 0, pendingApprovals: 0, overdueMissions: 0, totalMissions: 0 });
  if (selected.role === "parent") return <><ParentDashboard childList={snapshots} metrics={summary} demoMode={demoMode} onBack={() => setSelected(null)} /><div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-8"><MissionComposer childList={snapshots} demoMode={demoMode} onCreated={handleMissionCreated} /><RecoveryMissionComposer childList={snapshots} demoMode={demoMode} onCreated={refreshChildren} /><ApprovalPanel childList={snapshots} demoMode={demoMode} onDemoApproved={handleDemoMissionResolved} onResolved={refreshChildren} /><PenaltySettlement demoMode={demoMode} onSettled={refreshChildren} /><MissionHistory childList={snapshots} demoMode={demoMode} /><RewardManager demoMode={demoMode} /><ReportPanel demoMode={demoMode} /></div></>;
  const child = snapshots.find((snapshot) => snapshot.id === selected.id) ?? snapshots[0];
  if (!child) return <p className="p-8 text-white">Nenhum perfil infantil encontrado.</p>;
  const childViewKey = `${child.id}-${child.missions.map((mission) => `${mission.id}:${mission.status}`).join("|")}`;
  return <ChildDashboard key={childViewKey} child={child} demoMode={demoMode} onBack={() => setSelected(null)} onDemoResolved={handleDemoMissionResolved} />;
}
