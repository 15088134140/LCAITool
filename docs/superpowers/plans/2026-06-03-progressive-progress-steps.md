# Progressive Progress Steps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the generation progress modal hide the progress area during preparation, then reveal steps progressively as each `step_index` arrives.

**Architecture:** Keep the existing backend SSE payload unchanged. Update only the frontend `ProgressModal` UI state so preparation (`steps.length === 0 && progress === 0`) hides the progress area, `total_steps` drives the header count after start, and `step_index` drives the visible list length.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, existing `useSSE` hook.

---

## File Structure

- Modify: `apps/frontend-user/src/components/tool-detail/ProgressModal.tsx`
  - Responsibility: render the task progress modal and transform SSE progress events into visible UI state.
  - Change: hide the progress bar/count block until progress has started, and replace the current “fill all `total_steps` slots” loop with “fill slots through the current `stepIndex` only”.
- No backend files change.
- No new test framework is introduced because `apps/frontend-user/package.json` currently exposes only `dev`, `build`, `start`, and `lint` scripts.

---

### Task 1: Reveal Progress Steps Incrementally

**Files:**
- Modify: `apps/frontend-user/src/components/tool-detail/ProgressModal.tsx:188-196`

- [ ] **Step 1: Inspect the existing update block**

Open `apps/frontend-user/src/components/tool-detail/ProgressModal.tsx` and locate this block inside the SSE subscription handler:

```tsx
setSteps((prev) => {
  const next = [...prev];
  // Ensure we have enough slots
  while (next.length < totalStepsVal) {
    next.push({
      name: `步骤 ${next.length + 1}`,
      status: 'pending',
    });
  }

  // Update step name from message
  const stepName =
    event.progressMessage || next[stepIndex]?.name || `步骤 ${stepIndex + 1}`;
```

- [ ] **Step 2: Change slot creation to current-step-only**

Replace only the comment and `while` condition with this code:

```tsx
setSteps((prev) => {
  const next = [...prev];
  // Only reveal steps that have started; keep future steps hidden.
  while (next.length <= stepIndex) {
    next.push({
      name: `步骤 ${next.length + 1}`,
      status: 'pending',
    });
  }

  // Update step name from message
  const stepName =
    event.progressMessage || next[stepIndex]?.name || `步骤 ${stepIndex + 1}`;
```

This keeps `totalStepsVal` available for `setTotalSteps(totalStepsVal)` but prevents future steps from entering the rendered `steps` array.

- [ ] **Step 3: Confirm previous-step completion logic still works**

Leave this existing code unchanged:

```tsx
// Mark all previous steps as completed
for (let i = 0; i < stepIndex; i++) {
  const prevStep = next[i];
  if (prevStep && prevStep.status !== 'completed') {
    next[i] = { name: prevStep.name || `步骤 ${i + 1}`, status: 'completed' };
  }
}
```

Reason: once `stepIndex` advances from `0` to `1`, the array will have two items and this loop correctly marks the first item completed without creating future placeholders.

---

### Task 2: Hide Progress Area During Preparation

**Files:**
- Modify: `apps/frontend-user/src/components/tool-detail/ProgressModal.tsx:310-408`

- [ ] **Step 1: Add a derived “started” flag**

Find this code near the render preparation section:

```tsx
// Get current description text (show waiting message cycler before steps arrive)
const completedCount = steps.filter((s) => s.status === 'completed').length;

if (!isOpen) return null;
```

Replace it with:

```tsx
// Get current description text (show waiting message cycler before steps arrive)
const completedCount = steps.filter((s) => s.status === 'completed').length;
const hasStartedProgress = steps.length > 0 || progress > 0;

if (!isOpen) return null;
```

- [ ] **Step 2: Render progress bar only after progress starts**

Find the existing progress bar block:

```tsx
{/* Progress Bar — always visible from start */}
<div className="mb-6">
  <div className="flex justify-between text-sm mb-2">
    <span className="text-[#64748B]">
      步骤 {completedCount}/{totalSteps}
    </span>
    <span className="font-medium text-[#059669]">{progress}%</span>
  </div>
  <div className="h-3 bg-[#E4E7EB] rounded-full overflow-hidden">
    <div
      className={cn(
        'h-full bg-gradient-to-r from-[#059669] to-[#10B981] rounded-full transition-all duration-500 ease-out',
        status === 'failed' && 'from-red-500 to-red-500'
      )}
      style={{ width: `${progress}%` }}
    />
  </div>
</div>
```

Replace it with:

```tsx
{/* Progress Bar — hidden while the task is still preparing */}
{hasStartedProgress && (
  <div className="mb-6">
    <div className="flex justify-between text-sm mb-2">
      <span className="text-[#64748B]">
        步骤 {completedCount}/{totalSteps}
      </span>
      <span className="font-medium text-[#059669]">{progress}%</span>
    </div>
    <div className="h-3 bg-[#E4E7EB] rounded-full overflow-hidden">
      <div
        className={cn(
          'h-full bg-gradient-to-r from-[#059669] to-[#10B981] rounded-full transition-all duration-500 ease-out',
          status === 'failed' && 'from-red-500 to-red-500'
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
)}
```

This hides the whole progress area during the preparation state shown by `steps.length === 0 && progress === 0`.

---

### Task 3: Verify

**Files:**
- Verify: `apps/frontend-user/src/components/tool-detail/ProgressModal.tsx`

- [ ] **Step 1: Run frontend lint**

Run from repository root:

```bash
pnpm --filter @lcaitool/frontend-user lint
```

Expected result: lint completes without new errors from `ProgressModal.tsx`. If the existing project ESLint config cannot load `next/core-web-vitals`, record that exact error.

- [ ] **Step 2: Build frontend user app**

Run from repository root:

```bash
pnpm --filter @lcaitool/frontend-user build
```

Expected result: Next.js build completes successfully. If local `.next` filesystem permissions block the build, record that exact error.

- [ ] **Step 3: Run TypeScript type check**

Run from repository root:

```bash
pnpm --filter @lcaitool/frontend-user exec tsc --noEmit
```

Expected result: command completes successfully with no output.

- [ ] **Step 4: Manual UI verification**

Start the frontend and backend using the project’s normal local development workflow, then create an AI 有声绘本 generation task.

Verify these states in the modal:

1. Immediately after opening: no progress bar, no `0%`, no `步骤 0/4`, and no gray placeholder rows for future steps are visible.
2. After first structured progress event: the progress bar appears and only one row appears, named from the current progress message such as `正在生成故事大纲...`.
3. After second structured progress event: exactly two rows are visible; the first row is completed and the second row is running.
4. Future rows such as `步骤 3`, `步骤 4`, `步骤 5`, `步骤 6` do not appear before their own `step_index` events arrive.
5. Header still shows the total denominator after start, for example `步骤 1/6`, and the existing percentage progress remains visible.

- [ ] **Step 5: Review diff**

Run:

```bash
git diff -- apps/frontend-user/src/components/tool-detail/ProgressModal.tsx docs/superpowers/specs/2026-06-03-progressive-progress-steps-design.md docs/superpowers/plans/2026-06-03-progressive-progress-steps.md
```

Expected result: the code diff changes only the progress-area visibility and step slot creation logic in `ProgressModal.tsx`; the docs describe the same behavior.

---

## Self-Review

- Spec coverage: The plan implements the approved design by hiding the preparation progress area, keeping `total_steps` for the header after start, and using `step_index` to limit visible rows. Backend SSE structure is unchanged.
- Placeholder scan: No unresolved TBD/TODO placeholders remain.
- Type consistency: The plan uses existing `stepIndex`, `totalStepsVal`, `StepItem.status`, `progress`, `steps`, and `setSteps` names from `ProgressModal.tsx`.
