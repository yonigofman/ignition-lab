import type { InstallEvent } from "../../src/engine/events";

/** Dispatches that satisfy upi-3m-2w's remove-bootstrap-from-lb gate. */
export const BOOTSTRAP_LB_GATE_FIXES: InstallEvent[] = [
  { t: 65, type: "lb.backend", frontend: 6443, backend: "bootstrap", state: "removed" },
  { t: 66, type: "lb.backend", frontend: 22623, backend: "bootstrap", state: "removed" },
];

/** Dispatches that satisfy both of upi-3m-2w's worker CSR gates (client, then serving). */
export const WORKER_CSR_GATE_FIXES: InstallEvent[] = [
  { t: 112, type: "csr.approved", id: "csr-worker-0-client", by: "learner" },
  { t: 113, type: "csr.approved", id: "csr-worker-1-client", by: "learner" },
  { t: 117, type: "csr.approved", id: "csr-worker-0-serving", by: "learner" },
  { t: 118, type: "csr.approved", id: "csr-worker-1-serving", by: "learner" },
];

/** All gates before upi-3m-2w's own co.status/install.complete section. */
export const ALL_PRIOR_GATE_FIXES: InstallEvent[] = [...BOOTSTRAP_LB_GATE_FIXES, ...WORKER_CSR_GATE_FIXES];
