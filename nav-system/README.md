# 智能导航中心

一个现代化的网址导航系统，专为 OpenWrt 路由器环境设计，支持密码保护的分组功能。

## 🌟 特性

- **📂 分组管理**: 将网址按类别分组管理
- **🔐 密码保护**: 支持为特定分组设置密码保护
- **🔍 智能搜索**: 快速搜索网址和描述
- **📱 响应式设计**: 适配手机、平板和桌面设备
- **🚀 高性能**: 基于 Node.js + Express，轻量高效
- **🐳 Docker 部署**: 完美适配 OpenWrt Docker 环境
- **🔒 安全防护**: JWT 认证 + 请求限制

## 📋 系统要求

### 硬件要求
- **内存**: 建议 512MB 以上
- **存储**: 建议 1GB 以上可用空间
- **CPU**: ARM/x86/x64 架构

### 软件要求
- **OpenWrt**: 19.07+ 或更新版本
- **Docker**: 已安装并运行
- **Docker Compose**: v1.25+ 或更新版本

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <project-url>
cd nav-system
```

### 2. 使用部署脚本（推荐）

```bash
# 给脚本执行权限
chmod +x deploy.sh

# 启动服务
./deploy.sh start
```

### 3. 手动部署

```bash
# 创建环境文件
cp .env.example .env

# 编辑配置
vi .env

# 启动服务
docker-compose up -d
```

## 📖 详细部署说明

### 环境配置

创建 `.env` 文件并配置以下变量：

```bash
# JWT密钥 (请设置为随机字符串)
JWT_SECRET=your-super-secret-jwt-key-change-this

# 端口配置
HTTP_PORT=80
HTTPS_PORT=443
APP_PORT=3000

# 时区设置
TZ=Asia/Shanghai

# 环境模式
NODE_ENV=production
```

### Docker Compose 配置

系统包含两个主要服务：

1. **nav-system**: 主应用容器
2. **nginx**: 反向代理（可选）

### 资源限制

为了适应 OpenWrt 环境，已设置资源限制：

- **应用容器**: 最大 256MB 内存，0.5 CPU
- **Nginx 容器**: 最大 64MB 内存，0.2 CPU

## 🔧 配置说明

### 导航组配置

在 `server.js` 中的 `navigationData` 对象中配置导航组：

```javascript
const navigationData = {
  groups: [
    {
      id: 1,
      name: "常用工具",
      description: "日常使用的实用工具",
      isPasswordProtected: false,
      links: [
        { 
          name: "Google", 
          url: "https://www.google.com", 
          description: "搜索引擎" 
        }
        // ... 更多链接
      ]
    },
    {
      id: 3,
      name: "管理后台",
      description: "系统管理和配置工具",
      isPasswordProtected: true,
      password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password123
      links: [
        // ... 受保护的链接
      ]
    }
  ]
};
```

### 密码设置

受保护组的密码使用 bcrypt 加密。要生成新密码：

```javascript
const bcrypt = require('bcryptjs');
const password = 'your-new-password';
const hash = bcrypt.hashSync(password, 10);
console.log(hash); // 将此值设置为密码字段
```

默认管理后台密码：`password123`

## 🛠️ 管理命令

### 使用部署脚本

```bash
# 启动服务
./deploy.sh start

# 停止服务
./deploy.sh stop

# 重启服务
./deploy.sh restart

# 查看状态
./deploy.sh status

# 查看日志
./deploy.sh logs
./deploy.sh logs nav-system  # 指定服务

# 健康检查
./deploy.sh health

# 更新服务
./deploy.sh update

# 备份数据
./deploy.sh backup

# 清理资源
./deploy.sh cleanup
```

### 直接使用 Docker Compose

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f

# 重新构建
docker-compose build --no-cache
```

## 🌐 访问应用

服务启动后，可通过以下地址访问：

- **主应用**: `http://路由器IP`
- **API健康检查**: `http://路由器IP:3000/api/health`

## 📱 使用说明

### 基本功能

1. **浏览导航**: 在主页面查看所有公开的导航组
2. **搜索网站**: 使用顶部搜索框快速查找网站
3. **访问链接**: 点击链接在新标签页打开网站

### 密码保护功能

1. 对于受保护的组，点击"输入密码解锁"按钮
2. 在弹出的对话框中输入密码
3. 验证成功后，该组的内容将显示 24 小时
4. 密码会存储在浏览器中，无需重复输入

### 快捷键

- `Ctrl + /`: 快速聚焦到搜索框
- `Esc`: 关闭密码输入对话框

## 🔐 安全特性

- **JWT 认证**: 受保护组使用 JWT 令牌验证
- **密码加密**: 所有密码使用 bcrypt 安全存储
- **请求限制**: 防止暴力破解攻击
- **XSS 防护**: 内置跨站脚本攻击防护
- **CSRF 保护**: 跨站请求伪造防护

## 🔧 故障排除

### 常见问题

**1. 服务启动失败**
```bash
# 检查日志
./deploy.sh logs

# 检查端口占用
netstat -tulpn | grep :80
netstat -tulpn | grep :3000
```

**2. 无法访问应用**
```bash
# 检查服务状态
./deploy.sh status

# 检查防火墙设置
iptables -L | grep 80
```

**3. 内存不足**
```bash
# 查看内存使用
free -h

# 减少资源限制
vi docker-compose.yml
```

**4. 磁盘空间不足**
```bash
# 清理 Docker 资源
./deploy.sh cleanup

# 查看磁盘使用
df -h
```

### 日志查看

```bash
# 应用日志
docker-compose logs nav-system

# Nginx 日志
docker-compose logs nginx

# 实时日志
docker-compose logs -f
```

## 🔄 更新升级

```bash
# 拉取最新代码
git pull

# 重新构建并部署
./deploy.sh update

# 或手动操作
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📊 监控

### 健康检查

系统提供多个健康检查端点：

- **应用健康**: `GET /api/health`
- **Nginx 健康**: `GET /nginx-health`

### 性能监控

```bash
# 查看容器资源使用
docker stats

# 查看系统资源
./deploy.sh status
```

## 🛡️ 生产环境建议

1. **更改默认密码**: 修改所有受保护组的默认密码
2. **设置强 JWT 密钥**: 使用随机生成的强密钥
3. **启用 HTTPS**: 配置 SSL 证书
4. **设置防火墙**: 限制不必要的端口访问
5. **定期备份**: 使用 `./deploy.sh backup` 备份数据
6. **监控日志**: 定期检查应用和访问日志

## 📝 自定义配置

### 添加新的导航组

在 `server.js` 中添加新的组配置：

```javascript
{
  id: 5,  // 唯一ID
  name: "新分组",
  description: "分组描述",
  isPasswordProtected: false,  // 或 true
  password: "加密后的密码",  // 如果需要密码保护
  links: [
    {
      name: "网站名称",
      url: "https://example.com",
      description: "网站描述"
    }
  ]
}
```

### 修改样式

编辑 `public/style.css` 文件来自定义界面样式。

### 扩展功能

应用使用模块化设计，可以轻松扩展：

- 添加新的 API 端点
- 实现用户管理
- 集成外部认证
- 添加统计功能

## 📄 API 文档

### 公开端点

- `GET /api/navigation` - 获取所有公开导航组
- `GET /api/health` - 健康检查

### 认证端点

- `POST /api/auth/verify` - 验证组密码
- `GET /api/navigation/protected/:groupId` - 获取受保护组内容

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 📞 支持

如果遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查 GitHub Issues
3. 提交新的 Issue

---

**注意**: 本系统专为 OpenWrt 环境优化，在其他环境中可能需要调整配置。