export const metadata = {
  title: { absolute: "Contact Us | Mahjong Springs in Utah County" },
  description: "Get in touch with Mahjong Springs at hello@mahjongsprings.com.",
};

export default function ContactPage() {
  return (
    <main id="main">
      <header className="page-hero"><div className="eyebrow">Hello</div><h1>Contact</h1></header>
      <div className="content-area"><div className="ms-wrap prose">
        <p>Email <a href="mailto:hello@mahjongsprings.com">hello@mahjongsprings.com</a>.</p>
        <p>Mahjong Springs is based in Saratoga Springs, Utah 84045. Instagram: <a href="https://www.instagram.com/mahjongsprings/">@mahjongsprings</a>.</p>
      </div></div>
    </main>
  );
}
