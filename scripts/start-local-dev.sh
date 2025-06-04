#!/usr/bin/env bash
set -e

# 1) Build and start Docker Compose (LocalStack, Mongo, and App)
docker-compose up -d --build

# 2) Wait for LocalStack to be healthy
echo "Waiting for LocalStack to start..."
until docker exec localstack awslocal sts get-caller-identity &> /dev/null; do
  printf "."
  sleep 2
done
echo "✅ LocalStack is ready."

# 3) Wait for nalukataq-app container to start
echo "Waiting for nalukataq-app container to start..."
while [ "$(docker inspect -f '{{.State.Running}}' nalukataq-app)" != "true" ]; do
  printf "."
  sleep 1
done
echo "✅ nalukataq-app is running."

# 4) Seed dummy parameters into LocalStack's SSM
echo "Seeding dummy parameters into SSM..."
docker exec localstack awslocal ssm put-parameter \
  --name "/nalukataq/dev/TWILIO_NUMBER" \
  --value "+15550001111" \
  --type "String" \
  --overwrite

docker exec localstack awslocal ssm put-parameter \
  --name "/nalukataq/dev/TWILIO_SID" \
  --value "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" \
  --type "String" \
  --overwrite

docker exec localstack awslocal ssm put-parameter \
  --name "/nalukataq/dev/TWILIO_TOKEN" \
  --value "dummy_auth_token" \
  --type "String" \
  --overwrite
echo "✅ Dummy parameters created/updated."

# 5) (Optional) Verify that the parameters exist in LocalStack
echo "Verifying dummy SSM parameters..."
docker exec localstack awslocal ssm get-parameter --name "/nalukataq/dev/TWILIO_NUMBER"
docker exec localstack awslocal ssm get-parameter --name "/nalukataq/dev/TWILIO_SID"
docker exec localstack awslocal ssm get-parameter --name "/nalukataq/dev/TWILIO_TOKEN"
echo "✅ Verification complete."

# 6) Deploy the Serverless service into LocalStack, forcing AWS SDK calls to LocalStack
echo "Deploying to LocalStack (using serverless)…"
docker exec \
  -e AWS_REGION="us-east-1" \
  -e AWS_ACCESS_KEY_ID="test" \
  -e AWS_SECRET_ACCESS_KEY="test" \
  -e AWS_SSM_ENDPOINT="http://localstack:4566" \
  -e AWS_ENDPOINT_URL="http://localstack:4566" \
  nalukataq-app \
  sh -c "serverless deploy --stage dev"
echo "✅ Deployment to LocalStack complete."

echo ""
echo "You can now hit your local endpoint at: http://localhost:3000/dev/webhook"