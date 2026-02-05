import { redirect } from 'next/navigation';

type Params = { name: string };

export default async function TagPageRedirect({ params }: { params: Promise<Params> }) {
  const { name } = await params;
  redirect(`/ideas?tag=${encodeURIComponent(name)}`);
}
