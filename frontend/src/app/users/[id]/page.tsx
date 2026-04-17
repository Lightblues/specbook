import { redirect } from 'next/navigation';

type Params = { id: string };

export default async function UserPageRedirect({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  redirect(`/u/${id}`);
}
