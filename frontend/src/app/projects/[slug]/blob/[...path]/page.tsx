'use client';

import { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { FileText, Save, Eye, Code, Lock, Edit } from 'lucide-react';
import { specs, projects } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center">Loading editor...</div>,
});

type Params = { slug: string; path: string[] };

export default function BlobPage({ params }: { params: Promise<Params> }) {
  const { slug, path } = use(params);
  const filePath = path.join('/');
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [editMode, setEditMode] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');

  const { data: projectData } = useQuery({
    queryKey: ['project', slug],
    queryFn: () => projects.get(slug, token),
  });

  const { data: fileData, isLoading } = useQuery({
    queryKey: ['spec-file', slug, filePath],
    queryFn: async () => {
      const data = await specs.read(slug, filePath);
      setEditorContent(data.content);
      setOriginalContent(data.content);
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (content: string) =>
      specs.write(token!, slug, filePath, content, `Update ${filePath}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spec-file', slug, filePath] });
      setOriginalContent(editorContent);
      setEditMode(false);
    },
  });

  const canEdit = !!projectData?.role;
  const hasChanges = editorContent !== originalContent;
  const isMarkdown = filePath.endsWith('.md');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-blue-500">Specbook</Link>
            <span>/</span>
            <Link href="/projects" className="hover:text-blue-500">Projects</Link>
            <span>/</span>
            <Link href={`/projects/${slug}`} className="hover:text-blue-500">{projectData?.project.name || slug}</Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300 font-medium">{filePath}</span>
          </div>
        </div>

        {/* File Header */}
        <div className="bg-white dark:bg-gray-800 rounded-t-lg border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-gray-500" />
              <span className="font-mono text-sm">{filePath}</span>
              {hasChanges && editMode && (
                <span className="text-xs text-orange-500">● Modified</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle (for markdown) */}
              {isMarkdown && !editMode && (
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded">
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center gap-1 px-3 py-1 text-sm ${
                      viewMode === 'preview'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Eye size={14} />
                    Preview
                  </button>
                  <button
                    onClick={() => setViewMode('code')}
                    className={`flex items-center gap-1 px-3 py-1 text-sm ${
                      viewMode === 'code'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Code size={14} />
                    Code
                  </button>
                </div>
              )}

              {/* Edit/Save */}
              {canEdit ? (
                editMode ? (
                  <>
                    <button
                      onClick={() => {
                        setEditorContent(originalContent);
                        setEditMode(false);
                      }}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveMutation.mutate(editorContent)}
                      disabled={!hasChanges || saveMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      <Save size={14} />
                      {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                )
              ) : (
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Lock size={14} />
                  Read only
                </span>
              )}
            </div>
          </div>
        </div>

        {/* File Content */}
        <div className="bg-white dark:bg-gray-800 rounded-b-lg">
          {editMode || viewMode === 'code' ? (
            <MonacoEditor
              height="600px"
              language="markdown"
              theme="vs-dark"
              value={editorContent}
              onChange={(value) => setEditorContent(value || '')}
              options={{
                minimap: { enabled: false },
                wordWrap: 'on',
                lineNumbers: 'on',
                fontSize: 14,
                readOnly: !editMode,
              }}
            />
          ) : (
            <div className="p-8 prose dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {editorContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
