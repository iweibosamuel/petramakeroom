import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Current step of a multi-step flow, kept in browser history so the browser
// or phone back button returns to the previous step instead of leaving the
// flow. Moving forward adds a history entry; `back` pops one.
//
// The flow's answers live in component state, so a step restored after a
// reload or from another page has nothing behind it. On mount the flow
// always starts from the first step.
export function useFlowStep<Step extends string>(
  firstStep: Step,
): [step: Step, goTo: (next: Step) => void, back: () => void] {
  const location = useLocation();
  const navigate = useNavigate();
  const historyStep = (location.state as { step?: Step } | null)?.step;
  const mounted = useRef(false);

  const step = mounted.current ? historyStep ?? firstStep : firstStep;

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      if (historyStep && historyStep !== firstStep) {
        navigate(location.pathname + location.search, { replace: true, state: null });
      }
    }
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  function goTo(next: Step) {
    navigate(location.pathname + location.search, { state: { step: next } });
  }

  function back() {
    navigate(-1);
  }

  return [step, goTo, back];
}
