# Test Scenarios for Planner Freezing Fix

## Purpose
Verify that the race condition bug has been fixed and the planner no longer freezes when editing newly created schedules.

## Prerequisites
- Frontend development server running (`npm run dev`)
- Browser with developer tools open (to monitor for errors/freezes)

## Test Case 1: Create Schedule → Immediate Time Drag
**Objective**: Verify that dragging a schedule immediately after creation doesn't freeze the UI

**Steps**:
1. Navigate to the planner view (click "플래너 뷰" button)
2. Click the "새 일정" button to create a new schedule
3. **Immediately** (within 100ms) try to drag the newly created schedule to a different time slot
4. Observe the behavior

**Expected Result**:
- The schedule should show a visual indicator that it's not draggable (50% opacity, not-allowed cursor)
- After ~100ms, the opacity returns to normal and cursor becomes a move cursor
- The schedule can then be dragged successfully without any UI freeze
- No console errors appear

**Actual Result (Before Fix)**:
- UI would freeze completely
- Application becomes unresponsive
- Requires page refresh to recover

---

## Test Case 2: Create Schedule → Immediate Title Edit
**Objective**: Verify that editing the title immediately after creation doesn't freeze the UI

**Steps**:
1. Navigate to the planner view
2. Click the "새 일정" button to create a new schedule
3. **Immediately** (within 100ms) click the edit button (pencil icon) on the newly created schedule
4. Observe the behavior

**Expected Result**:
- The edit button should be disabled/non-responsive during the pending period
- After ~100ms, the edit button becomes clickable
- Clicking it enters edit mode successfully
- Title can be changed and saved without freezing

**Actual Result (Before Fix)**:
- UI would freeze when attempting to edit
- Application becomes unresponsive

---

## Test Case 3: Multiple Rapid Schedule Creations
**Objective**: Verify that creating multiple schedules rapidly doesn't cause ID collisions or freezes

**Steps**:
1. Navigate to the planner view
2. Rapidly click "새 일정" button 5 times in quick succession
3. Observe that 5 distinct schedules are created
4. Try to interact with each schedule (drag, edit title)

**Expected Result**:
- 5 separate schedules are created with unique IDs
- No duplicate IDs or overlapping schedules
- Each schedule can be independently edited after its pending period
- No UI freezes occur

---

## Test Case 4: Create → Edit → Create → Edit Chain
**Objective**: Verify that alternating between creating and editing schedules works smoothly

**Steps**:
1. Navigate to the planner view
2. Create a new schedule (click "새 일정")
3. Wait 100ms, then drag it to a different time
4. Create another schedule
5. Wait 100ms, then edit its title
6. Create a third schedule
7. Wait 100ms, then delete it

**Expected Result**:
- All operations complete successfully
- No freezes occur at any step
- Pending states are properly managed between operations
- UI remains responsive throughout

---

## Test Case 5: Visual Feedback Verification
**Objective**: Verify that visual feedback for pending state is working correctly

**Steps**:
1. Navigate to the planner view
2. Click "새 일정" to create a schedule
3. **Immediately** observe the schedule's appearance

**Expected Result**:
- Schedule initially appears with 50% opacity
- Cursor shows "not-allowed" when hovering during pending state
- After ~100ms, opacity changes to 100%
- Cursor changes to "move" cursor
- Edit and delete buttons are disabled during pending state

---

## Test Case 6: View Toggle During Pending Operation
**Objective**: Verify that switching views during a pending operation doesn't cause issues

**Steps**:
1. Navigate to the planner view
2. Click "새 일정" to create a schedule
3. **Immediately** (during pending period) click "캘린더 뷰" to switch views
4. Switch back to "플래너 뷰"
5. Try to interact with the schedule

**Expected Result**:
- View switches successfully
- Schedule appears in both views
- Pending state is maintained across view switches
- No freezes or errors occur

---

## Test Case 7: Long-Running Edit Operations
**Objective**: Verify that long edit sessions don't cause issues

**Steps**:
1. Create a schedule and wait for pending to complete
2. Click to edit the title
3. Type a very long title (100+ characters)
4. Wait 5 seconds before saving
5. Press Enter or click outside to save

**Expected Result**:
- Title editing works smoothly
- Long titles are handled without freezing
- Pending state is properly set during save operation
- UI remains responsive

---

## Performance Test Case
**Objective**: Verify that the pending mechanism doesn't cause performance issues

**Steps**:
1. Create 20 schedules in the planner (spread across different time slots)
2. Rapidly interact with multiple schedules (drag, edit, delete)
3. Monitor browser performance metrics

**Expected Result**:
- No noticeable performance degradation
- Pending state checks are fast (O(1) with Set)
- UI remains smooth and responsive
- No memory leaks over extended use

---

## Browser Compatibility Test
**Objective**: Verify the fix works across different browsers

**Browsers to Test**:
- Chrome/Chromium
- Firefox
- Safari
- Edge

**Steps**:
1. Run Test Cases 1-5 in each browser
2. Verify crypto.randomUUID() is supported

**Expected Result**:
- All test cases pass in all browsers
- No browser-specific issues
- Consistent behavior across platforms

---

## Regression Test
**Objective**: Verify that existing functionality still works

**Steps**:
1. Test calendar view functionality (create, edit, delete schedules)
2. Test AI sidebar functionality
3. Test date selection and navigation
4. Test schedule status changes
5. Test priority changes

**Expected Result**:
- All existing features work as before
- No regressions introduced by the fix
- Both calendar and planner views function correctly

---

## Notes for Testers

### What to Watch For:
- Console errors (open Developer Tools → Console tab)
- UI freezes (browser stops responding to clicks)
- Incorrect visual states (opacity, cursor)
- Missing schedules or duplicate IDs
- Memory leaks (use browser's Performance/Memory profiler)

### Timing Considerations:
- The 100ms pending delay is intentional and expected
- Users should perceive it as nearly instantaneous
- If delays feel longer than ~100ms, investigate
- Visual feedback should make the pending period clear

### How to Verify Fix:
- Compare behavior with "before fix" descriptions
- The key indicator of success is **no UI freeze**
- Pending state should prevent immediate edits but not cause hangs
- All operations should eventually complete successfully
