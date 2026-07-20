import {
  adminActionCatalog,
  adminFixtureNotice,
  adminRoleFixtures,
  aiRows,
  auditRows,
  moduleUsage,
  operationRows,
  overviewMetrics,
  recipeReportRows,
  recipeRows,
  serviceStates,
  sportRows,
  subscriptionRows,
  supportUsers,
} from "@/lib/admin/fixtures";
import type {
  AdminAction,
  AdminDataSensitivity,
  AdminFixtureNotice,
  AdminMetric,
  AdminModuleId,
  AdminModuleUsage,
  AdminStatusItem,
  AdminTone,
} from "@/lib/admin/types";

export interface AdminFilterOption {
  id: string;
  label: string;
}

export interface AdminDisplayColumn {
  key: string;
  label: string;
  align?: "left" | "right";
}

export interface AdminDisplayRow {
  id: string;
  tone: AdminTone;
  cells: Record<string, string>;
  searchText: string;
  filterTags: string[];
}

export interface AdminPanelItem {
  label: string;
  value: string;
  tone: AdminTone;
}

export interface AdminModulePanel {
  title: string;
  description: string;
  items: AdminPanelItem[];
}

export interface AdminModuleView {
  id: AdminModuleId;
  title: string;
  eyebrow: string;
  description: string;
  primaryStat: string;
  secondaryStat: string;
  sensitivity: AdminDataSensitivity;
  filterLabel: string;
  filters: AdminFilterOption[];
  columns: AdminDisplayColumn[];
  rows: AdminDisplayRow[];
  emptyState: string;
  panel: AdminModulePanel;
  actions: AdminAction[];
}

export interface AdminGovernanceItem {
  label: string;
  value: string;
  tone: AdminTone;
}

export interface AdminBackOfficeData {
  notice: AdminFixtureNotice;
  generatedLabel: string;
  metrics: AdminMetric[];
  moduleUsage: AdminModuleUsage[];
  serviceStates: AdminStatusItem[];
  governance: AdminGovernanceItem[];
  modules: AdminModuleView[];
}

const commonToneFilters: AdminFilterOption[] = [
  { id: "all", label: "Tous" },
  { id: "success", label: "Stable" },
  { id: "info", label: "À suivre" },
  { id: "warning", label: "À surveiller" },
  { id: "danger", label: "Critique" },
];

const actionById = new Map(
  adminActionCatalog.map((action) => [action.id, action]),
);

function getActions(ids: string[]): AdminAction[] {
  return ids.map((id) => {
    const action = actionById.get(id);

    if (!action) {
      throw new Error(`Unknown admin action fixture: ${id}`);
    }

    return action;
  });
}

function makeRow(
  id: string,
  tone: AdminTone,
  cells: Record<string, string>,
  filterTags: string[],
): AdminDisplayRow {
  return {
    id,
    tone,
    cells,
    filterTags: [tone, ...filterTags],
    searchText: [id, ...Object.values(cells)].join(" ").toLowerCase(),
  };
}

function statusGroup(tone: AdminTone): string {
  if (tone === "success") {
    return "stable";
  }

  if (tone === "warning" || tone === "danger") {
    return "attention";
  }

  return "watch";
}

function buildOverviewModule(): AdminModuleView {
  return {
    id: "overview",
    title: "Vue générale",
    eyebrow: "Pilotage",
    description:
      "Lecture agrégée de l'activité Haru, sans contenu personnel de carnet.",
    primaryStat: `${overviewMetrics[0]?.value ?? "0"} inscrits fictifs`,
    secondaryStat: `${serviceStates.filter((state) => state.tone === "warning").length} service à surveiller`,
    sensitivity: "aggregate",
    filterLabel: "État module",
    filters: [
      { id: "all", label: "Tous" },
      { id: "core", label: "Usage fort" },
      { id: "pilot", label: "Usage pilote" },
      { id: "warning", label: "À surveiller" },
    ],
    columns: [
      { key: "module", label: "Module" },
      { key: "activeUsers", label: "Actifs 7 jours", align: "right" },
      { key: "weeklyChange", label: "Variation", align: "right" },
      { key: "adoption", label: "Adoption", align: "right" },
    ],
    rows: moduleUsage.map((usage) =>
      makeRow(
        usage.id,
        usage.tone,
        {
          module: usage.module,
          activeUsers: usage.activeUsers,
          weeklyChange: usage.weeklyChange,
          adoption: `${usage.adoption}%`,
        },
        [usage.adoption >= 50 ? "core" : "pilot"],
      ),
    ),
    emptyState: "Aucun module ne correspond aux filtres de la maquette.",
    panel: {
      title: "Limites de lecture",
      description:
        "Les indicateurs sont volontairement agrégés et ne chargent aucun repas, poids, observation tabac ou réponse comportementale.",
      items: [
        { label: "Source", value: "Fixtures TypeScript locales", tone: "info" },
        { label: "Version affichée", value: "admin-ui.1 fictive", tone: "neutral" },
        { label: "Écriture", value: "Aucune", tone: "success" },
      ],
    },
    actions: getActions(["export-view"]),
  };
}

function buildUsersModule(): AdminModuleView {
  return {
    id: "users",
    title: "Utilisateurs",
    eyebrow: "Support",
    description:
      "Recherche de comptes de démonstration et état technique minimal, sans carnet personnel.",
    primaryStat: `${supportUsers.length} comptes pilotes`,
    secondaryStat: `${supportUsers.filter((user) => user.tone === "warning" || user.tone === "danger").length} à contrôler`,
    sensitivity: "account_state",
    filterLabel: "État support",
    filters: [
      { id: "all", label: "Tous" },
      { id: "stable", label: "Stables" },
      { id: "attention", label: "À contrôler" },
      { id: "paid", label: "Avec droits" },
      { id: "free", label: "Gratuits" },
    ],
    columns: [
      { key: "account", label: "Compte" },
      { key: "contact", label: "Contact fictif" },
      { key: "state", label: "État" },
      { key: "subscription", label: "Droits" },
      { key: "sync", label: "Synchro" },
      { key: "activity", label: "Activité" },
    ],
    rows: supportUsers.map((user) =>
      makeRow(
        user.id,
        user.tone,
        {
          account: `${user.displayName} · ${user.id}`,
          contact: user.contact,
          state: `${user.accountState} · onboarding ${user.onboarding}`,
          subscription: user.subscription,
          sync: user.syncState,
          activity: user.lastActivity,
        },
        [
          statusGroup(user.tone),
          user.subscription === "Gratuit" ? "free" : "paid",
        ],
      ),
    ),
    emptyState: "Aucun compte fictif ne correspond à cette recherche.",
    panel: {
      title: "Fiche support prévue",
      description:
        "La future fiche devra afficher uniquement l'état de compte autorisé, avec motif obligatoire pour tout accès exceptionnel.",
      items: [
        { label: "Carnets personnels", value: "Exclus", tone: "success" },
        { label: "Désactivation", value: "Action désactivée", tone: "neutral" },
        { label: "Audit", value: "À brancher plus tard", tone: "warning" },
      ],
    },
    actions: getActions(["open-user", "export-view"]),
  };
}

function buildSubscriptionsModule(): AdminModuleView {
  return {
    id: "subscriptions",
    title: "Abonnements",
    eyebrow: "Droits",
    description:
      "Contrôle visuel des offres Gratuit, Sport, Recettes et combinée, sans prestataire de paiement.",
    primaryStat: `${subscriptionRows.length} lignes fictives`,
    secondaryStat: `${subscriptionRows.filter((row) => row.tone === "warning" || row.tone === "danger").length} divergences tests`,
    sensitivity: "account_state",
    filterLabel: "Réconciliation",
    filters: [
      { id: "all", label: "Tous" },
      { id: "stable", label: "Alignés" },
      { id: "attention", label: "Divergences" },
      { id: "manual", label: "Droits manuels" },
      { id: "free", label: "Gratuit" },
    ],
    columns: [
      { key: "account", label: "Compte" },
      { key: "offer", label: "Offre" },
      { key: "source", label: "Source" },
      { key: "renewal", label: "Renouvellement" },
      { key: "rights", label: "Droits applicatifs" },
      { key: "reconciliation", label: "Contrôle" },
    ],
    rows: subscriptionRows.map((row) =>
      makeRow(
        row.id,
        row.tone,
        {
          account: row.account,
          offer: row.offer,
          source: row.source,
          renewal: row.renewal,
          rights: row.appRights,
          reconciliation: row.reconciliation,
        },
        [
          statusGroup(row.tone),
          row.offer === "Gratuit" ? "free" : "paid",
          row.source.includes("manuel") ? "manual" : "payment",
        ],
      ),
    ),
    emptyState: "Aucune ligne d'abonnement fictive ne correspond aux filtres.",
    panel: {
      title: "Règle de vérité",
      description:
        "La source de paiement réelle restera externe. Le back-office affichera surtout les droits applicatifs et les écarts à traiter.",
      items: [
        { label: "Paiement réel", value: "Non branché", tone: "neutral" },
        { label: "Droit manuel", value: "Motif requis plus tard", tone: "warning" },
        { label: "Mutation", value: "Aucune", tone: "success" },
      ],
    },
    actions: getActions(["manual-entitlement", "export-view"]),
  };
}

function buildRecipesModule(): AdminModuleView {
  return {
    id: "recipes",
    title: "Recettes",
    eyebrow: "Contenu",
    description:
      "File éditoriale fictive pour juger publication, archivage, allergènes et revue CIQUAL future.",
    primaryStat: `${recipeRows.length} contenus tests`,
    secondaryStat: "1 proposition publique fictive",
    sensitivity: "public_content",
    filterLabel: "État éditorial",
    filters: [
      { id: "all", label: "Tous" },
      { id: "stable", label: "Prêts" },
      { id: "attention", label: "À relire" },
      { id: "public", label: "Propositions publiques" },
      { id: "draft", label: "Brouillons" },
    ],
    columns: [
      { key: "title", label: "Recette" },
      { key: "owner", label: "Origine" },
      { key: "status", label: "Statut" },
      { key: "category", label: "Catégorie" },
      { key: "updated", label: "Mise à jour" },
      { key: "review", label: "Revue" },
    ],
    rows: recipeRows.map((row) =>
      makeRow(
        row.id,
        row.tone,
        {
          title: `${row.title} · ${row.id}`,
          owner: row.owner,
          status: row.status,
          category: row.category,
          updated: row.updatedAt,
          review: row.reviewState,
        },
        [
          statusGroup(row.tone),
          row.owner.includes("publique") ? "public" : "editorial",
          row.status === "Brouillon" ? "draft" : "review",
        ],
      ),
    ),
    emptyState: "Aucune recette fictive ne correspond aux critères.",
    panel: {
      title: "À brancher côté contenu",
      description:
        "La maquette montre la surface attendue pour gérer brouillons, publications, allergènes et correspondances nutritionnelles.",
      items: [
        { label: "CIQUAL", value: "Correspondance future", tone: "info" },
        { label: "Publication", value: "Désactivée", tone: "neutral" },
        { label: "Signalements", value: "File séparée", tone: "warning" },
      ],
    },
    actions: getActions(["publish-content", "export-view"]),
  };
}

function buildSportModule(): AdminModuleView {
  return {
    id: "sport",
    title: "Sport",
    eyebrow: "Catalogue",
    description:
      "Bibliothèque fictive d'exercices et programmes, sans modification du module Sport utilisateur.",
    primaryStat: `${sportRows.length} exercices tests`,
    secondaryStat: "1 média manquant fictif",
    sensitivity: "public_content",
    filterLabel: "État catalogue",
    filters: [
      { id: "all", label: "Tous" },
      { id: "stable", label: "Publiés" },
      { id: "attention", label: "À compléter" },
      { id: "draft", label: "Brouillons" },
      { id: "beginner", label: "Débutant" },
    ],
    columns: [
      { key: "title", label: "Exercice" },
      { key: "owner", label: "Bibliothèque" },
      { key: "status", label: "Statut" },
      { key: "category", label: "Groupe" },
      { key: "updated", label: "Mise à jour" },
      { key: "review", label: "Contrôle" },
    ],
    rows: sportRows.map((row) =>
      makeRow(
        row.id,
        row.tone,
        {
          title: `${row.title} · ${row.id}`,
          owner: row.owner,
          status: row.status,
          category: row.category,
          updated: row.updatedAt,
          review: row.reviewState,
        },
        [
          statusGroup(row.tone),
          row.status === "Brouillon" ? "draft" : "published",
          row.reviewState.includes("débutant") ? "beginner" : "catalog",
        ],
      ),
    ),
    emptyState: "Aucun exercice fictif ne correspond aux filtres.",
    panel: {
      title: "Contrôles attendus",
      description:
        "Le futur back-office devra gérer niveaux, matériel, précautions, médias et programmes sans logique de compétition.",
      items: [
        { label: "Module mobile Sport", value: "Non modifié", tone: "success" },
        { label: "Médias", value: "Workflow futur", tone: "warning" },
        { label: "Publication", value: "Désactivée", tone: "neutral" },
      ],
    },
    actions: getActions(["publish-content", "export-view"]),
  };
}

function buildRecipeModerationModule(): AdminModuleView {
  return {
    id: "recipe-moderation",
    title: "Signalements recettes",
    eyebrow: "Modération contenus",
    description:
      "File fictive strictement limitée aux signalements de recettes publiques.",
    primaryStat: `${recipeReportRows.length} signalements tests`,
    secondaryStat: "1 priorité haute fictive",
    sensitivity: "public_content",
    filterLabel: "Priorité",
    filters: [
      { id: "all", label: "Tous" },
      { id: "danger", label: "Haute" },
      { id: "warning", label: "Normale" },
      { id: "info", label: "Basse" },
      { id: "rights", label: "Droits d'utilisation" },
    ],
    columns: [
      { key: "type", label: "Motif" },
      { key: "recipe", label: "Recette publique fictive" },
      { key: "priority", label: "Priorité" },
      { key: "age", label: "Ancienneté" },
      { key: "state", label: "État de revue" },
    ],
    rows: recipeReportRows.map((row) =>
      makeRow(
        row.id,
        row.tone,
        {
          type: `${row.reportType} · ${row.id}`,
          recipe: `${row.recipeTitle} · ${row.recipeId}`,
          priority: row.priority,
          age: row.queueAge,
          state: row.reviewState,
        },
        [
          row.reportType === "Droits d'utilisation" ? "rights" : "moderation",
        ],
      ),
    ),
    emptyState: "Aucun signalement fictif ne correspond aux filtres.",
    panel: {
      title: "Périmètre strict",
      description:
        "Cette surface concerne uniquement la qualité et la conformité des recettes publiques.",
      items: [
        { label: "Cible", value: "Recettes publiques", tone: "info" },
        { label: "Action sur compte", value: "Exclue", tone: "success" },
        { label: "Traitement", value: "Désactivé", tone: "neutral" },
      ],
    },
    actions: getActions(["review-report", "export-view"]),
  };
}

function buildAiModule(): AdminModuleView {
  return {
    id: "ai",
    title: "Analyses/IA",
    eyebrow: "Règles",
    description:
      "Versions fictives de règles et prompts, testables seulement comme simulation visuelle locale.",
    primaryStat: `${aiRows.length} capacités tests`,
    secondaryStat: "0 donnée utilisateur",
    sensitivity: "synthetic",
    filterLabel: "Garde-fou",
    filters: [
      { id: "all", label: "Tous" },
      { id: "success", label: "Validés" },
      { id: "warning", label: "À relire" },
      { id: "neutral", label: "Désactivés" },
      { id: "synthetic", label: "Synthétique" },
    ],
    columns: [
      { key: "capability", label: "Capacité" },
      { key: "version", label: "Version" },
      { key: "rollout", label: "Déploiement" },
      { key: "run", label: "Dernier test" },
      { key: "guardrail", label: "Garde-fou" },
    ],
    rows: aiRows.map((row) =>
      makeRow(
        row.id,
        row.tone,
        {
          capability: `${row.capability} · ${row.id}`,
          version: row.version,
          rollout: row.rollout,
          run: row.lastSyntheticRun,
          guardrail: row.guardrailState,
        },
        [row.guardrailState.includes("synthétiques") ? "synthetic" : "guardrail"],
      ),
    ),
    emptyState: "Aucune analyse fictive ne correspond aux filtres.",
    panel: {
      title: "Cadre IA",
      description:
        "Les tests restent limités à des entrées fictives. Aucun portrait comportemental utilisateur ne peut être réécrit ici.",
      items: [
        { label: "Jeu de test", value: "Synthétique uniquement", tone: "success" },
        { label: "Rollback", value: "Commande future", tone: "warning" },
        { label: "Écriture audit", value: "Non branchée", tone: "neutral" },
      ],
    },
    actions: getActions(["run-synthetic-analysis", "toggle-rollout"]),
  };
}

function buildOperationsModule(): AdminModuleView {
  return {
    id: "operations",
    title: "Exploitation technique",
    eyebrow: "Opérations",
    description:
      "État fictif des services, files et migrations, sans accès aux payloads ni relance réelle.",
    primaryStat: `${operationRows.length} services tests`,
    secondaryStat: "1 file en retard fictive",
    sensitivity: "technical",
    filterLabel: "État service",
    filters: commonToneFilters,
    columns: [
      { key: "service", label: "Service" },
      { key: "state", label: "État" },
      { key: "check", label: "Dernier contrôle" },
      { key: "queue", label: "File" },
      { key: "detail", label: "Détail" },
    ],
    rows: operationRows.map((row) =>
      makeRow(
        row.id,
        row.tone,
        {
          service: `${row.service} · ${row.id}`,
          state: row.state,
          check: row.lastCheck,
          queue: row.queue,
          detail: row.detail,
        },
        [statusGroup(row.tone)],
      ),
    ),
    emptyState: "Aucun service fictif ne correspond aux filtres.",
    panel: {
      title: "Exploitation future",
      description:
        "Les relances devront être précises, idempotentes et sans opération de masse destructive.",
      items: [
        { label: "Payloads", value: "Masqués", tone: "success" },
        { label: "Relance", value: "Désactivée", tone: "neutral" },
        { label: "Migrations", value: "Aucune créée", tone: "info" },
      ],
    },
    actions: getActions(["retry-job", "export-view"]),
  };
}

function buildAuditModule(): AdminModuleView {
  return {
    id: "audit",
    title: "Journal d'audit",
    eyebrow: "Traçabilité",
    description:
      "Exemples locaux de journalisation administrative, sans lecture de table réelle.",
    primaryStat: `${auditRows.length} événements tests`,
    secondaryStat: "0 trace réelle consultée",
    sensitivity: "audit_metadata",
    filterLabel: "Type de trace",
    filters: commonToneFilters,
    columns: [
      { key: "actor", label: "Acteur fictif" },
      { key: "role", label: "Rôle fictif" },
      { key: "action", label: "Action" },
      { key: "target", label: "Cible" },
      { key: "reason", label: "Motif" },
      { key: "correlation", label: "Corrélation" },
      { key: "created", label: "Date" },
    ],
    rows: auditRows.map((row) =>
      makeRow(
        row.id,
        row.tone,
        {
          actor: row.actor,
          role: row.actorRole,
          action: `${row.action} · ${row.requiredPermission}`,
          target: `${row.targetType} · ${row.targetLabel} · ${row.targetId}`,
          reason: row.reason,
          correlation: row.correlationId,
          created: row.createdAt,
        },
        [statusGroup(row.tone)],
      ),
    ),
    emptyState: "Aucune trace fictive ne correspond aux filtres.",
    panel: {
      title: "Journal cible",
      description:
        "Les futures actions sensibles devront conserver acteur, cible, motif, corrélation et métadonnées minimales.",
      items: [
        { label: "Données sensibles", value: "Exclues", tone: "success" },
        { label: "Contexte réel", value: "Non consulté", tone: "neutral" },
        { label: "Export", value: "Désactivé", tone: "info" },
      ],
    },
    actions: getActions(["inspect-audit-context", "export-view"]),
  };
}

export function createAdminBackOfficeData(): AdminBackOfficeData {
  return {
    notice: adminFixtureNotice,
    generatedLabel: "16 juillet 2026, 09:00 Europe/Paris",
    metrics: overviewMetrics,
    moduleUsage,
    serviceStates,
    governance: [
      {
        label: "Source des données",
        value: "Fixtures locales explicitement fictives",
        tone: "success",
      },
      {
        label: "Branchements",
        value: "Aucun Supabase, paiement, IA ou rôle réel",
        tone: "success",
      },
      {
        label: "Actions",
        value: "Désactivées ou simulation visuelle locale",
        tone: "warning",
      },
      {
        label: "Contrats d'accès",
        value: `${adminRoleFixtures.length} rôles fictifs, permissions explicites`,
        tone: "info",
      },
    ],
    modules: [
      buildOverviewModule(),
      buildUsersModule(),
      buildSubscriptionsModule(),
      buildRecipesModule(),
      buildSportModule(),
      buildRecipeModerationModule(),
      buildAiModule(),
      buildOperationsModule(),
      buildAuditModule(),
    ],
  };
}
