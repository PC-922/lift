  it('updates form and logs the alternative exercise correctly', async () => {
    const customExercises = [
      ...exercises,
      { id: 'ex3', name: 'Alt Press', muscleGroup: 'Pecho', logs: [{ date: '2026-01-20', weight: 80, reps: 12 }] },
    ] as Exercise[];

    const altRoutines = [
      {
        id: 'r3',
        name: 'Alt Day',
        exercises: [{ exerciseId: 'ex1', alternativeExerciseId: 'ex3', sets: 3, reps: '10', dropset: false, toFailure: false }],
      },
    ];

    const onLogExerciseMock = vi.fn();
    renderWithToast(<RoutinesScreen {...defaultProps} exercises={customExercises} routines={altRoutines} onLogExercise={onLogExerciseMock} />);

    // Open Routine
    const card = screen.getByText('Alt Day').closest('div[class*="rounded-2xl"]')!;
    fireEvent.mouseDown(card);
    fireEvent.mouseUp(card);
    await act(() => vi.runAllTimersAsync());

    // Check placeholder for ex1
    const weightInput = screen.getByPlaceholderText('70') as HTMLInputElement;
    expect(weightInput).toBeTruthy();

    // Toggle Alternative
    const toggleBtn = screen.getByText('Alt Press', { selector: 'button *' }).closest('button')!;
    fireEvent.click(toggleBtn);
    await act(() => vi.runAllTimersAsync());

    // Check placeholder changed for Alt Press (ex3)
    const newWeightInput = screen.getByPlaceholderText('80') as HTMLInputElement;
    expect(newWeightInput).toBeTruthy();

    // Enter new weight and log
    fireEvent.change(newWeightInput, { target: { value: '85' } });
    const repsInput = screen.getByPlaceholderText('12') as HTMLInputElement;
    fireEvent.change(repsInput, { target: { value: '10' } });

    const logBtn = screen.getByText(t.actions.log);
    fireEvent.click(logBtn);
    await act(() => vi.runAllTimersAsync());

    // Should call onLogExercise with alternative exercise ID (ex3)
    expect(onLogExerciseMock).toHaveBeenCalledWith('ex3', 85, 10);
    
    // Check it reset placeholder for Alt Press
    expect((newWeightInput as HTMLInputElement).value).toBe('');
    expect(screen.getByPlaceholderText('80')).toBeTruthy();
  });
