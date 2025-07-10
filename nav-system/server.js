const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 中间件设置
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 限制登录尝试次数
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次尝试
  message: { success: false, message: '尝试次数过多，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 导航数据配置
const navigationData = {
  groups: [
    {
      id: 1,
      name: "常用工具",
      description: "日常使用的实用工具",
      isPasswordProtected: false,
      links: [
        { name: "Google", url: "https://www.google.com", description: "搜索引擎" },
        { name: "GitHub", url: "https://github.com", description: "代码托管平台" },
        { name: "Stack Overflow", url: "https://stackoverflow.com", description: "程序员问答" },
        { name: "MDN Web Docs", url: "https://developer.mozilla.org", description: "Web开发文档" }
      ]
    },
    {
      id: 2,
      name: "娱乐休闲",
      description: "休闲娱乐相关网站",
      isPasswordProtected: false,
      links: [
        { name: "YouTube", url: "https://www.youtube.com", description: "视频平台" },
        { name: "Reddit", url: "https://www.reddit.com", description: "社区论坛" },
        { name: "Netflix", url: "https://www.netflix.com", description: "视频流媒体" },
        { name: "Spotify", url: "https://www.spotify.com", description: "音乐平台" }
      ]
    },
    {
      id: 3,
      name: "管理后台",
      description: "系统管理和配置工具",
      isPasswordProtected: true,
      password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password123
      links: [
        { name: "OpenWrt 管理界面", url: "http://192.168.1.1", description: "路由器管理" },
        { name: "Docker 管理", url: "http://localhost:9000", description: "容器管理" },
        { name: "系统监控", url: "http://localhost:3001", description: "系统状态监控" },
        { name: "日志查看", url: "http://localhost:3002", description: "系统日志" }
      ]
    },
    {
      id: 4,
      name: "开发工具",
      description: "开发相关的工具和资源",
      isPasswordProtected: false,
      links: [
        { name: "VS Code Web", url: "https://vscode.dev", description: "在线代码编辑器" },
        { name: "CodePen", url: "https://codepen.io", description: "前端代码试验场" },
        { name: "Can I Use", url: "https://caniuse.com", description: "浏览器兼容性查询" },
        { name: "JSON Formatter", url: "https://jsonformatter.org", description: "JSON格式化工具" }
      ]
    }
  ]
};

// 验证JWT令牌的中间件
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: '未提供访问令牌' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '无效的访问令牌' });
  }
};

// API路由

// 获取所有公开的导航组
app.get('/api/navigation', (req, res) => {
  const publicGroups = navigationData.groups.map(group => {
    if (group.isPasswordProtected) {
      return {
        id: group.id,
        name: group.name,
        description: group.description,
        isPasswordProtected: true,
        links: [] // 不返回受保护的链接
      };
    }
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      isPasswordProtected: false,
      links: group.links
    };
  });

  res.json({ success: true, groups: publicGroups });
});

// 密码验证
app.post('/api/auth/verify', loginLimiter, async (req, res) => {
  const { groupId, password } = req.body;

  if (!groupId || !password) {
    return res.status(400).json({ 
      success: false, 
      message: '请提供组ID和密码' 
    });
  }

  const group = navigationData.groups.find(g => g.id === parseInt(groupId));
  
  if (!group || !group.isPasswordProtected) {
    return res.status(404).json({ 
      success: false, 
      message: '组不存在或不需要密码' 
    });
  }

  try {
    const isValidPassword = await bcrypt.compare(password, group.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: '密码错误' 
      });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { groupId: group.id, groupName: group.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true, 
      message: '验证成功',
      token,
      expiresIn: '24h'
    });

  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误' 
    });
  }
});

// 获取受保护的组内容
app.get('/api/navigation/protected/:groupId', verifyToken, (req, res) => {
  const groupId = parseInt(req.params.groupId);
  
  if (req.user.groupId !== groupId) {
    return res.status(403).json({ 
      success: false, 
      message: '无权访问此组' 
    });
  }

  const group = navigationData.groups.find(g => g.id === groupId);
  
  if (!group || !group.isPasswordProtected) {
    return res.status(404).json({ 
      success: false, 
      message: '组不存在' 
    });
  }

  res.json({ 
    success: true, 
    group: {
      id: group.id,
      name: group.name,
      description: group.description,
      links: group.links
    }
  });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 服务静态文件
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Navigation server is running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});