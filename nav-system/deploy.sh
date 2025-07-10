#!/bin/bash

# 导航系统部署脚本 - 适用于OpenWrt Docker环境
# 使用方法: ./deploy.sh [start|stop|restart|logs|status]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_NAME="nav-system"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 创建环境文件
create_env_file() {
    if [[ ! -f "$ENV_FILE" ]]; then
        log_info "创建环境配置文件..."
        cat > "$ENV_FILE" << EOF
# 导航系统环境配置

# JWT密钥 (请更改为随机字符串)
JWT_SECRET=$(openssl rand -base64 32)

# 端口配置
HTTP_PORT=80
HTTPS_PORT=443
APP_PORT=3000

# 时区设置
TZ=Asia/Shanghai

# 环境模式
NODE_ENV=production

# 日志级别
LOG_LEVEL=info
EOF
        log_success "环境文件创建完成: $ENV_FILE"
    else
        log_info "环境文件已存在: $ENV_FILE"
    fi
}

# 创建必要目录
create_directories() {
    log_info "创建必要的目录..."
    
    mkdir -p ssl
    mkdir -p logs
    mkdir -p data
    
    # 设置目录权限
    chmod 755 ssl logs data
    
    log_success "目录创建完成"
}

# 检查系统资源
check_system_resources() {
    log_info "检查系统资源..."
    
    # 检查内存
    TOTAL_MEM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    
    if [[ $AVAILABLE_MEM -lt 512 ]]; then
        log_warning "可用内存较少 (${AVAILABLE_MEM}MB)，建议至少512MB"
    fi
    
    # 检查磁盘空间
    AVAILABLE_DISK=$(df -m . | awk 'NR==2{print $4}')
    
    if [[ $AVAILABLE_DISK -lt 1024 ]]; then
        log_warning "可用磁盘空间较少 (${AVAILABLE_DISK}MB)，建议至少1GB"
    fi
    
    log_success "系统资源检查完成"
}

# 启动服务
start_services() {
    log_info "启动导航系统..."
    
    # 检查是否已运行
    if docker-compose ps | grep -q "Up"; then
        log_warning "服务已在运行中"
        return 0
    fi
    
    # 构建并启动服务
    docker-compose up -d --build
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    if check_service_health; then
        log_success "导航系统启动成功!"
        show_service_info
    else
        log_error "服务启动失败，请检查日志"
        docker-compose logs --tail=20
        exit 1
    fi
}

# 停止服务
stop_services() {
    log_info "停止导航系统..."
    
    docker-compose down
    
    log_success "导航系统已停止"
}

# 重启服务
restart_services() {
    log_info "重启导航系统..."
    
    stop_services
    sleep 2
    start_services
}

# 检查服务健康状态
check_service_health() {
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    return 1
}

# 显示服务信息
show_service_info() {
    echo ""
    log_success "=== 导航系统信息 ==="
    echo "🌐 访问地址: http://$(hostname -I | awk '{print $1}'):80"
    echo "🔧 API健康检查: http://$(hostname -I | awk '{print $1}'):3000/api/health"
    echo "📋 管理后台密码: password123"
    echo ""
    echo "🐳 Docker 容器状态:"
    docker-compose ps
    echo ""
}

# 显示日志
show_logs() {
    local service=$1
    
    if [[ -n "$service" ]]; then
        docker-compose logs -f "$service"
    else
        docker-compose logs -f
    fi
}

# 显示服务状态
show_status() {
    echo ""
    log_info "=== 服务状态 ==="
    docker-compose ps
    
    echo ""
    log_info "=== 系统资源使用 ==="
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    
    echo ""
    log_info "=== 健康检查 ==="
    if check_service_health; then
        log_success "✅ 服务运行正常"
    else
        log_error "❌ 服务不可用"
    fi
}

# 更新服务
update_services() {
    log_info "更新导航系统..."
    
    # 拉取最新代码
    git pull
    
    # 重新构建并启动
    docker-compose up -d --build
    
    log_success "更新完成"
}

# 备份数据
backup_data() {
    local backup_dir="backup_$(date +%Y%m%d_%H%M%S)"
    
    log_info "创建数据备份..."
    
    mkdir -p "$backup_dir"
    
    # 备份配置文件
    cp -r data logs "$backup_dir/" 2>/dev/null || true
    cp "$ENV_FILE" "$backup_dir/" 2>/dev/null || true
    
    tar -czf "${backup_dir}.tar.gz" "$backup_dir"
    rm -rf "$backup_dir"
    
    log_success "备份完成: ${backup_dir}.tar.gz"
}

# 清理资源
cleanup() {
    log_info "清理Docker资源..."
    
    # 停止服务
    docker-compose down
    
    # 清理未使用的镜像
    docker image prune -f
    
    # 清理未使用的卷
    docker volume prune -f
    
    log_success "清理完成"
}

# 显示帮助信息
show_help() {
    echo "导航系统部署脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [命令]"
    echo ""
    echo "可用命令:"
    echo "  start     启动服务"
    echo "  stop      停止服务"
    echo "  restart   重启服务"
    echo "  status    显示服务状态"
    echo "  logs      显示日志 (可选服务名)"
    echo "  update    更新服务"
    echo "  backup    备份数据"
    echo "  cleanup   清理资源"
    echo "  health    健康检查"
    echo "  help      显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start"
    echo "  $0 logs nav-system"
    echo "  $0 status"
}

# 主函数
main() {
    local command=${1:-"help"}
    
    # 切换到脚本目录
    cd "$(dirname "$0")"
    
    case "$command" in
        "start")
            check_dependencies
            create_env_file
            create_directories
            check_system_resources
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs $2
            ;;
        "update")
            update_services
            ;;
        "backup")
            backup_data
            ;;
        "cleanup")
            cleanup
            ;;
        "health")
            if check_service_health; then
                log_success "服务健康状态正常"
            else
                log_error "服务健康检查失败"
                exit 1
            fi
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 执行主函数
main "$@"