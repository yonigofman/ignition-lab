import type { ScenarioArtifact } from "../engine/scenario";
import { buildSharedAuthArtifacts } from "./sharedArtifacts";

export interface IpiBaremetalArtifactsOptions {
  cluster: string;
  baseDomain: string;
  apiVip: string;
  ingressVip: string;
  bmc: Record<string, { address: string; mac: string }>;
  clusterId: string;
  infraId: string;
}

/** The artifacts an IPI bare-metal install produces before install starts. Structurally different enough from the UPI artifact set (platform.baremetal hosts/BMCs/VIPs instead of platform: none, a BareMetalHost manifest instead of a scheduler config) that it isn't built from buildStandardArtifacts. */
export function buildIpiBaremetalArtifacts(opts: IpiBaremetalArtifactsOptions): ScenarioArtifact[] {
  const { cluster, baseDomain, apiVip, ingressVip, bmc, clusterId, infraId } = opts;

  const hostsYaml = Object.entries(bmc)
    .map(
      ([name, { address, mac }]) => `    - name: ${name}
      role: ${name.startsWith("master") ? "master" : "worker"}
      bmc:
        address: ${address}
        username: admin
        password: REDACTED
      bootMACAddress: "${mac}"
      bootMode: UEFI`
    )
    .join("\n");

  return [
    {
      id: "install-config",
      path: "install-config.yaml",
      language: "yaml",
      content: `apiVersion: v1
baseDomain: ${baseDomain}
metadata:
  name: ${cluster}
compute:
  - name: worker
    replicas: 2
controlPlane:
  name: master
  replicas: 3
networking:
  networkType: OVNKubernetes
  machineNetwork:
    - cidr: 192.168.2.0/24
platform:
  baremetal:
    apiVIPs:
      - ${apiVip}
    ingressVIPs:
      - ${ingressVip}
    provisioningNetwork: Managed
    hosts:
${hostsYaml}
pullSecret: '{"auths": {"...": {}}}'
sshKey: |
  ssh-ed25519 AAAA... core@provisioning
`,
    },
    {
      id: "manifests",
      path: "manifests/baremetalhost-master-0.yaml",
      language: "yaml",
      content: `apiVersion: metal3.io/v1alpha1
kind: BareMetalHost
metadata:
  name: master-0
  namespace: openshift-machine-api
spec:
  online: true
  bmc:
    address: ${bmc["master-0"]?.address ?? ""}
    credentialsName: master-0-bmc-secret
  bootMACAddress: "${bmc["master-0"]?.mac ?? ""}"
  bootMode: UEFI
`,
      note: "Generated once Ironic has inspected the host. One BareMetalHost resource exists per host listed in install-config.yaml's platform.baremetal.hosts — this is the bare-metal-specific manifest; there's no equivalent in a UPI install.",
    },
    {
      id: "bootstrap-ignition",
      path: "bootstrap.ign",
      language: "json",
      content: `{
  "ignition": { "version": "3.2.0" },
  "storage": {
    "files": ["/* ~1800 more lines: release image pull spec, bootkube unit files, Ironic container config, etcd static pod manifests, CA bundles */"]
  },
  "systemd": {
    "units": [{ "name": "bootkube.service", "enabled": true }, { "name": "ironic.service", "enabled": true }, { "name": "release-image.service", "enabled": true }]
  }
}
`,
      note: "Truncated. Same role as UPI's bootstrap.ign, plus the Ironic containers that power on and deploy RHCOS to the other hosts over BMC.",
    },
    {
      id: "master-ignition",
      path: "master.ign",
      language: "json",
      content: `{
  "ignition": {
    "version": "3.2.0",
    "config": {
      "merge": [
        { "source": "https://api-int.${cluster}.${baseDomain}:22623/config/master" }
      ]
    }
  }
}
`,
      note: "A pointer config, same shape as UPI's. api-int resolves to the on-cluster API VIP here instead of a dedicated load-balancer node.",
    },
    {
      id: "worker-ignition",
      path: "worker.ign",
      language: "json",
      content: `{
  "ignition": {
    "version": "3.2.0",
    "config": {
      "merge": [
        { "source": "https://api-int.${cluster}.${baseDomain}:22623/config/worker" }
      ]
    }
  }
}
`,
      note: "A pointer config, same idea as master.ign. By the time workers fetch the real config from this URL, bootstrap is already gone — the running control plane's own Machine Config Server answers, same as in UPI.",
    },
    ...buildSharedAuthArtifacts({ cluster, baseDomain, clusterId, infraId }),
  ];
}
