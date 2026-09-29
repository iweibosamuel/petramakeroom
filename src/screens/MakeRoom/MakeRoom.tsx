import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { GivingProgress } from "./GivingProgress";


const loopWords = ["MORE", "MULTITUDES", "NATIONS"];

const getLoopWordFontSize = (word: string): string => {
  const scale = Math.min(1, loopWords[0].length / word.length);
  const min = (2.5 * scale).toFixed(2);
  const preferred = (16 * scale).toFixed(2);
  const max = (16.5625 * scale).toFixed(2);
  return `clamp(${min}rem, ${preferred}vw, ${max}rem)`;
};

const scripture = {
  text: "“God says so! “Clear lots of ground for your tents! Make your tents large. Spread out! Think big! Use plenty of rope, drive the tent pegs deep. You’re going to need lots of elbow room for your growing family. You’re going to take over whole nations; you’re going to resettle abandoned cities. Don’t be afraid—you’re not going to be embarrassed. Don’t hold back—you’re not going to come up short.“",
  reference: "Isaiah 54:2-4 MSG",
};

export const MakeRoom = (): JSX.Element => {
  const [wordIndex, setWordIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % loopWords.length);
        setIsVisible(true);
      }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <main
      className="w-full overflow-hidden bg-[#fffaf4]"
      data-model-id="357:17077"
    >
      <section className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col items-center">
        <header className="flex w-full flex-col items-center pt-6 sm:pt-8">
          <img
            className="mb-8 h-24 w-24"
            alt="Petra logo"
            src="/images/Petra%20logo.svg"
          />
          <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center px-4 text-center [font-family:'Zalando_Sans_SemiExpanded',Helvetica] tracking-[0]">
            {/* Scales with the screen so it never overflows a phone; caps at
                200px on desktop. */}
            <h1 className="flex flex-col items-center font-drum text-[clamp(2.75rem,15vw,12.5rem)] font-bold leading-[0.82] text-black">
              <span>MAKE</span>
              <span>ROOM</span>
            </h1>
            <p className="mt-6 text-center text-[clamp(3rem,13.2vw,5.9rem)] font-bold leading-none tracking-[0] text-[#280084] sm:mt-8">
              LAGOS
            </p>
            <blockquote className="mt-6 max-w-[542px] text-center [font-family:'Inter',Helvetica] text-base leading-[22px] text-[#161b26]">
              <p>{scripture.text}</p>
              <cite className="mt-[14px] block font-bold not-italic">
                {scripture.reference}
              </cite>
            </blockquote>
            {/* Stacked on phones (GIVE first); side by side at equal widths from
                tablet up, with GIVE on the right. */}
            <div className="mt-8 grid w-full max-w-[560px] grid-cols-1 gap-4 md:max-w-none md:grid-cols-2">
              <Button
                asChild
                variant="outline"
                className="h-auto flex-1 rounded-full border-[3px] border-black bg-black px-8 md:order-last py-5 font-drum text-[clamp(1.25rem,2.4vw,2.25rem)] font-bold leading-none text-white shadow-[0px_2.78px_5.57px_#1018280d] hover:bg-black/85 hover:text-white"
              >
                <Link to="/give">GIVE</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-auto flex-1 rounded-full border-[3px] border-black bg-transparent px-8 py-5 font-drum text-[clamp(1.25rem,2.4vw,2.25rem)] font-bold leading-none text-black shadow-[0px_2.78px_5.57px_#1018280d] hover:bg-black/5 hover:text-black"
              >
                <Link to="/trackgiving">TRACK GIVING</Link>
              </Button>
            </div>
            <GivingProgress />
          </div>
          <img
            className="mt-12 block w-full"
            alt="Petra auditorium building with international flags"
            src="/images/petra%20aud.png"
          />
        </header>
        <section className="flex w-full flex-col items-center px-6 py-16 text-center sm:px-10 sm:py-24">
          <h2 className="font-drum text-[clamp(2.5rem,6vw,5.625rem)] font-bold leading-none tracking-[0] text-black">
            MAKE ROOM FOR
          </h2>
          <p
            className={`mt-2 whitespace-nowrap font-drum font-bold leading-[0.9] tracking-[0] text-black transition-opacity duration-300 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{ fontSize: getLoopWordFontSize(loopWords[wordIndex]) }}
          >
            {loopWords[wordIndex]}
          </p>
        </section>
      </section>
    </main>
  );
};
