import { applyFault, type Scenario } from "../engine/scenario";
import {
  bootstrapLeftInLb,
  expiredIgnition,
  missingApiIntDns,
  missingAppsWildcard,
  wrong22623Backend,
} from "../scenarios/faults";
import { ipiBaremetal } from "../scenarios/ipi-baremetal";
import { upgrade3m2w } from "../scenarios/upgrade-3m-2w";
import { upi3m2w } from "../scenarios/upi-3m-2w";
import { upiCompact3Node } from "../scenarios/upi-compact-3node";

export interface ScenarioOption {
  label: string;
  scenario: Scenario;
}

export const SCENARIO_OPTIONS: readonly [ScenarioOption, ...ScenarioOption[]] = [
  { label: "UPI compact (3 master)", scenario: upiCompact3Node },
  { label: "UPI (3 master + 2 worker)", scenario: upi3m2w },
  { label: "IPI bare metal (3 master + 2 worker)", scenario: ipiBaremetal },
  { label: "Upgrade (3 master + 2 worker)", scenario: upgrade3m2w },
  { label: "Fault: missing api-int DNS", scenario: applyFault(upi3m2w, missingApiIntDns) },
  { label: "Fault: 22623 backend wrong host", scenario: applyFault(upi3m2w, wrong22623Backend) },
  { label: "Fault: missing *.apps wildcard", scenario: applyFault(upi3m2w, missingAppsWildcard) },
  { label: "Fault: ignition older than 24h", scenario: applyFault(upi3m2w, expiredIgnition) },
  { label: "Fault: bootstrap left in LB", scenario: applyFault(upi3m2w, bootstrapLeftInLb) },
];
