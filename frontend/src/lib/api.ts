const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }

  return data.data;
}

// Auth
export const auth = {
  register: (email: string, password: string, name: string) =>
    request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: { email, password, name },
    }),

  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  me: (token: string) => request<{ user: User }>('/auth/me', { token }),

  createToken: (token: string, name: string) =>
    request<{ id: string; name: string; token: string }>('/auth/token', {
      method: 'POST',
      body: { name },
      token,
    }),

  listTokens: (token: string) =>
    request<{ tokens: ApiToken[] }>('/auth/tokens', { token }),

  deleteToken: (token: string, tokenId: string) =>
    request<{ deleted: boolean }>(`/auth/tokens/${tokenId}`, {
      method: 'DELETE',
      token,
    }),
};

// Projects (public read, auth for write)
export const projects = {
  list: (options?: { tags?: string[]; token?: string | null } | string | null, legacyToken?: string | null) => {
    // Support both old signature: list(token) and new: list({ tags, token })
    if (typeof options === 'string' || options === null || options === undefined) {
      return request<{ projects: Project[] }>('/projects', { token: options || legacyToken });
    }
    const params = new URLSearchParams();
    if (options.tags && options.tags.length > 0) params.set('tags', options.tags.join(','));
    const qs = params.toString();
    return request<{ projects: Project[] }>(`/projects${qs ? `?${qs}` : ''}`, { token: options.token });
  },

  get: (slug: string, token?: string | null) =>
    request<{ project: Project; members: Member[]; role: string | null }>(
      `/projects/${slug}`,
      { token }
    ),

  create: (token: string, data: { slug: string; name: string; description?: string; tags?: string[] }) =>
    request<{ project: Project }>('/projects', { method: 'POST', body: data, token }),

  update: (token: string, slug: string, data: { name?: string; description?: string }) =>
    request<{ project: Project }>(`/projects/${slug}`, {
      method: 'PATCH',
      body: data,
      token,
    }),

  delete: (token: string, slug: string) =>
    request<{ deleted: boolean }>(`/projects/${slug}`, { method: 'DELETE', token }),

  addMember: (token: string, slug: string, email: string, role?: string) =>
    request<{ members: Member[] }>(`/projects/${slug}/members`, {
      method: 'POST',
      body: { email, role },
      token,
    }),

  getIdeas: (slug: string) =>
    request<{ ideas: Idea[] }>(`/projects/${slug}/ideas`),

  getTags: (limit?: number) =>
    request<{ tags: Tag[] }>(`/projects/tags${limit ? `?limit=${limit}` : ''}`),
};

// Specs (public read, auth for write)
export const specs = {
  getTree: (slug: string, token?: string | null) =>
    request<{ tree: TreeNode[] }>(`/projects/${slug}/tree`, { token }),

  getContext: (slug: string, token?: string | null) =>
    request<ProjectContext>(`/projects/${slug}/context`, { token }),

  getReadme: (slug: string) =>
    request<{ file: string | null; content: string | null }>(`/projects/${slug}/readme`),

  read: (slug: string, path: string, ref?: string) =>
    request<{ path: string; content: string; ref: string }>(
      `/projects/${slug}/specs/${path}${ref ? `?ref=${ref}` : ''}`
    ),

  write: (token: string, slug: string, path: string, content: string, message?: string) =>
    request<{ path: string; updated: boolean }>(`/projects/${slug}/specs/${path}`, {
      method: 'PUT',
      body: { content, message },
      token,
    }),

  delete: (token: string, slug: string, path: string) =>
    request<{ deleted: boolean }>(`/projects/${slug}/specs/${path}`, {
      method: 'DELETE',
      token,
    }),

  history: (slug: string, path: string) =>
    request<{ path: string; history: Commit[] }>(`/projects/${slug}/history/${path}`),

  search: (slug: string, query: string) =>
    request<{ query: string; results: SearchResult[] }>(
      `/projects/${slug}/search?q=${encodeURIComponent(query)}`
    ),
};

// Ideas (independent, public read)
export const ideas = {
  list: (options?: { sort?: string; limit?: number; offset?: number; tag?: string; tags?: string[]; q?: string; author?: string; project?: string }, token?: string | null) => {
    const params = new URLSearchParams();
    if (options?.sort) params.set('sort', options.sort);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.tag) params.set('tag', options.tag);
    if (options?.tags && options.tags.length > 0) params.set('tags', options.tags.join(','));
    if (options?.q) params.set('q', options.q);
    if (options?.author) params.set('author', options.author);
    if (options?.project) params.set('project', options.project);
    const qs = params.toString();
    return request<{ ideas: Idea[] }>(`/ideas${qs ? `?${qs}` : ''}`, { token });
  },

  get: (id: string, token?: string | null) =>
    request<{ idea: Idea; comments: Comment[] }>(`/ideas/${id}`, { token }),

  create: (token: string, data: { title: string; content: string; summary?: string; tags?: string[] }) =>
    request<{ idea: Idea }>('/ideas', {
      method: 'POST',
      body: data,
      token,
    }),

  update: (token: string, id: string, data: { title?: string; content?: string; summary?: string; tags?: string[] }) =>
    request<{ idea: Idea }>(`/ideas/${id}`, {
      method: 'PATCH',
      body: data,
      token,
    }),

  delete: (token: string, id: string) =>
    request<{ deleted: boolean }>(`/ideas/${id}`, {
      method: 'DELETE',
      token,
    }),

  upvote: (token: string, id: string) =>
    request<{ upvoted: boolean }>(`/ideas/${id}/upvote`, {
      method: 'POST',
      token,
    }),

  addComment: (token: string, id: string, content: string, parentId?: string) =>
    request<{ comment: Comment }>(`/ideas/${id}/comments`, {
      method: 'POST',
      body: { content, parent_id: parentId },
      token,
    }),

  deleteComment: (token: string, ideaId: string, commentId: string) =>
    request<{ deleted: boolean }>(`/ideas/${ideaId}/comments/${commentId}`, {
      method: 'DELETE',
      token,
    }),

  linkProject: (token: string, id: string, slug: string) =>
    request<{ linked: boolean }>(`/ideas/${id}/projects`, {
      method: 'POST',
      body: { slug },
      token,
    }),

  unlinkProject: (token: string, id: string, slug: string) =>
    request<{ unlinked: boolean }>(`/ideas/${id}/projects/${slug}`, {
      method: 'DELETE',
      token,
    }),
};

// Tags
export const tags = {
  list: (limit?: number) =>
    request<{ tags: Tag[] }>(`/tags${limit ? `?limit=${limit}` : ''}`),

  getIdeas: (name: string, options?: { sort?: string; limit?: number; offset?: number }, token?: string | null) => {
    const params = new URLSearchParams();
    if (options?.sort) params.set('sort', options.sort);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    const qs = params.toString();
    return request<{ tag: string; ideas: Idea[] }>(`/tags/${name}/ideas${qs ? `?${qs}` : ''}`, { token });
  },
};

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  created_at: string;
}

export interface ApiToken {
  id: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url?: string | null;
  owner_id: string;
  owner_name?: string;
  tags?: string[];
  created_at: string;
  role?: string;
}

export interface Member {
  id: string;
  email: string;
  name: string;
  role: string;
  joined_at: string;
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: TreeNode[];
}

export interface ProjectContext {
  project: { slug: string; name: string; description: string | null };
  main_spec: string | null;
  skill: string | null;
  modules: { path: string; title: string | null }[];
  tree: TreeNode[];
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface SearchResult {
  path: string;
  title: string | null;
  snippet: string | null;
}

export interface Idea {
  id: string;
  author_id: string;
  author_name?: string;
  author_email?: string;
  title: string;
  content: string;
  summary?: string | null;
  cover_url?: string | null;
  upvote_count: number;
  comment_count: number;
  upvoted?: boolean;
  tags?: string[];
  projects?: { slug: string; name: string }[];
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  idea_id: string;
  author_id: string;
  author_name?: string;
  content: string;
  parent_id: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  count: string;
}
