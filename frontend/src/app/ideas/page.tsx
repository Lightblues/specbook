'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowUp, MessageCircle, Clock, TrendingUp, Flame, Plus, Tag, FolderOpen, X, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { ideas, tags, projects, type Idea, type Project } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

type SortType = 'hot' | 'new' | 'top';

export default function IdeasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">Loading...</div>}>
      <IdeasPageContent />
    </Suspense>
  );
}

function IdeasPageContent() {
  const { token, user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [sort, setSort] = useState<SortType>('hot');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  // Sync from URL on mount
  useEffect(() => {
    const tagParam = searchParams.get('tag');
    const tagsParam = searchParams.get('tags');
    const projectParam = searchParams.get('project');

    if (tagParam) {
      setSelectedTags([tagParam]);
    } else if (tagsParam) {
      setSelectedTags(tagsParam.split(','));
    }
    if (projectParam) {
      setSelectedProjects([projectParam]);
    }
  }, [searchParams]);

  // Fetch ideas with filters
  const { data: ideasData, isLoading } = useQuery({
    queryKey: ['ideas', sort, selectedTags, selectedProjects],
    queryFn: () => ideas.list({
      sort,
      limit: 50,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      project: selectedProjects.length > 0 ? selectedProjects[0] : undefined,
    }, token),
  });

  // Fetch tags for sidebar
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tags.list(20),
  });

  // Fetch projects for sidebar
  const { data: projectsData } = useQuery({
    queryKey: ['projects-for-filter'],
    queryFn: () => projects.list(),
  });

  const upvoteMutation = useMutation({
    mutationFn: (ideaId: string) => ideas.upvote(token!, ideaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas'] }),
  });

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const toggleProject = (slug: string) => {
    setSelectedProjects(prev =>
      prev.includes(slug)
        ? prev.filter(p => p !== slug)
        : [...prev, slug]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedProjects([]);
    router.push('/ideas');
  };

  const hasFilters = selectedTags.length > 0 || selectedProjects.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Header with filters summary */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Sort tabs */}
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1">
              {[
                { key: 'hot', icon: Flame, label: 'Hot' },
                { key: 'new', icon: Clock, label: 'New' },
                { key: 'top', icon: TrendingUp, label: 'Top' },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setSort(key as SortType)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    sort === key
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            {/* Active filters */}
            {hasFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                {selectedTags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-sm">
                    <Tag size={12} />
                    {tag}
                    <button onClick={() => toggleTag(tag)} className="hover:text-blue-900">
                      <X size={14} />
                    </button>
                  </span>
                ))}
                {selectedProjects.map(slug => (
                  <span key={slug} className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-sm">
                    <FolderOpen size={12} />
                    {slug}
                    <button onClick={() => toggleProject(slug)} className="hover:text-green-900">
                      <X size={14} />
                    </button>
                  </span>
                ))}
                <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700 underline">
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* New Idea button
          {token && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
            >
              <Plus size={16} />
              New Idea
            </button>
          )} */}
        </div>

        <div className="flex gap-6">
          {/* Ideas list */}
          <div className="flex-1 space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : ideasData?.ideas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {hasFilters ? 'No ideas match your filters.' : 'No ideas yet. Be the first!'}
              </div>
            ) : (
              ideasData?.ideas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onUpvote={() => token && upvoteMutation.mutate(idea.id)}
                  canUpvote={!!token}
                  onTagClick={toggleTag}
                  selectedTags={selectedTags}
                />
              ))
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-64 hidden lg:block space-y-4">
            {/* Tags filter */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Tag size={16} />
                Filter by Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {tagsData?.tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    className={`px-2 py-1 rounded text-sm transition-colors ${
                      selectedTags.includes(tag.name)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tag.name}
                    <span className="ml-1 opacity-70">({tag.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Projects filter */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FolderOpen size={16} />
                Filter by Project
              </h3>
              <div className="flex flex-wrap gap-2">
                {projectsData?.projects.slice(0, 10).map((project: Project) => (
                  <button
                    key={project.id}
                    onClick={() => toggleProject(project.slug)}
                    className={`px-2 py-1 rounded text-sm transition-colors ${
                      selectedProjects.includes(project.slug)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {project.name}
                  </button>
                ))}
              </div>
              {projectsData?.projects && projectsData.projects.length > 10 && (
                <Link href="/projects" className="text-sm text-blue-500 hover:text-blue-600 mt-2 inline-block">
                  View all projects
                </Link>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Create Modal */}
      {showCreate && token && (
        <CreateIdeaModal
          token={token}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ['ideas'] });
          }}
        />
      )}
    </div>
  );
}

function IdeaCard({
  idea,
  onUpvote,
  canUpvote,
  onTagClick,
  selectedTags,
}: {
  idea: Idea;
  onUpvote: () => void;
  canUpvote: boolean;
  onTagClick: (tag: string) => void;
  selectedTags: string[];
}) {
  const timeAgo = getTimeAgo(idea.created_at);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden flex gap-4">
      {/* Cover Image */}
      {idea.cover_url && (
        <Link href={`/ideas/${idea.id}`} className="w-40 shrink-0">
          <img
            src={idea.cover_url}
            alt={idea.title}
            className="w-full h-full object-cover"
          />
        </Link>
      )}

      <div className="flex gap-4 p-4 flex-1">
        {/* Upvote */}
        <div className="flex flex-col items-center">
          <button
            onClick={onUpvote}
            disabled={!canUpvote}
            className={`p-1.5 rounded transition-colors ${
              idea.upvoted
                ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/30'
                : canUpvote
                ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <ArrowUp size={20} />
          </button>
          <span className={`text-sm font-medium ${idea.upvoted ? 'text-orange-500' : 'text-gray-600'}`}>
            {idea.upvote_count}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Link href={`/ideas/${idea.id}`} className="block">
            <h2 className="font-semibold text-lg hover:text-blue-500 line-clamp-1">
              {idea.title}
            </h2>
          </Link>
          {idea.summary && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">
              {idea.summary}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <Link href={`/u/${idea.author_id}`} className="hover:text-blue-500">
              by {idea.author_name}
            </Link>
            <span>{timeAgo}</span>
            <span className="flex items-center gap-1">
              <MessageCircle size={14} />
              {idea.comment_count}
            </span>
          </div>

          {/* Tags */}
          {idea.tags && idea.tags.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {idea.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={(e) => {
                    e.preventDefault();
                    onTagClick(tag);
                  }}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Linked Projects */}
          {idea.projects && idea.projects.length > 0 && (
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {idea.projects.map((p) => (
                <Link
                  key={p.slug}
                  href={`/projects/${p.slug}`}
                  className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs hover:bg-blue-200"
                >
                  <LinkIcon size={10} />
                  {p.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateIdeaModal({
  token,
  onClose,
  onCreated,
}: {
  token: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const tagList = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      await ideas.create(token, {
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || undefined,
        tags: tagList.length > 0 ? tagList : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create idea');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Share an Idea</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="A concise title for your idea"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Summary (optional)</label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="Brief description shown in the feed"
                maxLength={500}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Content (Markdown)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 min-h-[200px] font-mono text-sm"
                placeholder="## Problem&#10;&#10;Describe the problem...&#10;&#10;## Solution&#10;&#10;Your proposed solution..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="feature, search, v0.3"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim() || !content.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Idea'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
