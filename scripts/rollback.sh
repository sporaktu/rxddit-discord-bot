#!/bin/bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-ai-bots}"
DEPLOYMENT="${DEPLOYMENT:-rxddit-discord-bot}"
REVISION="${1:-}"

echo "Rolling back ${DEPLOYMENT} in ${NAMESPACE}"

if [ -n "${REVISION}" ]; then
  kubectl rollout undo deployment/${DEPLOYMENT} \
    -n "${NAMESPACE}" \
    --to-revision="${REVISION}"
else
  kubectl rollout undo deployment/${DEPLOYMENT} \
    -n "${NAMESPACE}"
fi

kubectl rollout status deployment/${DEPLOYMENT} \
  -n "${NAMESPACE}" \
  --timeout=120s

echo "Rollback complete!"
kubectl get pods -n "${NAMESPACE}" -l app="${DEPLOYMENT}"
