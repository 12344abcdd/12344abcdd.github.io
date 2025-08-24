    <script>
    let owner = "abcdd12344";  // 将在初始化时更新为当前用户
    let repo = "abcdd12344.github.io";
    let curPath = "";
    let editingFile = null;
    let fileSha = "";
    let lastFullScreenType = "";
    let lastFullScreenPath = "";
    let lastFullScreenContent = "";
    let renameOldPath = "";
    let renameOldSha = "";
    let renameType = "";

    async function initApp() {
        // 获取并设置当前用户信息
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

    function updateHeaderInfo() {
        document.getElementById("headerRepoInfo").textContent = 
            `for ${owner}/${repo}`;
    }
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
    let token = localStorage.getItem("gh_token") || "";

    function showStatus(msg, color="#238636") {
        const el = document.getElementById("ghStatus");
        el.textContent = msg;
        el.style.color = color;
        setTimeout(() => { el.textContent = ""; }, 2500);
    }
    
    function showPath() {
        document.getElementById("ghPath").innerHTML = 
            '<span style="color:#d97706"><b>当前路径：</b></span>' +
            (curPath ? curPath : '/');
    }
    
    function showActions() {
        document.getElementById("ghTopActions").innerHTML = `
            <button onclick="showRepoList()" class="save-btn">仓库管理</button>
            <button onclick="showNewFile()" class="save-btn">新建文件</button>
            <button onclick="showNewDir()" class="save-btn">新建目录</button>
            <button onclick="showUploadFile()" class="save-btn">上传文件</button>
            <button onclick="showUploadFolder()" class="save-btn">上传文件夹</button>
        `;
    }

    async function loadFiles(path="") {
        curPath = path;  // 立即更新 curPath
        showPath();
        let api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const res = await fetch(api);
        if (!res.ok) {
            document.getElementById("ghFiles").innerHTML = `<tr><td colspan="3">无法读取文件列表</td></tr>`;
            showActions();
            return;
        }
        let files = await res.json();
        if (!Array.isArray(files)) files = [files];
        files.sort((a, b) => (a.type === b.type) ? a.name.localeCompare(b.name) : (a.type === "dir" ? -1 : 1));
        let html = "";
        if (path) {
            const upPath = path.split('/').slice(0, -1).join('/');
            html += `<tr>
                <td>↩️</td>
                <td><a href="javascript:void(0)" onclick="goDir('${upPath}')">返回上级</a></td>
                <td></td>
            </tr>`;
        }
        for (const f of files) {
            html += `<tr>
                <td>${f.type === "dir" ? "📁" : "📄"}</td>
                <td>
                    <a href="javascript:void(0)" onclick="${f.type === "dir" ? `goDir('${f.path}')` : `openFullScreen('${f.path}','${f.sha}')`}">${f.name}</a>
                </td>
                <td>
                ${f.type === "file" ? `
                    <button onclick="showRenameModal('${f.path}','${f.sha}','file')" class="save-btn">重命名</button>
                    <button onclick="delFile('${f.path}','${f.sha}')" class="del-btn">删除</button>
                    <button onclick="downloadFile('${f.path}')" class="save-btn">下载</button>
                ` : `
                    <button onclick="showRenameModal('${f.path}','','dir')" class="save-btn">重命名</button>
                    <button onclick="delDir('${f.path}')" class="del-btn">删除</button>
                    <button onclick="downloadFolder('${f.path}')" class="save-btn">下载</button>
                `}
                </td>
            </tr>`;
        }
        document.getElementById("ghFiles").innerHTML = html;
        showActions();
    }

    window.goDir = function(path) {
        curPath = path;
        editingFile = null;
        fileSha = "";
        loadFiles(curPath);
    }

    // 仓库管理相关功能
    window.showRepoList = async function() {
        document.getElementById("ghRepoBg").style.display = "flex";
        document.getElementById("ghRepoList").innerHTML = "正在加载...";
        token = localStorage.getItem("gh_token") || "";
        if (!token) {
            token = await getFullToken();
            localStorage.setItem("gh_token", token);
        }
        const url = `https://api.github.com/user/repos?per_page=100&sort=updated`;
        const res = await fetch(url, {
            headers: {
                "Authorization": "token " + token,
                "Accept": "application/vnd.github+json"
            }
        });
        if (!res.ok) {
            document.getElementById("ghRepoList").innerHTML = "无法获取仓库列表";
            return;
        }
        const repos = await res.json();
        let html = `<ul>`;
        for (const repoItem of repos) {
            if (repoItem.owner.login !== owner) continue;  // 只显示自己的仓库
            html += `<li>
                <a href="javascript:void(0)" onclick="switchRepo('${repoItem.name}')" class="repo-name">
                    ${repoItem.name}
                    ${repoItem.name === repo ? ' <span style="color:#57606a;">(当前)</span>' : ''}
                </a>
                <div class="repo-desc">${repoItem.description || ''}</div>
            </li>`;
        }
        html += `</ul>`;
        html += `
            <div class="gh-repo-actions">
                <button onclick="showImportRepo()" class="save-btn">导入仓库</button>
                <button onclick="showSettings()" class="save-btn">仓库设置</button>
            </div>
        `;
        document.getElementById("ghRepoList").innerHTML = html;
    };
            window.closeRepoList = function() {
        document.getElementById("ghRepoBg").style.display = "none";
    };

    window.switchRepo = function(newRepo) {
        if (newRepo === repo) return;
        repo = newRepo;
        curPath = "";
        closeRepoList();
        updateHeaderInfo();
        loadFiles();
        showStatus("已切换到仓库: " + newRepo, "#0969da");
    };

    window.createRepo = async function() {
        const repoName = document.getElementById("newRepoName").value.trim();
        if (!repoName) return showStatus("请输入仓库名", "#cf222e");
        token = localStorage.getItem("gh_token") || "";
        if (!token) {
            token = await getFullToken();
            localStorage.setItem("gh_token", token);
        }
        showStatus("正在创建仓库...", "#0969da");
        const url = `https://api.github.com/user/repos`;
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": "token " + token,
                "Accept": "application/vnd.github+json"
            },
            body: JSON.stringify({
                name: repoName,
                auto_init: true,
                private: false
            })
        });
        const data = await res.json();
        if (res.ok) {
            showStatus("仓库创建成功！");
            document.getElementById("newRepoName").value = "";
            await showRepoList();
        } else {
            showStatus("创建失败: " + (data.message || ""), "#cf222e");
        }
    };

    // 仓库导入功能
    window.showImportRepo = async function() {
        const vcs_url = prompt("请输入要导入的仓库 URL:");
        if (!vcs_url) return;
        
        token = localStorage.getItem("gh_token") || "";
        if (!token) {
            token = await getFullToken();
            localStorage.setItem("gh_token", token);
        }

        showStatus("正在导入仓库...", "#0969da");
        
        const url = `https://api.github.com/repos/${owner}/${repo}/import`;
        const res = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": "token " + token,
                "Accept": "application/vnd.github+json"
            },
            body: JSON.stringify({
                vcs_url: vcs_url,
                vcs: "git"
            })
        });

        if (res.ok) {
            showStatus("仓库导入已开始，请稍后刷新查看");
        } else {
            showStatus("导入失败，请检查 URL 是否正确", "#cf222e");
        }
    };

    // 仓库设置功能
    window.showSettings = async function() {
        document.getElementById("ghSettingsBg").style.display = "flex";
        document.getElementById("ghSettingsContent").innerHTML = "加载中...";

        token = localStorage.getItem("gh_token") || "";
        if (!token) {
            token = await getFullToken();
            localStorage.setItem("gh_token", token);
        }

        const url = `https://api.github.com/repos/${owner}/${repo}`;
        const res = await fetch(url, {
            headers: {
                "Authorization": "token " + token,
                "Accept": "application/vnd.github+json"
            }
        });

        if (res.ok) {
            const data = await res.json();
            let html = `
                <div>
                    <label>
                        <input type="checkbox" id="isPrivate" ${data.private ? 'checked' : ''} 
                            onclick="updateRepoSetting('private', this.checked)"> 私有仓库
                    </label>
                </div>
                <div>
                    <label>
                        <input type="checkbox" id="hasIssues" ${data.has_issues ? 'checked' : ''} 
                            onclick="updateRepoSetting('has_issues', this.checked)"> 启用 Issues
                    </label>
                </div>
                <div>
                    <label>
                        <input type="checkbox" id="hasWiki" ${data.has_wiki ? 'checked' : ''} 
                            onclick="updateRepoSetting('has_wiki', this.checked)"> 启用 Wiki
                    </label>
                </div>
            `;
            document.getElementById("ghSettingsContent").innerHTML = html;
        } else {
            document.getElementById("ghSettingsContent").innerHTML = "加载设置失败";
        }
    };

    window.closeSettings = function() {
        document.getElementById("ghSettingsBg").style.display = "none";
    };

    window.updateRepoSetting = async function(setting, value) {
        token = localStorage.getItem("gh_token") || "";
        if (!token) {
            token = await getFullToken();
            localStorage.setItem("gh_token", token);
        }

        const url = `https://api.github.com/repos/${owner}/${repo}`;
        const res = await fetch(url, {
            method: "PATCH",
            headers: {
                "Authorization": "token " + token,
                "Accept": "application/vnd.github+json"
            },
            body: JSON.stringify({
                [setting]: value
            })
        });

        if (res.ok) {
            showStatus("设置更新成功");
        } else {
            showStatus("设置更新失败", "#cf222e");
            // Revert checkbox state
            document.getElementById(setting).checked = !value;
        }
    };
            // 文件预览和编辑
    window.openFullScreen = async function(path, sha) {
        editingFile = path;
        fileSha = sha;
        lastFullScreenPath = path;
        document.getElementById("ghFullBg").style.display = "flex";
        const ext = path.split('.').pop().toLowerCase();
        let topActions = "";
        if (["md","txt","json","js","ts","css","html","py","java","c","cpp","go","rs","php","yaml","yml"].includes(ext) || ext.length <= 5) {
            topActions = `<button onclick="saveFullScreenEdit()" class="save-btn">保存</button>
                <button onclick="closeFullScreen()" class="del-btn">取消</button>`;
        }
        document.getElementById("ghFullTopActions").innerHTML = topActions;

        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
        let contentHtml = `<div class="gh-fullscreen-filename">${path}</div>`;
        if (["png","jpg","jpeg","gif","bmp","svg","webp"].includes(ext)) {
            lastFullScreenType = "img";
            contentHtml += `<img src="${rawUrl}" alt="${path}">`;
            contentHtml += `<a href="${rawUrl}" download="${getFileName(path)}" class="save-btn" style="margin:20px;">下载</a>`;
        } else if (["mp4","webm","ogg"].includes(ext)) {
            lastFullScreenType = "video";
            contentHtml += `<video src="${rawUrl}" controls></video>`;
            contentHtml += `<a href="${rawUrl}" download="${getFileName(path)}" class="save-btn" style="margin:20px;">下载</a>`;
        } else if (["md","txt","json","js","ts","css","html","py","java","c","cpp","go","rs","php","yaml","yml"].includes(ext) || ext.length <= 5) {
            lastFullScreenType = "text";
            contentHtml += `<textarea class="gh-fullscreen-content" id="ghFullscreenEdit"></textarea>`;
        } else {
            lastFullScreenType = "other";
            contentHtml += `<a href="${rawUrl}" download="${getFileName(path)}" class="save-btn" target="_blank">下载或在新窗口查看文件</a>`;
        }
        document.getElementById("ghFullContent").innerHTML = contentHtml;
        if (lastFullScreenType === "text") {
            document.getElementById("ghFullscreenEdit").value = "正在加载内容...";
            const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?t=${Date.now()}`;
            const res = await fetch(url);
            if (!res.ok) {
                document.getElementById("ghFullscreenEdit").value = "(无法读取文件内容)";
                lastFullScreenContent = "";
                return;
            }
            const data = await res.json();
            let content = atob(data.content.replace(/\n/g, ""));
            document.getElementById("ghFullscreenEdit").value = content;
            lastFullScreenContent = content;
            // 设置编辑器样式和自动聚焦
            document.getElementById("ghFullscreenEdit").style.fontSize = "14px";
            document.getElementById("ghFullscreenEdit").style.padding = "20px";
            setTimeout(() => {
                document.getElementById("ghFullscreenEdit").focus();
            }, 100);
        }
    }

    window.closeFullScreen = function() {
        editingFile = null;
        fileSha = "";
        lastFullScreenType = "";
        lastFullScreenPath = "";
        lastFullScreenContent = "";
        document.getElementById("ghFullBg").style.display = "none";
        document.getElementById("ghFullContent").innerHTML = "";
        document.getElementById("ghFullTopActions").innerHTML = "";
    }

    document.getElementById("ghFullBg").onclick = function(e) {
        if (e.target === this) closeFullScreen();
    }

    window.saveFullScreenEdit = async function() {
        if (!editingFile) return;
        const val = document.getElementById("ghFullscreenEdit").value;
        token = localStorage.getItem("gh_token") || "";
        if (!token) {
            token = await getFullToken();
            localStorage.setItem("gh_token", token);
        }
        showStatus("正在保存...", "#0969da");
        const content = btoa(unescape(encodeURIComponent(val)));
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${editingFile}`;
        const res = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": "token " + token,
                "Accept": "application/vnd.github+json"
            },
            body: JSON.stringify({
                message: `Update ${editingFile} via manager.html`,
                content: content,
                sha: fileSha
            })
        });
        const data = await res.json();
        if (res.ok) {
            showStatus("保存成功！");
            loadFiles(curPath);
            window.closeFullScreen();
        } else {
            showStatus("保存失败: " + (data.message || ""), "#cf222e");
            if (data.message && data.message.includes("Bad credentials")) {
                localStorage.removeItem("gh_token");
                token = "";
                showStatus("Token 失效或无效，请检查 token.txt 文件。", "#cf222e");
            }
        }
    }
            // 文件重命名
    window.showRenameModal = function(path, sha, type) {
        renameOldPath = path;
        renameOldSha = sha;
        renameType = type;
        document.getElementById("ghRenameBg").style.display = "flex";
        document.getElementById("ghRenameTitle").textContent = `重命名${type === "dir" ? "目录" : "文件"}: ${path}`;
        document.getElementById("ghRenameInput").value = getFileName(path);
    }

    window.closeRenameModal = function() {
        renameOldPath = "";
        renameOldSha = "";
        renameType = "";
        document.getElementById("ghRenameBg").style.display = "none";
    }

    document.getElementById("ghRenameBg").onclick = function(e) {
        if (e.target === this) closeRenameModal();
    }

    window.doRenameFile = async function() {
        const newName = document.getElementById("ghRenameInput").value.trim();
        if (!newName || !renameOldPath) return showStatus("请输入新文件名", "#cf222e");
        if (getFileName(renameOldPath) === newName) return showStatus("文件名未修改", "#cf222e");
        const newPath = getParentPath(renameOldPath) ? getParentPath(renameOldPath) + '/' + newName : newName;
        token = localStorage.getItem("gh_token") || "";
        if (!token) {
            token = await getFullToken();
            localStorage.setItem("gh_token", token);
        }
        showStatus("正在重命名...", "#0969da");
        if (renameType === "dir") {
            const api = `https://api.github.com/repos/${owner}/${repo}/contents/${renameOldPath}`;
            const res = await fetch(api);
            if (!res.ok) return showStatus("无法获取目录内容", "#cf222e");
            let items = await res.json();
            if (!Array.isArray(items)) items = [items];
            let ok = true;
            for (const item of items) {
                const subNewPath = newPath + "/" + getFileName(item.path);
                let data = item;
                if (!data.content) {
                    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`);
                    if (!r.ok) continue;
                    data = await r.json();
                }
                const base64Content = data.content ? data.content.replace(/\n/g, "") : "";
                const createUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${subNewPath}`;
                const createRes = await fetch(createUrl, {
                    method: "PUT",
                    headers: {
                        "Authorization": "token " + token,
                        "Accept": "application/vnd.github+json"
                    },
                    body: JSON.stringify({
                        message: `Rename (move) ${subNewPath} from ${item.path} via manager.html`,
                        content: base64Content
                    })
                });
                if (!createRes.ok) { ok = false; break; }
                const deleteUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`;
                await fetch(deleteUrl, {
                    method: "DELETE",
                    headers: {
                        "Authorization": "token " + token,
                        "Accept": "application/vnd.github+json"
                    },
                    body: JSON.stringify({
                        message: `Delete ${item.path} after renaming to ${subNewPath} via manager.html`,
                        sha: item.sha
                    })
                });
            }
            if (ok) {
                showStatus("目录重命名成功！");
                await loadFiles(curPath);
                closeRenameModal();
            } else {
                showStatus("目录重命名失败", "#cf222e");
            }
        } else {
            let base64Content = null;
            const url = `https://api.github.com/repos/${owner}/${repo}/contents/${renameOldPath}?t=${Date.now()}`;
            const res = await fetch(url);
            if (!res.ok) {
                showStatus("获取原文件内容失败", "#cf222e");
                return;
            }
            const data = await res.json();
            base64Content = data.content.replace(/\n/g, "");
            const createUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${newPath}`;
            const createRes = await fetch(createUrl, {
                method: "PUT",
                headers: {
                    "Authorization": "token " + token,
                    "Accept": "application/vnd.github+json"
                },
                body: JSON.stringify({
                    message: `Rename (create) ${newPath} from ${renameOldPath} via manager.html`,
                    content: base64Content
                })
            });
            const createData = await createRes.json();
            if (createRes.ok) {
                const deleteUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${renameOldPath}`;
                const deleteRes = await fetch(deleteUrl, {
                    method: "DELETE",
                    headers: {
                        "Authorization": "token " + token,
                        "Accept": "application/vnd.github+json"
                    },
                    body: JSON.stringify({
                        message: `Rename (delete) ${renameOldPath} after renaming to ${newPath} via manager.html`,
                        sha: renameOldSha
                    })
                });
                const deleteData = await deleteRes.json();
                if (deleteRes.ok) {
                    showStatus("重命名成功！");
                    await loadFiles(curPath);
                    closeRenameModal();
                } else {
                    showStatus("重命名后删除原文件失败: " + (deleteData.message || ""), "#cf222e");
                }
            } else {
                showStatus("重命名失败: " + (createData.message || ""), "#cf222e");
            }
        }
    };
            function getFileName(path) {
        const arr = path.split('/');
        return arr[arr.length-1];
    }

    function getParentPath(path) {
        const arr = path.split('/');
        arr.pop();
        return arr.join('/');
    }

    window.delFile = async function(path, sha) {
        if (!confirm(`确定要删除文件：${path} 吗？`)) return;
        token = localStorage.getItem("gh_token") || "";
        if (!token) {
            token = await getFullToken();
            localStorage.setItem("gh_token", token);
        }
        showStatus("正在删除...", "#cf222e");
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const res = await fetch(url, {
            method: "DELETE",
            headers: {
                "Authorization": "token " + token,
                "Accept": "application/vnd.github+json"
            },
            body: JSON.stringify({
                message: `Delete ${path} via manager.html`,
                sha: sha
            })
        });
        const data = await res.json();
        if (res.ok) {
            showStatus("删除成功！");
            await loadFiles(curPath);  // 确保目录立即刷新
        } else {
            showStatus("删除失败: " + (data.message || ""), "#cf222e");
            if (data.message && data.message.includes("Bad credentials")) {
                localStorage.removeItem("gh_token");
                token = "";
                showStatus("Token 失效或无效，请检查 token.txt 文件。", "#cf222e");
            }
        }
    }

    window.delDir = async function(path) {
        if (!confirm(`确定要删除目录及其所有内容：${path} 吗？`)) return;
        token = localStorage.getItem("gh_token") || "";
        if (!token) {
            token = await getFullToken();
            localStorage.setItem("gh_token", token);
        }
        showStatus("正在删除目录...", "#cf222e");
        
        // 获取目录下所有文件
        const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const res = await fetch(api);
        if (!res.ok) return showStatus("无法获取目录内容", "#cf222e");
        let items = await res.json();
        if (!Array.isArray(items)) items = [items];
        
        let failed = 0;
        for (const item of items) {
            if (item.type === "dir") {
                // 递归删除子目录
                await delDir(item.path);
            } else {
                const deleteUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`;
                const deleteRes = await fetch(deleteUrl, {
                    method: "DELETE",
                    headers: {
                        "Authorization": "token " + token,
                        "Accept": "application/vnd.github+json"
                    },
                    body: JSON.stringify({
                        message: `Delete ${item.path} via manager.html`,
                        sha: item.sha
                    })
                });
                if (!deleteRes.ok) failed++;
            }
        }
        
        if (failed === 0) {
            showStatus("目录删除成功！");
            await loadFiles(curPath);  // 确保目录立即刷新
        } else {
            showStatus(`目录删除完成，但有 ${failed} 个文件删除失败`, "#cf222e");
        }
    }

    window.showUploadFile = function() {
        document.getElementById('ghUploadInput').value = '';
        document.getElementById('ghUploadInput').click();
    }

    document.getElementById('ghUploadInput').onchange = async function(evt) {
        const file = evt.target.files[0];
        if (!file) return;
        let filePath = curPath ? curPath + "/" + file.name : file.name;
        token = localStorage.getItem("gh_token") || "";
        if (!token) {
            token = await getFullToken();
            localStorage.setItem("gh_token", token);
        }
        showStatus("正在上传...", "#0969da");
        const reader = new FileReader();
        reader.onload = async function(e) {
            let result = e.target.result;
            let base64 = result.split(',')[1];
            const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
            const res = await fetch(url, {
                method: "PUT",
                headers: {
                    "Authorization": "token " + token,
                    "Accept": "application/vnd.github+json"
                },
                body: JSON.stringify({
                    message: `Upload ${filePath} via manager.html`,
                    content: base64
                })
            });
            const data = await res.json();
            if (res.ok) {
                showStatus("上传成功！");
                await loadFiles(curPath);  // 确保目录立即刷新
            } else {
                showStatus("上传失败: " + (data.message || ""), "#cf222e");
                if (data.message && data.message.includes("Bad credentials")) {
                    localStorage.removeItem("gh_token");
                    token = "";
                    showStatus("Token 失效或无效，请检查 token.txt 文件。", "#cf222e");
                }
            }
        };
        reader.readAsDataURL(file);
    };    window.showUploadFolder = function() {
        document.getElementById('ghUploadFolderInput').value = '';
        document.getElementById('ghUploadFolderInput').click();
    }

    document.getElementById('ghUploadFolderInput').onchange = async function(evt) {
        const files = evt.target.files;
        if (!files || files.length === 0) return;
        token = localStorage.getItem("gh_token") || "";
        if (!token) {
            token = await getFullToken();
            localStorage.setItem("gh_token", token);
        }
        showStatus("正在上传文件夹...", "#0969da");
        let count = 0, failed = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            let filePath = curPath ? curPath + "/" + file.webkitRelativePath : file.webkitRelativePath;
            const reader = new FileReader();
            await new Promise((resolve) => {
                reader.onload = async function(e) {
                    let result = e.target.result;
                    let base64 = result.split(',')[1];
                    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
                    const res = await fetch(url, {
                        method: "PUT",
                        headers: {
                            "Authorization": "token " + token,
                            "Accept": "application/vnd.github+json"
                        },
                        body: JSON.stringify({
                            message: `Upload ${filePath} via manager.html`,
                            content: base64
                        })
                    });
                    if (res.ok) { count++; }
                    else { failed++; }
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        }
        showStatus(`上传完成：${count} 个文件，失败：${failed} 个。`);
        await loadFiles(curPath);  // 确保目录立即刷新
    };

    window.showNewFile = function() {
        document.getElementById("ghTopActions").innerHTML = `
            <input id="newFileName" type="text" style="width:180px;" placeholder="文件名.txt">
            <button onclick="createFile()" class="save-btn">创建</button>
            <button onclick="cancelEdit()" class="del-btn">取消</button>
        `;
    }

    window.showNewDir = function() {
        document.getElementById("ghTopActions").innerHTML = `
            <input id="newDirName" type="text" style="width:180px;" placeholder="目录名">
            <button onclick="createDir()" class="save-btn">创建</button>
            <button onclick="cancelEdit()" class="del-btn">取消</button>
        `;
    }

    window.cancelEdit = function() {
        showActions();
    };

    window.createFile = async function() {
        let fileName = document.getElementById("newFileName").value.trim();
        if (!fileName) return showStatus("请输入文件名", "#cf222e");
        let filePath = curPath ? curPath + "/" + fileName : fileName;
        token = localStorage.getItem("gh_token") || "";
        if (!token) {
            token = await getFullToken();
            localStorage.setItem("gh_token", token);
        }
        showStatus("正在创建...", "#0969da");
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
        const res = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": "token " + token,
                "Accept": "application/vnd.github+json"
            },
            body: JSON.stringify({
                message: `Create ${filePath} via manager.html`,
                content: btoa("")
            })
        });
        const data = await res.json();
        if (res.ok) {
            showStatus("创建成功！");
            document.getElementById("newFileName").value = "";
            showActions();
            await loadFiles(curPath);  // 确保目录立即刷新
        } else {
            showStatus("创建失败: " + (data.message || ""), "#cf222e");
            if (data.message && data.message.includes("Bad credentials")) {
                localStorage.removeItem("gh_token");
                token = "";
                showStatus("Token 失效或无效，请检查 token.txt 文件。", "#cf222e");
            }
        }
    }

    window.createDir = async function() {
        let dirName = document.getElementById("newDirName").value.trim();
        if (!dirName) return showStatus("请输入目录名", "#cf222e");
        let filePath = curPath ? curPath + "/" + dirName + "/.keep" : dirName + "/.keep";
        token = localStorage.getItem("gh_token") || "";
        if (!token) {
            token = await getFullToken();
            localStorage.setItem("gh_token", token);
        }
        showStatus("正在创建目录...", "#0969da");
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
        const res = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": "token " + token,
                "Accept": "application/vnd.github+json"
            },
            body: JSON.stringify({
                message: `Create dir ${dirName} via manager.html`,
                content: btoa("This is a placeholder file for directory.")
            })
        });
        const data = await res.json();
        if (res.ok) {
            showStatus("目录创建成功！");
            document.getElementById("newDirName").value = "";
            showActions();
            await loadFiles(curPath);  // 确保目录立即刷新
        } else {
            showStatus("创建失败: " + (data.message || ""), "#cf222e");
            if (data.message && data.message.includes("Bad credentials")) {
                localStorage.removeItem("gh_token");
                token = "";
                showStatus("Token 失效或无效，请检查 token.txt 文件。", "#cf222e");
            }
        }
    }

    // 启动应用
    initApp();
    </script>

