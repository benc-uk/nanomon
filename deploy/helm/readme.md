# Helm Docs

A Helm chart for deploying NanoMon is provided

## First Run

Update chart dependencies

```bash
cd deploy/helm
helm dep update ./nanomon
```

## Quick Deploy

### With Ingress

It's strongly advised to deploy the chart to a Kubernetes cluster with an Ingress Controller available. By default the NGINX controller is used, but this can be changed by setting `ingress.className`

```bash
helm install nm ./nanomon \
--set ingress.enabled=true,ingress.host=mydomain.example.com
```

### Without Ingress

Deploying without an Ingress Controller is slightly more complex and a two phase process, and assumes you are deploying to a cluster where the `LoadBalancer` service type can be used (which is the case for most cloud hosted Kubernetes, e.g. AKS)

First run:

```bash
helm install nm ./nanomon \
--set frontend.serviceType=LoadBalancer,api.serviceType=LoadBalancer
```

Run the kubectl command given in the output, e.g. `kubectl get svc nm-nanomon-api nm-nanomon-frontend` and wait for both services to get their external IPs. Then update the deployment, setting the `frontend.apiEndpoint` to point to the URL with the new public IP address of the API service. e.g.

```bash
helm upgrade nm ./nanomon --reuse-values \
--set frontend.apiEndpoint=http://API_IP_ADDRESS/api
```

Then go to `http://FRONTEND_IP_ADDRESS/` in your browser to open the app

## Helm chart reference

Many more deployment options are available.

Click [here for the readme for the NanoMon Helm chart](./nanomon/) which includes details for all the values that can be passed to the chart.

## Remote Repo

This repo on Github can be used as a remote Helm repo for installing the chart directly

```bash
helm repo add nanomon 'https://raw.githubusercontent.com/benc-uk/nanomon/main/deploy/helm'
helm repo update nanomon

helm install myrelease nanomon/nanomon
```
