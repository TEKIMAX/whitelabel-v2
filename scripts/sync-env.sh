#!/bin/bash

echo "Syncing environment variables to Convex..."

if [ ! -f .env.local ]; then
    echo ".env.local not found!"
    exit 1
fi

# Iterate over each line in .env.local
while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments
    if [[ "$line" =~ ^# ]]; then
        continue
    fi
    
    # Skip empty lines
    if [[ -z "${line// }" ]]; then
        continue
    fi

    # Split key and value
    if [[ "$line" =~ = ]]; then
        key=$(echo "$line" | cut -d '=' -f 1 | xargs)
        value=$(echo "$line" | cut -d '=' -f 2- | xargs)
        
        # Remove quotes if present
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"

        # Skip VITE_ variables (frontend only)
        if [[ "$key" == VITE_* ]]; then
            continue
        fi

        # Skip specific keys we might not want (optional)
        # if [[ "$key" == "SOME_KEY" ]]; then continue; fi

        if [ -n "$key" ]; then
            echo "Setting $key..."
            npx convex env set "$key" "$value"
        fi
    fi
done < .env.local

echo "Done! Configuration synced."
