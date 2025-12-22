# 使用官方Node.js运行时作为基础镜像
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json（如果存在）
COPY package*.json ./

# 复制环境变量文件（如果存在）
COPY .env.production* ./ 2>/dev/null || echo "No .env.production file found"

# 安装依赖
RUN npm ci

# 复制项目文件
COPY . .

# 构建生产版本
# 如果存在 .env.production 文件，会在构建时使用
RUN npm run build

# 使用nginx作为生产服务器
FROM nginx:alpine

# 复制构建产物到nginx目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制自定义nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]