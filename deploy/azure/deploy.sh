#!/usr/bin/env bash

# =================================================================
# Deployment wrapper script for deploying the Bicep template 
# =================================================================

set -euo pipefail

if [[ "${TRACE-0}" == "1" ]]; then set -o xtrace; fi

if [[ "${1-}" =~ ^-*h(elp)?$ ]]; then
  echo -e "Usage: $(basename "$0") <parameterFile> <azureRegion>\nDeploy NanoMon to Azure using Bicep"
  exit
fi

# Easy way to make files are relative to the script
cd "$(dirname "$0")"

# Check CLI is installed
which az > /dev/null || { echo -e "💥 Error! Azure CLI is not installed. https://aka.ms/azure-cli"; exit 1; }
az bicep version > /dev/null || { echo -e "💥 Error! Bicep extension not installed in Azure CLI"; exit 1; }
# Check docker is installed
which docker > /dev/null || { echo -e "💥 Error! Docker is not installed. It's needed to run psql after deployment"; exit 1; }

paramFile=${1:-deploy.bicepparam}
location=${2:-uksouth}

# check .bicepparam exists
if [ ! -f "$paramFile" ]; then
  echo -e "💥 \e[31mParameter file '${paramFile}' not found!\e[0m"
  exit 1
fi

SUB_NAME=$(az account show --query name -o tsv)
test "$SUB_NAME" || { echo -e "💥 \e[31mYou are not logged into Azure!"; exit 1; }
TENANT_ID=$(az account show --query tenantId -o tsv)

echo -e "\e[32m⛅ Azure details: \e[0m"
echo -e " 🔑 \e[34mSubscription: \e[33m$SUB_NAME\e[0m"
echo -e " 🌐 \e[34mTenant:       \e[33m$TENANT_ID\e[0m"

if [[ "${NOPROMPT-0}" != "1" ]]; then 
  read -r -p "🤔 Are these details are correct? [Y/n] " response
  response=${response,,}   
  if [[ ! "$response" =~ ^(yes|y|"")$ ]]; then echo -e "\e[31m👋 Exiting...\e[0m"; exit 1; fi
fi

# Add your public IP to the database firewall rules
myIP=$(curl -s https://api.ipify.org)

echo -e "\n🚀 Deploying NanoMon to Azure..."
az deployment sub create --template-file main.bicep --location "${location}" \
  --parameters "${paramFile}" allowAccessForIP="$myIP" --name nanomon

appUrl=$(az deployment sub show --name nanomon --query "properties.outputs.appURL.value" -o tsv)
dbHost=$(az deployment sub show --name nanomon --query "properties.outputs.dbHost.value" -o tsv)

set +e
postgresDSN=$(grep -E '^param postgresDSN' "$paramFile" 2>/dev/null | sed -E "s/^param postgresDSN\s*=\s*'([^']*)'.*/\1/" || echo "")
if [[ -n "$postgresDSN" ]]; then
  echo -e "⚓ You are using an external database!"
  echo -e "💡 You will need to manually run the SQL in sql/init/nanomon_init.sql to setup your database"
  echo -e "\n\e[32m🎉 NanoMon was deployed to Azure!\e[0m"
  echo -e "\e[34m🌐 App URL: \e[33m$appUrl\e[0m\n"
  exit 0
fi

postgresPassword=$(grep -E '^param postgresPassword' "$paramFile" | awk -F '=' '{print $2}' | tr -d '[:space:]' | tr -d "'\"")
if [[ -z "$postgresPassword" ]]; then
  echo -e "💥 \e[31mDatabase password not found in parameter file!\e[0m"
  exit 1
fi
set -e

echo -e "🎈 Initializing the database using SQL init script"
sqlDir=$(realpath "$(dirname "$0")/../../sql/init")
docker run -it --rm -v "$sqlDir":/root -e PGPASSWORD="$postgresPassword" postgres psql -h "$dbHost" -U citus -d nanomon -f /root/nanomon_init.sql

echo -e "\n\e[32m🎉 NanoMon was deployed to Azure!\e[0m"
echo -e "\e[34m🌐 App URL: \e[33m$appUrl\e[0m\n"
