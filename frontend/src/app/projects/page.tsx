'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { FolderOpen, Users, Tag, X } from 'lucide-react';
import { projects, type Project, type Tag as TagType } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">Loading...</div>}>
      <ProjectsPageContent />
    </Suspense>
  );
}

function ProjectsPageContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Sync from URL on mount
  useEffect(() => {
    const tagParam = searchParams.get('tag');
    const tagsParam = searchParams.get('tags');

    if (tagParam) {
      setSelectedTags([tagParam]);
    } else if (tagsParam) {
      setSelectedTags(tagsParam.split(','));
    }
  }, [searchParams]);

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['all-projects', selectedTags],
    queryFn: () => projects.list({
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    }),
  });

  const { data: tagsData } = useQuery({
    queryKey: ['project-tags'],
    queryFn: () => projects.getTags(20),
  });

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    router.push('/projects');
  };

  const hasFilters = selectedTags.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Browse all public projects
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                My Projects
              </Link>
              <Link
                href="/projects/new"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              >
                New Project
              </Link>
            </div>
          )}
        </div>

        {/* Active filters */}
        {hasFilters && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {selectedTags.map(tag => (
              <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-sm">
                <Tag size={12} />
                {tag}
                <button onClick={() => toggleTag(tag)} className="hover:text-blue-900">
                  <X size={14} />
                </button>
              </span>
            ))}
            <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700 underline">
              Clear all
            </button>
          </div>
        )}

        <div className="flex gap-6">
          {/* Projects grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : projectsData?.projects.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                <FolderOpen size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">
                  {hasFilters ? 'No projects match your filters' : 'No public projects yet'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {projectsData?.projects.map((project: Project) => (
                  <ProjectCard key={project.id} project={project} onTagClick={toggleTag} selectedTags={selectedTags} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-64 hidden lg:block">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Tag size={16} />
                Filter by Tags
              </h3>
              {tagsData?.tags && tagsData.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tagsData.tags.map((tag: TagType) => (
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
              ) : (
                <p className="text-sm text-gray-500">No tags yet. Create a project with tags to get started.</p>
              )}
              {selectedTags.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function ProjectCard({
  project,
  onTagClick,
  selectedTags,
}: {
  project: Project;
  onTagClick: (tag: string) => void;
  selectedTags: string[];
}) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
    >
      {/* Cover Image */}
      {project.cover_url ? (
        <div
          className="h-32 bg-cover bg-center"
          style={{ backgroundImage: `url(${project.cover_url})` }}
        />
      ) : (
        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
          <FolderOpen size={48} className="text-white/50" />
        </div>
      )}

      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
        <p className="text-gray-500 text-sm mb-3 line-clamp-2">
          {project.description || 'No description'}
        </p>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.tags.slice(0, 3).map((tag) => (
              <button
                key={tag}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
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
            {project.tags.length > 3 && (
              <span className="px-2 py-0.5 text-gray-500 text-xs">
                +{project.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Users size={14} />
            {project.owner_name}
          </span>
          <span>/{project.slug}</span>
        </div>
      </div>
    </Link>
  );
}
