# Interactive Cubic Bézier Curve

An interactive web-based visualization of a cubic Bézier curve with a unique "wobble" effect when control points are released.

## Overview

This project implements a cubic Bézier curve from scratch, including all mathematical computations and a spring physics system. The curve features a distinctive behavior: when you drag and release a control point, it wobbles/shivers for exactly 1 second before settling at the drop position.

## Mathematical Foundation

### Cubic Bézier Curve

A cubic Bézier curve is defined by four control points (P₀, P₁, P₂, P₃) and parameterized by `t ∈ [0, 1]`:

```
B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
```

**Implementation Details:**
- The curve is sampled at increments of `t = 0.01` (100 points) to create a smooth path
- Each point on the curve is computed independently using the formula above
- The curve starts at P₀ (when t=0) and ends at P₃ (when t=1)
- Code implementation uses optimized calculations:
  ```javascript
  mt = 1 - t
  mt² = mt * mt
  mt³ = mt² * mt
  t² = t * t
  t³ = t² * t
  ```

### Tangent Computation

The tangent vector at any point on the curve is the derivative of B(t):

```
B'(t) = 3(1-t)²(P₁-P₀) + 6(1-t)t(P₂-P₁) + 3t²(P₃-P₂)
```

**Visualization:**
- Tangents are computed at 21 evenly-spaced points along the curve (i = 0 to 20, t = i/20)
- Each tangent vector is normalized using `Math.hypot()` to calculate length
- Normalized tangents are drawn as bright cyan line segments (40px length)
- Tangents show the direction of the curve at each point
- If tangent length is zero (at inflection points), it is skipped to avoid division errors

## Physics Model: "Wobble at Drop Point"

### Spring-Damping System

When a control point (P₁ or P₂) is released, it enters a 1-second wobble animation using spring-damping physics:

```
acceleration = -k * (position - target) - damping * velocity
```

Where:
- **k** (spring constant) = 0.6: High stiffness for a tight "shiver" effect
- **damping** = 0.15: Low damping to ensure continuous movement for the full second
- **target**: The drop position (where the point was released)
- **position**: Current position of the control point
- **velocity**: Current velocity of the control point

### Physics Integration

The physics system uses Euler integration with a fixed time step:

```javascript
// Acceleration calculation
ax = -k*(P.x - target.x) - damp*P.vx
ay = -k*(P.y - target.y) - damp*P.vy

// Velocity update (Euler integration)
P.vx += ax
P.vy += ay

// Position update
P.x += P.vx
P.y += P.vy
```

**Time Step:** `dt = 1/60` (for 60 FPS), though the code uses frame-based updates rather than explicit time stepping.

### Wobble Behavior

1. **On Release (`endDrag` function):**
   - The drop position becomes the new target: `target = current_position`
   - Mouse velocity is calculated as: `dragVelocity = current_mouse - last_mouse`
   - Mouse velocity is transferred to the point: `P.vx = dragVelocity.x * 5`, `P.vy = dragVelocity.y * 5`
     - The factor of 5 amplifies the momentum for a more noticeable effect
   - A random "kick" impulse is added: `P.vx += (Math.random() - 0.5) * 15`
     - This ensures wobbling even if the point was held still before release
     - The kick ranges from -7.5 to +7.5 units in each direction
   - A 1-second timer starts: `P.releaseTime = currentTime`

2. **During Wobble (0-1000ms):**
   - Physics updates only occur if `elapsed < 1000ms` and `releaseTime !== 0`
   - Spring physics continuously updates position and velocity each frame
   - The point oscillates around the drop position
   - High stiffness (k=0.6) creates rapid, tight oscillations
   - Low damping (0.15) maintains motion throughout the duration
   - Physics is disabled while dragging (`if (this.dragging) return`)

3. **After 1 Second:**
   - Animation stops immediately when `elapsed >= 1000ms`
   - Point snaps to the exact drop position: `P.x = target.x`, `P.y = target.y`
   - Velocity is reset to zero: `P.vx = 0`, `P.vy = 0`
   - Timer is reset: `P.releaseTime = 0` (stops further processing)

### Mouse Velocity Tracking

The system tracks mouse movement to transfer momentum:
- `lastMouse`: Previous mouse position
- `dragVelocity`: Current mouse velocity (difference between current and last position)
- Updated every `mousemove` event
- Used only when releasing the point

## Control Points Behavior

### Initialization

- **P₀ and P₃**: Fixed endpoints
  - P₀: Positioned at 20% of canvas width, 50% of canvas height
  - P₃: Positioned at 80% of canvas width, 50% of canvas height
  
- **P₁ and P₂**: Dynamic control points
  - Initialized at the midpoint between P₀ and P₃
  - Offset by 10% of the minimum of canvas width/height
  - P₁: `midX - offset, midY - offset`
  - P₂: `midX + offset, midY + offset`
  - Initial targets set to these starting positions

### Interaction

- **Hit Detection**: Points have a hit radius of 20px (default)
- **While Dragging**: 
  - Direct control - point follows mouse immediately
  - Position: `P.x = mouse.x - dragOffset.x`
  - Velocity reset to zero during drag
  - Physics disabled during drag
- **On Release**: Wobbles for 1 second, then settles at drop position
- **Idle State**: Points maintain their position when not being interacted with

## Design Choices

### Rendering

1. **Curve Path**: 
   - Drawn in green (#4CAF50) with 3px line width
   - Sampled at 0.01 increments (100 points total)
   - Uses `ctx.beginPath()`, `ctx.moveTo()`, and `ctx.lineTo()` for smooth rendering

2. **Control Points**: 
   - Fixed points (P₀, P₃): Blue circles (#2196F3), 6px radius
   - Dynamic points (P₁, P₂): Orange circles (#FF9800), 6px radius
   - All points have white stroke outline
   - Drawn using `ctx.arc()` with full circle (0 to 2π)

3. **Tangents**: 
   - Bright cyan lines (#00FFFF) with 2.5px width
   - 40px length (normalized direction vector * 40)
   - 21 tangent lines evenly spaced (t = 0, 0.05, 0.10, ..., 1.0)
   - Only drawn if tangent length > 0 (avoids division by zero)

4. **Background**: Dark (#1a1a1a) for high contrast with bright curve and tangents

5. **Control Polygon**: Not rendered in current implementation (removed for cleaner look)

### Performance

- Uses `requestAnimationFrame` for smooth 60 FPS animation
- Efficient curve sampling (0.01 step size = 100 points)
- Physics calculations only run during the 1-second wobble period
- Physics disabled while dragging (no unnecessary calculations)
- Canvas is cleared and redrawn each frame: `ctx.fillRect(0, 0, width, height)`
- Time tracking uses `performance.now()` for accurate timing

### Code Organization

The code is organized into clear sections:

1. **Initialization (`constructor`)**:
   - Canvas setup and context retrieval
   - Control point initialization
   - Physics parameter setup
   - Event listener registration
   - Animation loop start

2. **Resize Handling (`resize`)**:
   - Canvas dimension updates
   - Fixed endpoint positioning
   - Dynamic point initialization (only on first load)

3. **Input Handling (`setupMouseEvents`)**:
   - Mouse position calculation with bounding rect offset
   - Drag start detection (hit testing)
   - Drag movement tracking with velocity calculation
   - Drag end handling with momentum transfer

4. **Physics Engine (`updatePhysics`, `updatePoint`)**:
   - Time-based animation control
   - Spring-damping force calculation
   - Euler integration for position/velocity updates
   - Timer-based animation termination

5. **Bézier Math (`bezierPoint`, `bezierTangent`)**:
   - Pure mathematical functions
   - Optimized calculations using pre-computed powers
   - No side effects

6. **Rendering (`render`, `drawControlPoint`)**:
   - Canvas clearing
   - Curve path drawing
   - Tangent visualization
   - Control point rendering

7. **Animation Loop (`animate`)**:
   - Frame timing updates
   - Physics updates
   - Rendering calls

## Usage

1. Open `index.html` in a modern web browser
2. **Drag** the orange control points (P₁ or P₂) to move them
   - Cursor changes to "grab" when hovering over draggable points
   - Points follow mouse directly while dragging
3. **Release** to see the wobble effect
   - The point will shiver/wobble for exactly 1 second
   - Fast mouse movement creates more pronounced wobble
   - Even holding still and releasing creates a small wobble (random kick)
4. Watch the curve dynamically update as control points move
5. Observe the bright cyan tangent lines (21 lines) showing curve direction

## Technical Requirements Met

-Cubic Bézier curve implemented from scratch  
-Tangent computation using derivative formula  
-Spring-damping physics for wobble effect  
-Mouse input handling with drag-and-drop  
-Real-time rendering at 60 FPS  
-No external libraries or prebuilt APIs  
-Clean, organized code structure  
-Unique "wobble at drop point" interaction  
-Time-based animation control (1-second duration)  
-Momentum transfer from mouse movement  

## Browser Compatibility

Works in all modern browsers that support:
- HTML5 Canvas API
- ES6 JavaScript (arrow functions, destructuring, `const`/`let`)
- `requestAnimationFrame` API
- `performance.now()` API
- `Math.hypot()` for vector normalization

## Key Features

- **Interactive Control Points**: Drag P₁ and P₂ to control the curve shape
- **Wobble Effect**: Points shiver for exactly 1 second when released
- **Momentum Transfer**: Mouse velocity (multiplied by 5) affects the wobble
- **Random Kick**: Ensures wobbling even when released from a stationary position
- **Visual Feedback**: Bright cyan tangents (21 lines) show curve direction
- **Smooth Animation**: 60 FPS rendering with efficient calculations
- **Time-Based Control**: Precise 1-second animation duration
- **Hit Detection**: 20px radius for easy point selection

## Implementation Notes

- The physics system uses frame-based updates rather than fixed time steps
- Velocity is updated before position (semi-implicit Euler)
- The random kick impulse uses `Math.random() - 0.5` to center around zero
- Control points maintain their position when window is resized (only reset if x === 0)
- The animation loop continuously calls `requestAnimationFrame` for smooth updates
