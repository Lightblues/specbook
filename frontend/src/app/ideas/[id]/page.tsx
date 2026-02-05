'use client';

import { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, MessageCircle, Tag, Link as LinkIcon, Send } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ideas, type Comment } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

type Params = { id: string };

export default function IdeaDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const { token, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['idea', id],
    queryFn: () => ideas.get(id, token),
  });

  const upvoteMutation = useMutation({
    mutationFn: () => ideas.upvote(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['idea', id] }),
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => ideas.addComment(token!, id, content),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['idea', id] });
    },
  });

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !token) return;
    commentMutation.mutate(commentText.trim());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        Loading...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load idea</p>
          <Link href="/ideas" className="text-blue-500 hover:underline">
            Back to ideas
          </Link>
        </div>
      </div>
    );
  }

  const { idea, comments } = data;
  const timeAgo = getTimeAgo(idea.created_at);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
          {/* Cover Image */}
          {idea.cover_url && (
            <div className="w-full h-64 bg-cover bg-center" style={{ backgroundImage: `url(${idea.cover_url})` }} />
          )}

          <div className="p-6">
            {/* Header */}
            <div className="flex gap-4">
            {/* Upvote */}
            <div className="flex flex-col items-center pt-1">
              <button
                onClick={() => token && upvoteMutation.mutate()}
                disabled={!token}
                className={`p-2 rounded-lg transition-colors ${
                  idea.upvoted
                    ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/30'
                    : token
                    ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <ArrowUp size={24} />
              </button>
              <span className={`text-lg font-bold ${idea.upvoted ? 'text-orange-500' : 'text-gray-600'}`}>
                {idea.upvote_count}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{idea.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <Link href={`/u/${idea.author_id}`} className="hover:text-blue-500">
                  by {idea.author_name}
                </Link>
                <span>{timeAgo}</span>
                <span className="flex items-center gap-1">
                  <MessageCircle size={14} />
                  {idea.comment_count} comments
                </span>
              </div>

              {/* Tags */}
              {idea.tags && idea.tags.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <Tag size={14} className="text-gray-400" />
                  {idea.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/ideas?tag=${encodeURIComponent(tag)}`}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm hover:bg-gray-200"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Linked Projects */}
              {idea.projects && idea.projects.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <LinkIcon size={14} className="text-gray-400" />
                  {idea.projects.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/projects/${p.slug}`}
                      className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm hover:bg-blue-200"
                    >
                      {p.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="mt-6 pl-16 prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {idea.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Comments */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-6">
          <h2 className="font-semibold text-lg mb-4">
            Comments ({comments.length})
          </h2>

          {/* Add comment */}
          {token ? (
            <form onSubmit={handleComment} className="mb-6">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 min-h-[80px] text-sm"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={!commentText.trim() || commentMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
                    >
                      <Send size={14} />
                      {commentMutation.isPending ? 'Posting...' : 'Comment'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <p className="text-gray-500 text-sm mb-6">
              <Link href="/" className="text-blue-500 hover:underline">
                Login
              </Link>{' '}
              to comment
            </p>
          )}

          {/* Comment list */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-sm">No comments yet</p>
            ) : (
              comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const timeAgo = getTimeAgo(comment.created_at);

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-medium">
        {comment.author_name?.charAt(0).toUpperCase() || '?'}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{comment.author_name}</span>
          <span className="text-gray-500">{timeAgo}</span>
        </div>
        <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
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
