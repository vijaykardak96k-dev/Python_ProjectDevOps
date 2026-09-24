# Smart Farm Helm Chart

This chart deploys only the Smart Farm application workloads. MongoDB is external and its connection string must be provided through the existing Kubernetes Secret configured by `backend.existingSecret`.

## Validate

```bash
helm lint ./helm/smart-farm
helm template smart-farm ./helm/smart-farm
```

## Install

```bash
kubectl create namespace smart-farm
kubectl -n smart-farm create secret generic smart-farm-secrets \\
  --from-literal=MONGO_URI='mongodb://USER:PASSWORD@HOST:27017/smartfarm?authSource=admin'

helm upgrade --install smart-farm ./helm/smart-farm \\
  --namespace smart-farm \\
  --set backend.image.tag=v1 \\
  --set frontend.image.tag=v1
```
