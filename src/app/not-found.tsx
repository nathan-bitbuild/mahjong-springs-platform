import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="content-area">
      <div className="ms-wrap prose">
        <h1>Page not found</h1>
        <p><Link href="/">Back home</Link></p>
      </div>
    </main>
  );
}
