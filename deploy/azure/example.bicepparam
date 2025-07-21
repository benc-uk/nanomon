// ============================================================================================
// Example parameters for Azure deployment
// Copy this file to your own `deploy.bicepparam` then uncomment parameters as needed
// ============================================================================================

using './main.bicep'

param appName = 'nanomon'
param imageTag = 'latest'

// Admin password for the new PostgreSQL database
param postgresPassword = '__CHANGE_ME__'

// Only set this when using an external database
//param postgresDSN = 'host=__CHANGE_ME__ port=5432 dbname=nanomon user=__CHANGE_ME__ sslmode=require'

// Uncomment these if you want to ena
//param authClientId = ''
//param authTenant = ''

// Uncomment these if you want to enable email alerts
//param alertFailCount = 3
//param alertFrom = '__CHANGE_ME__'
//param alertTo = '__CHANGE_ME__'
//param alertPassword = '__CHANGE_ME__'
