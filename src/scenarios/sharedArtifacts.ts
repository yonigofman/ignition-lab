import type { ScenarioArtifact } from "../engine/scenario";

export interface SharedAuthArtifactsOptions {
  cluster: string;
  baseDomain: string;
  clusterId: string;
  infraId: string;
}

/** metadata.json / auth/kubeconfig / auth/kubeadmin-password are identical in shape across every install path (UPI and IPI alike) - only the identifiers inside differ. */
export function buildSharedAuthArtifacts(opts: SharedAuthArtifactsOptions): ScenarioArtifact[] {
  const { cluster, baseDomain, clusterId, infraId } = opts;

  return [
    {
      id: "metadata",
      path: "metadata.json",
      language: "json",
      content: `{
  "clusterName": "${cluster}",
  "clusterID": "${clusterId}",
  "infraID": "${infraId}"
}
`,
    },
    {
      id: "kubeconfig",
      path: "auth/kubeconfig",
      language: "yaml",
      content: `apiVersion: v1
kind: Config
clusters:
  - name: ${cluster}
    cluster:
      server: https://api.${cluster}.${baseDomain}:6443
      certificate-authority-data: REDACTED
users:
  - name: admin
    user:
      client-certificate-data: REDACTED
      client-key-data: REDACTED
contexts:
  - name: admin
    context:
      cluster: ${cluster}
      user: admin
current-context: admin
`,
      note: "Cert/key material is redacted here — this is a preview, not a usable kubeconfig.",
    },
    {
      id: "kubeadmin-password",
      path: "auth/kubeadmin-password",
      language: "text",
      content: "REDACTED-fake-placeholder-password\n",
      note: "A single-line placeholder. The real file holds the one-time kubeadmin password generated for this install.",
    },
  ];
}
