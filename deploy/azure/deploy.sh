#!/usr/bin/env bash
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
  response=${response,,}    # tolower
  if [[ ! "$response" =~ ^(yes|y|"")$ ]]; then echo -e "\e[31m👋 Exiting...\e[0m"; exit 1; fi
fi

echo -e "\e[32m🚀 Deploying NanoMon to Azure...\e[0m"
az deployment sub create --template-file main.bicep --location "${location}" --parameters "${paramFile}"