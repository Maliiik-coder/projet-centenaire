"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  CreditCard,
  Database,
  Dumbbell,
  FileText,
  Filter,
  Flag,
  Home,
  Lock,
  Search,
  Server,
  ShieldCheck,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { AdminActionMode, AdminModuleId, AdminTone } from "@/lib/admin/types";
import type {
  AdminBackOfficeData,
  AdminDisplayColumn,
  AdminDisplayRow,
  AdminModuleView,
} from "./adminBackOfficeModel";
import styles from "./adminBackOffice.module.css";

interface AdminBackOfficeProps {
  data: AdminBackOfficeData;
}

const moduleIcons: Record<AdminModuleId, LucideIcon> = {
  overview: Home,
  users: Users,
  subscriptions: CreditCard,
  recipes: Utensils,
  sport: Dumbbell,
  "recipe-moderation": Flag,
  ai: Brain,
  operations: Server,
  audit: FileText,
};

const toneLabels: Record<AdminTone, string> = {
  neutral: "Neutre",
  info: "À suivre",
  success: "Stable",
  warning: "Attention",
  danger: "Critique",
};

const actionModeLabels: Record<AdminActionMode, string> = {
  disabled: "Désactivé",
  simulation: "Simulation",
};

function toneClassName(tone: AdminTone): string {
  return styles[`tone-${tone}`];
}

function findActiveModule(
  modules: AdminModuleView[],
  activeModuleId: AdminModuleId,
): AdminModuleView {
  return (
    modules.find((module) => module.id === activeModuleId) ?? modules[0]
  );
}

function filterRows(
  rows: AdminDisplayRow[],
  query: string,
  selectedFilter: string,
): AdminDisplayRow[] {
  const normalizedQuery = query.trim().toLowerCase();

  return rows.filter((row) => {
    const matchesQuery =
      normalizedQuery.length === 0 || row.searchText.includes(normalizedQuery);
    const matchesFilter =
      selectedFilter === "all" || row.filterTags.includes(selectedFilter);

    return matchesQuery && matchesFilter;
  });
}

function rowValue(row: AdminDisplayRow, column: AdminDisplayColumn): string {
  return row.cells[column.key] ?? "";
}

export function AdminBackOffice({ data }: AdminBackOfficeProps) {
  const [activeModuleId, setActiveModuleId] =
    useState<AdminModuleId>("overview");
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [simulationMessage, setSimulationMessage] = useState<string | null>(
    null,
  );

  const activeModule = findActiveModule(data.modules, activeModuleId);
  const safeSelectedFilter = activeModule.filters.some(
    (filter) => filter.id === selectedFilter,
  )
    ? selectedFilter
    : "all";
  const visibleRows = useMemo(
    () => filterRows(activeModule.rows, query, safeSelectedFilter),
    [activeModule.rows, query, safeSelectedFilter],
  );

  const incidentCount = data.serviceStates.filter(
    (state) => state.tone === "warning" || state.tone === "danger",
  ).length;

  function handleModuleChange(moduleId: AdminModuleId) {
    setActiveModuleId(moduleId);
    setQuery("");
    setSelectedFilter("all");
    setSimulationMessage(null);
  }

  function handleSimulation(label: string) {
    setSimulationMessage(
      `Simulation locale déclenchée: "${label}". Aucune donnée n'a été écrite.`,
    );
  }

  return (
    <main className={styles.adminShell}>
      <aside className={styles.sidebar} aria-label="Navigation admin">
        <div className={styles.brandBlock}>
          <div className={styles.brandMark} aria-hidden="true">
            H
          </div>
          <div>
            <p className={styles.brandKicker}>Haru</p>
            <p className={styles.brandTitle}>Back-office</p>
          </div>
        </div>

        <nav className={styles.navList}>
          {data.modules.map((module) => {
            const Icon = moduleIcons[module.id];
            const isActive = module.id === activeModule.id;

            return (
              <button
                aria-current={isActive ? "page" : undefined}
                className={`${styles.navButton} ${
                  isActive ? styles.navButtonActive : ""
                }`}
                key={module.id}
                onClick={() => handleModuleChange(module.id)}
                type="button"
              >
                <Icon aria-hidden="true" size={18} strokeWidth={2} />
                <span>{module.title}</span>
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <ShieldCheck aria-hidden="true" size={18} />
          <p>{data.notice.title}</p>
        </div>
      </aside>

      <section className={styles.workspace} aria-labelledby="admin-title">
        <header className={styles.topBar}>
          <div>
            <p className={styles.kicker}>Maquette complète non branchée</p>
            <h1 id="admin-title">Back-office Haru</h1>
            <p className={styles.subtitle}>{data.notice.description}</p>
          </div>
          <div className={styles.releasePanel} aria-label="État maquette">
            <span>Généré</span>
            <strong>{data.generatedLabel}</strong>
            <small>{incidentCount} alerte technique fictive</small>
          </div>
        </header>

        <section className={styles.governanceStrip} aria-label="Cadre maquette">
          {data.governance.map((item) => (
            <div className={styles.governanceItem} key={item.label}>
              <span className={`${styles.statusDot} ${toneClassName(item.tone)}`} />
              <div>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </div>
            </div>
          ))}
        </section>

        <section className={styles.metricGrid} aria-label="Indicateurs agrégés">
          {data.metrics.map((metric) => (
            <article className={styles.metricCard} key={metric.id}>
              <div className={styles.metricHeader}>
                <span className={`${styles.badge} ${toneClassName(metric.tone)}`}>
                  {toneLabels[metric.tone]}
                </span>
                <span className={styles.sensitivity}>{metric.sensitivity}</span>
              </div>
              <strong>{metric.value}</strong>
              <p>{metric.label}</p>
              <small>{metric.detail}</small>
            </article>
          ))}
        </section>

        <section className={styles.contentGrid}>
          <div className={styles.mainColumn}>
            <section
              className={styles.moduleHeader}
              aria-labelledby="admin-module-title"
            >
              <div>
                <p className={styles.kicker}>{activeModule.eyebrow}</p>
                <h2 id="admin-module-title">{activeModule.title}</h2>
                <p>{activeModule.description}</p>
              </div>
              <div className={styles.moduleStats}>
                <div>
                  <span>Volume</span>
                  <strong>{activeModule.primaryStat}</strong>
                </div>
                <div>
                  <span>Point de vigilance</span>
                  <strong>{activeModule.secondaryStat}</strong>
                </div>
              </div>
            </section>

            <section className={styles.filterBar} aria-label="Filtres">
              <label className={styles.searchField}>
                <Search aria-hidden="true" size={18} />
                <span className={styles.srOnly}>Rechercher</span>
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher dans les données fictives"
                  type="search"
                  value={query}
                />
              </label>

              <label className={styles.selectField}>
                <Filter aria-hidden="true" size={18} />
                <span>{activeModule.filterLabel}</span>
                <select
                  onChange={(event) => setSelectedFilter(event.target.value)}
                  value={safeSelectedFilter}
                >
                  {activeModule.filters.map((filter) => (
                    <option key={filter.id} value={filter.id}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </label>

              <p className={styles.resultCount}>
                {visibleRows.length} / {activeModule.rows.length} lignes
              </p>
            </section>

            <DataTable
              columns={activeModule.columns}
              emptyState={activeModule.emptyState}
              onReset={() => {
                setQuery("");
                setSelectedFilter("all");
              }}
              rows={visibleRows}
            />
          </div>

          <aside className={styles.sideRail} aria-label="Panneaux admin">
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <Database aria-hidden="true" size={18} />
                <h3>{activeModule.panel.title}</h3>
              </div>
              <p>{activeModule.panel.description}</p>
              <dl className={styles.panelList}>
                {activeModule.panel.items.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd className={toneClassName(item.tone)}>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <Activity aria-hidden="true" size={18} />
                <h3>Actions</h3>
              </div>
              <div className={styles.actionStack}>
                {activeModule.actions.map((action) => {
                  const isDisabled = action.mode === "disabled";
                  const Icon = isDisabled ? Lock : CheckCircle2;

                  return (
                    <button
                      className={`${styles.actionButton} ${
                        isDisabled ? styles.actionButtonDisabled : ""
                      }`}
                      disabled={isDisabled}
                      key={action.id}
                      onClick={() => handleSimulation(action.label)}
                      title={`${action.reason} Permission future: ${action.requiredPermission}.`}
                      type="button"
                    >
                      <Icon aria-hidden="true" size={16} />
                      <span>{action.label}</span>
                      <small>{actionModeLabels[action.mode]}</small>
                    </button>
                  );
                })}
              </div>
              {simulationMessage ? (
                <p className={styles.simulationMessage} role="status">
                  {simulationMessage}
                </p>
              ) : null}
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <AlertTriangle aria-hidden="true" size={18} />
                <h3>Non inclus</h3>
              </div>
              <p>
                Pas de vraie donnée, pas de mutation, pas de rôle réel, pas de
                plomberie sécurisée et pas de service privilégié dans cette
                passe.
              </p>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}

interface DataTableProps {
  columns: AdminDisplayColumn[];
  rows: AdminDisplayRow[];
  emptyState: string;
  onReset: () => void;
}

function DataTable({ columns, rows, emptyState, onReset }: DataTableProps) {
  if (rows.length === 0) {
    return (
      <section className={styles.emptyState} aria-live="polite">
        <BarChart3 aria-hidden="true" size={22} />
        <div>
          <h3>Aucun résultat</h3>
          <p>{emptyState}</p>
        </div>
        <button onClick={onReset} type="button">
          Réinitialiser
        </button>
      </section>
    );
  }

  return (
    <section className={styles.tablePanel} aria-label="Tableau admin">
      <div className={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              <th scope="col">État</th>
              {columns.map((column) => (
                <th
                  className={column.align === "right" ? styles.alignRight : ""}
                  key={column.key}
                  scope="col"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className={`${styles.badge} ${toneClassName(row.tone)}`}>
                    {toneLabels[row.tone]}
                  </span>
                </td>
                {columns.map((column) => (
                  <td
                    className={
                      column.align === "right" ? styles.alignRight : ""
                    }
                    key={column.key}
                  >
                    {rowValue(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
