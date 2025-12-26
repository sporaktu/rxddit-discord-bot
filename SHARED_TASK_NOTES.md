# Shared Task Notes - rxddit Discord Bot Kubernetes Deployment

## Current Status

**PR 1/4**: ✅ MERGED - Container Registry & Image Publishing (rxddit-discord-bot repo)
**PR 2/4**: ✅ MERGED - Kubernetes Manifests (homelab-kubernetes repo)
**PR 3/4**: ⏳ TODO - Deployment Automation & CI/CD
**PR 4/4**: ⏳ TODO - Monitoring, Backup & Observability

## Next Action: PR 3/4 - Deployment Automation

Work in the **rxddit-discord-bot** repository on branch `feat/k8s-deployment-automation`.

### Tasks for PR 3:

1. **Create deployment scripts** in `scripts/` directory:
   - `deploy-to-k8s.sh` - Manual deployment script
   - `rollback.sh` - Rollback script

2. **Extend GitHub Actions workflow**:
   - Modify `.github/workflows/docker-build.yml` to add deployment job
   - Create `.github/workflows/deploy.yml` for manual deployment triggers
   - Deployment job should only run on main branch after successful build
   - Use SHA tags instead of `latest` for deployments

3. **Update documentation**:
   - Add Kubernetes deployment section to main README.md
   - Document the full deployment workflow
   - Include rollback procedures

4. **Required GitHub Secrets**:
   - `KUBECONFIG` - Base64-encoded kubeconfig for cluster access
   - Already exists: `GITHUB_TOKEN` (for container registry)

### Key Requirements:

- Scripts must use `set -euo pipefail`
- All variables must be quoted: `"${VAR}"`
- Provide defaults: `"${VAR:-default}"`
- Deployment job must wait for rollout status verification
- Include timeout on rollout status (120s)
- Only deploy on push to main branch

### Code Review Process:

After completing PR 3:
1. Run code review using `.claude/prompts/code-review.md` or homelab-kubernetes review command
2. Fix any issues identified
3. Only create PR once review approves
4. Merge PR after approval

## Important Context

- Container images are at: `ghcr.io/sporaktu/rxddit-discord-bot`
- Kubernetes namespace: `ai-bots`
- Deployment name: `rxddit-discord-bot`
- Bot requires singleton deployment (replicas=1, Recreate strategy) due to SQLite
- PVC name: `rxddit-discord-bot-data`
- Secret name: `rxddit-discord-bot-secrets`

## Deployment Plan Reference

See `KUBERNETES_DEPLOYMENT_PLAN.md` for full details on all 4 PRs and acceptance criteria.
