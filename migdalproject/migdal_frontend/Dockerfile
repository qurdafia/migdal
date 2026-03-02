# Stage 1: Build the React App
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.25-alpine
# Copy the compiled React files from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html
