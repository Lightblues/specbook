'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Copy, Check, User } from 'lucide-react';
import { auth } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const [tokenName, setTokenName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: tokensData, isLoading } = useQuery({
    queryKey: ['api-tokens'],
    queryFn: () => auth.listTokens(token!),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => auth.createToken(token!, name),
    onSuccess: (data) => {
      setNewToken(data.token);
      setTokenName('');
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (tokenId: string) => auth.deleteToken(token!, tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
    },
  });

  const copyToken = async () => {
    if (newToken) {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!token) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {/* Profile Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">Name:</span>
              <span className="ml-2">{user?.name}</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Email:</span>
              <span className="ml-2">{user?.email}</span>
            </div>
          </div>
          <Link
            href={`/u/${user?.id}`}
            className="inline-flex items-center gap-2 mt-4 text-sm text-blue-500 hover:text-blue-600"
          >
            <User size={16} />
            View my public profile
          </Link>
        </section>

        {/* API Tokens Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">API Tokens</h2>
          <p className="text-sm text-gray-500 mb-4">
            Create tokens for your Coding Agents to access Specbook API.
            Save the token to <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">~/.specbook/credentials.json</code>
          </p>

          {/* New token alert */}
          {newToken && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                Token created! Copy it now - it won't be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-white dark:bg-gray-800 rounded border font-mono text-sm break-all">
                  {newToken}
                </code>
                <button
                  onClick={copyToken}
                  className="p-2 hover:bg-green-100 dark:hover:bg-green-800 rounded"
                >
                  {copied ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
                </button>
              </div>
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                <p>Save to credentials file:</p>
                <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">
{`mkdir -p ~/.specbook
echo '{"token": "${newToken}"}' > ~/.specbook/credentials.json`}
                </pre>
              </div>
            </div>
          )}

          {/* Create token form */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="Token name (e.g., Claude Code)"
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <button
              onClick={() => createMutation.mutate(tokenName || 'API Token')}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <Plus size={20} />
              Create
            </button>
          </div>

          {/* Token list */}
          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : tokensData?.tokens.length === 0 ? (
            <p className="text-gray-500 text-sm">No API tokens yet</p>
          ) : (
            <div className="space-y-2">
              {tokensData?.tokens.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(t.created_at).toLocaleDateString()}
                      {t.last_used_at && (
                        <> · Last used: {new Date(t.last_used_at).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(t.id)}
                    disabled={deleteMutation.isPending}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
