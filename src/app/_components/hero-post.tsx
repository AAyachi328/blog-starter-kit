import Avatar from "@/app/_components/avatar";
import CoverImage from "@/app/_components/cover-image";
import { type Author } from "@/interfaces/author";
import Link from "next/link";
import DateFormatter from "./date-formatter";
import TextToSpeech from "./TextToSpeech";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  excerpt: string;
  author: Author;
  slug: string;
};

export function HeroPost({
  title,
  coverImage,
  date,
  excerpt,
  author,
  slug,
}: Props) {
  return (
    <section>
      <div className="mb-8 md:mb-16">
        <CoverImage title={title} src={coverImage} slug={slug} />
      </div>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h3 className="mb-2 text-4xl lg:text-5xl leading-tight">
            <Link href={`/posts/${slug}`} className="hover:underline">
              {title}
            </Link>
          </h3>
          <p className="text-lg leading-relaxed mb-4 max-w-2xl mx-auto">{excerpt}</p>
          <div className="text-lg mb-6 text-gray-500">
            <DateFormatter dateString={date} />
          </div>
          <div className="flex justify-center items-center gap-8 flex-wrap">
            <TextToSpeech slug={slug} />
            <Avatar name={author.name} picture={author.picture} />
          </div>
        </div>
      </div>
    </section>
  );
}
