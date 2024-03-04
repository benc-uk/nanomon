// =================================================================================
// Deploy as Azure Container Instance using the special "standalone" image
// This mode will not support auth (no HTTPS), only use for testing
// =================================================================================

targetScope = 'resourceGroup'

@description('Name used for instance')
param appName string

@description('Azure region for all resources')
param location string = 'uksouth'

@description('Version of container image to deploy')
param imageTag string = '0.0.10'

resource containerInstance 'Microsoft.ContainerInstance/containerGroups@2022-09-01' = {
  name: appName
  location: location
  properties: {
    osType: 'Linux'
    containers: [
      {
        name: 'nanomon'
        properties: {
          image: 'ghcr.io/benc-uk/nanomon-standalone:${imageTag}'

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
              name: 'API_ENDPOINT'
              value: 'http://${appName}.${location}.azurecontainer.io:8000/api'
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
