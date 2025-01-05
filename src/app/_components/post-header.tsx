import Avatar from "./avatar";
import CoverImage from "./cover-image";
import DateFormatter from "./date-formatter";
import { PostTitle } from "@/app/_components/post-title";
import { type Author } from "@/interfaces/author";
import TextToSpeech from "./TextToSpeech";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  author: Author;
  slug: string;
};

export function PostHeader({ title, coverImage, date, author, slug }: Props) {
  return (
    <>
      <PostTitle>{title}</PostTitle>
      <div className="text-lg text-gray-500 text-center md:text-left mb-6">
        <DateFormatter dateString={date} />
      </div>
      <div className="hidden md:block md:mb-12">
        <Avatar name={author.name} picture={author.picture} />
      </div>
      <div className="mb-8 md:mb-16 sm:mx-0">
        <CoverImage title={title} src={coverImage} />
      </div>
      <div className="max-w-2xl mx-auto">
        <div className="block md:hidden mb-6">
          <Avatar name={author.name} picture={author.picture} />
        </div>
        <div className="mb-6">
          <TextToSpeech slug={slug} />
        </div>
      </div>
    </>
  );
}
