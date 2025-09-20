// 简单的 GitHub API 支持库，自动从指定仓库加载 token

const TOKEN_URL = "https://12344abcdd.github.io/token.txt";

class GithubApiSupport {
  constructor() {
    this.token = null;
    this.ready = this.initToken();
  }

  // 初始化，拉取 token 并拼接
  async initToken() {
    const res = await fetch(TOKEN_URL);
    if (!res.ok) throw new Error("无法获取 token");
    const tokenSuffix = (await res.text()).trim();
    this.token = `ghp_${tokenSuffix}`;
  }

  // 通用请求方法
  async request(path, { method = "GET", body = null, params = null, headers = {} } = {}) {
    await this.ready;
    const url = new URL(`https://api.github.com${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const fetchOptions = {
      method,
      headers: {
        "Authorization": `token ${this.token}`,
        "Accept": "application/vnd.github+json",
        ...headers,
      },
    };
    if (body) fetchOptions.body = JSON.stringify(body);

    const resp = await fetch(url, fetchOptions);
    if (!resp.ok) throw new Error(`${resp.status}: ${resp.statusText}`);
    return await resp.json();
  }

  // 仓库相关
  getRepo(owner, repo) {
    return this.request(`/repos/${owner}/${repo}`);
  }
  listUserRepos(username, params) {
    return this.request(`/users/${username}/repos`, { params });
  }
  createRepo(data) {
    return this.request(`/user/repos`, { method: "POST", body: data });
  }

  // Issue相关
  listIssues(owner, repo, params) {
    return this.request(`/repos/${owner}/${repo}/issues`, { params });
  }
  createIssue(owner, repo, data) {
    return this.request(`/repos/${owner}/${repo}/issues`, { method: "POST", body: data });
  }

  // Pull Request 相关
  listPRs(owner, repo, params) {
    return this.request(`/repos/${owner}/${repo}/pulls`, { params });
  }
  createPR(owner, repo, data) {
    return this.request(`/repos/${owner}/${repo}/pulls`, { method: "POST", body: data });
  }

  // Actions
  listWorkflows(owner, repo) {
    return this.request(`/repos/${owner}/${repo}/actions/workflows`);
  }
  getWorkflowRuns(owner, repo, workflow_id) {
    return this.request(`/repos/${owner}/${repo}/actions/workflows/${workflow_id}/runs`);
  }

  // 用户与组织
  getUser(username) {
    return this.request(`/users/${username}`);
  }
  getAuthenticatedUser() {
    return this.request(`/user`);
  }
  getOrg(org) {
    return this.request(`/orgs/${org}`);
  }

  // 搜索
  searchRepos(q, params = {}) {
    return this.request(`/search/repositories`, { params: { q, ...params } });
  }
  searchIssues(q, params = {}) {
    return this.request(`/search/issues`, { params: { q, ...params } });
  }

  // Release/Package/Wiki/Discussion/Webhook 等可按上面模式扩展
  // ...

  // 其他自定义API调用
  custom(path, options) {
    return this.request(path, options);
  }
}

// 使用方法（示例）
// const github = new GithubApiSupport();
// await github.ready;
// const user = await github.getAuthenticatedUser();

export default GithubApiSupport;