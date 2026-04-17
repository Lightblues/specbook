'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FileText, Folder, ChevronRight } from 'lucide-react';
import { specs, projects, type TreeNode } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

type Params = { slug: string };

export default function FilesPage({ params }: { params: Promise<Params> }) {
  const { slug } = use(params);
  const { token } = useAuthStore();

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', slug],
    queryFn: () => projects.get(slug, token),
  });

  const { data: context, isLoading: contextLoading } = useQuery({
    queryKey: ['project-context', slug],
    queryFn: () => specs.getContext(slug, token),
  });

  const isLoading = projectLoading || contextLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-blue-500">Specbook</Link>
            <span>/</span>
            <Link href="/projects" className="hover:text-blue-500">Projects</Link>
            <span>/</span>
            <Link href={`/projects/${slug}`} className="hover:text-blue-500">{context?.project.name || slug}</Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300 font-medium">Files</span>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{context?.project.name}</h1>
            <p className="text-gray-500 mt-1">/{slug}</p>
          </div>
          {projectData?.role && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">
              {projectData.role}
            </span>
          )}
        </div>

        {/* File Tree */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <h2 className="font-semibold">Files</h2>
          </div>
          <div className="p-4">
            {context?.tree && context.tree.length > 0 ? (
              <FileTree nodes={context.tree} slug={slug} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Folder size={48} className="mx-auto mb-4 opacity-50" />
                <p>No files yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FileTree({ nodes, slug, level = 0 }: { nodes: TreeNode[]; slug: string; level?: number }) {
  return (
    <div style={{ paddingLeft: level * 16 }}>
      {nodes.map((node) => (
        <div key={node.path}>
          {node.type === 'dir' ? (
            <>
              <div className="flex items-center gap-2 py-2 text-gray-700 dark:text-gray-300">
                <Folder size={16} className="text-blue-500" />
                <span className="font-medium">{node.name}</span>
              </div>
              {node.children && <FileTree nodes={node.children} slug={slug} level={level + 1} />}
            </>
          ) : (
            <Link
              href={`/projects/${slug}/blob/${node.path}`}
              className="flex items-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 -mx-2"
            >
              <FileText size={16} className="text-gray-500" />
              <span>{node.name}</span>
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
