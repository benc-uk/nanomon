// ==============================================================================
// Deploy all nanomon components to Azure Container Apps 
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

// ===== Variables ============================================================

var mongoImage = 'mongo:6-jammy'

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

module network './bicep-iac/modules/network/network-multi.bicep' = {
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
    controlPlaneSubnetId: network.outputs.subnets[0].id
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

    envs: [
      {
        name: 'MONGO_URI'
        value: 'mongodb://mongo:27017'
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

    envs: [
      {
        name: 'MONGO_URI'
        value: 'mongodb://mongo:27017'
      }
      {
        name: 'MONITOR_CHANGE_INTERVAL'
        value: '30s'
      }
    ]
  }
}

module mongodb './bicep-iac/modules/containers/app.bicep' = {
  scope: resGroup
  name: 'mongodb'
  params: {
    location: location
    name: 'mongo'
    image: mongoImage
    environmentId: containerAppEnv.outputs.id

    ingressPort: 27017
    ingressExternal: false
    ingressTransport: 'tcp'

    cpu: '0.25'
    memory: '0.5Gi'
  }
}

output appURL string = 'https://${frontend.outputs.fqdn}/'
