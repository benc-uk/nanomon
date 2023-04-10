// ==============================================================================
// Deploy as standalone Azure Container Instance, connected to existing database
// This was an experiment to see if it was possible to run the app as a single ACI
// ==============================================================================

targetScope = 'resourceGroup'

@description('Name used for instance')
param appName string

@description('Azure region for all resources')
param location string = 'uksouth'

@description('Connect to external MongoDB instance')
@secure()
param externalMongoDbURI string

@description('After deployment, set this')
param apiEndpoint string = '/api'

resource containerInstance 'Microsoft.ContainerInstance/containerGroups@2022-09-01' = {
  name: appName
  location: location
  properties: {
    osType: 'Linux'
    containers: [
      {
        name: 'nanomon'
        properties: {
          image: 'ghcr.io/benc-uk/nanomon-standalone:latest'

          resources: {
            requests: {
              memoryInGB: 1
              cpu: 1
            }
          }

          ports: [
            {
              port: 8000
              protocol: 'TCP'
            }
            {
              port: 8001
              protocol: 'TCP'
            }
          ]

          environmentVariables: [
            {
              name: 'NO_MONGO'
              value: 'true'
            }
            {
              name: 'MONGO_URI'
              value: externalMongoDbURI
            }
            {
              name: 'API_ENDPOINT'
              value: apiEndpoint
            }
          ]
        }
      }
    ]

    ipAddress: {
      ports: [
        {
          port: 8000
          protocol: 'TCP'
        }
        {
          port: 8001
          protocol: 'TCP'
        }
      ]
      type: 'Public'
      dnsNameLabel: appName
    }

    restartPolicy: 'always'
  }
}
