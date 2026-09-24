# Smart Farm

A small farm management application for tracking crops, harvest status, watering and fertilizer needs.

## Stack

- Frontend: React, Vite, Nginx
- Backend: Python, Flask, PyMongo, Gunicorn
- Database: MongoDB
- Containers: Docker, Docker Compose
- Kubernetes: Deployments, Services, ConfigMap, Secret, probes, resources, HPA, PDB, optional Ingress
- Packaging: Helm
- CI/CD: Jenkins

## Project layout

```text
smart-farm/
├── backend/
├── frontend/
├── k8s/                    # Raw Kubernetes manifests only
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   ├── pdb.yaml
│   ├── hpa.yaml
│   ├── secret.example.yaml
│   └── ingress.yaml.example
├── helm/                   # Helm chart only
│   └── smart-farm/
├── tests/
├── docker-compose.yml
├── Jenkinsfile
└── README.md
```

## Run locally with Docker

```bash
docker compose up --build
```

Open `http://localhost:8080`.

Stop:

```bash
docker compose down
```

Remove MongoDB volume:

```bash
docker compose down -v
```

## Kubernetes - raw YAML

The `k8s/` directory is independent from Helm. It contains plain Kubernetes manifests and can be deployed directly with `kubectl`.

MongoDB is expected to be provided externally for this production-oriented deployment. Create the application Secret first:

```bash
kubectl create namespace smart-farm
kubectl -n smart-farm create secret generic smart-farm-secrets \\
  --from-literal=MONGO_URI='mongodb://USER:PASSWORD@HOST:27017/smartfarm?authSource=admin'
```

Then deploy the raw manifests:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/pdb.yaml
kubectl apply -f k8s/hpa.yaml
```

Or, after creating the Secret, apply all deployable YAML files in one command:

```bash
kubectl apply -f k8s/
```

`*.example.yaml` files are documentation/templates and are not applied by the command above.

Check:

```bash
kubectl -n smart-farm get pods
kubectl -n smart-farm get svc
kubectl -n smart-farm get hpa
```

For local access without an Ingress controller:

```bash
kubectl -n smart-farm port-forward svc/smart-farm-frontend 8080:80
```

Open `http://localhost:8080`.

### Optional Ingress

Copy `k8s/ingress.yaml.example` to `k8s/ingress.yaml`, change the host to your real DNS name, then apply it. An Nginx Ingress Controller and DNS record are required.

## Kubernetes - Helm

The `helm/` directory is completely separate from the raw manifests.

Install or upgrade:

```bash
helm upgrade --install smart-farm ./helm/smart-farm \\
  --namespace smart-farm \\
  --create-namespace \\
  --set backend.image.tag=v1 \\
  --set frontend.image.tag=v1
```

Create the MongoDB Secret before installing the chart:

```bash
kubectl -n smart-farm create secret generic smart-farm-secrets \\
  --from-literal=MONGO_URI='mongodb://USER:PASSWORD@HOST:27017/smartfarm?authSource=admin'
```

Useful commands:

```bash
helm lint ./helm/smart-farm
helm template smart-farm ./helm/smart-farm
helm upgrade --install smart-farm ./helm/smart-farm -n smart-farm --wait --timeout 5m
```

## Docker Hub

Images:

```text
vijaykardak/smart-farm-back
vijaykardak/smart-farm-front
```

Do not store Docker Hub credentials in Git. Jenkins uses its credential store.

## Jenkins

Create these Jenkins credentials:

- `dockerhub-credentials` - Docker Hub username + access token
- `kubernetes-kubeconfig` - kubeconfig for the target cluster

The pipeline tests the backend, builds both images, pushes versioned images, and deploys the Helm chart on the `main` branch. It passes the Jenkins build number as the image tag, so the Helm files do not need to be edited for every release.

## Production notes

- Use a managed MongoDB or a properly operated MongoDB cluster rather than running the database inside the application deployment.
- Keep `MONGO_URI` in a Kubernetes Secret or external secret manager.
- Use TLS and a real DNS name for public Ingress.
- Keep resource requests/limits and HPA thresholds tuned to observed workload.
- Use immutable image tags in production; avoid `latest`.
- Never commit credentials, kubeconfig files, or `.env` files.
