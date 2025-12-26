#!/bin/bash
set -euo pipefail

# Configuration
NAMESPACE="${NAMESPACE:-ai-bots}"
DEPLOYMENT="${DEPLOYMENT:-rxddit-discord-bot}"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_NAME="${IMAGE_NAME:-sporaktu/rxddit-discord-bot}"
TAG="${TAG:-latest}"

IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"

echo "Deploying ${IMAGE} to ${NAMESPACE}/${DEPLOYMENT}"

# Update image
kubectl set image deployment/${DEPLOYMENT} \
  bot="${IMAGE}" \
  -n "${NAMESPACE}"

# Wait for rollout
kubectl rollout status deployment/${DEPLOYMENT} \
  -n "${NAMESPACE}" \
  --timeout=120s

echo "Deployment complete!"
kubectl get pods -n "${NAMESPACE}" -l app="${DEPLOYMENT}"
