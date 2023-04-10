#!/usr/bin/env bash
set -euo pipefail

if [[ "${1-}" =~ ^-*h(elp)?$ ]]; then
  echo -e "Usage: $(basename "$0")\nCreate Azure AD App registration for NanoMon"
  exit
fi

# Check CLI is installed
which az > /dev/null || { echo -e "💥 Error! Azure CLI is not installed. https://aka.ms/azure-cli"; exit 1; }

echo "### Creating Azure AD app registration for NanoMon..."
clientId=$(az ad app create --display-name NanoMon --sign-in-audience AzureADandPersonalMicrosoftAccount --query appId -o tsv)

appRegId=$(az ad app show --id "$clientId" --query id -o tsv)

apiScopeJSON=$(echo '{
    "acceptMappedClaims": null,
    "knownClientApplications": [],
    "oauth2PermissionScopes": [{
          "adminConsentDescription": "Allows you to create, edit and delete monitors in the NanoMon app",
          "adminConsentDisplayName": "System adminstrator",
          "id": "4199aca0-17a5-40e1-a240-a4eade4335dd",
          "isEnabled": true,
          "type": "User",
          "userConsentDescription": "Allows you to create, edit and delete monitors in the NanoMon app",
          "userConsentDisplayName": "System adminstrator",
          "value": "system.admin"
    }],
    "preAuthorizedApplications": [],
    "requestedAccessTokenVersion": 2
}' | jq .)

# Update app registration to expose API scope
echo "### Updating Azure AD app registration with exposed API scopes.."
az ad app update \
    --id "$clientId" \
    --identifier-uris api://"$clientId" \
    --set api="$apiScopeJSON"

echo "### Patching app registration to allow SPA redirect URIs..."
az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications/$appRegId" --headers 'Content-Type=application/json' --body '{"spa":{"redirectUris":["http://localhost:3000"]}}'

echo "### Creating service principal for NanoMon..."
az ad sp create --id "$clientId" --query id --output tsv
spId=$(az ad sp show --id "$clientId" --query id --output tsv)

echo -e "\n### Done!\n"
echo " - Client ID: $clientId"
echo " - Tenant ID: $(az account show --query tenantId -o tsv)"
echo " - SP ID: $spId"