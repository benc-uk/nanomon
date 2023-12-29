# nanomon

![Version: 0.0.6](https://img.shields.io/badge/Version-0.0.6-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 0.0.9](https://img.shields.io/badge/AppVersion-0.0.9-informational?style=flat-square)

Deploy NanoMon, a HTTP and network monitoring tool

## Requirements

| Repository | Name | Version |
|------------|------|---------|
| https://charts.bitnami.com/bitnami | mongodb | 13.x.x |

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` | Affinity used by all pods |
| api.replicaCount | int | `1` | Number of pod replicas for the API |
| api.serviceType | string | `"ClusterIP"` | Type of service for the API |
| authClientId | string | `nil` | Enable authentication with an Azure AD app id |
| frontend.apiEndpoint | string | `nil` | Endpoint to access the deployed API, don't set when using ingress |
| frontend.replicaCount | int | `1` | Number of pod replicas for the frontend host |
| frontend.serviceType | string | `"ClusterIP"` | Type of service for the frontend |
| fullnameOverride | string | `""` | Override the full release name |
| image.pullPolicy | string | `"Always"` | Set the image pull policy |
| image.pullSecrets | list | `[]` | Image pull secrets if needed |
| image.regRepo | string | `"ghcr.io/benc-uk"` | Registry & repo prefix for all images |
| image.tag | string | `"latest"` | Tag for all images |
| ingress.annotations | object | `{}` | Annotations applied to the ingress |
| ingress.className | string | `"nginx"` | Class name of your ingress controller |
| ingress.enabled | bool | `false` | Use a Ingress, you will need an ingress controller deployed and setup |
| ingress.host | string | `nil` | Hostname for the ingress rules, strongly recommended to set |
| ingress.tlsSecret | string | `nil` | TLS cert secret name, leave blank to disable TLS |
| mongodb.connectionURI | string | `nil` | Point to an existing MongoDB instance, leave blank when enabled=true |
| mongodb.enabled | bool | `true` | Enable deploying MongoDB, leave connectionURI blank if true |
| mongodb.persistence.enabled | bool | `false` | Enable persistence for MongoDB |
| mongodb.persistence.size | string | `"1Gi"` | Size of the MongoDB persistent volume |
| mongodb.persistence.storageClass | string | `"default"` | Storage class for the MongoDB persistent volume |
| nameOverride | string | `""` | Override the chart name |
| nodeSelector | object | `{}` | Node selector for all pods |
| podAnnotations | object | `{}` | Annotations applied to all pods |
| runner.alerting.failCount | int | `3` | How many times a monitor can fail before sending an alert |
| runner.alerting.from | string | `nil` | The email address to send alerts from, set to enable alerting |
| runner.alerting.password | string | `nil` | SMTP password for sending alerts, set to enable alerting |
| runner.alerting.smtpHost | string | `"smtp.gmail.com"` | SMTP host for sending alerts |
| runner.alerting.smtpPort | int | `587` | SMTP port for sending alerts |
| runner.alerting.to | string | `nil` | The email address to send alerts to, set to enable alerting |
| runner.pollingInterval | string | `nil` | Only set when using polling, use a duration string, e.g. "5s" |
| runner.replicaCount | int | `1` | Number of pod replicas for the runner, best left as 1 |
| runner.usePolling | string | `nil` | Set to "true" to using DB polling instead of MongoDB change streams |
| tolerations | list | `[]` | Tolerations used by all pods |

