import { loginAdmin } from "@/app/actions";

export default async function AdminLoginPage({ searchParams }) {
  const params = await searchParams;
  const hasError = params?.error === "1";

  return (
    <main className="page-shell narrow">
      <section className="edit-panel">
        <p className="eyebrow">Nick Rizzo Daily</p>
        <h1 className="compact-title">Admin Login</h1>
        {hasError ? (
          <div className="empty-state">That password did not work.</div>
        ) : null}
        <form action={loginAdmin}>
          <label>
            Password
            <input name="password" required type="password" />
          </label>
          <div className="actions">
            <button className="button primary" type="submit">
              Log in
            </button>
            <a className="button" href="/">
              Public site
            </a>
          </div>
        </form>
      </section>
    </main>
  );
}
