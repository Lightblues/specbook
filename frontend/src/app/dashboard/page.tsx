'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus, FolderOpen, Lightbulb, ArrowUp, MessageCircle } from 'lucide-react';
import { projects, ideas, type Idea } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

export default function Dashboard() {
  const router = useRouter();
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.push('/');
    }
  }, [token, router]);

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['my-projects'],
    queryFn: () => projects.list(token),
    enabled: !!token,
  });

  const { data: ideasData, isLoading: ideasLoading } = useQuery({
    queryKey: ['my-ideas'],
    queryFn: () => ideas.list({ author: user?.id, limit: 10 }, token),
    enabled: !!token && !!user,
  });

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Projects Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">My Projects</h2>
            <Link
              href="/projects/new"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus size={20} />
              New Project
            </Link>
          </div>

          {projectsLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : projectsData?.projects.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow">
              <FolderOpen size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-4">No projects yet</p>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Plus size={20} />
                Create your first project
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projectsData?.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.slug}`}
                  className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                  <p className="text-gray-500 text-sm mb-2 line-clamp-2">
                    {project.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                      {project.role}
                    </span>
                    <span>/{project.slug}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Ideas Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">My Ideas</h2>
            <Link
              href="/ideas"
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              View all ideas
            </Link>
          </div>

          {ideasLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : ideasData?.ideas.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow">
              <Lightbulb size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-4">No ideas yet</p>
              <p className="text-sm text-gray-400">
                Share your ideas with the community from the Ideas page
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ideasData?.ideas.map((idea: Idea) => (
                <Link
                  key={idea.id}
                  href={`/ideas/${idea.id}`}
                  className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-semibold mb-2 line-clamp-1">{idea.title}</h3>
                  {idea.summary && (
                    <p className="text-gray-500 text-sm mb-2 line-clamp-2">{idea.summary}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <ArrowUp size={12} />
                      {idea.upvote_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} />
                      {idea.comment_count}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
