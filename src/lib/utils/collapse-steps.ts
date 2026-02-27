import type { JobStep } from '@/types/jobs';

export interface CollapsedStep {
  step: JobStep;
  count: number;
}

/**
 * Groups consecutive same-tool steps into a single entry with a count.
 * e.g. 4× "generate_pdf" in a row → one entry with count=4.
 */
export function collapseSteps(steps: JobStep[]): CollapsedStep[] {
  if (steps.length === 0) return [];

  const result: CollapsedStep[] = [];
  let current: CollapsedStep = { step: steps[0], count: 1 };

  for (let i = 1; i < steps.length; i++) {
    if (steps[i].tool_name === current.step.tool_name) {
      current = { step: steps[i], count: current.count + 1 };
    } else {
      result.push(current);
      current = { step: steps[i], count: 1 };
    }
  }
  result.push(current);

  return result;
}
