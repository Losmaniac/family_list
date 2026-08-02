interface ProfilePageProps {
  params: Promise<{ userId: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { userId } = await params;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Profil</h1>
      <p className="text-zinc-500">Uživatel: {userId}</p>
    </div>
  );
}
