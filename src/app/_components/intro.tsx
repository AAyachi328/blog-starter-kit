import { CMS_NAME } from "@/lib/constants";
import NotificationToggle from "./NotificationToggle";

export function Intro() {
  return (
    <section className="flex-col md:flex-row flex items-center md:justify-between mt-16 mb-16 md:mb-12">
      <h1 className="text-5xl md:text-8xl font-bold tracking-tighter leading-tight md:pr-8">
        Actus Tennis 🎾
      </h1>
      <div className="text-center md:text-left mt-5 md:pl-8">
        <h4 className="text-lg mb-4">
          Les actus du tennis à ne pas manquer !!! - {CMS_NAME}.
        </h4>
        <NotificationToggle />
      </div>
    </section>
  )
}
