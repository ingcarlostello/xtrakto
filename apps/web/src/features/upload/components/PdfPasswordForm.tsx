import { Eye, EyeOff, Lock } from "lucide-react";
import { useId } from "react";
import type { FormEvent, Ref, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePasswordField } from "../hooks/use-password-field";
import { UPLOAD_COPY } from "../upload.constants";

const COPY = UPLOAD_COPY.locked;

type PasswordInputProps = {
  ref: Ref<HTMLInputElement>;
  id: string;
  describedBy: string;
  password: string;
  onPassword: (password: string) => void;
  isShown: boolean;
  onToggle: () => void;
  isWrong: boolean;
  isOpening: boolean;
};

// Shows what's typed, or hides it again, from inside the field.
function ShowToggle({
  isShown,
  onToggle,
}: Pick<PasswordInputProps, "isShown" | "onToggle">) {
  const Toggle = isShown ? Eye : EyeOff;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={COPY.show}
      aria-pressed={isShown}
      className="absolute top-1/2 right-0.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:text-ink"
    >
      <Toggle aria-hidden strokeWidth={1.9} className="size-[18px]" />
    </button>
  );
}

// The field, a white pill with the lock inside it, and the switch that shows
// what's typed (docs/ui/v8-09).
function PasswordInput({
  ref,
  id,
  describedBy,
  password,
  onPassword,
  isShown,
  onToggle,
  isWrong,
  isOpening,
}: PasswordInputProps) {
  return (
    <div className="relative">
      <Lock
        aria-hidden
        strokeWidth={1.9}
        className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink-muted"
      />
      <Input
        ref={ref}
        id={id}
        type={isShown ? "text" : "password"}
        value={password}
        onChange={(event) => onPassword(event.currentTarget.value)}
        readOnly={isOpening}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={isWrong || undefined}
        aria-describedby={describedBy}
        className="rounded-full pr-13 pl-11 shadow-chip"
      />
      <ShowToggle isShown={isShown} onToggle={onToggle} />
    </div>
  );
}

type PasswordActionsProps = {
  isOpening: boolean;
  isBusy: boolean;
  onChooseAnother: () => void;
};

// "Abrir PDF" keeps its focus while the password is tried.
function PasswordActions({
  isOpening,
  isBusy,
  onChooseAnother,
}: PasswordActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-1">
      <Button type="submit" disabled={isOpening} focusableWhenDisabled>
        <Lock aria-hidden />
        {isOpening ? COPY.opening : COPY.open}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={isBusy}
        onClick={onChooseAnother}
      >
        {COPY.chooseAnother}
      </Button>
    </div>
  );
}

type PdfPasswordFormProps = {
  /** The password the person typed didn't open it. */
  isWrong: boolean;
  /** A password the person typed is being tried. */
  isOpening: boolean;
  /** While files go up, the file can't be swapped. */
  isBusy: boolean;
  /** The "Elegir archivos" button, whose focus the field may take. */
  picker: RefObject<HTMLElement | null>;
  onOpen: (password: string) => void;
  onChooseAnother: () => void;
};

/**
 * The password a PDF asks for, in its file's row (docs/ui/v8-09): typed here,
 * it opens the file in the browser and goes nowhere else. Enter opens it.
 */
export function PdfPasswordForm(props: PdfPasswordFormProps) {
  const { isWrong, isOpening, picker, onOpen } = props;
  const ids = { input: useId(), hint: useId(), error: useId() };
  const { form, field, password, setPassword, isShown, toggleShown } =
    usePasswordField(isOpening, picker);
  const open = (event: FormEvent) => {
    event.preventDefault();
    if (password !== "" && !isOpening) onOpen(password);
  };
  return (
    <form ref={form} onSubmit={open} className="flex flex-col gap-2 pt-1.5">
      <label htmlFor={ids.input} className="text-caption font-bold text-ink">
        {COPY.label}
      </label>
      <PasswordInput
        {...{ password, isShown, isWrong, isOpening }}
        ref={field}
        id={ids.input}
        describedBy={isWrong ? `${ids.error} ${ids.hint}` : ids.hint}
        onPassword={setPassword}
        onToggle={toggleShown}
      />
      {isWrong && (
        <p
          id={ids.error}
          role="alert"
          className="text-caption font-semibold text-danger"
        >
          {COPY.wrong}
        </p>
      )}
      <p id={ids.hint} className="text-caption text-ink-muted">
        {COPY.hint}
      </p>
      <PasswordActions {...props} />
    </form>
  );
}
