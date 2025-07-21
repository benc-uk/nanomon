// ==============================================================================
// Bicep IaC template
// Deploy all NanoMon components using Azure Container Apps 
// ==============================================================================

targetScope = 'subscription'

@description('Name used for resource group, and default base name for all resources')
param appName string

@description('Azure region for all resources')
param location string = deployment().location

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

@description('Password for the Postgres user')
@secure()
param postgresPassword string = ''

@description('Alerting parameters, all optional')
param alertFrom string = ''
param alertTo string = ''
param alertMailHost string = ''
param alertMailPort string = ''
@secure()
#disable-next-line secure-parameter-default
param alertPassword string = '__ignored_default__'
param alertFailCount int = 3

@description('IP address granted access to the Postgres database')
param allowAccessForIP string = ''

// ===== Modules & Resources ==================================================

resource resGroup 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: appName
  location: location
}

module database './bicep-iac/modules/database/postgres-cosmosdb.bicep' = if (postgresDSN == '') {
  scope: resGroup
  params: {
    location: location
    name: 'nanomon-db'
    databaseName: 'nanomon'
    version: '16'
    adminPassword: postgresPassword
    allowAccessForIP: allowAccessForIP
  }
}

module logAnalytics './bicep-iac/modules/monitoring/log-analytics.bicep' = {
  scope: resGroup

  params: {
    location: location
    name: 'logs'
  }
}

module containerAppEnv './bicep-iac/modules/containers/app-env.bicep' = {
  scope: resGroup

  params: {
    location: location
    name: 'app-environment'
    logAnalyticsName: logAnalytics.outputs.name
    logAnalyticsResGroup: resGroup.name
  }
}

module api './bicep-iac/modules/containers/app.bicep' = {
  scope: resGroup

  params: {
    location: location
    name: 'nanomon-api'
    environmentId: containerAppEnv.outputs.id
    image: '${imageRepo}/nanomon-api:${imageTag}'

    probePath: '/api/health'
    probePort: 8000

    ingressPort: 8000
    ingressExternal: true

    cpu: '0.25'
    memory: '0.5Gi'

    secrets: [
      {
        name: 'postgres-password'
        value: postgresPassword
      }
    ]

    envs: [
      {
        name: 'POSTGRES_DSN'
        value: postgresDSN != '' ? postgresDSN : database.outputs.dsn
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
}

module frontend './bicep-iac/modules/containers/app.bicep' = {
  scope: resGroup

  params: {
    location: location
    name: 'nanomon-frontend'
    environmentId: containerAppEnv.outputs.id
    image: '${imageRepo}/nanomon-frontend:${imageTag}'

    probePath: '/'
    probePort: 8001

    ingressPort: 8001
    ingressExternal: true

    cpu: '0.25'
    memory: '0.5Gi'

    envs: [
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
}

module runner './bicep-iac/modules/containers/app.bicep' = {
  scope: resGroup

  params: {
    location: location
    name: 'nanomon-runner'
    environmentId: containerAppEnv.outputs.id
    image: '${imageRepo}/nanomon-runner:${imageTag}'

    cpu: '0.25'
    memory: '0.5Gi'

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

    envs: [
      {
        name: 'POSTGRES_DSN'
        value: postgresDSN != '' ? postgresDSN : database.outputs.dsn
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
}

output appURL string = 'https://${frontend.outputs.fqdn}/'
output dbHost string = postgresDSN != '' ? 'Unknown' : database.outputs.host
output resGroup string = resGroup.name
output postgresResName string = postgresDSN != '' ? 'Unknown' : database.outputs.name
