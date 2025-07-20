# Deploy to Azure

A Bicep template & deployment bash script is provided that deploys all of NanoMon using [Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/overview)

Ensure you are on the latest version of the Azure CLI.

Make a copy of `example.bicepparam` if you wish and modify the parameters, at a minimum you will need to set the `postgresPassword` parameter to a secure password.

## Running Deployment

First fetch/update the latest sub-modules required for the templates

```
git submodule update --init --recursive
```

Then deploy using the bash helper script

```bash
cd deploy/azure
./deploy.sh myparams.bicepparam
```

The script will attempt to automate the entire deployment process, including:

- Creating a resource group
- Getting your public IP address so that it can be added to the PostgreSQL firewall rules
- Deploying the Bicep template with the parameters provided
- Running the initial SQL setup script to create the required tables and triggers. Note for this it uses docker to run the `psql` command, so ensure you have Docker installed.

At end of the deployment, you should see a message with the URL of the NanoMon frontend.

### Resources

- Container App x3 (API, frontend and runner)
- Container Apps Environment
- Azure Cosmos DB for PostgreSQL Cluster (smallest burstable tier)
- Log Analytics workspace

## Notes

By default the template will deploy a Azure Cosmos DB for PostgreSQL Cluster with a new database and user. If you want to use an existing database, set the `postgresDSN` parameter in your `my-params.bicepparam` file. When using an external database, you must also set the `postgresPassword` parameter to the password of the existing database user.

When using an external database, you must also ensure that the database is accessible from the Azure Container Apps environment. This may involve configuring firewall rules or VNet integration. It is also your responsibility to run the initial SQL setup script to create the required tables and triggers. This is located in `sql/init/nanomon_init.sql`

If you want to enable authentication, set the `authClientId` and `authTenant` parameters in your `my-params.bicepparam` file. You will also need to configure the EntraID application with the correct redirect URIs.
