import { loginAction } from "@/app/admin/actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl font-semibold text-foreground">Админ нэвтрэх</h1>
        <p className="mt-1 text-sm text-muted-foreground">Толь бичгийн удирдлагын самбар</p>

        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form action={loginAction} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Имэйл эсвэл нэр
            <input
              type="text"
              name="name"
              required
              autoFocus
              className="rounded-md border border-border bg-surface px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Нууц үг
            <input
              type="password"
              name="password"
              required
              className="rounded-md border border-border bg-surface px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-md bg-primary px-4 py-2 font-medium text-white hover:bg-primary-dark"
          >
            Нэвтрэх
          </button>
        </form>
      </div>
    </main>
  );
}
