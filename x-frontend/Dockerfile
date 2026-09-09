FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# Vite nướng biến env vào bundle lúc BUILD, không đọc được lúc chạy — nên URL công khai
# phải truyền vào từ đây (xem .env.production ở root).
ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_BASE_URL=$VITE_WS_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /src/dist /usr/share/nginx/html
# Cấu hình nginx mount từ compose/nginx/spa.conf — hai frontend dùng chung một file.
EXPOSE 80
