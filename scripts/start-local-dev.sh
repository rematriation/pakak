#!/usr/bin/env bash
set -e

docker-compose up -d --build

echo "Waiting for LocalStack to start..."
until docker exec localstack awslocal sts get-caller-identity &> /dev/null; do
  printf "."
  sleep 2
done
echo "LocalStack is ready."

echo "Waiting for pakak-app container to start..."
while [ "$(docker inspect -f '{{.State.Running}}' pakak-app)" != "true" ]; do
  printf "."
  sleep 2
done
echo "pakak-app is running."

echo "Seeding dummy parameters into SSM..."
docker exec localstack awslocal ssm put-parameter \
  --name "/pakak/dev/TWILIO_NUMBER" \
  --value "+15550001111" \
  --type "String" \
  --overwrite

docker exec localstack awslocal ssm put-parameter \
  --name "/pakak/dev/TWILIO_SID" \
  --value "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" \
  --type "String" \
  --overwrite

docker exec localstack awslocal ssm put-parameter \
  --name "/pakak/dev/TWILIO_TOKEN" \
  --value "dummy_auth_token" \
  --type "String" \
  --overwrite
echo "Dummy parameters created/updated."

echo "Verifying dummy SSM parameters..."
docker exec localstack awslocal ssm get-parameter --name "/pakak/dev/TWILIO_NUMBER"
docker exec localstack awslocal ssm get-parameter --name "/pakak/dev/TWILIO_SID"
docker exec localstack awslocal ssm get-parameter --name "/pakak/dev/TWILIO_TOKEN"
echo "Verification complete."

echo "Deploying to LocalStack (using serverless)…"
docker exec \
  -e AWS_REGION="us-east-1" \
  -e AWS_ACCESS_KEY_ID="test" \
  -e AWS_SECRET_ACCESS_KEY="test" \
  -e AWS_SSM_ENDPOINT="http://localstack:4566" \
  -e AWS_ENDPOINT_URL="http://localstack:4566" \
  pakak-app \
  sh -c "serverless deploy --stage dev"
echo "Deployment to LocalStack complete."

echo ""
echo "Hit local endpoint: http://localhost:3000/dev/webhook"