#!/usr/bin/env bash
set -euo pipefail

APP_REG_NAME="NanoMon"
URI_LIST="\"http://localhost:3000\""

if [[ "${1-}" =~ ^-*h(elp)?$ ]]; then
  echo -e "Usage: $(basename "$0") {extraRedirectURI}\n\nCreate Azure AD App registration for NanoMon"
  exit
fi

# Check CLI is installed
which az > /dev/null || { echo -e "💥 Error! Azure CLI is not installed. https://aka.ms/azure-cli"; exit 1; }

echo "### Creating Azure AD app registration for NanoMon..."
clientId=$(az ad app create --display-name $APP_REG_NAME --sign-in-audience AzureADandPersonalMicrosoftAccount --query appId -o tsv)

appRegId=$(az ad app show --id "$clientId" --query id -o tsv)

apiScopeJSON=$(echo '{
    "oauth2PermissionScopes": [{
      "value": "system.admin",
      "type": "User",
      "id": "4199aca0-17a5-40e1-a240-a4eade4335dd",
      "adminConsentDescription": "Allows administration of monitors in the NanoMon app",
      "adminConsentDisplayName": "NanoMon adminstrator",
      "userConsentDescription": "Allows administration of monitors in the NanoMon app",
      "userConsentDisplayName": "NanoMon adminstrator"
    }]
}' | jq .)

# Update app registration to expose API scope
echo "### Updating Azure AD app registration with exposed API scopes.."
az ad app update \
    --id "$clientId" \
    --identifier-uris api://"$clientId" \
    --set api="$apiScopeJSON"

if [ -n "${1-}" ]; then
  URI_LIST="$URI_LIST, \"$1\""
fi

echo "### Redirect URIs: $URI_LIST"

echo "### Patching app registration to allow SPA redirect URIs..."
az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications/$appRegId" \
--headers 'Content-Type=application/json' \
--body "{\"spa\":{\"redirectUris\":[$URI_LIST]}}"

echo "### Creating service principal for NanoMon..."
az ad sp create --id "$clientId" > /dev/null
spId=$(az ad sp show --id "$clientId" --query id --output tsv)

echo -e "\n### Done!\n"
echo " - Client ID: $clientId"
echo " - Tenant ID: $(az account show --query tenantId -o tsv)"
echo " - SP ID: $spId"