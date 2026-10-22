import { Config, Facility } from './demo';
import { withDeclaredAreas } from './market-sections';
import { parseOperations } from './onboarding-operations';
import { readTerminalSections } from '@stalltrack/terminal-config';

/** The persisted workspace document. Both Validation and Activation must read this one shape. */
export interface WorkspaceConfig {
  facilities?: Facility[];
  administrator?: { name?: string; position?: string; email?: string };
  branding?: { officeName?: string; orPrefix?: string; orStart?: string; logoName?: string; logoDataUri?: string };
  /** Declared revenue operations — initial intent only. Absent in every draft saved before they existed. */
  operations?: { version?: number; items?: unknown[] } | null;
  terminalSections?: unknown;
}

export function parseWorkspaceConfig(json: string | null): WorkspaceConfig | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as WorkspaceConfig;
  } catch {
    return null;
  }
}

/** Project the saved workspace into the common operator-review shape without dropping branding identity. */
export function toReviewConfig(workspace: WorkspaceConfig | null): Config {
  const operations = parseOperations(workspace?.operations);
  const terminal = readTerminalSections(workspace?.terminalSections);
  return {
    facilities: Array.isArray(workspace?.facilities)
      ? workspace.facilities.map((facility) => ({
          ...facility,
          sections: withDeclaredAreas(Array.isArray(facility?.sections) ? facility.sections : []),
        }))
      : [],
    orSeries: `${workspace?.branding?.orPrefix ?? ''}${workspace?.branding?.orStart ?? ''}`,
    users: workspace?.administrator
      ? [{
          name: workspace.administrator.name ?? '',
          role: 'Head',
          email: workspace.administrator.email ?? '',
        }]
      : [],
    officeName: workspace?.branding?.officeName?.trim() || undefined,
    operations: operations.items,
    operationProblems: operations.problems,
    operationsDeclared: operations.present,
    operationsUnreadable: operations.unreadable,
    terminalSections: terminal.present && !terminal.unreadable ? terminal.choices : undefined,
    terminalSectionsUnreadable: terminal.unreadable,
  };
}
