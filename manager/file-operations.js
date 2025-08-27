// 文件操作模块（含重命名、下载等功能）
// 适配 manager.js 的结构，需配合 core.js 和 ui-handlers.js
import { owner, repo, token, getFullToken, showStatus, getFileName, getParentPath } from './core.js';
import { showPath, showActions } from './ui-handlers.js';

export let curPath = "";
export let editingFile = null;
export let fileSha = "";

// 目录导航
export function goDir(path) {
    curPath = path;
    editingFile = null;
    fileSha = "";
    loadFiles(curPath);
}

// 加载文件列表
export async function loadFiles(path="") {
    curPath = path;
    showPath();
    let api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const res = await fetch(api, {
        headers: {
            "Authorization": token ? "token " + token : undefined,
            "Accept": "application/vnd.github+json"
        }
    });
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
            <td class="file-name"><a href="javascript:void(0)" onclick="goDir('${upPath}')">返回上级</a></td>
            <td></td>
        </tr>`;
    }
    for (const f of files) {
        let decompressBtn = "";
        if (f.type === "file" && f.name.toLowerCase().endsWith(".zip")) {
            decompressBtn = `<button onclick="decompressFile('${f.path}')" class="save-btn">解压</button>`;
        }
        let compressBtn = "";
        if (f.type === "dir") {
            compressBtn = `<button onclick="compressFolder('${f.path}')" class="save-btn">压缩目录</button>`;
        } else if (f.type === "file") {
            compressBtn = `<button onclick="compressFile('${f.path}')" class="save-btn">压缩</button>`;
        }
        html += `<tr>
            <td>${f.type === "dir" ? "📁" : "📄"}</td>
            <td class="file-name">
                <a href="javascript:void(0)" onclick="${f.type === "dir" ? `goDir('${f.path}')` : `openFullScreen('${f.path}','${f.sha}')`}">${f.name}</a>
            </td>
            <td>
            ${f.type === "file" ? `
                <button onclick="showRenameModal('${f.path}','${f.sha}','file')" class="save-btn">重命名</button>
                <button onclick="delFile('${f.path}','${f.sha}')" class="del-btn">删除</button>
                <button onclick="downloadFile('${f.path}')" class="save-btn">下载</button>
                ${compressBtn}
                ${decompressBtn}
            ` : `
                <button onclick="showRenameModal('${f.path}','','dir')" class="save-btn">重命名</button>
                <button onclick="delDir('${f.path}')" class="del-btn">删除</button>
                <button onclick="downloadFolder('${f.path}')" class="save-btn">下载</button>
                ${compressBtn}
            `}
            </td>
        </tr>`;
    }
    document.getElementById("ghFiles").innerHTML = html;
    showActions();
}

// 删除单个文件
export async function delFile(path, sha) {
    if (!confirm(`确定要删除文件：${path} 吗？`)) return;
    let myToken = token;
    if (!myToken) {
        myToken = await getFullToken();
        localStorage.setItem("gh_token", myToken);
    }
    showStatus("正在删除...", "#cf222e");
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const res = await fetch(url, {
        method: "DELETE",
        headers: {
            "Authorization": "token " + myToken,
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
        await loadFiles(curPath);
    } else {
        showStatus("删除失败: " + (data.message || ""), "#cf222e");
        if (data.message && data.message.includes("Bad credentials")) {
            localStorage.removeItem("gh_token");
        }
    }
}

// 递归删除目录
export async function delDir(path) {
    if (!confirm(`确定要删除目录及其所有内容：${path} 吗？`)) return;
    let myToken = token;
    if (!myToken) {
        myToken = await getFullToken();
        localStorage.setItem("gh_token", myToken);
    }
    showStatus("正在删除目录...", "#cf222e");
    const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const res = await fetch(api, {
        headers: {
            "Authorization": myToken ? "token " + myToken : undefined,
            "Accept": "application/vnd.github+json"
        }
    });
    if (!res.ok) return showStatus("无法获取目录内容", "#cf222e");
    let items = await res.json();
    if (!Array.isArray(items)) items = [items];
    let failed = 0;
    for (const item of items) {
        if (item.type === "dir") {
            await delDir(item.path);
        } else {
            const deleteUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`;
            const deleteRes = await fetch(deleteUrl, {
                method: "DELETE",
                headers: {
                    "Authorization": "token " + myToken,
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
        await loadFiles(curPath);
    } else {
        showStatus(`目录删除完成，但有 ${failed} 个文件删除失败`, "#cf222e");
    }
}

// 新建文件
export async function createFile(fileName) {
    if (!fileName) return showStatus("请输入文件名", "#cf222e");
    let filePath = curPath ? curPath + "/" + fileName : fileName;
    let myToken = token;
    if (!myToken) {
        myToken = await getFullToken();
        localStorage.setItem("gh_token", myToken);
    }
    showStatus("正在创建...", "#0969da");
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const res = await fetch(url, {
        method: "PUT",
        headers: {
            "Authorization": "token " + myToken,
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
        await loadFiles(curPath);
    } else {
        showStatus("创建失败: " + (data.message || ""), "#cf222e");
        if (data.message && data.message.includes("Bad credentials")) {
            localStorage.removeItem("gh_token");
        }
    }
}

// 新建目录
export async function createDir(dirName) {
    if (!dirName) return showStatus("请输入目录名", "#cf222e");
    let filePath = curPath ? curPath + "/" + dirName + "/.keep" : dirName + "/.keep";
    let myToken = token;
    if (!myToken) {
        myToken = await getFullToken();
        localStorage.setItem("gh_token", myToken);
    }
    showStatus("正在创建目录...", "#0969da");
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const res = await fetch(url, {
        method: "PUT",
        headers: {
            "Authorization": "token " + myToken,
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
        await loadFiles(curPath);
    } else {
        showStatus("创建失败: " + (data.message || ""), "#cf222e");
        if (data.message && data.message.includes("Bad credentials")) {
            localStorage.removeItem("gh_token");
        }
    }
}

// 文件上传
export async function uploadFile(file) {
    if (!file) return;
    let filePath = curPath ? curPath + "/" + file.name : file.name;
    let myToken = token;
    if (!myToken) {
        myToken = await getFullToken();
        localStorage.setItem("gh_token", myToken);
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
                "Authorization": "token " + myToken,
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
            await loadFiles(curPath);
        } else {
            showStatus("上传失败: " + (data.message || ""), "#cf222e");
            if (data.message && data.message.includes("Bad credentials")) {
                localStorage.removeItem("gh_token");
            }
        }
    };
    reader.readAsDataURL(file);
}

// 文件夹上传
export async function uploadFolder(files) {
    if (!files || files.length === 0) return;
    let myToken = token;
    if (!myToken) {
        myToken = await getFullToken();
        localStorage.setItem("gh_token", myToken);
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
                        "Authorization": "token " + myToken,
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
    await loadFiles(curPath);
}

// 文件重命名
export async function renameFile(oldPath, oldSha, newName, type) {
    if (!newName || !oldPath) return showStatus("请输入新文件名", "#cf222e");
    if (getFileName(oldPath) === newName) return showStatus("文件名未修改", "#cf222e");
    const newPath = getParentPath(oldPath) ? getParentPath(oldPath) + '/' + newName : newName;
    let myToken = token;
    if (!myToken) {
        myToken = await getFullToken();
        localStorage.setItem("gh_token", myToken);
    }
    showStatus("正在重命名...", "#0969da");
    if (type === "dir") {
        const api = `https://api.github.com/repos/${owner}/${repo}/contents/${oldPath}`;
        const res = await fetch(api, {
            headers: {
                "Authorization": "token " + myToken,
                "Accept": "application/vnd.github+json"
            }
        });
        if (!res.ok) return showStatus("无法获取目录内容", "#cf222e");
        let items = await res.json();
        if (!Array.isArray(items)) items = [items];
        let ok = true;
        for (const item of items) {
            const subNewPath = newPath + "/" + getFileName(item.path);
            let data = item;
            if (!data.content) {
                const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`, {
                    headers: {
                        "Authorization": "token " + myToken,
                        "Accept": "application/vnd.github+json"
                    }
                });
                if (!r.ok) continue;
                data = await r.json();
            }
            const base64Content = data.content ? data.content.replace(/\n/g, "") : "";
            const createUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${subNewPath}`;
            const createRes = await fetch(createUrl, {
                method: "PUT",
                headers: {
                    "Authorization": "token " + myToken,
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
                    "Authorization": "token " + myToken,
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
        } else {
            showStatus("目录重命名失败", "#cf222e");
        }
    } else {
        let base64Content = null;
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${oldPath}`;
        const res = await fetch(url, {
            headers: {
                "Authorization": "token " + myToken,
                "Accept": "application/vnd.github+json"
            }
        });
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
                "Authorization": "token " + myToken,
                "Accept": "application/vnd.github+json"
            },
            body: JSON.stringify({
                message: `Rename (create) ${newPath} from ${oldPath} via manager.html`,
                content: base64Content
            })
        });
        if (createRes.ok) {
            const deleteUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${oldPath}`;
            await fetch(deleteUrl, {
                method: "DELETE",
                headers: {
                    "Authorization": "token " + myToken,
                    "Accept": "application/vnd.github+json"
                },
                body: JSON.stringify({
                    message: `Rename (delete) ${oldPath} after renaming to ${newPath} via manager.html`,
                    sha: oldSha
                })
            });
            showStatus("重命名成功！");
            await loadFiles(curPath);
        } else {
            showStatus("重命名失败", "#cf222e");
        }
    }
}

// 文件下载
export async function downloadFile(path) {
    // 直接跳转 raw.githubusercontent.com
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
    const a = document.createElement('a');
    a.href = rawUrl;
    a.download = getFileName(path);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// 目录下载（打包为 zip）
export async function downloadFolder(path) {
    showStatus("正在打包目录...", "#0969da");
    const JSZip = window.JSZip;
    async function addToZip(zip, dirPath, relPathPrefix) {
        const api = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}`;
        const res = await fetch(api, {
            headers: {
                "Authorization": token ? "token " + token : undefined,
                "Accept": "application/vnd.github+json"
            }
        });
        if (!res.ok) return;
        let items = await res.json();
        if (!Array.isArray(items)) items = [items];
        for (const item of items) {
            if (item.type === "dir") {
                await addToZip(zip, item.path, relPathPrefix + item.name + "/");
            } else {
                const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`, {
                    headers: {
                        "Authorization": token ? "token " + token : undefined,
                        "Accept": "application/vnd.github+json"
                    }
                });
                if (!fileRes.ok) continue;
                const fileData = await fileRes.json();
                const content = atob(fileData.content.replace(/\n/g, ""));
                zip.file(relPathPrefix + item.name, content);
            }
        }
    }
    const zip = new JSZip();
    await addToZip(zip, path, "");
    const zipBlob = await zip.generateAsync({type:"blob"});
    const folderName = path.split('/').pop();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = folderName + ".zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showStatus("目录打包下载完成！");
}
