# Kubernetes Deployment Plan: rxddit-discord-bot

This document outlines the plan for deploying the rxddit Discord bot to the homelab Kubernetes cluster, structured as multiple PRs for incremental implementation.

---

## Code Review Summary

Review conducted using `.claude/prompts/code-review.md` criteria.

### Critical Findings for Deployment

| Finding | Impact | K8s Requirement |
|---------|--------|-----------------|
| SQLite database at `/app/data/messages.db` | Data must persist | PersistentVolumeClaim required |
| `better-sqlite3` native module | Requires compilation | Multi-arch builds need attention |
| Non-root user (UID 1001) | Security best practice | SecurityContext in manifest |
| 30-day data retention with cleanup | Automated maintenance | No external cron needed |
| Graceful shutdown handlers | Clean database close | `terminationGracePeriodSeconds` |

### Security Review Results

| Check | Status | Notes |
|-------|--------|-------|
| SQL Injection | PASS | All queries use parameterized statements |
| Input Validation | PASS | Discord.js handles message validation |
| Permission Checks | PASS | Bot checks channel permissions before actions |
| Environment Variables | PASS | Token loaded from env, not hardcoded |
| Regex DoS (ReDoS) | PASS | Simple patterns, `lastIndex` properly reset |

### Code Quality Highlights

**Well Implemented:**
- Atomic revert operation (`markAsReverted` uses `WHERE is_reverted = 0`)
- Transaction-based cleanup prevents orphaned reactions
- Proper partial reaction/message handling in Discord.js
- Foreign key enforcement enabled in SQLite
- Database indexes on frequently queried columns

**Architecture:**
```
src/
├── bot.ts        # Discord event handlers, lifecycle management
├── database.ts   # SQLite operations, singleton pattern
└── linkUtils.ts  # Pure functions for link detection/conversion
```

---

## Overview

**Current State:**
- Discord bot written in TypeScript with discord.js
- SQLite database for message/reaction persistence (better-sqlite3)
- Docker containerization complete with data volume
- Comprehensive test suite with Jest
- homelab-kubernetes has an `ai-bots` namespace ready

**Target State:**
- Bot running in Kubernetes with PersistentVolumeClaim for SQLite
- Container images built and stored in GitHub Container Registry
- CI/CD pipeline for automated builds and deployments
- Integrated with existing cluster patterns

---

## Prerequisites

Before starting implementation:
1. Kubernetes cluster is running (k3s installed)
2. `kubectl` configured with cluster access
3. Docker installed for building images
4. GitHub repository access for both projects
5. GitHub Container Registry enabled on repository

---

## Implementation Plan: 4 PRs

### PR 1: Container Registry & Image Publishing

**Repository:** rxddit-discord-bot
**Branch:** `feat/container-registry`

**Scope:**
1. Create GitHub Actions workflow for building and pushing Docker images
2. Configure GitHub Container Registry (ghcr.io) as the image repository
3. Handle `better-sqlite3` native module compilation for multi-arch
4. Add image tagging strategy (latest + git SHA + semantic version)

**Files to Create/Modify:**
```
.github/
└── workflows/
    └── docker-build.yml    # New: Build and push workflow
.dockerignore               # New: Optimize build context
```

**Docker Build Workflow Requirements:**
```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=sha-
            type=semver,pattern={{version}}
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

**Native Module Note:**
`better-sqlite3` compiles native bindings. The multi-stage Dockerfile already handles this by running `npm ci` in the builder stage. For multi-arch builds, QEMU emulation will compile for each architecture.

**Acceptance Criteria:**
- [ ] Workflow runs successfully on push to main
- [ ] Image is accessible at ghcr.io
- [ ] Both amd64 and arm64 images available
- [ ] Image runs successfully when pulled from registry
- [ ] Native SQLite bindings work on both architectures

---

### PR 2: Kubernetes Manifests with Persistent Storage

**Repository:** homelab-kubernetes
**Branch:** `feat/rxddit-discord-bot`

**Scope:**
1. Create Kubernetes manifests in `namespaces/ai-bots/rxddit-discord-bot/`
2. Configure PersistentVolumeClaim for SQLite database
3. Define secrets template for Discord token
4. Set up proper security context for non-root user

**Files to Create:**
```
namespaces/ai-bots/
├── rxddit-discord-bot/
│   ├── deployment.yaml          # Deployment with PVC mount
│   ├── pvc.yaml                 # PersistentVolumeClaim for SQLite
│   ├── secret-template.yaml     # Template for DISCORD_TOKEN
│   └── README.md                # Deployment instructions
└── README.md                    # Update: Add rxddit-bot section
```

**PersistentVolumeClaim (pvc.yaml):**
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: rxddit-discord-bot-data
  namespace: ai-bots
  labels:
    app: rxddit-discord-bot
    app.kubernetes.io/name: rxddit-discord-bot
    app.kubernetes.io/component: storage
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path-fast  # Use fast storage for database
  resources:
    requests:
      storage: 1Gi  # SQLite DB is small, 1Gi is plenty
```

**Deployment Manifest (deployment.yaml):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rxddit-discord-bot
  namespace: ai-bots
  labels:
    app: rxddit-discord-bot
    app.kubernetes.io/name: rxddit-discord-bot
    app.kubernetes.io/component: discord-bot
    app.kubernetes.io/part-of: ai-bots
spec:
  replicas: 1  # Discord bots MUST be singleton
  strategy:
    type: Recreate  # Ensures old pod stops before new starts (SQLite lock)
  selector:
    matchLabels:
      app: rxddit-discord-bot
  template:
    metadata:
      labels:
        app: rxddit-discord-bot
        app.kubernetes.io/name: rxddit-discord-bot
        app.kubernetes.io/component: discord-bot
        app.kubernetes.io/part-of: ai-bots
    spec:
      securityContext:
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
      terminationGracePeriodSeconds: 30
      containers:
        - name: bot
          image: ghcr.io/USERNAME/rxddit-discord-bot:latest
          imagePullPolicy: Always
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          envFrom:
            - secretRef:
                name: rxddit-discord-bot-secrets
          env:
            - name: NODE_ENV
              value: "production"
          volumeMounts:
            - name: data
              mountPath: /app/data
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: false  # SQLite needs write access
            capabilities:
              drop:
                - ALL
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: rxddit-discord-bot-data
```

**Secret Template (secret-template.yaml):**
```yaml
# DO NOT COMMIT WITH REAL VALUES
# Copy this file, fill in values, apply with kubectl
apiVersion: v1
kind: Secret
metadata:
  name: rxddit-discord-bot-secrets
  namespace: ai-bots
  labels:
    app: rxddit-discord-bot
type: Opaque
stringData:
  DISCORD_TOKEN: "YOUR_DISCORD_BOT_TOKEN_HERE"
  CLIENT_ID: "YOUR_DISCORD_CLIENT_ID_HERE"  # Optional
```

**Acceptance Criteria:**
- [ ] Manifests pass `kubectl apply --dry-run=client`
- [ ] PVC uses `local-path-fast` storage class
- [ ] Security context matches Dockerfile (UID 1001)
- [ ] Strategy is `Recreate` (prevents SQLite locking issues)
- [ ] Resource limits match docker-compose specifications
- [ ] Volume mounted at `/app/data`
- [ ] README includes step-by-step deployment instructions

---

### PR 3: Deployment Automation & CI/CD

**Repository:** rxddit-discord-bot
**Branch:** `feat/k8s-deployment-automation`

**Scope:**
1. Extend GitHub Actions for Kubernetes deployment
2. Create manual deployment scripts
3. Add rollback procedures
4. Update documentation

**Files to Create/Modify:**
```
.github/workflows/
├── docker-build.yml            # Modify: Add k8s deployment job
└── deploy.yml                  # New: Manual deployment trigger
scripts/
├── deploy-to-k8s.sh            # New: Manual deployment script
└── rollback.sh                 # New: Rollback script
README.md                       # Update: Add Kubernetes section
```

**Deployment Script (scripts/deploy-to-k8s.sh):**
```bash
#!/bin/bash
set -euo pipefail

# Configuration
NAMESPACE="${NAMESPACE:-ai-bots}"
DEPLOYMENT="${DEPLOYMENT:-rxddit-discord-bot}"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_NAME="${IMAGE_NAME:-USERNAME/rxddit-discord-bot}"
TAG="${TAG:-latest}"

IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"

echo "Deploying ${IMAGE} to ${NAMESPACE}/${DEPLOYMENT}"

# Update image
kubectl set image deployment/${DEPLOYMENT} \
  bot=${IMAGE} \
  -n ${NAMESPACE}

# Wait for rollout
kubectl rollout status deployment/${DEPLOYMENT} \
  -n ${NAMESPACE} \
  --timeout=120s

echo "Deployment complete!"
kubectl get pods -n ${NAMESPACE} -l app=${DEPLOYMENT}
```

**Rollback Script (scripts/rollback.sh):**
```bash
#!/bin/bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-ai-bots}"
DEPLOYMENT="${DEPLOYMENT:-rxddit-discord-bot}"
REVISION="${1:-}"

echo "Rolling back ${DEPLOYMENT} in ${NAMESPACE}"

if [ -n "${REVISION}" ]; then
  kubectl rollout undo deployment/${DEPLOYMENT} \
    -n ${NAMESPACE} \
    --to-revision=${REVISION}
else
  kubectl rollout undo deployment/${DEPLOYMENT} \
    -n ${NAMESPACE}
fi

kubectl rollout status deployment/${DEPLOYMENT} \
  -n ${NAMESPACE} \
  --timeout=120s

echo "Rollback complete!"
```

**GitHub Actions Deployment Job (addition to docker-build.yml):**
```yaml
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Set up kubectl
        uses: azure/setup-kubectl@v3

      - name: Configure kubeconfig
        run: |
          mkdir -p ~/.kube
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > ~/.kube/config
          chmod 600 ~/.kube/config

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/rxddit-discord-bot \
            bot=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:sha-${{ github.sha }} \
            -n ai-bots
          kubectl rollout status deployment/rxddit-discord-bot \
            -n ai-bots --timeout=120s
```

**Acceptance Criteria:**
- [ ] Scripts are executable and pass shellcheck
- [ ] Deployment job only runs on main branch
- [ ] Kubeconfig handled securely via GitHub secrets
- [ ] Rollout status is verified before completing
- [ ] README documents full deployment workflow

---

### PR 4: Monitoring, Backup & Observability

**Repository:** homelab-kubernetes
**Branch:** `feat/rxddit-bot-monitoring`

**Scope:**
1. Add Kubernetes labels for observability
2. Create SQLite backup CronJob (optional)
3. Add alerting rules for bot availability
4. Document operational procedures

**Files to Create/Modify:**
```
namespaces/ai-bots/
├── rxddit-discord-bot/
│   ├── deployment.yaml         # Modify: Add annotations
│   ├── backup-cronjob.yaml     # New: SQLite backup job
│   └── README.md               # Update: Add operations section
└── monitoring/
    └── rxddit-bot-alerts.yaml  # New: Alert rules (if Prometheus exists)
```

**Backup CronJob (backup-cronjob.yaml):**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rxddit-discord-bot-backup
  namespace: ai-bots
spec:
  schedule: "0 3 * * *"  # Daily at 3 AM
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          securityContext:
            runAsUser: 1001
            runAsGroup: 1001
            fsGroup: 1001
          containers:
            - name: backup
              image: alpine:3.19
              command:
                - /bin/sh
                - -c
                - |
                  BACKUP_FILE="/backups/messages-$(date +%Y%m%d-%H%M%S).db"
                  cp /data/messages.db "$BACKUP_FILE"
                  echo "Backup created: $BACKUP_FILE"
                  # Keep only last 7 backups
                  ls -t /backups/*.db | tail -n +8 | xargs -r rm
              volumeMounts:
                - name: data
                  mountPath: /data
                  readOnly: true
                - name: backups
                  mountPath: /backups
          restartPolicy: OnFailure
          volumes:
            - name: data
              persistentVolumeClaim:
                claimName: rxddit-discord-bot-data
            - name: backups
              persistentVolumeClaim:
                claimName: rxddit-discord-bot-backups  # Create separate PVC
```

**Alerting Rules (if using Prometheus):**
```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rxddit-discord-bot-alerts
  namespace: ai-bots
spec:
  groups:
    - name: rxddit-discord-bot
      rules:
        - alert: RxdditBotDown
          expr: |
            kube_deployment_status_replicas_available{
              deployment="rxddit-discord-bot",
              namespace="ai-bots"
            } == 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "rxddit Discord bot is unavailable"
            description: "The rxddit Discord bot has had 0 available replicas for 5 minutes"

        - alert: RxdditBotPodCrashLooping
          expr: |
            increase(kube_pod_container_status_restarts_total{
              pod=~"rxddit-discord-bot.*",
              namespace="ai-bots"
            }[1h]) > 3
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "rxddit Discord bot is crash looping"
            description: "Pod {{ $labels.pod }} has restarted {{ $value }} times in the last hour"
```

**Acceptance Criteria:**
- [ ] Backup CronJob syntax is valid
- [ ] Backup retention (7 days) is enforced
- [ ] Alert thresholds are reasonable
- [ ] Documentation covers recovery procedures
- [ ] Labels follow Kubernetes recommended conventions

---

## Deployment Order

```
PR 1 ──► PR 2 ──► PR 3 ──► PR 4
 │         │        │        │
 │         │        │        └─ Monitoring & backup (recommended)
 │         │        └─ CI/CD automation (recommended)
 │         └─ K8s manifests + PVC (required)
 └─ Container registry (required)
```

**Minimum Viable Deployment:** PR 1 + PR 2
**Recommended Production Setup:** PR 1 + PR 2 + PR 3
**Full Production Setup:** All 4 PRs

---

## Manual Deployment Steps (After PRs 1 & 2)

```bash
# 1. Build and push image (or wait for GitHub Actions)
docker build -t ghcr.io/USERNAME/rxddit-discord-bot:latest .
docker push ghcr.io/USERNAME/rxddit-discord-bot:latest

# 2. Create namespace (if not exists)
kubectl apply -f namespaces/ai-bots/

# 3. Create the secret (one-time, use real values)
kubectl create secret generic rxddit-discord-bot-secrets \
  --from-literal=DISCORD_TOKEN='your-token-here' \
  --from-literal=CLIENT_ID='your-client-id' \
  -n ai-bots

# 4. Apply PVC first (must exist before deployment)
kubectl apply -f namespaces/ai-bots/rxddit-discord-bot/pvc.yaml

# 5. Apply the deployment
kubectl apply -f namespaces/ai-bots/rxddit-discord-bot/deployment.yaml

# 6. Verify deployment
kubectl get pods -n ai-bots -l app=rxddit-discord-bot
kubectl logs -n ai-bots -l app=rxddit-discord-bot -f
```

---

## Rollback Procedure

```bash
# View deployment history
kubectl rollout history deployment/rxddit-discord-bot -n ai-bots

# Rollback to previous version
kubectl rollout undo deployment/rxddit-discord-bot -n ai-bots

# Rollback to specific revision
kubectl rollout undo deployment/rxddit-discord-bot -n ai-bots --to-revision=2

# Verify rollback
kubectl rollout status deployment/rxddit-discord-bot -n ai-bots
```

---

## Database Recovery

If the SQLite database becomes corrupted:

```bash
# 1. Scale down to stop writes
kubectl scale deployment/rxddit-discord-bot -n ai-bots --replicas=0

# 2. Access the PVC data
kubectl run -it --rm sqlite-debug \
  --image=alpine:3.19 \
  --overrides='{"spec":{"containers":[{"name":"debug","image":"alpine:3.19","command":["sh"],"volumeMounts":[{"name":"data","mountPath":"/data"}]}],"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"rxddit-discord-bot-data"}}]}}' \
  -n ai-bots

# 3. Inside the debug pod, check database
apk add sqlite
sqlite3 /data/messages.db ".schema"
sqlite3 /data/messages.db "PRAGMA integrity_check"

# 4. If corrupted, restore from backup or delete to start fresh
rm /data/messages.db  # Bot will recreate on start

# 5. Scale back up
kubectl scale deployment/rxddit-discord-bot -n ai-bots --replicas=1
```

---

## Configuration Reference

| Environment Variable | Required | Description |
|---------------------|----------|-------------|
| DISCORD_TOKEN | Yes | Discord bot authentication token |
| CLIENT_ID | No | Discord application client ID |
| NODE_ENV | No | Set to "production" in Kubernetes |

---

## Resource Specifications

| Resource | Request | Limit | Notes |
|----------|---------|-------|-------|
| CPU | 100m | 500m | Matches docker-compose |
| Memory | 128Mi | 256Mi | Sufficient for SQLite + discord.js |
| Storage | 1Gi | - | SQLite database (messages + reactions) |

---

# Code Reviewer Agent Guide

## Purpose

This guide is for the Claude code reviewer agent to validate each PR before submission. Use this as the evaluation criteria for reviewing Kubernetes deployment PRs.

---

## General Review Checklist (All PRs)

### Security
- [ ] No hardcoded secrets or tokens
- [ ] Secret templates use obvious placeholders
- [ ] RBAC permissions are minimal (if any)
- [ ] Containers run as non-root (UID 1001)
- [ ] No `privileged: true` or `allowPrivilegeEscalation: true`

### Code Quality
- [ ] Consistent naming conventions (kebab-case for k8s resources)
- [ ] YAML files properly formatted (2-space indentation)
- [ ] No trailing whitespace
- [ ] Files end with newline
- [ ] Labels follow `app.kubernetes.io/*` conventions

### Documentation
- [ ] README updated if new features added
- [ ] All placeholder values clearly marked (e.g., `YOUR_TOKEN_HERE`, `USERNAME`)
- [ ] Deployment steps are accurate and complete

### Git Hygiene
- [ ] Commit messages are descriptive
- [ ] No unrelated changes in PR
- [ ] Branch is rebased on latest main (if applicable)

---

## PR 1 Review: Container Registry & Image Publishing

### GitHub Actions Workflow Validation
- [ ] Triggers: push to main, PRs, manual dispatch, version tags
- [ ] Uses official actions (actions/checkout@v4, docker/build-push-action@v5)
- [ ] GITHUB_TOKEN permissions: `packages: write`, `contents: read`
- [ ] Docker layer caching enabled (`cache-from: type=gha`)
- [ ] Multi-platform builds: `linux/amd64,linux/arm64`
- [ ] Login step conditional: `if: github.event_name != 'pull_request'`

### Image Tagging
- [ ] Tags include: `latest` (main only), `sha-{commit}`, semver (on tags)
- [ ] Uses `docker/metadata-action` for consistent tagging
- [ ] No hardcoded image names (uses `${{ github.repository }}`)

### Native Module Handling
- [ ] QEMU setup included for cross-compilation
- [ ] Buildx configured for multi-platform
- [ ] No assumptions about host architecture

### Test Commands
```bash
# After merge, verify image exists and works
docker pull ghcr.io/USERNAME/rxddit-discord-bot:latest
docker run --rm ghcr.io/USERNAME/rxddit-discord-bot:latest node -e "require('better-sqlite3')"
```

---

## PR 2 Review: Kubernetes Manifests

### Deployment Manifest Validation
- [ ] `apiVersion: apps/v1` for Deployment
- [ ] `namespace: ai-bots` on all resources
- [ ] `replicas: 1` (Discord bots MUST be singleton)
- [ ] `strategy.type: Recreate` (prevents SQLite locking)
- [ ] Labels consistent: selector, template, and metadata match
- [ ] `imagePullPolicy: Always` for `latest` tag
- [ ] Resource requests AND limits defined
- [ ] Resources match docker-compose: 100m-500m CPU, 128Mi-256Mi memory

### Security Context Validation
- [ ] Pod-level: `runAsUser: 1001`, `runAsGroup: 1001`, `fsGroup: 1001`
- [ ] Container-level: `allowPrivilegeEscalation: false`
- [ ] Capabilities: `drop: [ALL]`
- [ ] Matches Dockerfile user (nodejs:1001)

### PersistentVolumeClaim Validation
- [ ] `storageClassName: local-path-fast` (or appropriate class)
- [ ] `accessModes: [ReadWriteOnce]`
- [ ] Storage request reasonable (1Gi for SQLite)
- [ ] Labels match deployment for easy identification

### Volume Mount Validation
- [ ] Volume name matches between `volumes` and `volumeMounts`
- [ ] `mountPath: /app/data` matches Dockerfile and database.ts
- [ ] PVC name matches actual PVC resource

### Secret Reference Validation
- [ ] Uses `envFrom.secretRef` for clean env loading
- [ ] Secret name matches template name
- [ ] Template includes all required env vars (DISCORD_TOKEN)

### Test Commands
```bash
# Dry-run all manifests
kubectl apply -f namespaces/ai-bots/rxddit-discord-bot/ --dry-run=client -o yaml

# Verify selectors match
kubectl apply -f deployment.yaml --dry-run=server

# Check security context
yq '.spec.template.spec.securityContext' deployment.yaml
yq '.spec.template.spec.containers[0].securityContext' deployment.yaml

# Verify volume configuration
yq '.spec.template.spec.volumes' deployment.yaml
yq '.spec.template.spec.containers[0].volumeMounts' deployment.yaml
```

---

## PR 3 Review: Deployment Automation

### Script Validation
- [ ] Shebang: `#!/bin/bash`
- [ ] Strict mode: `set -euo pipefail`
- [ ] Variables quoted: `"${VAR}"`
- [ ] Defaults provided: `"${VAR:-default}"`
- [ ] Namespace/deployment names match PR 2 manifests
- [ ] Timeout on rollout status
- [ ] Exit status properly propagated

### GitHub Actions Deployment Job
- [ ] Condition: `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`
- [ ] `needs: build` to ensure image exists
- [ ] Uses `environment: production` for approval gates
- [ ] Kubeconfig from secrets (base64 encoded)
- [ ] Uses SHA tag, not just `latest`
- [ ] Includes rollout status verification

### Security
- [ ] Kubeconfig not logged or exposed
- [ ] No hardcoded cluster credentials
- [ ] Uses minimal RBAC (deployment patch only)

### Test Commands
```bash
# Validate script syntax
bash -n scripts/deploy-to-k8s.sh
bash -n scripts/rollback.sh
shellcheck scripts/*.sh

# Test locally (dry-run)
NAMESPACE=ai-bots DEPLOYMENT=rxddit-discord-bot \
  kubectl set image deployment/rxddit-discord-bot bot=test:latest --dry-run=client
```

---

## PR 4 Review: Monitoring & Backup

### CronJob Validation
- [ ] `schedule` uses valid cron syntax
- [ ] `concurrencyPolicy: Forbid` prevents overlap
- [ ] History limits set (3 successful, 3 failed)
- [ ] `restartPolicy: OnFailure`
- [ ] Security context matches main deployment (UID 1001)
- [ ] Source volume is `readOnly: true`
- [ ] Backup retention logic is correct

### Alert Rules (if Prometheus)
- [ ] PromQL syntax is valid
- [ ] Alert names are descriptive
- [ ] `for` duration prevents flapping (5m minimum)
- [ ] Severity levels appropriate (warning, not critical for bot)
- [ ] Annotations provide actionable context

### Labels
- [ ] Standard labels applied to all new resources
- [ ] `app.kubernetes.io/*` convention followed
- [ ] Labels enable filtering (`kubectl get all -l app=rxddit-discord-bot`)

### Test Commands
```bash
# Validate CronJob
kubectl apply -f backup-cronjob.yaml --dry-run=client

# Test alert PromQL (if promtool available)
promtool check rules rxddit-bot-alerts.yaml

# Verify labels
kubectl get all -n ai-bots -l app=rxddit-discord-bot -o name
```

---

## Common Issues to Watch For

### BLOCK PR (Security/Critical)
- Secrets with real values committed
- `privileged: true` or `hostPath` mounts
- Running as root without justification
- Missing resource limits
- `replicas > 1` (causes SQLite locking)

### REQUEST CHANGES (Configuration)
- Mismatched labels/selectors
- Wrong namespace
- Missing PVC mount
- `strategy.type: RollingUpdate` (should be Recreate for SQLite)
- UID mismatch with Dockerfile

### COMMENT ONLY (Style/Suggestions)
- Minor YAML formatting
- Additional labels that would be nice
- Optional improvements to scripts

---

## Approval Criteria

**Approve if:**
- All blocking issues resolved
- Acceptance criteria for the PR met
- Security review passed
- Dry-run/syntax validation passed
- Documentation is accurate

**Request Changes if:**
- Configuration would prevent deployment
- Security concerns exist
- Missing required resources (PVC, secrets)
- Significant deviation from existing patterns

---

## Quick Reference Commands

```bash
# Full manifest validation
kubectl apply -f . --dry-run=client -R 2>&1 | grep -E "(error|warning)"

# Check what would change
kubectl diff -f . -R

# Verify running deployment
kubectl get all -n ai-bots -l app=rxddit-discord-bot
kubectl describe deployment rxddit-discord-bot -n ai-bots
kubectl logs -n ai-bots -l app=rxddit-discord-bot --tail=50

# Check PVC status
kubectl get pvc -n ai-bots
kubectl describe pvc rxddit-discord-bot-data -n ai-bots

# Check secrets (names only, not values)
kubectl get secrets -n ai-bots
```
