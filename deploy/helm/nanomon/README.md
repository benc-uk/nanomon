# nanomon

![Version: 0.0.8](https://img.shields.io/badge/Version-0.0.8-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 0.2.0](https://img.shields.io/badge/AppVersion-0.2.0-informational?style=flat-square)

Deploy NanoMon, a HTTP and network monitoring tool

## Requirements

| Repository | Name | Version |
|------------|------|---------|
| https://charts.bitnami.com/bitnami | postgresql | 16.7.20 |

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` | Affinity used by all pods |
| api.replicaCount | int | `1` | Number of pod replicas for the API |
| api.serviceType | string | `"ClusterIP"` | Type of service for the API |
| authClientId | string | `nil` | Enable authentication with EntraID & a client id |
| authTenant | string | `nil` | Optional, set tenant ID for EntraID auth |
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
| nameOverride | string | `""` | Override the chart name |
| nodeSelector | object | `{}` | Node selector for all pods |
| podAnnotations | object | `{}` | Annotations applied to all pods |
| postgresql.enabled | bool | `true` | Enable deploying Postgres, set to false when using an external database |
| postgresql.externalDSN | string | `nil` | Point to an existing database instance, leave blank when enabled=true |
| postgresql.externalPassword | string | `nil` | Password for the external database, leave blank when enabled=true |
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

