#!/bin/bash
set -e

# Backend Deployment Script
# Deploys LLM_BACKEND to Google Cloud Run

echo "🚀 Deploying LLM_BACKEND to Google Cloud Run..."
gcloud run deploy llm-backend --source ./LLM_BACKEND --region us-central1

echo "✅ Deployment complete!"
