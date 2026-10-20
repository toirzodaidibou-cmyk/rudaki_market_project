"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { TelegramIcon as TelegramLogo } from "@/components/ui/BrandIcons";
import { useCustomer } from "@/customer/CustomerProvider";
import { format } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { ClientApiError, clientApi, formatPhone } from "@/lib/clientApi";
import type { CodeRequested, LoginChannel } from "@/lib/clientApi";

const CODE_LENGTH = 4;

/** "921234567" → "92 123 45 67" */
const formatLocal = (d: string) =>
  [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" ");

/** Даромад бо рақам: 1) рақам + роҳ (Telegram / SMS) → 2) рамз. Дар равзана ва дар саҳифаи писандидаҳо. */
export function LoginForm() {
  const { dict } = useI18n();
  const t = dict.auth;
  const { completeLogin } = useCustomer();

  const [channels, setChannels] = useState<{ sms: boolean; telegram: boolean } | null>(null);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [digits, setDigits] = useState("");
  const [sent, setSent] = useState<CodeRequested | null>(null);
  const [code, setCode] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<LoginChannel | "verify" | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    clientApi.channels().then(setChannels, () => setChannels({ sms: false, telegram: false }));
  }, []);

  // Ҳисоби баръакс барои "рамзи нав"
  useEffect(() => {
    if (step !== "code") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [step]);
  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const errorText = (e: unknown) =>
    t.errors[(e instanceof ClientApiError ? e.code : "unknown") as keyof typeof t.errors] ?? t.errors.unknown;

  async function sendCode(channel: LoginChannel) {
    setError(null);
    setBusy(channel);
    try {
      const r = await clientApi.requestCode(digits, channel);
      setSent(r);
      setResendAt(Date.now() + r.resendAfterSeconds * 1000);
      setNow(Date.now());
      setCode("");
      setStep("code");
      if (!r.telegramUrl) window.setTimeout(() => codeRef.current?.focus(), 50);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function verify(value: string) {
    if (!sent || value.length !== CODE_LENGTH || busy) return;
    setError(null);
    setBusy("verify");
    try {
      await completeLogin(await clientApi.verify(sent.phone, value));
    } catch (e) {
      setError(errorText(e));
      setCode("");
      codeRef.current?.focus();
    } finally {
      setBusy(null);
    }
  }

  // Enter дар майдони рақам: роҳи асосӣ (SMS агар бошад, вагарна Telegram)
  const primary: LoginChannel | null = channels?.sms ? "sms" : channels?.telegram ? "telegram" : null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === "phone") {
      if (primary && digits.length === 9) void sendCode(primary);
    } else void verify(code);
  }

  const spinner = <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />;

  return (
    <form onSubmit={onSubmit} noValidate className="w-full">
      {step === "phone" ? (
        <>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">{t.phoneLabel}</span>
            <div className="flex h-14 items-center rounded-2xl border-2 border-border bg-background px-4 transition-colors focus-within:border-accent">
              <span className="mr-2 text-lg font-semibold text-foreground">+992</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                autoFocus
                placeholder="92 123 45 67"
                value={formatLocal(digits)}
                onChange={(e) => {
                  let d = e.target.value.replace(/\D/g, "");
                  if (d.length > 9 && d.startsWith("992")) d = d.slice(3);
                  setDigits(d.slice(0, 9));
                  setError(null);
                }}
                aria-invalid={!!error}
                className="h-full min-w-0 flex-1 bg-transparent text-lg font-semibold tracking-wide text-foreground outline-none placeholder:font-normal placeholder:text-muted"
              />
            </div>
          </label>

          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-[#e5484d]">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2.5">
            {channels === null && <div className="flex h-13 items-center justify-center text-muted">{spinner}</div>}
            {channels?.telegram && (
              <button
                type="button"
                onClick={() => void sendCode("telegram")}
                disabled={busy !== null || digits.length !== 9}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#2AABEE] text-base font-semibold text-white transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-50"
              >
                {busy === "telegram" ? spinner : <TelegramLogo className="h-5 w-5" />}
                {t.viaTelegram}
              </button>
            )}
            {channels?.sms && (
              <button
                type="button"
                onClick={() => void sendCode("sms")}
                disabled={busy !== null || digits.length !== 9}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-base font-semibold text-on-accent transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-50"
              >
                {busy === "sms" ? spinner : t.viaSms}
              </button>
            )}
            {channels && !channels.sms && !channels.telegram && (
              <p className="text-sm text-muted">{t.errors.unavailable}</p>
            )}
          </div>
        </>
      ) : (
        sent && (
          <div>
            {sent.telegramUrl ? (
              // Бори аввал бо Telegram: дастур + пайванди бот
              <div className="mb-4 rounded-2xl bg-[#2AABEE]/10 p-4">
                <p className="text-sm whitespace-pre-line text-foreground">{t.tgSteps}</p>
                <a
                  href={sent.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2AABEE] font-semibold text-white transition-all hover:brightness-95 active:scale-[0.98]"
                  onClick={() => window.setTimeout(() => codeRef.current?.focus(), 300)}
                >
                  <TelegramLogo className="h-5 w-5" />
                  {t.openTelegram}
                </a>
              </div>
            ) : (
              <p className="mb-3 text-sm text-muted">
                {sent.channel === "telegram" ? t.codeSentTelegram : format(t.codeSent, { phone: formatPhone(sent.phone) })}
              </p>
            )}

            <label className="block">
              <span className="sr-only">{t.codeLabel}</span>
              <input
                ref={codeRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH}
                placeholder="• • • •"
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
                  setCode(v);
                  setError(null);
                  if (v.length === CODE_LENGTH) void verify(v); // 4 рақам — худкор тасдиқ
                }}
                aria-invalid={!!error}
                className="h-16 w-full rounded-2xl border-2 border-border bg-background text-center text-3xl font-bold tracking-[0.6em] text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent"
              />
            </label>
            {sent.devCode && (
              <p className="mt-2 rounded-xl bg-accent/15 px-3 py-2 text-center text-sm text-foreground">
                {format(t.devCode, { code: sent.devCode })}
              </p>
            )}

            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-[#e5484d]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy !== null || code.length !== CODE_LENGTH}
              className="mt-4 flex h-13 w-full items-center justify-center rounded-2xl bg-accent text-base font-semibold text-on-accent transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-50"
            >
              {busy === "verify" ? spinner : t.confirm}
            </button>

            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setError(null);
                }}
                className="font-medium text-muted hover:text-foreground"
              >
                {t.changePhone}
              </button>
              {secondsLeft > 0 ? (
                <span className="text-muted tabular-nums">{format(t.resendIn, { s: String(secondsLeft) })}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void sendCode(sent.channel)}
                  className="font-semibold text-foreground hover:underline"
                >
                  {sent.telegramUrl ? t.newLink : t.resend}
                </button>
              )}
            </div>
          </div>
        )
      )}
    </form>
  );
}
