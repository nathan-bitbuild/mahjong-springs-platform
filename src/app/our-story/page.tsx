import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Our Story | Mahjong Springs, Utah County" },
  description: "Meet Lyndsey and Denise, the friends behind Mahjong Springs, an 8-week American Mahjong league in Saratoga Springs and Utah County.",
};

export default function StoryPage() {
  return (
    <main id="main">
      <header className="page-hero"><div className="eyebrow">Our Story</div><h1>Two friends, one table</h1></header>
      <div className="content-area"><div className="ms-wrap prose">
        <img src="/images/founders-table-v2.jpg" alt="Lyndsey and Denise laughing over a game of mahjong" />
        <p>Mahjong Springs began the way the best things do: around a table with friends, a bowl of candy, and “just one more game.”</p>
        <p>We’re two friends who were always looking for a reason to get together. We fell for the click of the tiles and the laughter and conversation in between. Soon we wanted more than a game night. We wanted a community that always has room for one more, playing the same game we love with a dash of competition (and a few prizes) added in.</p>
        <p className="ms-story-signoff">Always room at our table.</p>
        <p className="ms-story-byline">— Lyndsey &amp; Denise</p>
        <p>Mahjong Springs is based in Saratoga Springs, Utah 84045. Lyndsey and Denise run the home leagues. Organizers in other states can host their own seasons on this platform and keep their entry fees.</p>
      </div></div>
    </main>
  );
}
