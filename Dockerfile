# --- build stage ---
FROM node:current-alpine3.21 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci            # install deps
COPY . .
RUN npm run build     # tsc compiles into dist/

# --- runtime stage ---
FROM node:current-alpine3.21
WORKDIR /app

RUN npm install -g serverless@3.39.0

ENV AWS_REGION="us-east-1" \
    AWS_ACCESS_KEY_ID="test" \
    AWS_SECRET_ACCESS_KEY="test" \
    AWS_SSM_ENDPOINT="http://localstack:4566" \
    AWS_ENDPOINT_URL="http://localstack:4566"

COPY --from=build /app /app
EXPOSE 3000
CMD ["tail", "-f", "/dev/null"]