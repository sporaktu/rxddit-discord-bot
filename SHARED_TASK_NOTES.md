# Shared Task Notes - rxddit Discord Bot Kubernetes Deployment

## Current Status

**PR 1/4**: ✅ MERGED - Container Registry & Image Publishing (rxddit-discord-bot repo)
**PR 2/4**: ✅ MERGED - Kubernetes Manifests (homelab-kubernetes repo)
**PR 3/4**: ✅ MERGED - Deployment Automation & CI/CD (rxddit-discord-bot repo)
**PR 4/4**: ⏳ TODO - Monitoring, Backup & Observability (homelab-kubernetes repo)

## Next Action: PR 4/4 - Monitoring & Observability

Work in the **homelab-kubernetes** repository on branch `feat/rxddit-bot-monitoring`.

### Tasks for PR 4:

1. **Optional SQLite backup CronJob**:
   - Create `namespaces/ai-bots/rxddit-discord-bot/backup-cronjob.yaml`
   - Daily backup at 3 AM
   - Keep last 7 backups
   - Requires separate PVC for backups

2. **Add Kubernetes labels for observability** (if not already present):
   - Update deployment.yaml with recommended labels
   - Follow `app.kubernetes.io/*` conventions

3. **Optional alerting rules** (if Prometheus exists):
   - Create monitoring rules for bot availability
   - Alert on pod crash loops
   - Alert on 0 replicas for >5 minutes

4. **Update documentation**:
   - Add operations section to README
   - Document backup/restore procedures
   - Include troubleshooting steps

### Key Notes:

- This PR is **optional/recommended** - bot is fully functional without it
- Backup CronJob requires creating a second PVC: `rxddit-discord-bot-backups`
- Security context must match deployment (UID 1001)
- Backup volume should be read-only when mounted

### Code Review Process:

After completing PR 4:
1. Run code review using `.claude/prompts/code-review.md`
2. Validate CronJob syntax with `kubectl apply --dry-run=client`
3. Fix any issues identified
4. Merge PR after approval

## Deployment Complete After PR 4

Once PR 4 is merged, the full deployment will be complete:
- ✅ Container images published to ghcr.io
- ✅ Kubernetes manifests deployed
- ✅ CI/CD pipeline operational
- ✅ Monitoring and backup (optional) configured

## Important Context

- Container images: `ghcr.io/sporaktu/rxddit-discord-bot`
- Kubernetes namespace: `ai-bots`
- Deployment name: `rxddit-discord-bot`
- Bot requires singleton deployment (replicas=1, Recreate strategy) due to SQLite
- PVC name: `rxddit-discord-bot-data`
- Secret name: `rxddit-discord-bot-secrets`

## Manual Deployment Commands

```bash
# Deploy to Kubernetes (after creating secret)
kubectl create secret generic rxddit-discord-bot-secrets \
  --from-literal=DISCORD_TOKEN='your-token' \
  -n ai-bots

kubectl apply -f namespaces/ai-bots/rxddit-discord-bot/pvc.yaml
kubectl apply -f namespaces/ai-bots/rxddit-discord-bot/deployment.yaml

# Or use deployment script
TAG=sha-abc123 ./scripts/deploy-to-k8s.sh

# Rollback if needed
./scripts/rollback.sh
```

## Deployment Plan Reference

See `KUBERNETES_DEPLOYMENT_PLAN.md` for full details on all 4 PRs and acceptance criteria.
