  getRunnerState(): Record<string, unknown> {
    return { behaviorSwapped };
  },
  restoreRunnerState(state): void {
    behaviorSwapped =
      (state.behaviorSwapped as boolean) ?? false;
  },
