import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";

const heroTitleLines = [
  {
    text: "MAKE",
    className:
      "text-white text-[clamp(6rem,20vw,14rem)] leading-[0.85] font-black",
  },
  {
    text: "ROOM",
    className:
      "bg-[radial-gradient(50%_50%_at_50%_56%,rgba(207,46,98,1)_0%,rgba(250,64,15,1)_33%,rgba(255,148,110,1)_50%,rgba(255,172,142,1)_85%,rgba(255,255,255,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] text-[clamp(6rem,20vw,14rem)] leading-[0.8] font-black",
  },
];

const loopWords = ["MORE", "MULTITUDES", "NATIONS"];

const getLoopWordFontSize = (word: string): string => {
  const scale = Math.min(1, loopWords[0].length / word.length);
  const min = (5 * scale).toFixed(2);
  const preferred = (16 * scale).toFixed(2);
  const max = (16.5625 * scale).toFixed(2);
  return `clamp(${min}rem, ${preferred}vw, ${max}rem)`;
};

const scriptureLines = [
  "“GOD SAYS SO! “CLEAR LOTS OF GROUND FOR YOUR TENTS! MAKE YOUR TENTS LARGE. SPREAD OUT! THINK BIG! USE PLENTY OF ROPE, DRIVE THE TENT PEGS DEEP. YOU’RE GOING TO NEED LOTS OF ELBOW ROOM FOR YOUR GROWING FAMILY. YOU’RE GOING TO TAKE OVER WHOLE NATIONS; YOU’RE GOING TO RESETTLE ABANDONED CITIES. DON’T BE AFRAID—YOU’RE NOT GOING TO BE EMBARRASSED. DON’T HOLD BACK—YOU’RE NOT GOING TO COME UP SHORT.”",
  "ISAIAH 54:2-4 MSG",
];

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
      className="w-full overflow-hidden bg-[linear-gradient(180deg,rgba(91,135,148,1)_0%,rgba(151,179,178,1)_100%)]"
      data-model-id="357:17077"
    >
      <section className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col items-center">
        <header className="flex w-full flex-col items-center pt-6 sm:pt-8">
          <img
            className="mb-8 h-24 w-24 rounded-full object-cover"
            alt="Petra logo"
            src="/images/Petra%20logo.png"
          />
          <div className="relative w-full">
            <img
              className="block w-full"
              alt="Petra auditorium building with international flags"
              src="/images/petra%20aud.png"
            />
            <div className="absolute inset-0 mx-auto flex w-full max-w-[980px] flex-col items-center px-4 text-center [font-family:'Zalando_Sans_SemiExpanded',Helvetica] tracking-[0]">
              {heroTitleLines.map((line) => (
                <h1 key={line.text} className={line.className}>
                  {line.text}
                </h1>
              ))}
              <p className="mt-3 text-center text-[clamp(2rem,6vw,5.65rem)] font-bold leading-none tracking-[0] text-[#280084]">
                LAGOS X ABUJA
              </p>
              <div className="mt-8 flex w-full max-w-[560px] flex-col gap-4 sm:flex-row">
                <Button
                  asChild
                  variant="outline"
                  className="h-auto flex-1 rounded-full border-[3px] border-white bg-transparent px-8 py-5 [font-family:'JUST_Sans-SemiBold',Helvetica] text-[clamp(1.25rem,2.4vw,2.25rem)] font-semibold leading-none text-white shadow-[0px_2.78px_5.57px_#1018280d] hover:bg-white/10 hover:text-white"
                >
                  <Link to="/give">GIVE</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-auto flex-1 rounded-full border-[3px] border-white bg-white/10 px-8 py-5 [font-family:'JUST_Sans-SemiBold',Helvetica] text-[clamp(1.25rem,2.4vw,2.25rem)] font-semibold leading-none text-white shadow-[0px_2.78px_5.57px_#1018280d] hover:bg-white/20 hover:text-white"
                >
                  <Link to="/give/my">TRACK GIVING</Link>
                </Button>
              </div>
            </div>
          </div>
        </header>
        <section className="w-full px-6 py-8 sm:px-10 sm:py-12">
          <Card className="border-0 bg-transparent shadow-none">
            <CardContent className="flex flex-col items-center px-0 py-0">
              <blockquote className="max-w-[1134px] text-center [font-family:'Zalando_Sans',Helvetica] text-[clamp(1.5rem,3vw,2.5rem)] font-semibold leading-[1.35] tracking-[0] text-white">
                {scriptureLines[0]}
              </blockquote>
              <p className="mt-3 text-center [font-family:'Zalando_Sans',Helvetica] text-[clamp(1.5rem,3vw,2.5rem)] font-semibold leading-[1.35] tracking-[0] text-white">
                {scriptureLines[1]}
              </p>
            </CardContent>
          </Card>
        </section>
        <section className="flex w-full flex-col items-center px-6 pb-16 text-center sm:px-10 sm:pb-24">
          <h2 className="[font-family:'Zalando_Sans_SemiExpanded',Helvetica] text-[clamp(2.5rem,6vw,5.625rem)] font-black leading-none tracking-[0] text-white">
            MAKE ROOM FOR
          </h2>
          <p
            className={`mt-2 whitespace-nowrap bg-[radial-gradient(50%_50%_at_50%_62%,rgba(207,46,98,1)_0%,rgba(250,64,15,1)_33%,rgba(255,148,110,1)_50%,rgba(255,255,255,1)_100%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] [font-family:'Zalando_Sans_SemiExpanded',Helvetica] font-black leading-[0.9] tracking-[0] text-transparent transition-opacity duration-300 ${
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
