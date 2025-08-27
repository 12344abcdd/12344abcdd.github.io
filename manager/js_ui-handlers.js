// UI 处理模块 - 包含时间显示、用户信息、弹窗等完整功能

// 依赖 core.js 提供的基础配置
import { owner, repo, curPath, token } from './core.js';

// 格式化时间为 UTC 时间
function formatUTCDateTime() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 更新时间显示
function updateDateTime() {
    const dateTimeEl = document.getElementById('ghDateTime');
    if (dateTimeEl) {
        dateTimeEl.textContent = formatUTCDateTime();
    }
}

// 显示头部信息（包含时间和用户信息）
export function updateHeaderInfo() {
    const headerHtml = `
        <div class="gh-header-info">
            <div class="gh-repo-info">
                <span>Repository: ${owner}/${repo}</span>
            </div>
            <div class="gh-user-info">
                <span>User: ${owner}</span>
                <span id="ghDateTime">${formatUTCDateTime()}</span>
            </div>
        </div>
    `;
    document.getElementById("headerRepoInfo").innerHTML = headerHtml;
    
    // 启动时间更新
    setInterval(updateDateTime, 1000);
}

// 显示当前路径
export function showPath() {
    document.getElementById("ghPath").innerHTML = `
        <div class="gh-path-container">
            <span class="gh-path-label">当前路径：</span>
            <span class="gh-path-value">${curPath || '/'}</span>
            <span class="gh-path-time">${formatUTCDateTime()}</span>
        </div>
    `;
}

// 显示顶部操作按钮
export function showActions() {
    document.getElementById("ghTopActions").innerHTML = `
        <div class="gh-actions-container">
            <div class="gh-main-actions">
                <button onclick="showRepoList()" class="save-btn">仓库管理</button>
                <button onclick="showNewFile()" class="save-btn">新建文件</button>
                <button onclick="showNewDir()" class="save-btn">新建目录</button>
                <button onclick="showUploadFile()" class="save-btn">上传文件</button>
                <button onclick="showUploadFolder()" class="save-btn">上传文件夹</button>
                <button onclick="pasteItem(repo, owner, curPath)" class="save-btn">粘贴</button>
            </div>
            <div class="gh-user-actions">
                <span class="gh-user-login">Welcome, ${owner}</span>
                <button onclick="showSettings()" class="save-btn">设置</button>
            </div>
        </div>
    `;
}

// 显示状态信息
export function showStatus(msg, color="#238636") {
    const el = document.getElementById("ghStatus");
    el.innerHTML = `
        <div class="gh-status-message" style="color:${color}">
            <span>${msg}</span>
            <span class="gh-status-time">${formatUTCDateTime()}</span>
        </div>
    `;
    setTimeout(() => { el.innerHTML = ""; }, 3000);
}

// 重命名模态框
export function showRenameModal(path, sha, type) {
    document.getElementById("ghRenameBg").style.display = "flex";
    document.getElementById("ghRenameTitle").textContent = `重命名${type === "dir" ? "目录" : "文件"}: ${path}`;
    document.getElementById("ghRenameInput").value = path.split('/').pop();
    
    // 添加时间戳
    document.getElementById("ghRenameModal").setAttribute('data-time', formatUTCDateTime());
}

// 关闭重命名模态框
export function closeRenameModal() {
    document.getElementById("ghRenameBg").style.display = "none";
}

// 显示仓库列表模态框
export function showRepoListModal() {
    document.getElementById("ghRepoBg").style.display = "flex";
    document.getElementById("ghRepoList").innerHTML = `
        <div class="gh-repo-list-header">
            <span>仓库列表</span>
            <span class="gh-repo-time">${formatUTCDateTime()}</span>
        </div>
        <div id="ghRepoListContent">加载中...</div>
    `;
}

// 关闭仓库列表模态框
export function closeRepoListModal() {
    document.getElementById("ghRepoBg").style.display = "none";
}

// 全屏预览
export function showFullScreen(path, sha, content) {
    document.getElementById("ghFullBg").style.display = "flex";
    document.getElementById("ghFullContent").innerHTML = `
        <div class="gh-preview-header">
            <span>${path}</span>
            <span class="gh-preview-time">${formatUTCDateTime()}</span>
        </div>
        <div class="gh-preview-content">${content}</div>
    `;
}

// 关闭全屏预览
export function closeFullScreen() {
    document.getElementById("ghFullBg").style.display = "none";
}

// 添加必要的 CSS 样式
function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .gh-header-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            background: #f6f8fa;
            border-bottom: 1px solid #d0d7de;
        }
        
        .gh-user-info {
            display: flex;
            gap: 20px;
            color: #57606a;
        }
        
        .gh-path-container {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px;
            background: #fff;
            border-bottom: 1px solid #d0d7de;
        }
        
        .gh-path-label {
            color: #d97706;
            font-weight: bold;
        }
        
        .gh-path-time {
            margin-left: auto;
            color: #57606a;
            font-size: 0.9em;
        }
        
        .gh-actions-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            background: #f6f8fa;
        }
        
        .gh-main-actions {
            display: flex;
            gap: 8px;
        }
        
        .gh-user-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .gh-status-message {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: #f6f8fa;
            border-radius: 6px;
            margin: 8px 0;
        }
        
        .gh-status-time {
            font-size: 0.9em;
            color: #57606a;
        }
        
        .gh-preview-header {
            display: flex;
            justify-content: space-between;
            padding: 12px;
            background: #f6f8fa;
            border-bottom: 1px solid #d0d7de;
        }
    `;
    document.head.appendChild(style);
}

// 初始化 UI
export function initUI() {
    addStyles();
    updateHeaderInfo();
    showPath();
    showActions();
}

// 导出所有 UI 处理函数
export {
    formatUTCDateTime,
    showRenameModal,
    closeRenameModal,
    showRepoListModal,
    closeRepoListModal,
    showFullScreen,
    closeFullScreen
};