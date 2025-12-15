// Interactive Cubic Bezier Curve

class BezierCurve {
    constructor() {
        this.canvas = document.getElementById('canvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) return;
        
        // Control points
        this.controlPoints ={
            P0: {x: 0, y: 0},
            // Added releaseTime to track the 1-second window
            P1: {x: 0, y: 0, vx: 0, vy: 0, releaseTime: 0}, 
            P2: {x: 0, y: 0, vx: 0, vy: 0, releaseTime: 0}, 
            P3: {x: 0, y: 0}
        };
        
        // Physics Parameters
        // High stiffness for a tight shiver effect
        this.springConstant = 0.6; 
        // Low damping to ensure it keeps moving for the full second
        this.damping =0.15;        
        this.dt = 1/60;

        // The duration of the oscillation
        this.springDurationMs = 1000; 

        // These track the Resting Point (Target) for the spring
        // Initially set to defaults, but updated on Drop.
        this.targetP1 = {x: 0, y: 0};
        this.targetP2 = {x: 0, y: 0};

        // Mouse tracking
        this.mouse = {x: 0, y: 0 };
        this.lastMouse = {x: 0, y: 0};
        this.dragVelocity = {x: 0, y: 0}; // Track mouse speed for "throwing"
        
        // Dragging state
        this.dragging = null;
        this.dragOffset = {x: 0, y: 0};
        
        // Initialization
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupMouseEvents();
        
        // Animation Loop
        this.lastTime = performance.now();
        this.currentTime = this.lastTime;
        this.animate();
    }
    
    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Set Fixed Endpoints
        this.controlPoints.P0 = {x: w*0.2, y: h*0.5};
        this.controlPoints.P3 = {x: w*0.8, y: h*0.5};
        
        // Initialize dynamic points near the center
        const midX = (this.controlPoints.P0.x + this.controlPoints.P3.x)/2;
        const midY = (this.controlPoints.P0.y + this.controlPoints.P3.y)/2;
        const offset = Math.min(w, h)*0.1;
        
        // Only reset positions if they haven't been moved yet (or on first load)
        if (this.controlPoints.P1.x === 0) {
            this.controlPoints.P1.x = midX - offset;
            this.controlPoints.P1.y = midY - offset;
            this.controlPoints.P2.x = midX + offset;
            this.controlPoints.P2.y = midY + offset;
            
            // Set initial spring targets to these starting positions
            this.targetP1.x = this.controlPoints.P1.x;
            this.targetP1.y = this.controlPoints.P1.y;
            this.targetP2.x = this.controlPoints.P2.x;
            this.targetP2.y = this.controlPoints.P2.y;
        }
    }
    
    isPointOverControlPoint(mouseX, mouseY, controlPoint, radius = 20) {
        const dx = mouseX - controlPoint.x;
        const dy = mouseY - controlPoint.y;
        return Math.sqrt(dx * dx + dy * dy) <= radius;
    }
    
    setupMouseEvents() {
        const getMousePos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        this.canvas.addEventListener('mousedown', (e) => {
            const pos = getMousePos(e);
            this.lastMouse = pos; // Reset velocity tracking
            
            if (this.isPointOverControlPoint(pos.x, pos.y, this.controlPoints.P1)) {
                this.dragging = 'P1';
                this.dragOffset.x = pos.x - this.controlPoints.P1.x;
                this.dragOffset.y = pos.y - this.controlPoints.P1.y;
            } else if (this.isPointOverControlPoint(pos.x, pos.y, this.controlPoints.P2)) {
                this.dragging = 'P2';
                this.dragOffset.x = pos.x - this.controlPoints.P2.x;
                this.dragOffset.y = pos.y - this.controlPoints.P2.y;
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const pos = getMousePos(e);
            this.mouse = pos;

            // Calculate Mouse Velocity (to throw the point)
            this.dragVelocity.x = pos.x - this.lastMouse.x;
            this.dragVelocity.y = pos.y - this.lastMouse.y;
            this.lastMouse = pos;
            
            if (this.dragging) {
                const P = this.dragging === 'P1' ? this.controlPoints.P1 : this.controlPoints.P2;
                
                // Directly move the point
                P.x = this.mouse.x - this.dragOffset.x;
                P.y = this.mouse.y - this.dragOffset.y;
                P.vx = 0; 
                P.vy = 0;
            } else {
                this.canvas.style.cursor = 
                    (this.isPointOverControlPoint(pos.x, pos.y, this.controlPoints.P1) || 
                     this.isPointOverControlPoint(pos.x, pos.y, this.controlPoints.P2)) 
                    ? 'grab' : 'crosshair';
            }
        });
        
        const endDrag = () => {
            if (this.dragging) {
                const P = this.dragging === 'P1' ? this.controlPoints.P1 : this.controlPoints.P2;
                const T = this.dragging === 'P1' ? this.targetP1 : this.targetP2;

                // 1. Set the new resting target to CURRENT drop position
                T.x = P.x;
                T.y = P.y;

                // 2. Transfer mouse momentum to the point
                // Multiply by a factor to make it feel "loose"
                P.vx = this.dragVelocity.x * 5; 
                P.vy = this.dragVelocity.y * 5;

                // 3. Add a "Kick" Impulse 
                // This ensures it wobbles even if you hold it still then release
                const kick = 15; 
                P.vx += (Math.random() - 0.5) * kick;
                P.vy += (Math.random() - 0.5) * kick;

                // 4. Start the 1-second timer
                P.releaseTime = this.currentTime;
                
                this.dragging = null;
                this.canvas.style.cursor = 'crosshair';
            }
        };

        this.canvas.addEventListener('mouseup', endDrag);
        this.canvas.addEventListener('mouseleave', endDrag);
    }
    
    // Physics Engine

    updatePhysics() {
        if (this.dragging) return;
        
        this.updatePoint(this.controlPoints.P1, this.targetP1);
        this.updatePoint(this.controlPoints.P2, this.targetP2);
    }

    updatePoint(P, target) {
        // Time since release
        const elapsed = this.currentTime - P.releaseTime;

        // Only animate for 1 second (1000ms)
        if (elapsed < this.springDurationMs && P.releaseTime !== 0) {
            
            const k = this.springConstant;
            const damp = this.damping;
            
            // Standard Spring Force: F = -k * displacement
            const ax = -k * (P.x - target.x) - damp * P.vx;
            const ay = -k * (P.y - target.y) - damp * P.vy;

            P.vx += ax; // Update velocity
            P.vy += ay;
            
            P.x += P.vx; // Update position
            P.y += P.vy;

        } else if (P.releaseTime !== 0) {
            // Time is up! Hard stop at the drop target.
            P.x = target.x;
            P.y = target.y;
            P.vx = 0;
            P.vy = 0;
            P.releaseTime = 0; // Stop processing
        }
    }

    // Math & Rendering (Standard Bézier)
    
    bezierPoint(t) {
        const { P0, P1, P2, P3 } = this.controlPoints;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;
        
        return {
            x: mt3*P0.x + 3*mt2*t*P1.x + 3*mt*t2*P2.x + t3*P3.x,
            y: mt3*P0.y + 3*mt2*t*P1.y + 3*mt*t2*P2.y + t3*P3.y
        };
    }
    
    bezierTangent(t) {
        const { P0, P1, P2, P3 } = this.controlPoints;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const t2 = t * t;
        
        return {
            x: 3*mt2*(P1.x - P0.x) + 6*mt*t*(P2.x - P1.x) + 3*t2*(P3.x - P2.x),
            y: 3*mt2*(P1.y - P0.y) + 6*mt*t*(P2.y - P1.y) + 3*t2*(P3.y - P2.y)
        };
    }

    drawControlPoint(p, color) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = 'white';
        this.ctx.stroke();
    }

    render() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw Curve
        this.ctx.beginPath();
        this.ctx.moveTo(this.controlPoints.P0.x, this.controlPoints.P0.y);
        for(let t=0; t<=1; t+=0.01) {
            const p = this.bezierPoint(t);
            this.ctx.lineTo(p.x, p.y);
        }
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Draw Tangents - UPDATED VISIBILITY
        this.ctx.strokeStyle = '#00FFFF'; // Bright Cy  an
        this.ctx.lineWidth = 2.5;         // Thicker lines
        
        for(let i=0; i<=20; i++) {
            const t = i/20;
            const p = this.bezierPoint(t);
            const tan = this.bezierTangent(t);
            const len = Math.hypot(tan.x, tan.y);
            
            if(len > 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                // Longer length (40) for better visibility
                this.ctx.lineTo(p.x + (tan.x/len)*40, p.y + (tan.y/len)*40);
                this.ctx.stroke();
            }
        }

        // Draw Points
        this.drawControlPoint(this.controlPoints.P0, '#2196F3');
        this.drawControlPoint(this.controlPoints.P1, '#FF9800');
        this.drawControlPoint(this.controlPoints.P2, '#FF9800');
        this.drawControlPoint(this.controlPoints.P3, '#2196F3');
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.currentTime = performance.now();
        this.updatePhysics();
        this.render();
    }
}

document.addEventListener('DOMContentLoaded', () => new BezierCurve());