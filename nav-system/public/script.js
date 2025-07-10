// 应用状态管理
class NavigationApp {
    constructor() {
        this.apiBase = window.location.origin;
        this.navigationData = null;
        this.currentGroup = null;
        this.accessTokens = new Map(); // 存储组访问令牌
        this.searchIndex = [];
        
        this.initializeElements();
        this.bindEvents();
        this.loadNavigationData();
    }

    // 初始化DOM元素引用
    initializeElements() {
        this.elements = {
            loading: document.getElementById('loading'),
            navigationGroups: document.getElementById('navigationGroups'),
            searchInput: document.getElementById('searchInput'),
            passwordModal: document.getElementById('passwordModal'),
            passwordInput: document.getElementById('passwordInput'),
            passwordToggle: document.getElementById('passwordToggle'),
            modalError: document.getElementById('modalError'),
            closeModal: document.getElementById('closeModal'),
            cancelBtn: document.getElementById('cancelBtn'),
            verifyBtn: document.getElementById('verifyBtn'),
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toastMessage')
        };
    }

    // 绑定事件监听器
    bindEvents() {
        // 搜索功能
        this.elements.searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // 模态框事件
        this.elements.closeModal.addEventListener('click', () => {
            this.hidePasswordModal();
        });

        this.elements.cancelBtn.addEventListener('click', () => {
            this.hidePasswordModal();
        });

        this.elements.verifyBtn.addEventListener('click', () => {
            this.handlePasswordVerification();
        });

        // 密码显示/隐藏切换
        this.elements.passwordToggle.addEventListener('click', () => {
            this.togglePasswordVisibility();
        });

        // 密码输入框回车键
        this.elements.passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handlePasswordVerification();
            }
        });

        // 模态框点击外部关闭
        this.elements.passwordModal.addEventListener('click', (e) => {
            if (e.target === this.elements.passwordModal) {
                this.hidePasswordModal();
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.passwordModal.classList.contains('active')) {
                this.hidePasswordModal();
            }
            if (e.key === '/' && e.ctrlKey) {
                e.preventDefault();
                this.elements.searchInput.focus();
            }
        });
    }

    // 从后端加载导航数据
    async loadNavigationData() {
        try {
            this.showLoading();
            
            const response = await fetch(`${this.apiBase}/api/navigation`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '加载导航数据失败');
            }
            
            this.navigationData = data.groups;
            this.buildSearchIndex();
            this.renderNavigationGroups();
            
        } catch (error) {
            console.error('加载导航数据失败:', error);
            this.showToast('加载导航数据失败，请刷新页面重试', 'error');
            this.renderErrorState();
        } finally {
            this.hideLoading();
        }
    }

    // 构建搜索索引
    buildSearchIndex() {
        this.searchIndex = [];
        
        this.navigationData.forEach(group => {
            if (!group.isPasswordProtected) {
                group.links.forEach(link => {
                    this.searchIndex.push({
                        groupId: group.id,
                        groupName: group.name,
                        linkName: link.name,
                        linkDescription: link.description,
                        linkUrl: link.url,
                        searchText: `${link.name} ${link.description} ${group.name}`.toLowerCase()
                    });
                });
            }
        });
    }

    // 处理搜索
    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        
        if (!searchTerm) {
            this.renderNavigationGroups();
            return;
        }

        const filteredResults = this.searchIndex.filter(item => 
            item.searchText.includes(searchTerm)
        );

        this.renderSearchResults(filteredResults, searchTerm);
    }

    // 渲染搜索结果
    renderSearchResults(results, searchTerm) {
        if (results.length === 0) {
            this.elements.navigationGroups.innerHTML = `
                <div class="search-no-results">
                    <h3>未找到相关结果</h3>
                    <p>尝试使用其他关键词搜索</p>
                </div>
            `;
            return;
        }

        // 按组分组结果
        const groupedResults = {};
        results.forEach(result => {
            if (!groupedResults[result.groupId]) {
                groupedResults[result.groupId] = {
                    groupName: result.groupName,
                    links: []
                };
            }
            groupedResults[result.groupId].links.push(result);
        });

        let html = `<div class="search-results-header">
            <h3>搜索 "${searchTerm}" 的结果 (${results.length} 项)</h3>
        </div>`;

        Object.values(groupedResults).forEach(group => {
            html += `
                <div class="nav-group">
                    <div class="group-header">
                        <h3 class="group-title">${group.groupName}</h3>
                    </div>
                    <div class="links-grid">
                        ${group.links.map(link => `
                            <a href="${link.linkUrl}" target="_blank" class="link-item">
                                <span class="link-icon">🔗</span>
                                <div class="link-content">
                                    <div class="link-name">${this.highlightSearchTerm(link.linkName, searchTerm)}</div>
                                    <div class="link-description">${this.highlightSearchTerm(link.linkDescription, searchTerm)}</div>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        this.elements.navigationGroups.innerHTML = html;
    }

    // 高亮搜索关键词
    highlightSearchTerm(text, term) {
        if (!term) return text;
        
        const regex = new RegExp(`(${term})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // 渲染导航组
    renderNavigationGroups() {
        if (!this.navigationData) return;

        const html = this.navigationData.map(group => 
            this.renderNavigationGroup(group)
        ).join('');

        this.elements.navigationGroups.innerHTML = html;
        this.bindGroupEvents();
    }

    // 渲染单个导航组
    renderNavigationGroup(group) {
        const isProtected = group.isPasswordProtected;
        const hasAccess = this.accessTokens.has(group.id);
        const links = hasAccess ? this.getProtectedGroupLinks(group.id) : group.links;

        return `
            <div class="nav-group ${isProtected ? 'protected' : ''}" data-group-id="${group.id}">
                <div class="group-header">
                    <h3 class="group-title">
                        ${group.name}
                        ${isProtected ? '<span class="protected-icon">🔒</span>' : ''}
                    </h3>
                </div>
                <p class="group-description">${group.description}</p>
                
                ${isProtected && !hasAccess ? `
                    <button class="unlock-btn" data-group-id="${group.id}">
                        🔐 输入密码解锁
                    </button>
                ` : `
                    <div class="links-grid">
                        ${links.map(link => `
                            <a href="${link.url}" target="_blank" class="link-item">
                                <span class="link-icon">${this.getLinkIcon(link.url)}</span>
                                <div class="link-content">
                                    <div class="link-name">${link.name}</div>
                                    <div class="link-description">${link.description}</div>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    }

    // 获取链接图标
    getLinkIcon(url) {
        if (url.includes('github')) return '🐙';
        if (url.includes('google')) return '🔍';
        if (url.includes('youtube')) return '📺';
        if (url.includes('stackoverflow')) return '📚';
        if (url.includes('netflix')) return '🎬';
        if (url.includes('spotify')) return '🎵';
        if (url.includes('reddit')) return '🤖';
        if (url.includes('localhost') || url.includes('192.168')) return '⚙️';
        if (url.includes('docker')) return '🐳';
        if (url.includes('vscode')) return '💻';
        if (url.includes('codepen')) return '✏️';
        return '🔗';
    }

    // 绑定组相关事件
    bindGroupEvents() {
        const unlockButtons = document.querySelectorAll('.unlock-btn');
        unlockButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const groupId = parseInt(e.target.dataset.groupId);
                this.showPasswordModal(groupId);
            });
        });
    }

    // 显示密码模态框
    showPasswordModal(groupId) {
        this.currentGroup = groupId;
        this.elements.passwordInput.value = '';
        this.elements.modalError.classList.remove('show');
        this.elements.passwordModal.classList.add('active');
        
        // 聚焦到密码输入框
        setTimeout(() => {
            this.elements.passwordInput.focus();
        }, 100);
    }

    // 隐藏密码模态框
    hidePasswordModal() {
        this.elements.passwordModal.classList.remove('active');
        this.currentGroup = null;
        this.elements.passwordInput.value = '';
        this.elements.modalError.classList.remove('show');
    }

    // 切换密码可见性
    togglePasswordVisibility() {
        const input = this.elements.passwordInput;
        const toggle = this.elements.passwordToggle;
        
        if (input.type === 'password') {
            input.type = 'text';
            toggle.textContent = '🙈';
        } else {
            input.type = 'password';
            toggle.textContent = '👁️';
        }
    }

    // 处理密码验证
    async handlePasswordVerification() {
        const password = this.elements.passwordInput.value.trim();
        
        if (!password) {
            this.showModalError('请输入密码');
            return;
        }

        if (!this.currentGroup) {
            this.showModalError('无效的组ID');
            return;
        }

        try {
            this.elements.verifyBtn.disabled = true;
            this.elements.verifyBtn.textContent = '验证中...';
            
            const response = await fetch(`${this.apiBase}/api/auth/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    groupId: this.currentGroup,
                    password: password
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || '验证失败');
            }

            // 存储访问令牌
            this.accessTokens.set(this.currentGroup, {
                token: data.token,
                expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24小时
            });

            // 获取受保护的组内容
            await this.loadProtectedGroupContent(this.currentGroup);
            
            this.hidePasswordModal();
            this.showToast('验证成功，内容已解锁！', 'success');
            
            // 重新渲染页面
            this.renderNavigationGroups();
            
        } catch (error) {
            console.error('密码验证失败:', error);
            this.showModalError(error.message);
        } finally {
            this.elements.verifyBtn.disabled = false;
            this.elements.verifyBtn.textContent = '验证';
        }
    }

    // 加载受保护组的内容
    async loadProtectedGroupContent(groupId) {
        try {
            const tokenData = this.accessTokens.get(groupId);
            if (!tokenData) {
                throw new Error('未找到访问令牌');
            }

            const response = await fetch(`${this.apiBase}/api/navigation/protected/${groupId}`, {
                headers: {
                    'Authorization': `Bearer ${tokenData.token}`
                }
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || '获取内容失败');
            }

            // 更新本地导航数据
            const groupIndex = this.navigationData.findIndex(g => g.id === groupId);
            if (groupIndex !== -1) {
                this.navigationData[groupIndex].links = data.group.links;
            }

        } catch (error) {
            console.error('加载受保护内容失败:', error);
            this.accessTokens.delete(groupId);
            throw error;
        }
    }

    // 获取受保护组的链接
    getProtectedGroupLinks(groupId) {
        const group = this.navigationData.find(g => g.id === groupId);
        return group ? group.links : [];
    }

    // 显示模态框错误信息
    showModalError(message) {
        this.elements.modalError.textContent = message;
        this.elements.modalError.classList.add('show');
    }

    // 显示消息提示
    showToast(message, type = 'success') {
        this.elements.toastMessage.textContent = message;
        this.elements.toast.className = `toast ${type}`;
        this.elements.toast.classList.add('show');

        setTimeout(() => {
            this.elements.toast.classList.remove('show');
        }, 4000);
    }

    // 显示加载状态
    showLoading() {
        this.elements.loading.classList.remove('hide');
    }

    // 隐藏加载状态
    hideLoading() {
        setTimeout(() => {
            this.elements.loading.classList.add('hide');
        }, 500);
    }

    // 渲染错误状态
    renderErrorState() {
        this.elements.navigationGroups.innerHTML = `
            <div class="error-state">
                <h3>😔 加载失败</h3>
                <p>无法连接到服务器，请检查网络连接并刷新页面</p>
                <button class="btn btn-primary" onclick="window.location.reload()">
                    刷新页面
                </button>
            </div>
        `;
    }

    // 清理过期的令牌
    cleanupExpiredTokens() {
        const now = Date.now();
        for (const [groupId, tokenData] of this.accessTokens.entries()) {
            if (tokenData.expiresAt < now) {
                this.accessTokens.delete(groupId);
            }
        }
    }
}

// CSS样式补充（动态添加）
const additionalStyles = `
    .search-no-results {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--text-secondary);
    }

    .search-no-results h3 {
        margin-bottom: 0.5rem;
        color: var(--text-primary);
    }

    .search-results-header {
        margin-bottom: 2rem;
        text-align: center;
    }

    .search-results-header h3 {
        color: var(--text-primary);
        font-weight: 600;
    }

    .error-state {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--text-secondary);
    }

    .error-state h3 {
        margin-bottom: 1rem;
        color: var(--text-primary);
        font-size: 1.5rem;
    }

    .error-state p {
        margin-bottom: 2rem;
        font-size: 1.1rem;
    }

    mark {
        background: rgba(37, 99, 235, 0.2);
        color: var(--primary-color);
        padding: 0.1em 0.2em;
        border-radius: 0.25rem;
        font-weight: 500;
    }
`;

// 添加动态样式
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    window.navigationApp = new NavigationApp();
    
    // 定期清理过期令牌
    setInterval(() => {
        window.navigationApp.cleanupExpiredTokens();
    }, 5 * 60 * 1000); // 每5分钟检查一次
});

// 错误处理
window.addEventListener('error', (event) => {
    console.error('应用错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的 Promise 拒绝:', event.reason);
});