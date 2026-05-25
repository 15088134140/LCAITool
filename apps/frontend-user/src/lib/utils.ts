type ClassValue = string | number | boolean | null | undefined | ClassValue[] | Record<string, boolean | null | undefined>;

function clsx(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      classes.push(clsx(...input));
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }
  return classes.join(' ');
}

// Tailwind conflict resolution groups and utilities
const twGroups: Record<string, RegExp> = {
  'inset': /^(inset|inset-[xy])-/,
  'overflow': /^overflow-/,
  'z-index': /^z-/,
  'opacity': /^opacity-/,
  'cursor': /^cursor-/,
  'flex-direction': /^flex-(row|col|row-reverse|col-reverse)/,
  'flex-wrap': /^flex-(wrap|nowrap|wrap-reverse)/,
  'align-items': /^items-/,
  'justify-content': /^justify-/,
  'text-align': /^text-(left|center|right|justify)/,
  'text-transform': /^(uppercase|lowercase|capitalize|normal-case)/,
  'font-weight': /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/,
  'display': /^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|table|hidden|contents)/,
  'position': /^(static|fixed|absolute|relative|sticky)/,
};

function twMerge(...inputs: ClassValue[]): string {
  const classString = clsx(...inputs);
  const classes = classString.split(/\s+/);
  const seen = new Set<string>();
  const result: string[] = [];

  for (let i = classes.length - 1; i >= 0; i--) {
    const cls = classes[i];
    if (!cls) continue;

    // Check if it conflicts with a previously seen class
    let conflictGroup = '';
    for (const [group, pattern] of Object.entries(twGroups)) {
      if (pattern.test(cls)) {
        conflictGroup = group;
        break;
      }
    }

    const key = conflictGroup ? conflictGroup : cls;
    if (!seen.has(key)) {
      seen.add(key);
      result.unshift(cls);
    }
  }

  return result.join(' ');
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(inputs);
}

export { clsx };
