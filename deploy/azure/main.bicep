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

// Note: Setting this, will skip the deployment of MongoDB container
// The VNet will also be skipped, it's only required for the MongoDB TCP ingress
@description('When set, connect to external existing MongoDB instance')
@secure()
param externalMongoDbURI string = ''

@description('Force the runner to switch to database polling mode')
param usePolling bool = false
param pollingInterval string = '5m'

@description('Alerting parameters, all optional')
param alertFrom string = ''
param alertTo string = ''
param alertMailHost string = ''
param alertMailPort string = ''
@secure()
#disable-next-line secure-parameter-default
param alertPassword string = '__ignored_default__'
param alertFailCount int = 3

// ===== Variables ============================================================

// ===== Modules & Resources ==================================================

resource resGroup 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: appName
  location: location
}

module logAnalytics './bicep-iac/modules/monitoring/log-analytics.bicep' = {
  scope: resGroup
  name: 'monitoring'
  params: {
    location: location
    name: 'logs'
  }
}

module network './bicep-iac/modules/network/network-multi.bicep' = if (externalMongoDbURI == '') {
  scope: resGroup
  name: 'network'
  params: {
    location: location
    name: 'app-vnet'
    addressSpace: '10.75.0.0/16'
    subnets: [
      {
        name: 'controlplane'
        cidr: '10.75.0.0/21'
      }
    ]
  }
}

module containerAppEnv './bicep-iac/modules/containers/app-env.bicep' = {
  scope: resGroup
  name: 'containerAppEnv'
  params: {
    location: location
    name: 'app-environment'
    logAnalyticsName: logAnalytics.outputs.name
    logAnalyticsResGroup: resGroup.name
    controlPlaneSubnetId: externalMongoDbURI == '' ? network.outputs.subnets[0].id : ''
  }
}

module api './bicep-iac/modules/containers/app.bicep' = {
  scope: resGroup
  name: 'nanomon-api'
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
        name: 'mongo-uri'
        value: externalMongoDbURI == '' ? 'mongodb://mongo:27017' : externalMongoDbURI
      }
    ]

    envs: [
      {
        name: 'MONGO_URI'
        secretRef: 'mongo-uri'
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
  name: 'nanomon-frontend'
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
  name: 'nanomon-runner'
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
        name: 'mongo-uri'
        value: externalMongoDbURI == '' ? 'mongodb://mongo:27017' : externalMongoDbURI
      }
    ]

    envs: [
      {
        name: 'MONGO_URI'
        secretRef: 'mongo-uri'
      }
      {
        name: 'USE_POLLING'
        value: toLower(string(usePolling))
      }
      {
        name: 'POLLING_INTERVAL'
        value: pollingInterval
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

module mongodb './bicep-iac/modules/containers/app.bicep' = if (externalMongoDbURI == '') {
  scope: resGroup
  name: 'mongodb'
  params: {
    location: location
    name: 'mongo'
    image: 'bitnami/mongodb:6.0'
    environmentId: containerAppEnv.outputs.id

    ingressPort: 27017
    ingressExternal: false
    ingressTransport: 'tcp'

    cpu: '0.25'
    memory: '0.5Gi'

    // Configure MongoDB as replica set, but a single replica
    // This means we get change stream support
    envs: [
      {
        name: 'MONGODB_REPLICA_SET_MODE'
        value: 'primary'
      }
      {
        name: 'MONGODB_ADVERTISED_HOSTNAME'
        value: 'mongo'
      }
      {
        name: 'ALLOW_EMPTY_PASSWORD'
        value: 'yes'
      }
    ]
  }
}

output appURL string = 'https://${frontend.outputs.fqdn}/'
