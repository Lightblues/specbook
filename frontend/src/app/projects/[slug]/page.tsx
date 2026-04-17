'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FileText, Users, Lightbulb, Code, ArrowUp, MessageCircle, Tag } from 'lucide-react';
import { projects, specs, type Idea, type Member } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Params = { slug: string };
type TabType = 'overview' | 'ideas' | 'members';

export default function ProjectOverviewPage({ params }: { params: Promise<Params> }) {
  const { slug } = use(params);
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project', slug],
    queryFn: () => projects.get(slug, token),
  });

  const { data: readmeData } = useQuery({
    queryKey: ['project-readme', slug],
    queryFn: () => specs.getReadme(slug),
  });

  const { data: ideasData } = useQuery({
    queryKey: ['project-ideas', slug],
    queryFn: () => projects.getIdeas(slug),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        Loading...
      </div>
    );
  }

  const project = projectData?.project;
  const members = projectData?.members || [];
  const linkedIdeas = ideasData?.ideas || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Cover/Banner */}
      {project?.cover_url && (
        <div
          className="h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${project.cover_url})` }}
        />
      )}

      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">{project?.name}</h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">{project?.description}</p>
            {/* Project Tags */}
            {project?.tags && project.tags.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <Tag size={16} className="text-gray-400" />
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag: string) => (
                    <Link
                      key={tag}
                      href={`/projects?tags=${encodeURIComponent(tag)}`}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Users size={16} />
                {members.length} members
              </span>
              <span className="flex items-center gap-1">
                <Lightbulb size={16} />
                {linkedIdeas.length} ideas
              </span>
              {projectData?.role && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                  {projectData.role}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/projects/${slug}/files`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Code size={18} />
              View Files
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-blue-500 text-blue-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-500'
                }`}
              >
                Overview
              </button>
              <Link
                href={`/projects/${slug}/files`}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-blue-500"
              >
                Files
              </Link>
              <button
                onClick={() => setActiveTab('ideas')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'ideas'
                    ? 'border-b-2 border-blue-500 text-blue-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-500'
                }`}
              >
                Ideas ({linkedIdeas.length})
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'members'
                    ? 'border-b-2 border-blue-500 text-blue-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-500'
                }`}
              >
                Members ({members.length})
              </button>
            </nav>
          </div>

          <div className="p-8">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              readmeData?.content ? (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <FileText size={16} />
                    <span>{readmeData.file}</span>
                  </div>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {readmeData.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No README found</p>
                  <p className="text-sm mt-2">
                    Add a README.md, SPEC.md, or SKILL.md to get started
                  </p>
                </div>
              )
            )}

            {/* Ideas Tab */}
            {activeTab === 'ideas' && (
              linkedIdeas.length > 0 ? (
                <div className="space-y-4">
                  {linkedIdeas.map((idea: Idea) => (
                    <Link
                      key={idea.id}
                      href={`/ideas/${idea.id}`}
                      className="block bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <h3 className="font-semibold text-lg mb-1">{idea.title}</h3>
                      {idea.summary && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                          {idea.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <ArrowUp size={14} />
                          {idea.upvote_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={14} />
                          {idea.comment_count}
                        </span>
                        <span>by {idea.author_name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Lightbulb size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No linked ideas yet</p>
                </div>
              )
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-3">
                {members.map((member: Member) => (
                  <Link
                    key={member.id}
                    href={`/u/${member.id}`}
                    className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${member.id}`}
                      alt={member.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      member.role === 'owner'
                        ? 'bg-yellow-100 text-yellow-700'
                        : member.role === 'admin'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {member.role}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
