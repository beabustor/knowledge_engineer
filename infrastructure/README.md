# Optional infrastructure (templates, not deployments)

[English](README.md) · [Español](README.es.md)

Nothing here runs from Pages CI. Applying a template can create resources and
cost money even when no requests occur. Existing Kubernetes clusters, disks,
load balancers, registries, logs and egress may be billable. No free-cloud claim
is made. Docker/cluster validation has not been performed in this environment.

## Local Docker steps

1. Review `optional/README.md`. Create ignored `optional/config.local.json` from
   the example; set only `api.enabled=true` for a health-only smoke test.
2. Inspect the image and dependencies; pin the base image to a verified digest
   for deployment. The example image tag is not an immutable supply-chain lock.
3. Explicitly opt in:
   `docker compose -f infrastructure/docker/compose.optional.yml --profile backend up --build`.
4. Check local `/health` on port 8080. No AI/terminology endpoints are exposed.
5. Stop the profile using the same Compose file/profile and `down`.

Profile selection alone does not enable features. The configuration is a
read-only mount and contains no credentials. To implement live adapters later,
use Docker secrets or an external secret manager, not baked image layers.

## Kubernetes steps

1. Select cluster, namespace, budget and operator. Do not apply templates blindly.
2. Build and scan an image; replace the placeholder digest in
   `kubernetes/api.template.yaml`. Supply the operator ConfigMap with the
   reviewed configuration; never put secrets in a ConfigMap.
3. Deployment defaults to **zero replicas**, private ClusterIP, no ingress and
   no autoscaler. The NetworkPolicy template blocks all network traffic. Adapt
   it to the real CNI, ingress-controller, DNS and authorized provider paths.
   Standard NetworkPolicy does not enforce hostname allowlists; use an egress
   gateway/proxy when domain-level control is required.
4. Add secret-store/workload-identity integration and an authenticated TLS
   gateway before exposure. Validate manifests with cluster-side dry run.
5. For a health-only pilot, explicitly choose one replica and verify probes,
   resource limits and logs. Scale back to zero and remove resources when done.
6. Add query routes, workers, queue and storage adapters only after feature tests.
   Introduce horizontal scaling from observed metrics; retain global per-provider
   rate limits and budget enforcement across replicas.

No kubectl apply, Docker build, cloud login or resource creation is automated.
The API scaffold is deliberately not a production web server or query service.

## Private storage naming plan

Use `optional/storage/layout.json` as the common object-prefix scheme:
`raw/<source>/<edition>/`, `normalized/`, `ontologies/`, `indexes/`, `jobs/`,
`evaluations/`, `training/`, `models/`, `audit/`, `quarantine/`.

Provider plans in `cloud/azure/`, `cloud/aws/` and `cloud/gcp/` are inert JSON,
not Terraform or ARM resources. Resource names are examples, not reservations.
Region, global name uniqueness, SKU, license territory, IAM, encryption keys,
networking, retention and backups require operator decisions. Do not mount
private corpora under `web/`, commit them, or include them in Pages artifacts.
