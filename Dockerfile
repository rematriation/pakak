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
COPY --from=build /app /app
EXPOSE 3000
CMD ["npm", "run", "offline"]