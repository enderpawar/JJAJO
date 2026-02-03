# Planner Freezing Bug Fix

## Problem
When users created a new schedule ("새 일정") in the planner view and immediately tried to:
- Drag to adjust the time, OR
- Click to edit the title

The application would freeze and become unresponsive until refresh.

## Root Cause
**Race Condition**: The user interface allowed editing operations before the schedule creation/update was fully processed, causing conflicting state updates that locked the UI.

## Solution Implemented

### 1. Pending Operations Tracking
Added a `pendingOps` Set in `DayPlannerView.tsx` to track ongoing operations:

```typescript
const [pendingOps, setPendingOps] = useState<Set<string>>(new Set())

const markPending = (id: string) => {
  setPendingOps(prev => new Set(prev).add(id))
}

const markComplete = (id: string) => {
  setPendingOps(prev => {
    const next = new Set(prev)
    next.delete(id)
    return next
  })
}

const isPending = (id: string) => pendingOps.has(id)
```

### 2. Guarded Edit Operations
All edit operations now check if an operation is pending before proceeding:

**Drag Operation**:
```typescript
const handleDragStart = (e: React.DragEvent, todo: Todo) => {
  if (isPending(todo.id)) {
    e.preventDefault()  // Prevent drag if pending
    return
  }
  // ... continue with drag
}
```

**Title Edit**:
```typescript
const handleTitleClick = (todo: Todo) => {
  if (isPending(todo.id)) {
    return  // Don't allow editing if pending
  }
  setEditingId(todo.id)
  setEditingTitle(todo.title)
}
```

### 3. Visual Feedback
Pending schedules show clear visual indicators:

```typescript
className={cn(
  'absolute left-2 right-2 rounded-lg border-2 px-3 py-2',
  pending && 'opacity-50 cursor-not-allowed',  // Visual feedback
  !pending && !isEditing && 'hover:shadow-md cursor-move'
)}
```

- 50% opacity for pending items
- `cursor-not-allowed` to indicate unavailability
- Disabled state on action buttons

### 4. Operation Timing
Each operation has a 100ms cooldown period:

```typescript
addTodo(newTodo)
setTimeout(() => {
  markComplete(newId)
}, 100)
```

This ensures the state update propagates before allowing further edits.

## Files Modified

### New Files:
- `frontend/src/components/calendar/DayPlannerView.tsx` - New hourly planner view component

### Modified Files:
- `frontend/src/pages/MainPage.tsx` - Added toggle between calendar and planner views

## Testing Scenarios

### Scenario 1: Create then Drag (Previously Froze)
1. Click "새 일정" button
2. Immediately try to drag the schedule
3. ✅ **Result**: Drag is blocked for 100ms, then works smoothly

### Scenario 2: Create then Edit Title (Previously Froze)
1. Click "새 일정" button
2. Immediately click to edit the title
3. ✅ **Result**: Edit is blocked for 100ms, then works smoothly

### Scenario 3: Multiple Rapid Operations
1. Create a schedule
2. Drag it to new time
3. Edit title immediately
4. ✅ **Result**: Each operation waits for previous to complete

## Technical Details

### State Management Flow
```
1. User clicks "새 일정"
   ↓
2. newId generated, markPending(newId) called
   ↓
3. addTodo(newTodo) updates Zustand store
   ↓
4. setTimeout() schedules markComplete(newId) for 100ms later
   ↓
5. During 100ms: isPending(newId) returns true
   - Drag is prevented
   - Edit is prevented  
   - Visual feedback shows pending state
   ↓
6. After 100ms: markComplete(newId) called
   ↓
7. User can now freely edit/drag the schedule
```

### Why 100ms?
- Short enough to feel nearly instant to users
- Long enough for React state updates to propagate
- Long enough for Zustand store synchronization
- Prevents the race condition without noticeable delay

## Prevention of Future Issues

The pattern used here can be applied to other async operations:

1. **Always track pending state** for async operations
2. **Guard user interactions** during pending periods
3. **Provide visual feedback** for pending states
4. **Use reasonable timeouts** for state synchronization

## Performance Considerations

- Uses Set for O(1) pending status checks
- Minimal re-renders (only affected schedule items)
- Drag-and-drop uses native HTML5 API (no libraries)
- Inline editing without modal overhead
