'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowUp, MessageCircle, Lightbulb, Calendar } from 'lucide-react';
import { ideas, type Idea } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

type Params = { id: string };

export default function UserPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const { token } = useAuthStore();

  const { data: ideasData, isLoading } = useQuery({
    queryKey: ['user-ideas', id],
    queryFn: () => ideas.list({ author: id, limit: 50 }, token),
  });

  const userIdeas = ideasData?.ideas || [];
  const userName = userIdeas[0]?.author_name || 'User';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* User Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-center gap-6">
            <img
              src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${id}`}
              alt={userName}
              className="w-24 h-24 rounded-full border-4 border-gray-200 dark:border-gray-600"
            />
            <div>
              <h1 className="text-3xl font-bold">{userName}</h1>
              <div className="flex items-center gap-4 mt-2 text-gray-500">
                <span className="flex items-center gap-1">
                  <Lightbulb size={18} />
                  {userIdeas.length} ideas
                </span>
                <span className="flex items-center gap-1">
                  <ArrowUp size={18} />
                  {userIdeas.reduce((sum, i) => sum + i.upvote_count, 0)} upvotes received
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User's Ideas */}
        <h2 className="text-2xl font-bold mb-4">Ideas by {userName}</h2>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : userIdeas.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <Lightbulb size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No ideas yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {userIdeas.map((idea: Idea) => (
              <Link
                key={idea.id}
                href={`/ideas/${idea.id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg p-4 shadow hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-lg mb-1 hover:text-blue-500">
                  {idea.title}
                </h3>
                {idea.summary && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-2">
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
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(idea.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
