"use client";

import { useEffect, useRef, useState } from "react";

const CHAR_MS = 40;

const USER_1 = "I run a $6k/month SaaS, want to set aside taxes and start paying myself";
const AI_1   = "Got it — what percentage of revenue do you typically reinvest back into the business?";
const USER_2 = "Maybe 15–20%";
const AI_2   = "Here's your allocation plan";

const PLAN = [
  { label: "Tax Holdback",     value: "28%" },
  { label: "Owner Pay",        value: "20%" },
  { label: "Ad Spend",         value: "15%" },
  { label: "Savings",          value: "10%" },
  { label: "Operating Buffer", value: "27%" },
];

interface Msg {
  role: "user" | "ai";
  text: string;
  hasPlan?: boolean;
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-1.5 h-1.5 rounded-full bg-[#9B9590]"
          style={{
            animation: `thinking-bounce 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

function UserBubble({ text, typing }: { text: string; typing?: boolean }) {
  return (
    <div className="flex justify-end">
      <div className="bg-[#2C3340] text-white text-sm rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%] leading-relaxed">
        {text}
        {typing && (
          <span
            className="inline-block w-[1px] h-[14px] bg-white/70 ml-0.5 align-middle"
            style={{ animation: "cursor-blink 700ms step-end infinite" }}
          />
        )}
      </div>
    </div>
  );
}

function AiBubble({
  text,
  typing,
  hasPlan,
  visibleRows,
  showConfirm,
}: {
  text: string;
  typing?: boolean;
  hasPlan?: boolean;
  visibleRows?: number;
  showConfirm?: boolean;
}) {
  return (
    <div className="flex justify-start">
      <div className="bg-[#EEEBE6] text-[#2C3340] text-sm rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[88%]">
        <p className="leading-relaxed">
          {text}
          {typing && (
            <span
              className="inline-block w-[1px] h-[14px] bg-[#2C3340]/50 ml-0.5 align-middle"
              style={{ animation: "cursor-blink 700ms step-end infinite" }}
            />
          )}
        </p>

        {hasPlan && (
          <div className="mt-3 border-t border-[#2C3340]/10 pt-2 space-y-0">
            {PLAN.slice(0, visibleRows ?? 0).map((row, i) => (
              <div
                key={row.label}
                className="flex justify-between py-1.5 border-b border-[#2C3340]/8 last:border-0"
                style={{
                  animation: "slide-in-left 280ms ease forwards",
                  animationDelay: `${i * 40}ms`,
                  opacity: 0,
                }}
              >
                <span className="text-[#5C5852]">{row.label}</span>
                <span className="font-semibold text-[#2C3340]">{row.value}</span>
              </div>
            ))}

            {showConfirm && (
              <div
                className="pt-3"
                style={{ animation: "fade-in-up 350ms ease forwards", opacity: 0 }}
              >
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors">
                  Confirm plan →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AiPlannerChat() {
  const [msgs,         setMsgs]         = useState<Msg[]>([]);
  const [typingRole,   setTypingRole]   = useState<"user" | "ai" | null>(null);
  const [typingChars,  setTypingChars]  = useState("");
  const [showDots,     setShowDots]     = useState(false);
  const [visibleRows,  setVisibleRows]  = useState(0);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [cardOpacity,  setCardOpacity]  = useState(1);

  const alive = useRef(true);
  const tids  = useRef<ReturnType<typeof setTimeout>[]>([]);
  const iids  = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    alive.current = true;

    function schedule(fn: () => void, ms: number) {
      const id = setTimeout(() => { if (alive.current) fn(); }, ms);
      tids.current.push(id);
    }

    // Returns how long typing will take
    function typeMsg(
      role: "user" | "ai",
      text: string,
      hasPlan: boolean,
      onDone: () => void
    ) {
      let i = 0;
      setTypingRole(role);
      setTypingChars("");

      const id = setInterval(() => {
        if (!alive.current) { clearInterval(id); return; }
        i++;
        setTypingChars(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(id);
          setMsgs(prev => [...prev, { role, text, hasPlan }]);
          setTypingRole(null);
          setTypingChars("");
          onDone();
        }
      }, CHAR_MS);

      iids.current.push(id);
    }

    function loop() {
      // hard reset
      setMsgs([]);
      setTypingRole(null);
      setTypingChars("");
      setShowDots(false);
      setVisibleRows(0);
      setShowConfirm(false);
      setCardOpacity(1);

      // step 1: user types msg 1
      schedule(() => {
        typeMsg("user", USER_1, false, () => {
          // step 2: dots 500ms later
          schedule(() => {
            setShowDots(true);
            // step 3: hide dots, AI types msg 1
            schedule(() => {
              setShowDots(false);
              typeMsg("ai", AI_1, false, () => {
                // step 4: user types msg 2, 400ms later
                schedule(() => {
                  typeMsg("user", USER_2, false, () => {
                    // step 5: dots 500ms later
                    schedule(() => {
                      setShowDots(true);
                      // step 6: hide dots, AI types plan intro
                      schedule(() => {
                        setShowDots(false);
                        typeMsg("ai", AI_2, true, () => {
                          // slide in bucket rows with 250ms stagger
                          PLAN.forEach((_, idx) => {
                            schedule(() => setVisibleRows(idx + 1), idx * 250);
                          });
                          // confirm button after all rows
                          const allRowsMs = (PLAN.length - 1) * 250 + 350;
                          schedule(() => setShowConfirm(true), allRowsMs);

                          // step 7: fade out 3s after button appears
                          schedule(() => {
                            setCardOpacity(0);
                            schedule(() => loop(), 1500);
                          }, allRowsMs + 3000);
                        });
                      }, 1000);
                    }, 500);
                  });
                }, 400);
              });
            }, 1200);
          }, 500);
        });
      }, 0);
    }

    loop();

    return () => {
      alive.current = false;
      tids.current.forEach(clearTimeout);
      iids.current.forEach(clearInterval);
      tids.current = [];
      iids.current = [];
    };
  }, []);

  return (
    <div
      className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden flex flex-col h-[520px]"
      style={{ opacity: cardOpacity, transition: "opacity 800ms ease" }}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E8E4DF] flex-shrink-0">
        <div className="w-6 h-6 bg-[#2C3340] rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[8px] font-bold">S</span>
        </div>
        <span className="text-xs font-semibold text-[#2C3340]">Sulphor AI</span>
        <span className="ml-auto text-[10px] text-[#9B9590]">Budget planner</span>
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-hidden">
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <UserBubble key={i} text={m.text} />
          ) : (
            <AiBubble
              key={i}
              text={m.text}
              hasPlan={m.hasPlan}
              visibleRows={m.hasPlan ? visibleRows : 0}
              showConfirm={m.hasPlan ? showConfirm : false}
            />
          )
        )}

        {/* Currently typing bubble */}
        {typingRole === "user" && (
          <UserBubble text={typingChars} typing />
        )}
        {typingRole === "ai" && (
          <AiBubble text={typingChars} typing />
        )}

        {/* Thinking dots */}
        {showDots && (
          <div className="flex justify-start">
            <div className="bg-[#EEEBE6] rounded-2xl rounded-bl-sm px-4 py-3">
              <ThinkingDots />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
