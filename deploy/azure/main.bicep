// ==============================================================================
// Bicep IaC template
// Deploy all NanoMon components using Azure Container Apps and AVN
// ==============================================================================

targetScope = 'subscription'

@description('Name used for resource group, and default base name for all resources')
param appName string

@description('Repo and registry where the images are stored')
param imageRepo string = 'ghcr.io/benc-uk'

@description('Tag used for all images')
param imageTag string = 'latest'

@description('Enable optional auth with client ID')
param authClientId string = ''

@description('The tenant to use with auth, ignored if authClientId is empty')
param authTenant string = 'common'

@description('Connection DSN to an external Postgres database, if empty a new Postgres database will be created')
param postgresDSN string = ''

@description('IP address granted access to the Postgres database')
param allowAccessForIP string = ''

@description('Password for the Postgres user')
@secure()
param postgresPassword string = ''

// Alerting parameters, all optional
param alertFrom string = ''
param alertTo string = ''
param alertMailHost string = ''
param alertMailPort string = ''
@secure()
param alertPassword string = ''
param alertFailCount int = 3

// ===== Variables ==================================================

var scaleSettings = { minReplicas: 1, maxReplicas: 1, rules: [] }

// ===== Modules & Resources ==================================================

resource resGroup 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: appName
  location: deployment().location
}

module database 'br/public:avm/res/db-for-postgre-sql/flexible-server:0.12.1' = if (postgresDSN == '') {
  scope: resGroup

  params: {
    name: 'nanomon-db-${substring(uniqueString(resGroup.name), 0, 5)}'
    skuName: 'Standard_B1ms'
    tier: 'Burstable'
    version: '17'
    geoRedundantBackup: 'Disabled'
    highAvailability: 'Disabled'
    availabilityZone: -1

    administratorLogin: 'nanomon'
    administratorLoginPassword: postgresPassword

    databases: [
      { name: 'nanomon' }
    ]

    publicNetworkAccess: 'Enabled'
    firewallRules: [
      {
        name: 'AllowAzure'
        endIpAddress: '0.0.0.0'
        startIpAddress: '0.0.0.0'
      }
      {
        name: 'AllowAccessForIP'
        endIpAddress: allowAccessForIP
        startIpAddress: allowAccessForIP
      }
    ]
  }
}

module appEnv 'br/public:avm/res/app/managed-environment:0.11.2' = {
  scope: resGroup

  params: {
    name: 'nanomon'

    zoneRedundant: false
    publicNetworkAccess: 'Enabled'
    appLogsConfiguration: {
      destination: 'azure-monitor'
    }
  }
}

module api 'br/public:avm/res/app/container-app:0.18.1' = {
  scope: resGroup

  params: {
    name: 'nanomon-api'
    environmentResourceId: appEnv.outputs.resourceId

    ingressTargetPort: 8000
    ingressExternal: true

    secrets: [
      {
        name: 'postgres-password'
        value: postgresPassword
      }
    ]

    scaleSettings: scaleSettings

    containers: [
      {
        image: '${imageRepo}/nanomon-api:${imageTag}'
        resources: { cpu: '0.25', memory: '0.5Gi' }
        probes: [
          {
            type: 'Liveness'
            httpGet: { path: '/api/health', port: 8000 }
          }
        ]
        env: [
          {
            name: 'POSTGRES_DSN'
            value: postgresDSN != '' ? postgresDSN : 'host=${database!.outputs.fqdn} dbname=nanomon user=nanomon'
          }
          {
            name: 'POSTGRES_PASSWORD'
            secretRef: 'postgres-password'
          }
          {
            name: 'AUTH_CLIENT_ID'
            value: authClientId
          }
          {
            name: 'AUTH_TENANT'
            value: authTenant
          }
        ]
      }
    ]
  }
}

module frontend 'br/public:avm/res/app/container-app:0.18.1' = {
  scope: resGroup

  params: {
    name: 'nanomon-frontend'
    environmentResourceId: appEnv.outputs.resourceId

    ingressTargetPort: 8001
    ingressExternal: true

    scaleSettings: scaleSettings

    containers: [
      {
        image: '${imageRepo}/nanomon-frontend:${imageTag}'
        name: 'nanomon-frontend'
        resources: { cpu: '0.25', memory: '0.5Gi' }
        probes: [
          {
            type: 'Liveness'
            httpGet: { path: '/', port: 8001 }
          }
        ]
        env: [
          {
            name: 'API_ENDPOINT'
            value: 'https://${api.outputs.fqdn}/api'
          }
          {
            name: 'AUTH_CLIENT_ID'
            value: authClientId
          }
          {
            name: 'AUTH_TENANT'
            value: authTenant
          }
        ]
      }
    ]
  }
}

module runner 'br/public:avm/res/app/container-app:0.18.1' = {
  scope: resGroup

  params: {
    name: 'nanomon-runner'
    environmentResourceId: appEnv.outputs.resourceId

    secrets: [
      {
        name: 'alert-smtp-password'
        value: alertPassword
      }
      {
        name: 'postgres-password'
        value: postgresPassword
      }
    ]

    scaleSettings: scaleSettings

    containers: [
      {
        image: '${imageRepo}/nanomon-runner:${imageTag}'
        resources: { cpu: '0.25', memory: '0.5Gi' }

        env: [
          {
            name: 'POSTGRES_DSN'
            value: postgresDSN != '' ? postgresDSN : 'host=${database!.outputs.fqdn} dbname=nanomon user=nanomon'
          }
          {
            name: 'POSTGRES_PASSWORD'
            secretRef: 'postgres-password'
          }
          {
            name: 'ALERT_SMTP_FROM'
            value: alertFrom
          }
          {
            name: 'ALERT_SMTP_TO'
            value: alertTo
          }
          {
            name: 'ALERT_SMTP_HOST'
            value: alertMailHost
          }
          {
            name: 'ALERT_MAIL_PORT'
            value: alertMailPort
          }
          {
            name: 'ALERT_SMTP_PASSWORD'
            secretRef: 'alert-smtp-password'
          }
          {
            name: 'ALERT_FAIL_COUNT'
            value: '${alertFailCount}'
          }
        ]
      }
    ]
  }
}

output appURL string = 'https://${frontend.outputs.fqdn}/'
output dbHost string = postgresDSN != '' ? 'Unknown' : database!.outputs.fqdn
output resGroup string = resGroup.name
output postgresResName string = postgresDSN != '' ? 'Unknown' : database!.outputs.name
