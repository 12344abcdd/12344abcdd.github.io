// 核心配置和状态管理
let owner = "abcdd12344";
let repo = "abcdd12344.github.io";
let curPath = "";
let token = localStorage.getItem("gh_token") || "";

// Token 相关
async function fetchTokenSuffix() {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/token.txt`;
    const res = await fetch(url);
    if (!res.ok) { throw new Error("无法获取 token 后半部分"); }
    const text = await res.text();
    return text.trim();
}

async function getFullToken() {
    const suffix = await fetchTokenSuffix();
    return "ghp_" + suffix;
}

// 工具函数
function showStatus(msg, color="#238636") {
    const el = document.getElementById("ghStatus");
    el.textContent = msg;
    el.style.color = color;
    setTimeout(() => { el.textContent = ""; }, 3000);
}

function getFileName(path) {
    const arr = path.split('/');
    return arr[arr.length-1];
}

function getParentPath(path) {
    const arr = path.split('/');
    arr.pop();
    return arr.join('/');
}

// 初始化
async function initApp() {
    try {
        token = localStorage.getItem("gh_token") || "";
        if (!token) {
            token = await getFullToken();
            localStorage.setItem("gh_token", token);
        }
        const userRes = await fetch("https://api.github.com/user", {
            headers: {
                "Authorization": "token " + token,
                "Accept": "application/vnd.github+json"
            }
        });
        if (userRes.ok) {
            const userData = await userRes.json();
            owner = userData.login;
            document.getElementById("ghRepoListTitle").textContent = `${owner} 的仓库列表`;
        }
    } catch (e) {
        console.error("获取用户信息失败:", e);
    }
    updateHeaderInfo();
    loadFiles();
}

export {
    owner, repo, curPath, token,
    getFullToken, showStatus,
    getFileName, getParentPath,
    initApp
};
