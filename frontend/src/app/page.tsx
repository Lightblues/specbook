'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowUp, MessageCircle, ArrowRight, TrendingUp, FolderOpen, Users } from 'lucide-react';
import { ideas, projects, type Idea, type Project } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function HomePage() {
  const { token } = useAuthStore();

  const { data: trendingIdeas } = useQuery({
    queryKey: ['ideas', 'hot'],
    queryFn: () => ideas.list({ sort: 'hot', limit: 6 }, token),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projects.list(),
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Where Specs Meet Ideas
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          A collaborative platform for teams to write specs, share ideas, and build together with AI-powered coding assistants.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/ideas"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Explore Ideas
          </Link>
          <Link
            href="/projects"
            className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition-colors font-medium"
          >
            Browse Projects
          </Link>
        </div>
      </section>

      {/* Trending Ideas */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="text-orange-500" />
            Trending Ideas
          </h2>
          <Link
            href="/ideas"
            className="text-blue-500 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingIdeas?.ideas.slice(0, 6).map((idea: Idea) => (
            <Link
              key={idea.id}
              href={`/ideas/${idea.id}`}
              className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
            >
              {idea.cover_url && (
                <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${idea.cover_url})` }} />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{idea.title}</h3>
                {idea.summary && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                    {idea.summary}
                  </p>
                )}
                {/* Tags */}
                {idea.tags && idea.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {idea.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <ArrowUp size={16} />
                    {idea.upvote_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle size={16} />
                    {idea.comment_count}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Projects */}
      <section className="max-w-6xl mx-auto px-4 py-12 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="text-blue-500" />
            Featured Projects
          </h2>
          <Link
            href="/projects"
            className="text-blue-500 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectsData?.projects.slice(0, 6).map((project: Project) => (
            <Link
              key={project.id}
              href={`/projects/${project.slug}`}
              className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
            >
              {/* Cover Image */}
              {project.cover_url ? (
                <div
                  className="h-40 bg-cover bg-center"
                  style={{ backgroundImage: `url(${project.cover_url})` }}
                />
              ) : (
                <div className="h-40 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <FolderOpen size={48} className="text-white/50" />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-1">{project.name}</h3>
                {project.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}
                {/* Tags */}
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users size={14} />
                  <span>{project.owner_name}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
