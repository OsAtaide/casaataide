import type { ChildSnapshot, Profile } from "@/types/domain";

export const profiles: Profile[] = [
  { id: "parent-demo", displayName: "Guardião Principal", role: "parent", avatar: "🛡️", accent: "yellow" },
  { id: "child-adventure-demo", displayName: "Jennifer Ataide", role: "child", age: 9, experienceMode: "adventure", avatar: "🧭", accent: "purple" },
  { id: "child-pro-demo", displayName: "Richardson Ataide", role: "child", age: 13, experienceMode: "pro", avatar: "⚡", accent: "cyan" },
];

export const childSnapshots: ChildSnapshot[] = [
  {
    ...profiles[1], level: 3, totalXp: 680, xpInLevel: 280, xpToNextLevel: 220, coins: 42, currentStreak: 4, bestStreak: 12, shieldCount: 1,
    dailyProgress: 66, achievementCount: 8, nextReward: "Noite do filme", missions: [
      { id: "jennifer-1", title: "Organizar a mochila", description: "Deixar tudo pronto para a próxima aventura.", category: "Base", difficulty: "easy", xp: 10, coins: 3, status: "approved", priority: "normal" },
      { id: "jennifer-2", title: "Cuidar do cantinho", description: "Guardar livros e deixar o quarto respirando.", category: "Habitat", difficulty: "normal", xp: 20, coins: 5, status: "completed", priority: "high" },
      { id: "jennifer-3", title: "Missão: mesa brilhante", description: "Ajudar a preparar a mesa do jantar.", category: "Equipe", difficulty: "normal", xp: 20, coins: 5, status: "pending", priority: "normal", timeLabel: "Hoje • 19:00" },
    ],
  },
  {
    ...profiles[2], level: 4, totalXp: 1480, xpInLevel: 580, xpToNextLevel: 120, coins: 86, currentStreak: 9, bestStreak: 21, shieldCount: 2, dailyProgress: 75, achievementCount: 15, nextReward: "1h de jogo extra", missions: [
      { id: "richardson-1", title: "Revisar estação de estudo", description: "Preparar o setup para começar sem distrações.", category: "Foco", difficulty: "normal", xp: 20, coins: 5, status: "approved", priority: "normal" },
      { id: "richardson-2", title: "Louça da noite", description: "Finalizar a pia e deixar a bancada livre.", category: "Base", difficulty: "important", xp: 30, coins: 8, status: "waiting_approval", priority: "high" },
      { id: "richardson-3", title: "Treino de 30 minutos", description: "Completar o treino planejado para hoje.", category: "Energia", difficulty: "challenge", xp: 50, coins: 15, status: "pending", priority: "normal", timeLabel: "Hoje • 20:30" },
    ],
  },
];

export const parentOverview = {
  completionRate: 78,
  pendingApprovals: 2,
  overdue: 1,
  totalMissions: 14,
  children: childSnapshots,
};
