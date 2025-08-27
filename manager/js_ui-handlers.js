// UI 处理模块，适用于 manager.js 配套结构
// 提供路径显示、操作按钮渲染、头部信息更新、状态提示等功能

// 依赖 core.js 提供的 owner, repo, curPath
import { owner, repo, curPath } from './core.js';

// 显示当前路径
export function showPath() {
    document.getElementById("ghPath").innerHTML =
        '<span style="color:#d97706"><b>当前路径：</b></span>' +
        (curPath ? curPath : '/');
}

// 显示顶部操作按钮区
export function showActions() {
    document.getElementById("ghTopActions").innerHTML = `
        <button onclick="showRepoList()" class="save-btn">仓库管理</button>
        <button onclick="showNewFile()" class="save-btn">新建文件</button>
        <button onclick="showNewDir()" class="save-btn">新建目录</button>
        <button onclick="showUploadFile()" class="save-btn">上传文件</button>
        <button onclick="showUploadFolder()" class="save-btn">上传文件夹</button>
        <button onclick="pasteItem(repo, owner, curPath)" class="save-btn">粘贴</button>
    `;
}

// 更新头部仓库信息
export function updateHeaderInfo() {
    document.getElementById("headerRepoInfo").textContent = `for ${owner}/${repo}`;
}

// 状态提示（一般由 core.js 的 showStatus 实现，但也可在此补充）
export function showStatus(msg, color="#238636") {
    const el = document.getElementById("ghStatus");
    el.textContent = msg;
    el.style.color = color;
    setTimeout(() => { el.textContent = ""; }, 3000);
}

// 可选：初始化时调用（比如设置默认 UI）
export function initUI() {
    updateHeaderInfo();
    showPath();
    showActions();
}
