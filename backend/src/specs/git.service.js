import fs from 'fs/promises';
import path from 'path';
import git from 'isomorphic-git';
import { config } from '../config.js';

const getRepoPath = (projectId) => path.join(config.reposPath, `${projectId}`);

export async function initRepo(projectId) {
  const dir = getRepoPath(projectId);
  await fs.mkdir(dir, { recursive: true });
  await git.init({ fs, dir, defaultBranch: 'main' });
}

export async function deleteRepo(projectId) {
  const dir = getRepoPath(projectId);
  await fs.rm(dir, { recursive: true, force: true });
}

export async function listFiles(projectId, dirPath = '') {
  const dir = getRepoPath(projectId);
  const fullPath = path.join(dir, dirPath);

  try {
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      if (entry.name === '.git') continue;

      const relativePath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        files.push({ path: relativePath, type: 'dir' });
        const subFiles = await listFiles(projectId, relativePath);
        files.push(...subFiles);
      } else {
        files.push({ path: relativePath, type: 'file' });
      }
    }

    return files;
  } catch {
    return [];
  }
}

export async function readFile(projectId, filePath) {
  const dir = getRepoPath(projectId);
  const fullPath = path.join(dir, filePath);

  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    return content;
  } catch {
    return null;
  }
}

export async function writeFile(projectId, filePath, content, author, message) {
  const dir = getRepoPath(projectId);
  const fullPath = path.join(dir, filePath);

  // Ensure directory exists
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf-8');

  // Stage and commit
  await git.add({ fs, dir, filepath: filePath });

  try {
    await git.commit({
      fs,
      dir,
      message: message || `Update ${filePath}`,
      author: { name: author, email: `${author}@specbook.io` },
    });
  } catch (err) {
    // If nothing to commit (same content), that's ok
    if (!err.message?.includes('nothing to commit')) throw err;
  }
}

export async function deleteFile(projectId, filePath, author, message) {
  const dir = getRepoPath(projectId);
  const fullPath = path.join(dir, filePath);

  try {
    await fs.unlink(fullPath);
    await git.remove({ fs, dir, filepath: filePath });
    await git.commit({
      fs,
      dir,
      message: message || `Delete ${filePath}`,
      author: { name: author, email: `${author}@specbook.io` },
    });
    return true;
  } catch {
    return false;
  }
}

export async function getHistory(projectId, filePath, limit = 20) {
  const dir = getRepoPath(projectId);

  try {
    const commits = await git.log({
      fs,
      dir,
      depth: limit,
      ...(filePath && { filepath: filePath }),
    });

    return commits.map((c) => ({
      sha: c.oid,
      message: c.commit.message,
      author: c.commit.author.name,
      date: new Date(c.commit.author.timestamp * 1000).toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function readFileAtCommit(projectId, filePath, sha) {
  const dir = getRepoPath(projectId);

  try {
    const { blob } = await git.readBlob({
      fs,
      dir,
      oid: sha,
      filepath: filePath,
    });
    return new TextDecoder().decode(blob);
  } catch {
    return null;
  }
}

export async function getTree(projectId) {
  const files = await listFiles(projectId);
  return buildTree(files);
}

function buildTree(files) {
  const root = { name: '', type: 'dir', children: [] };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLast = i === parts.length - 1;

      let child = current.children.find((c) => c.name === name);
      if (!child) {
        child = {
          name,
          path: parts.slice(0, i + 1).join('/'),
          type: isLast ? file.type : 'dir',
          children: isLast && file.type === 'file' ? undefined : [],
        };
        current.children.push(child);
      }
      if (!isLast) current = child;
    }
  }

  return root.children;
}
