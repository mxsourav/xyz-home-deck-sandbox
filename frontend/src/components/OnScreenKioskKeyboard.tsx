import { useEffect, useState } from 'react';
import { Backspace, CaretDown } from '@phosphor-icons/react';

export type KioskKeyboardField =
  | 'name'
  | 'guardianName'
  | 'guardianPhone'
  | 'telegramHandle'
  | 'homeAddress'
  | 'medication';

const KEY_ROW_NUMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '@', '.'];
const KEY_ROW_TOP = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
const KEY_ROW_MID = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '/'];
const KEY_ROW_BOT = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ','];

export const KIOSK_KEYBOARD_FIELD_LABELS: Record<KioskKeyboardField, string> = {
  name: 'Parent’s Full Name',
  guardianName: 'Guardian Name',
  guardianPhone: 'Phone / Telegram',
  telegramHandle: 'Telegram Handle',
  homeAddress: 'Home Address',
  medication: 'Medication',
};

interface OnScreenKioskKeyboardProps {
  field: KioskKeyboardField;
  value: string;
  noAutoCapitalize?: boolean;
  onInsert: (text: string) => void;
  onBackspace: () => void;
  onMinimize: () => void;
  onDone: () => void;
  doneLabel?: string;
}

/**
 * iPadOS-style monochrome collapsible touch keyboard.
 * Exactly 216px tall: 32px header strip + 184px key grid.
 * Hidden (0px) whenever no text field is focused.
 */
export function OnScreenKioskKeyboard({
  field,
  value,
  noAutoCapitalize = false,
  onInsert,
  onBackspace,
  onMinimize,
  onDone,
  doneLabel = 'Done',
}: OnScreenKioskKeyboardProps) {
  const [isShiftOn, setIsShiftOn] = useState<boolean>(false);
  const [isNumeric, setIsNumeric] = useState<boolean>(false);
  const [litKey, setLitKey] = useState<string | null>(null);

  // Physical keyboard sync: flash the matching virtual key while typing.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      let match: string | null = null;
      if (key === 'Backspace') match = 'backspace';
      else if (key === ' ') match = 'space';
      else if (key === 'Enter') match = 'return';
      else if (/^[a-zA-Z]$/.test(key)) match = key.toUpperCase();
      else if (KEY_ROW_NUMS.includes(key)) match = key;
      if (!match) return;
      setLitKey(match);
      const timer = window.setTimeout(() => setLitKey(null), 160);
      return () => window.clearTimeout(timer);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const shouldUpper = (keyChar: string) =>
    isShiftOn ||
    (!noAutoCapitalize &&
      /[A-Z]/.test(keyChar) &&
      (value.length === 0 || value.endsWith(' ')));

  const pressKey = (keyChar: string) => {
    const upper = shouldUpper(keyChar);
    const char = /[A-Z]/.test(keyChar)
      ? upper
        ? keyChar.toUpperCase()
        : keyChar.toLowerCase()
      : keyChar;
    if (isShiftOn) setIsShiftOn(false);
    onInsert(char);
  };

  const renderKey = (
    label: string,
    opts: {
      cls?: string;
      onTap?: () => void;
      litId?: string;
      display?: React.ReactNode;
    } = {}
  ) => (
    <button
      key={label}
      type="button"
      tabIndex={-1}
      className={`es-key${opts.cls ? ` ${opts.cls}` : ''}${
        litKey === opts.litId ? ' lit' : ''
      }`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => (opts.onTap ? opts.onTap() : pressKey(label))}
    >
      {opts.display ?? (shouldUpper(label) ? label : label.toLowerCase())}
    </button>
  );

  return (
    <div className="es-kb" data-virtual-kb="true" aria-label="On-screen touch keyboard">
      {/* 32px header strip: field label + live preview, minimize + done */}
      <div className="es-kb-head">
        <div className="es-kb-field">
          <span style={{ flexShrink: 0 }}>{KIOSK_KEYBOARD_FIELD_LABELS[field]}</span>
          <span className="es-kb-preview es-num">{value || '—'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            tabIndex={-1}
            className="es-kb-min"
            aria-label="Hide keyboard"
            title="Hide keyboard"
            onClick={onMinimize}
          >
            <CaretDown size={16} weight="regular" />
          </button>
          <button type="button" tabIndex={-1} className="es-kb-done" onClick={onDone}>
            {doneLabel}
          </button>
        </div>
      </div>

      {/* 184px key grid */}
      <div className="es-kb-grid">
        {isNumeric ? (
          <div className="es-kb-row">
            {KEY_ROW_NUMS.map((k) => renderKey(k, { litId: k }))}
            <div style={{ flex: 2.2, display: 'flex', gap: '5px' }}>
              {renderKey('ABC', {
                cls: 'mod',
                display: 'ABC',
                onTap: () => setIsNumeric(false),
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="es-kb-row">
              {KEY_ROW_TOP.map((k) => renderKey(k, { litId: k }))}
            </div>
            <div className="es-kb-row" style={{ padding: '0 18px' }}>
              {KEY_ROW_MID.map((k) => renderKey(k, { litId: k }))}
            </div>
            <div className="es-kb-row">
              {renderKey('Shift', {
                cls: `mod${isShiftOn ? ' on' : ''}`,
                display: '⇧ Shift',
                onTap: () => setIsShiftOn((s) => !s),
              })}
              {KEY_ROW_BOT.map((k) => renderKey(k, { litId: k }))}
              {renderKey('Backspace', {
                cls: 'mod',
                display: <Backspace size={15} weight="regular" />,
                litId: 'backspace',
                onTap: onBackspace,
              })}
            </div>
          </>
        )}
        <div className="es-kb-row">
          {renderKey('123', {
            cls: 'mod',
            display: isNumeric ? 'ABC' : '123',
            onTap: () => setIsNumeric((n) => !n),
          })}
          {renderKey(' ', {
            cls: 'wide',
            display: 'space',
            litId: 'space',
          })}
          {renderKey('Return', {
            cls: 'mod',
            display: 'return',
            litId: 'return',
            onTap: onDone,
          })}
        </div>
      </div>
    </div>
  );
}
