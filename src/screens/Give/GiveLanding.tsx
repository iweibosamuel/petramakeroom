import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface GivingTier {
  title: string;
  description: ReactNode;
  image: string;
  imageAlt: string;
  to: string;
  titleClass: string;
  buttonClass: string;
}

const tiers: GivingTier[] = [
  {
    title: "Burden Bearer",
    description:
      "Every gift makes a difference. Give any amount as you are led and join us in carrying the vision forward.",
    image: "/images/BurdenBearer.png",
    imageAlt: "Armoured figure carrying a large boulder on their back",
    to: "/give/burden-bearer",
    titleClass: "text-[#0339a1]",
    buttonClass: "bg-[#0339a1] hover:bg-[#0339a1]/90",
  },
  {
    title: "Centurion",
    description: (
      <>
        This is for members who want to give <strong>₦10 million</strong> or
        more towards the vision and the work God is doing through this ministry.
      </>
    ),
    image: "/images/centurion.png",
    imageAlt: "Roman centurion in a flowing cape",
    to: "/give/centurion",
    titleClass: "text-[#a00238]",
    buttonClass: "bg-[#a00238] hover:bg-[#a00238]/90",
  },
];

export const GiveLanding = (): JSX.Element => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Mobile only: the cards sit in a horizontal scroll-snap row. Track which
  // card is closest to the left edge so the dots follow the swipe.
  function handleScroll() {
    const carousel = carouselRef.current;
    if (!carousel) return;
    let closest = 0;
    let closestDistance = Infinity;
    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const distance = Math.abs(card.offsetLeft - carousel.offsetLeft - carousel.scrollLeft);
      if (distance < closestDistance) {
        closest = index;
        closestDistance = distance;
      }
    });
    setActiveIndex(closest);
  }

  function scrollToCard(index: number) {
    const carousel = carouselRef.current;
    const card = cardRefs.current[index];
    if (!carousel || !card) return;
    carousel.scrollTo({
      left: card.offsetLeft - carousel.offsetLeft - 16,
      behavior: "smooth",
    });
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#fffaf4] px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto flex w-full max-w-[1222px] flex-col items-center">
        <Link to="/" className="mb-10 h-24 w-24">
          <img src="/images/Petra%20logo.svg" alt="Petra logo" className="h-24 w-24" />
        </Link>

        <h1 className="mb-8 w-full text-center font-drum text-[clamp(2rem,5vw,3.5rem)] font-bold uppercase leading-none text-black md:mb-12">
          Choose how you want to give
        </h1>

        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="no-scrollbar -mx-4 flex w-[calc(100%+2rem)] snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:w-full md:grid-cols-2 md:gap-[34px] md:overflow-visible md:px-0"
        >
          {tiers.map((tier, index) => (
            <article
              key={tier.title}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="flex w-[85%] max-w-[420px] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-[#d0d5dd] bg-[#fffaf4] md:w-auto md:max-w-none md:rounded-2xl"
            >
              <img
                src={tier.image}
                alt={tier.imageAlt}
                className="aspect-[594/394] w-full object-cover"
              />
              <div className="flex flex-1 flex-col gap-3 px-5 pt-5 text-left md:items-center md:gap-[18px] md:px-6 md:pt-6 md:text-center">
                <h2
                  className={`font-drum text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold uppercase leading-[1.05] md:max-w-[315px] ${tier.titleClass}`}
                >
                  {tier.title}
                </h2>
                <p className="[font-family:'Inter',Helvetica] text-base leading-6 text-[#161b26] md:max-w-[305px] md:leading-5">
                  {tier.description}
                </p>
              </div>
              <div className="px-5 pb-5 pt-4 md:mt-auto md:flex md:justify-center md:px-6 md:pb-10 md:pt-[18px]">
                <Link
                  to={tier.to}
                  className={`flex h-12 w-full items-center justify-center rounded-full font-drum text-sm font-bold text-white shadow-[0px_1px_2px_rgba(16,24,40,0.05)] transition-colors md:h-11 md:w-[158px] ${tier.buttonClass}`}
                >
                  GIVE
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 flex gap-2 md:hidden">
          {tiers.map((tier, index) => (
            <button
              key={tier.title}
              type="button"
              onClick={() => scrollToCard(index)}
              aria-label={`Show ${tier.title}`}
              aria-current={index === activeIndex}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                index === activeIndex ? "bg-black" : "bg-black/25"
              }`}
            />
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          Already filled the form?{" "}
          <Link to="/give/my" className="font-semibold text-black hover:underline">
            Track your giving
          </Link>
        </p>
      </div>
    </main>
  );
};
