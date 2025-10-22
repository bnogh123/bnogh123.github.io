// ==========================================
// 3D ASCII CAMERA BACKGROUND using Three.js
// With WASD Movement & Arrow Key Camera Controls
// ==========================================

class AsciiBackground {
    constructor() {
        this.canvas = document.getElementById('ascii-canvas');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = [];
        this.crystals = [];
        this.distantStars = [];
        this.loadedAetherytes = new Map(); // Track loaded full aetherytes
        this.floatingDebris = []; // Track procedurally generated debris
        this.envMap = null; // Environment map for reflections

        // Generation settings
        this.renderDistance = 300;
        this.detailDistance = 150; // Distance at which stars become full aetherytes
        this.gridSize = 100; // Spacing between potential aetheryte positions
        this.aetheryteChance = 0.3; // 30% chance of aetheryte at each grid point
        this.fadeInDuration = 2000; // ms for fade-in animation

        // Movement controls
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };

        // Physics-based movement
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.accelerationForce = 0.025; // How quickly we accelerate
        this.maxSpeed = 1.5; // Maximum velocity
        this.damping = 0.92; // Velocity damping (friction)

        // Rotational physics
        this.rotationalVelocity = new THREE.Vector3(); // Pitch, Yaw, Roll
        this.rotationalAcceleration = 0.001; // How quickly we build rotation
        this.maxRotationSpeed = 0.04; // Maximum rotation speed
        this.rotationalDamping = 0.85; // Rotation damping

        // Track frame count for generation throttling
        this.frameCount = 0;

        // Auto-pilot system
        this.idleTimer = 0;
        this.idleThreshold = 10000; // 10 seconds
        this.autoPilot = false;
        this.autoPilotTime = 0;
        this.previousCameraPosition = new THREE.Vector3();

        // HUD overlay
        this.hudCanvas = null;
        this.hudContext = null;

        // Speed lines system
        this.speedLines = [];
        this.maxSpeedLines = 60;
        this.speedLineColors = [
            'rgba(157, 78, 221, 0.8)',  // Purple
            'rgba(0, 229, 255, 0.8)',   // Cyan
            'rgba(91, 127, 255, 0.8)',  // Blue
            'rgba(255, 215, 0, 0.8)'    // Gold
        ];
        this.previousVelocity = new THREE.Vector3();

        this.init();
    }

    init() {
        // Setup scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.002);

        // Setup camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 50);

        // Setup renderer with enhanced settings
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x0a0a0a, 1);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // Create procedural environment map for reflections
        this.createEnvironmentMap();

        // Create HUD overlay
        this.createHUD();

        // Create environment
        this.createParticleField();
        this.createAsciiSprites();
        this.createFloatingDebris(); // Initial debris
        this.updateProceduralAetherytes(); // Initial generation

        // Event listeners
        this.setupEventListeners();

        // Start animation loop
        this.animate();
    }

    createHUD() {
        // Create HUD canvas overlay
        this.hudCanvas = document.createElement('canvas');
        this.hudCanvas.id = 'hud-overlay';
        this.hudCanvas.style.position = 'fixed';
        this.hudCanvas.style.top = '0';
        this.hudCanvas.style.left = '0';
        this.hudCanvas.style.width = '100%';
        this.hudCanvas.style.height = '100%';
        this.hudCanvas.style.pointerEvents = 'none';
        this.hudCanvas.style.zIndex = '0'; // Behind page content
        this.hudCanvas.width = window.innerWidth;
        this.hudCanvas.height = window.innerHeight;
        document.body.appendChild(this.hudCanvas);
        this.hudContext = this.hudCanvas.getContext('2d');
    }

    drawHUD() {
        const ctx = this.hudContext;
        const width = this.hudCanvas.width;
        const height = this.hudCanvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Update and draw speed lines first (behind everything else)
        this.updateSpeedLines(width, height);
        this.drawSpeedLines(ctx, width, height);

        // Vaporwave sunset gradient at bottom
        const sunsetHeight = height * 0.35;
        const gradient = ctx.createLinearGradient(0, height - sunsetHeight, 0, height);
        gradient.addColorStop(0, 'rgba(157, 78, 221, 0)'); // Transparent purple
        gradient.addColorStop(0.3, 'rgba(157, 78, 221, 0.15)'); // Washed purple
        gradient.addColorStop(0.5, 'rgba(91, 127, 255, 0.2)'); // Blue
        gradient.addColorStop(0.7, 'rgba(255, 100, 150, 0.25)'); // Pink
        gradient.addColorStop(0.9, 'rgba(255, 215, 0, 0.3)'); // Gold
        gradient.addColorStop(1, 'rgba(255, 150, 0, 0.35)'); // Orange-gold

        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - sunsetHeight, width, sunsetHeight);

        // Draw perspective grid
        this.drawPerspectiveGrid(ctx, width, height);

        // Draw corner accents
        this.drawCornerAccents(ctx, width, height);
    }

    drawPerspectiveGrid(ctx, width, height) {
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)'; // Cyan
        ctx.lineWidth = 1;

        const gridBottom = height;
        const gridTop = height * 0.65;
        const horizonY = gridTop;
        const vanishingPointX = width / 2;
        const vanishingPointY = horizonY;

        // Horizontal lines (perspective)
        const numHorizontalLines = 20; // Increased for more consistency
        for (let i = 0; i <= numHorizontalLines; i++) {
            const t = i / numHorizontalLines;
            const y = gridTop + (gridBottom - gridTop) * (t * t); // Quadratic for perspective
            const alpha = 0.15 + (1 - t) * 0.25;
            ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Vertical lines (converging to vanishing point)
        const numVerticalLines = 30; // Increased for more consistency
        for (let i = 0; i <= numVerticalLines; i++) {
            const t = (i / numVerticalLines - 0.5) * 2; // -1 to 1
            const bottomX = vanishingPointX + t * width * 1.2; // Extended to screen edges and beyond
            const alpha = 0.1 + (1 - Math.abs(t)) * 0.2;
            ctx.strokeStyle = `rgba(157, 78, 221, ${alpha})`; // Purple
            ctx.beginPath();
            ctx.moveTo(vanishingPointX, vanishingPointY);
            ctx.lineTo(bottomX, gridBottom);
            ctx.stroke();
        }
    }

    drawCornerAccents(ctx, width, height) {
        const cornerSize = 40;
        const cornerThickness = 2;

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)'; // Gold
        ctx.lineWidth = cornerThickness;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(20, 20 + cornerSize);
        ctx.lineTo(20, 20);
        ctx.lineTo(20 + cornerSize, 20);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(width - 20 - cornerSize, 20);
        ctx.lineTo(width - 20, 20);
        ctx.lineTo(width - 20, 20 + cornerSize);
        ctx.stroke();

        // Draw simple stats (optional, subtle)
        ctx.font = '12px monospace';
        ctx.fillStyle = 'rgba(179, 157, 219, 0.5)'; // Washed purple
        const x = this.camera.position.x.toFixed(0);
        const y = this.camera.position.y.toFixed(0);
        const z = this.camera.position.z.toFixed(0);
        ctx.fillText(`XYZ: ${x}, ${y}, ${z}`, 30, height - 30);

        if (this.autoPilot) {
            ctx.fillStyle = 'rgba(0, 229, 255, 0.7)'; // Cyan
            ctx.fillText('AUTO-PILOT', width - 120, height - 30);
        }

        // Draw speed indicator
        const speed = this.velocity.length();
        if (speed > 0.05) {
            ctx.fillStyle = 'rgba(179, 157, 219, 0.5)';
            ctx.fillText(`SPEED: ${(speed * 100).toFixed(0)}`, width - 150, 50);
        }

        // Draw auto-pilot countdown timer
        this.drawAutoPilotCountdown(ctx, width, height);
    }

    drawAutoPilotCountdown(ctx, width, height) {
        // Only show countdown when not in auto-pilot and idle
        if (this.autoPilot) return;

        // Don't show if any movement keys are currently pressed
        const anyKeyPressed = this.keys.w || this.keys.a || this.keys.s || this.keys.d ||
                              this.keys.ArrowUp || this.keys.ArrowDown ||
                              this.keys.ArrowLeft || this.keys.ArrowRight;
        if (anyKeyPressed) return;

        const now = Date.now();
        const timeSinceIdle = now - this.idleTimer;

        // Only show if we're counting down (within threshold time)
        if (timeSinceIdle >= this.idleThreshold) return;

        // Calculate countdown value (10 to 0)
        const remainingTime = this.idleThreshold - timeSinceIdle;
        const countdown = Math.ceil(remainingTime / 1000); // 10, 9, 8, ..., 1

        // Don't show if countdown hasn't started (still at 10)
        if (countdown > 10) return;

        // Progress from 0 to 1 over the threshold time
        const progress = timeSinceIdle / this.idleThreshold;

        // Color transitions: Purple -> Cyan -> Blue -> Gold
        let color;
        if (progress < 0.33) {
            // Purple to Cyan
            const t = progress / 0.33;
            color = this.lerpColor([157, 78, 221], [0, 229, 255], t);
        } else if (progress < 0.66) {
            // Cyan to Blue
            const t = (progress - 0.33) / 0.33;
            color = this.lerpColor([0, 229, 255], [91, 127, 255], t);
        } else {
            // Blue to Gold
            const t = (progress - 0.66) / 0.34;
            color = this.lerpColor([91, 127, 255], [255, 215, 0], t);
        }

        // Draw circular countdown in middle-right, just above horizon
        const horizonY = height * 0.65;
        const centerX = width - 80;
        const centerY = horizonY - 60; // Just above horizon line
        const radius = 40;

        // Draw background circle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw progress arc (counterclockwise from top)
        // Start at top (90 degrees or -PI/2), go counterclockwise
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle - (progress * Math.PI * 2); // Negative for counterclockwise

        ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.9)`;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle, true); // true = counterclockwise
        ctx.stroke();

        // Draw countdown number in center
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(countdown.toString(), centerX, centerY);

        // Draw label below
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(179, 157, 219, 0.6)';
        ctx.font = '10px monospace';
        ctx.fillText('AUTO-PILOT', centerX, centerY + radius + 15);

        // Reset shadow
        ctx.shadowBlur = 0;
    }

    lerpColor(color1, color2, t) {
        // Linear interpolation between two RGB colors
        return [
            Math.round(color1[0] + (color2[0] - color1[0]) * t),
            Math.round(color1[1] + (color2[1] - color1[1]) * t),
            Math.round(color1[2] + (color2[2] - color1[2]) * t)
        ];
    }

    updateSpeedLines(width, height) {
        // Get current velocity magnitude
        const speed = this.velocity.length();

        // Determine if moving forward or backward
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

        const forwardDot = this.velocity.dot(forward);
        const isMovingForward = forwardDot > 0; // Positive = moving forward

        // Get velocity in camera space for offset
        const velX = this.velocity.dot(right);
        const velY = this.velocity.dot(up);

        // Calculate curve factor from rotational velocity AND velocity direction change
        // Use rotational velocity for manual control, or derive from velocity change for auto-pilot
        let curveFactor, verticalCurveFactor;

        if (this.autoPilot) {
            // For auto-pilot, calculate curve from velocity direction changes
            const velocityChange = this.velocity.clone().sub(this.previousVelocity);
            const lateralChange = velocityChange.dot(right) * 800; // Reduced from 1500
            const verticalChange = velocityChange.dot(up) * 600; // Reduced from 1200
            curveFactor = lateralChange;
            verticalCurveFactor = verticalChange;
        } else {
            // For manual control, use rotational velocity
            curveFactor = this.rotationalVelocity.y * 600; // Yaw creates horizontal curve (reduced from 1200)
            verticalCurveFactor = this.rotationalVelocity.x * 450; // Pitch creates vertical curve (reduced from 900)
        }

        // Store current velocity for next frame comparison
        this.previousVelocity.copy(this.velocity);

        // Update existing speed lines
        this.speedLines = this.speedLines.filter(line => {
            // Add current position to trail history
            line.trail.push({ x: line.x, y: line.y });

            // Limit trail length based on line length and speed
            const maxTrail = Math.ceil(line.length / 5);
            if (line.trail.length > maxTrail) {
                line.trail.shift(); // Remove oldest position
            }

            // Move line based on speed and direction
            const moveSpeed = speed * 15 + 5;

            // Apply curve to velocity direction
            // Use shared curve perpendicular if this line is part of a symmetric pair
            let perpX, perpY;
            if (line.sharedCurvePerpendicular) {
                // Use the shared perpendicular for symmetric parabolic curves
                perpX = line.sharedCurvePerpendicular.x;
                perpY = line.sharedCurvePerpendicular.y;
            } else {
                // Calculate perpendicular from own velocity
                perpX = -line.vy;
                perpY = line.vx;
            }

            // Update velocity direction based on curve
            const curveInfluence = 0.008; // How much the curve affects direction (reduced for softer curves)
            line.vx += perpX * line.curveX * curveInfluence;
            line.vy += perpY * line.curveY * curveInfluence;

            // Normalize velocity to maintain consistent speed
            const velMag = Math.sqrt(line.vx * line.vx + line.vy * line.vy);
            if (velMag > 0) {
                line.vx /= velMag;
                line.vy /= velMag;
            }

            line.x += line.vx * moveSpeed;
            line.y += line.vy * moveSpeed;

            // Update curve control point based on current rotation
            line.curveX = curveFactor;
            line.curveY = verticalCurveFactor;

            // Gradually shorten line when slowing down
            if (speed < 0.5) {
                // Shrink rate increases as speed decreases
                const shrinkRate = (0.5 - speed) * 3; // 0 to 1.5
                line.length = Math.max(5, line.length - shrinkRate);

                // Also reduce trail
                if (line.trail.length > Math.ceil(line.length / 5)) {
                    line.trail.shift();
                }
            }

            // Fade in then out
            line.life += 1;
            if (line.life < 10) {
                line.alpha = line.life / 10;
            } else if (line.life > line.maxLife - 20) {
                line.alpha = (line.maxLife - line.life) / 20;
            }

            // Also fade out based on length when shrinking
            if (line.length < 15) {
                line.alpha = Math.min(line.alpha, line.length / 15);
            }

            // Remove if dead, too short, or out of bounds
            const outOfBounds = line.x < -200 || line.x > width + 200 ||
                               line.y < -200 || line.y > height + 200;
            return line.life < line.maxLife && line.length > 3 && !outOfBounds;
        });

        // Spawn new speed lines based on velocity (only when moving)
        // Spawn in pairs for symmetry
        const spawnRate = Math.min(speed * 20, this.maxSpeedLines / 20);
        if (speed > 0.05 && Math.random() < spawnRate && this.speedLines.length < this.maxSpeedLines - 1) {

            if (isMovingForward) {
                // FORWARD: Spawn near horizon vanishing point, radiate outward symmetrically
                const horizonY = height * 0.65;
                const vanishingX = width / 2 - velX * 100;
                const vanishingY = horizonY + velY * 100;
                const spawnRadius = 150 + Math.random() * 100; // Increased from 50-100 to 150-250

                // Calculate movement direction angle in screen space
                const movementAngle = Math.atan2(velY, velX); // Angle of movement vector

                // Generate a random angle offset from movement direction
                const rand = Math.random();
                let angleOffset;

                if (rand < 0.6) {
                    // 60% chance: Perpendicular to movement (sides)
                    angleOffset = (Math.random() - 0.5) * Math.PI * 0.8; // ±72°
                } else if (rand < 0.8) {
                    // 20% chance: Behind movement
                    angleOffset = Math.PI + (Math.random() - 0.5) * Math.PI * 0.6;
                } else {
                    // 20% chance: Ahead of movement
                    angleOffset = (Math.random() - 0.5) * Math.PI * 0.4;
                }

                // First line at angle
                const angle1 = movementAngle + angleOffset;
                const startX1 = vanishingX + Math.cos(angle1) * spawnRadius;
                const startY1 = vanishingY + Math.sin(angle1) * spawnRadius;
                const vx1 = Math.cos(angle1);
                const vy1 = Math.sin(angle1);

                // Symmetric line mirrored across movement axis
                const angle2 = movementAngle - angleOffset; // Mirror across movement direction
                const startX2 = vanishingX + Math.cos(angle2) * spawnRadius;
                const startY2 = vanishingY + Math.sin(angle2) * spawnRadius;
                const vx2 = Math.cos(angle2);
                const vy2 = Math.sin(angle2);

                // Add both symmetric lines
                const lineLength = 20 + Math.random() * 40;
                const trailSegments = Math.ceil(lineLength / 5);
                const lineColor = this.speedLineColors[Math.floor(Math.random() * this.speedLineColors.length)];
                const lineWidth = 1 + Math.random() * 2;

                // Calculate shared perpendicular based on movement direction for parabolic symmetry
                // Perpendicular to velocity direction in screen space
                const sharedPerp = {
                    x: -velY,
                    y: velX
                };
                // Normalize
                const perpMag = Math.sqrt(sharedPerp.x * sharedPerp.x + sharedPerp.y * sharedPerp.y);
                if (perpMag > 0) {
                    sharedPerp.x /= perpMag;
                    sharedPerp.y /= perpMag;
                }

                // First line
                this.speedLines.push({
                    x: startX1,
                    y: startY1,
                    vx: vx1,
                    vy: vy1,
                    length: lineLength,
                    width: lineWidth,
                    color: lineColor,
                    alpha: 0,
                    life: 0,
                    maxLife: 60 + Math.random() * 40,
                    curveX: curveFactor,
                    curveY: verticalCurveFactor,
                    trail: [],
                    maxTrailLength: trailSegments,
                    sharedCurvePerpendicular: sharedPerp
                });

                // Symmetric pair - uses same perpendicular for parabolic curves
                this.speedLines.push({
                    x: startX2,
                    y: startY2,
                    vx: vx2,
                    vy: vy2,
                    length: lineLength,
                    width: lineWidth,
                    color: lineColor,
                    alpha: 0,
                    life: 0,
                    maxLife: 60 + Math.random() * 40,
                    curveX: curveFactor,
                    curveY: verticalCurveFactor,
                    trail: [],
                    maxTrailLength: trailSegments,
                    sharedCurvePerpendicular: sharedPerp
                });
            } else {
                // BACKWARD: Spawn at edges, converge to vanishing point symmetrically
                const horizonY = height * 0.65;
                const vanishingX = width / 2 - velX * 150;
                const vanishingY = horizonY + velY * 150;

                // Calculate movement direction angle
                const movementAngle = Math.atan2(velY, velX);

                // Generate random position on edge
                const edge = Math.floor(Math.random() * 4);
                let startX1, startY1, startX2, startY2;

                const margin = 100;

                // Position based on edge, then mirror across movement axis
                if (edge === 0 || edge === 2) {
                    // Top or bottom edge - vary X position
                    const offsetX = (Math.random() - 0.5) * width * 0.8;
                    const baseX = width / 2;
                    const y = edge === 0 ? -margin : height + margin;

                    startX1 = baseX + offsetX;
                    startY1 = y;
                    startX2 = baseX - offsetX; // Mirror X
                    startY2 = y;
                } else {
                    // Left or right edge - vary Y position
                    const offsetY = (Math.random() - 0.5) * height * 0.8;
                    const baseY = height / 2;
                    const x = edge === 3 ? -margin : width + margin;

                    startX1 = x;
                    startY1 = baseY + offsetY;
                    startX2 = x;
                    startY2 = baseY - offsetY; // Mirror Y
                }

                // Direction toward vanishing point for both
                const dx1 = vanishingX - startX1;
                const dy1 = vanishingY - startY1;
                const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
                const vx1 = dx1 / dist1;
                const vy1 = dy1 / dist1;

                const dx2 = vanishingX - startX2;
                const dy2 = vanishingY - startY2;
                const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                const vx2 = dx2 / dist2;
                const vy2 = dy2 / dist2;

                // Add both symmetric lines
                const lineLength = 20 + Math.random() * 40;
                const trailSegments = Math.ceil(lineLength / 5);
                const lineColor = this.speedLineColors[Math.floor(Math.random() * this.speedLineColors.length)];
                const lineWidth = 1 + Math.random() * 2;

                // Calculate shared perpendicular based on movement direction for parabolic symmetry
                // Perpendicular to velocity direction in screen space
                const sharedPerp = {
                    x: -velY,
                    y: velX
                };
                // Normalize
                const perpMag = Math.sqrt(sharedPerp.x * sharedPerp.x + sharedPerp.y * sharedPerp.y);
                if (perpMag > 0) {
                    sharedPerp.x /= perpMag;
                    sharedPerp.y /= perpMag;
                }

                // First line
                this.speedLines.push({
                    x: startX1,
                    y: startY1,
                    vx: vx1,
                    vy: vy1,
                    length: lineLength,
                    width: lineWidth,
                    color: lineColor,
                    alpha: 0,
                    life: 0,
                    maxLife: 60 + Math.random() * 40,
                    curveX: curveFactor,
                    curveY: verticalCurveFactor,
                    trail: [],
                    maxTrailLength: trailSegments,
                    sharedCurvePerpendicular: sharedPerp
                });

                // Symmetric pair - uses same perpendicular for parabolic curves
                this.speedLines.push({
                    x: startX2,
                    y: startY2,
                    vx: vx2,
                    vy: vy2,
                    length: lineLength,
                    width: lineWidth,
                    color: lineColor,
                    alpha: 0,
                    life: 0,
                    maxLife: 60 + Math.random() * 40,
                    curveX: curveFactor,
                    curveY: verticalCurveFactor,
                    trail: [],
                    maxTrailLength: trailSegments,
                    sharedCurvePerpendicular: sharedPerp
                });
            }
        }
    }

    drawSpeedLines(ctx, width, height) {
        // Draw all active speed lines following their curved trail
        this.speedLines.forEach(line => {
            if (line.trail.length < 2) return; // Need at least 2 points

            const color = line.color.replace('0.8', line.alpha.toFixed(2));
            ctx.strokeStyle = color;
            ctx.lineWidth = line.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Draw line with glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;

            // Draw smooth curve through all trail points
            ctx.beginPath();
            ctx.moveTo(line.trail[0].x, line.trail[0].y);

            if (line.trail.length === 2) {
                // Just two points, draw a line
                ctx.lineTo(line.trail[1].x, line.trail[1].y);
            } else if (line.trail.length === 3) {
                // Three points, use quadratic curve
                const cp = line.trail[1];
                const end = line.trail[2];
                ctx.quadraticCurveTo(cp.x, cp.y, end.x, end.y);
            } else {
                // Multiple points, draw smooth curve using cardinal spline approach
                for (let i = 0; i < line.trail.length - 1; i++) {
                    const p0 = line.trail[Math.max(0, i - 1)];
                    const p1 = line.trail[i];
                    const p2 = line.trail[i + 1];
                    const p3 = line.trail[Math.min(line.trail.length - 1, i + 2)];

                    // Calculate control points for smooth curve
                    const tension = 0.5; // Controls curve smoothness
                    const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
                    const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
                    const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
                    const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

                    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
                }
            }

            ctx.stroke();
        });

        ctx.shadowBlur = 0;
    }

    createEnvironmentMap() {
        // Create a simple cube texture for reflections
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');

        // Create a gradient background (simulating space with stars)
        const gradient = context.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        gradient.addColorStop(0, '#0a1a2a');
        gradient.addColorStop(0.5, '#050510');
        gradient.addColorStop(1, '#000000');
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);

        // Add some stars
        context.fillStyle = '#ffffff';
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = Math.random() * 1.5;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.envMap = texture;
        this.scene.environment = this.envMap;
    }

    createParticleField() {
        const particleCount = 1500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const purpleColor = new THREE.Color(0x9d4edd);
        const cyanColor = new THREE.Color(0x00e5ff);
        const blueColor = new THREE.Color(0x5b7fff);
        const goldColor = new THREE.Color(0xffd700);

        const colorPalette = [purpleColor, cyanColor, blueColor, goldColor];

        for (let i = 0; i < particleCount; i++) {
            // Random positions in a larger space
            positions[i * 3] = (Math.random() - 0.5) * 300;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 300;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 300;

            // Random colors from palette
            const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        this.particleField = new THREE.Points(geometry, material);
        this.scene.add(this.particleField);
    }

    // Seeded random function for consistent generation
    seededRandom(x, y, z) {
        const seed = x * 374761393 + y * 668265263 + z * 1274126177;
        const t = Math.sin(seed) * 43758.5453;
        return t - Math.floor(t);
    }

    // Get grid position for a world position
    getGridPosition(worldPos) {
        return {
            x: Math.round(worldPos.x / this.gridSize),
            y: Math.round(worldPos.y / this.gridSize),
            z: Math.round(worldPos.z / this.gridSize)
        };
    }

    // Convert grid position to world position
    gridToWorld(gridPos) {
        return {
            x: gridPos.x * this.gridSize + (this.seededRandom(gridPos.x, gridPos.y, gridPos.z) - 0.5) * 20,
            y: gridPos.y * this.gridSize + (this.seededRandom(gridPos.y, gridPos.z, gridPos.x) - 0.5) * 20,
            z: gridPos.z * this.gridSize + (this.seededRandom(gridPos.z, gridPos.x, gridPos.y) - 0.5) * 20
        };
    }

    // Check if this grid position should have an aetheryte
    shouldHaveAetheryte(gridPos) {
        return this.seededRandom(gridPos.x, gridPos.y, gridPos.z) < this.aetheryteChance;
    }

    // Create a distant star representation
    createDistantStar(position) {
        // Random star color from palette
        const colors = [0x9d4edd, 0x00e5ff, 0x5b7fff]; // Purple, cyan, blue
        const coreColor = colors[Math.floor(Math.random() * colors.length)];

        const starGeometry = new THREE.SphereGeometry(1.8, 8, 8);
        const starMaterial = new THREE.MeshBasicMaterial({
            color: coreColor,
            transparent: true,
            opacity: 0.75
        });

        const star = new THREE.Mesh(starGeometry, starMaterial);
        star.position.set(position.x, position.y, position.z);

        // Add glow effect (gold) - normalized
        const glowGeometry = new THREE.SphereGeometry(3.6, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.35
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        star.add(glow);

        return star;
    }

    // Check if a point is in the camera's view frustum
    isInViewFrustum(worldPos) {
        // Update camera matrices
        this.camera.updateMatrixWorld();
        this.camera.updateProjectionMatrix();

        // Create frustum from camera
        const frustum = new THREE.Frustum();
        const projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(projScreenMatrix);

        // Check if point is in frustum
        return frustum.containsPoint(worldPos);
    }

    // Update procedural generation based on camera position
    updateProceduralAetherytes() {
        // Throttle updates to every 10 frames for performance
        this.frameCount++;
        if (this.frameCount % 10 !== 0) {
            return;
        }

        const camGridPos = this.getGridPosition(this.camera.position);
        // console.log(`Camera at grid: (${camGridPos.x}, ${camGridPos.y}, ${camGridPos.z})`);

        // Check grid positions around the camera
        const checkRadius = Math.ceil(this.renderDistance / this.gridSize);

        let starsCreated = 0;
        let aetherytesCreated = 0;

        for (let x = camGridPos.x - checkRadius; x <= camGridPos.x + checkRadius; x++) {
            for (let y = camGridPos.y - checkRadius; y <= camGridPos.y + checkRadius; y++) {
                for (let z = camGridPos.z - checkRadius; z <= camGridPos.z + checkRadius; z++) {
                    const gridPos = { x, y, z };
                    const key = `${x},${y},${z}`;

                    // Skip if no aetheryte should be here
                    if (!this.shouldHaveAetheryte(gridPos)) continue;

                    const worldPos = this.gridToWorld(gridPos);
                    const worldPosVector = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
                    const distance = this.camera.position.distanceTo(worldPosVector);

                    // Skip if outside render distance
                    if (distance > this.renderDistance) continue;

                    // Skip if not in camera's view frustum (only generate what you can see)
                    if (!this.isInViewFrustum(worldPosVector)) continue;

                    // Check if we need to upgrade from star to full aetheryte
                    if (distance < this.detailDistance) {
                        // Create full aetheryte if not already loaded
                        if (!this.loadedAetherytes.has(key)) {
                            const aetheryte = this.createAetheryte();
                            aetheryte.position.set(worldPos.x, worldPos.y, worldPos.z);

                            // Store original position for cleanup checks
                            aetheryte.userData.originalPosition = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);

                            // Random orientation
                            aetheryte.rotation.x = this.seededRandom(x, y, z) * Math.PI * 2;
                            aetheryte.rotation.y = this.seededRandom(y, z, x) * Math.PI * 2;
                            aetheryte.rotation.z = this.seededRandom(z, x, y) * Math.PI * 2;

                            // Smaller drift velocity - oscillate around origin instead of drifting away
                            aetheryte.userData.drift = {
                                x: (this.seededRandom(x + 1, y, z) - 0.5) * 0.005,
                                y: (this.seededRandom(x, y + 1, z) - 0.5) * 0.005,
                                z: (this.seededRandom(x, y, z + 1) - 0.5) * 0.005,
                                rotX: (this.seededRandom(x + 2, y, z) - 0.5) * 0.01,
                                rotY: (this.seededRandom(x, y + 2, z) - 0.5) * 0.01,
                                rotZ: (this.seededRandom(x, y, z + 2) - 0.5) * 0.01
                            };
                            aetheryte.userData.gridKey = key;
                            aetheryte.userData.time = 0; // For oscillation
                            aetheryte.userData.spawnTime = Date.now(); // For fade-in animation

                            // Start with scale 0 for smooth spawn
                            aetheryte.scale.set(0.1, 0.1, 0.1);

                            this.scene.add(aetheryte);
                            this.loadedAetherytes.set(key, aetheryte);
                            aetherytesCreated++;

                            // Remove star if it exists
                            const starIndex = this.distantStars.findIndex(s => s.userData.gridKey === key);
                            if (starIndex !== -1) {
                                this.scene.remove(this.distantStars[starIndex]);
                                this.distantStars.splice(starIndex, 1);
                            }
                        }
                    } else {
                        // Show as distant star if not already showing
                        if (!this.loadedAetherytes.has(key) &&
                            !this.distantStars.find(s => s.userData.gridKey === key)) {
                            const star = this.createDistantStar(worldPos);
                            star.userData.gridKey = key;
                            star.userData.originalPosition = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
                            this.scene.add(star);
                            this.distantStars.push(star);
                            starsCreated++;
                        }
                    }
                }
            }
        }

        // if (starsCreated > 0 || aetherytesCreated > 0) {
        //     console.log(`Created ${starsCreated} stars, ${aetherytesCreated} aetherytes. Total: ${this.distantStars.length} stars, ${this.loadedAetherytes.size} aetherytes`);
        // }

        // Clean up distant aetherytes and stars
        this.cleanupDistantObjects(camGridPos, checkRadius);
    }

    cleanupDistantObjects(camGridPos, checkRadius) {
        // Downgrade aetherytes to stars if they're beyond detail distance, or remove completely if too far
        let aetherytesDowngraded = 0;
        let aetherytesRemoved = 0;

        for (const [key, aetheryte] of this.loadedAetherytes.entries()) {
            if (aetheryte.userData.originalPosition) {
                const distance = this.camera.position.distanceTo(aetheryte.userData.originalPosition);

                if (distance > this.renderDistance * 1.2) {
                    // Too far - remove completely
                    this.scene.remove(aetheryte);
                    this.loadedAetherytes.delete(key);
                    aetherytesRemoved++;
                } else if (distance > this.detailDistance * 1.2) {
                    // Between detail and render distance - downgrade to star
                    this.scene.remove(aetheryte);
                    this.loadedAetherytes.delete(key);

                    // Create a star in its place
                    const star = this.createDistantStar(aetheryte.userData.originalPosition);
                    star.userData.gridKey = key;
                    star.userData.originalPosition = aetheryte.userData.originalPosition.clone();
                    this.scene.add(star);
                    this.distantStars.push(star);
                    aetherytesDowngraded++;
                }
            }
        }

        // Remove stars that are too far from their original position
        let starsRemoved = 0;
        this.distantStars = this.distantStars.filter(star => {
            if (star.userData.originalPosition) {
                const distance = this.camera.position.distanceTo(star.userData.originalPosition);
                if (distance > this.renderDistance * 1.2) { // Add 20% buffer
                    this.scene.remove(star);
                    starsRemoved++;
                    return false;
                }
            }
            return true;
        });

        // if (aetherytesRemoved > 0 || starsRemoved > 0 || aetherytesDowngraded > 0) {
        //     console.log(`Cleaned up: ${aetherytesRemoved} aetherytes removed, ${aetherytesDowngraded} downgraded, ${starsRemoved} stars removed`);
        // }
    }

    createAetheryte() {
        const group = new THREE.Group();

        // Vaporwave crystal core - randomly purple, cyan, or blue
        const coreColors = [0x9d4edd, 0x00e5ff, 0x5b7fff]; // Purple, cyan, blue
        const coreColor = coreColors[Math.floor(Math.random() * coreColors.length)];

        const coreGeometry = new THREE.OctahedronGeometry(6, 2); // Increased subdivisions
        coreGeometry.scale(1, 2, 1);

        // Crystalline material with reflections and refraction-like properties
        const coreMaterial = new THREE.MeshPhysicalMaterial({
            color: coreColor,
            metalness: 0.1,
            roughness: 0.05,
            transparent: true,
            opacity: 0.75,
            transmission: 0.9, // Glass-like transmission
            envMap: this.envMap,
            envMapIntensity: 1.5,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            side: THREE.FrontSide, // Only render front faces (backface culling)
        });

        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        group.add(core);

        // Inner glow crystal layer
        const innerGeometry = new THREE.OctahedronGeometry(5, 1);
        innerGeometry.scale(1, 2, 1);
        const innerMaterial = new THREE.MeshPhysicalMaterial({
            color: coreColor,
            emissive: coreColor,
            emissiveIntensity: 0.8,
            metalness: 0.9,
            roughness: 0.2,
            transparent: true,
            opacity: 0.6,
            side: THREE.FrontSide,
        });
        const innerCore = new THREE.Mesh(innerGeometry, innerMaterial);
        group.add(innerCore);

        // Wireframe overlay on core
        const coreWireframe = new THREE.Mesh(
            coreGeometry.clone(),
            new THREE.MeshBasicMaterial({
                color: coreColor,
                wireframe: true,
                transparent: true,
                opacity: 0.4,
                side: THREE.FrontSide
            })
        );
        group.add(coreWireframe);

        // Gold rings around the crystal with metallic reflective material
        const ringCount = 3;
        for (let i = 0; i < ringCount; i++) {
            const ringGeometry = new THREE.TorusGeometry(
                8 + i * 2,  // radius increases
                0.5,         // tube thickness
                16,
                64
            );

            const ringMaterial = new THREE.MeshStandardMaterial({
                color: 0xFFD700,
                metalness: 0.95,
                roughness: 0.15,
                emissive: 0xFFD700,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.85,
                envMap: this.envMap,
                envMapIntensity: 2.0,
                side: THREE.FrontSide, // Backface culling
            });

            const ring = new THREE.Mesh(ringGeometry, ringMaterial);

            // Position rings at different heights
            ring.position.y = (i - 1) * 4;
            // Tilt ring to be horizontal (like a hula hoop) - no random variance to prevent clipping
            ring.rotation.x = Math.PI / 2;

            // Store individual rotation speed for each ring (will rotate around Y axis like hula hoop)
            ring.userData.rotationSpeed = 0.01 + Math.random() * 0.01;

            group.add(ring);
        }

        // Add crystal color point light with higher intensity
        const coreLight = new THREE.PointLight(coreColor, 3, 60);
        coreLight.position.set(0, 0, 0);
        coreLight.castShadow = false;
        group.add(coreLight);

        // Add gold point light
        const goldLight = new THREE.PointLight(0xFFD700, 2, 50);
        goldLight.position.set(0, 0, 0);
        goldLight.castShadow = false;
        group.add(goldLight);

        return group;
    }

    createAsciiSprites() {
        const asciiChars = ['@', '#', '$', '%', '&', '*', '+', '=', '~', '◆', '◇', '★', '✦', '✧', '※'];
        this.asciiSprites = [];

        // Increase count for more debris
        for (let i = 0; i < 80; i++) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 64;
            canvas.height = 64;

            const char = asciiChars[Math.floor(Math.random() * asciiChars.length)];
            const colors = ['#9d4edd', '#00e5ff', '#5b7fff', '#ffd700']; // Purple, cyan, blue, gold
            const color = colors[Math.floor(Math.random() * colors.length)];

            context.font = 'Bold 48px monospace';
            context.fillStyle = color;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(char, 32, 32);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            });

            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.set(
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 200
            );
            // Normalized scale: 4-5 instead of 4-7
            sprite.scale.set(4 + Math.random() * 1, 4 + Math.random() * 1, 1);

            // Normalized velocity: reduced variance
            sprite.velocity = {
                x: (Math.random() - 0.5) * 0.05,
                y: (Math.random() - 0.5) * 0.05,
                z: (Math.random() - 0.5) * 0.05,
                rotation: (Math.random() - 0.5) * 0.015
            };

            this.asciiSprites.push(sprite);
            this.scene.add(sprite);
        }
    }

    createFloatingDebris() {
        // Create procedural floating sparkles and debris in view cone
        const debrisCount = 300;

        for (let i = 0; i < debrisCount; i++) {
            // Random position in a sphere around camera
            const angle = Math.random() * Math.PI * 2;
            const angle2 = Math.random() * Math.PI;
            const distance = 50 + Math.random() * 200;

            const x = Math.cos(angle) * Math.sin(angle2) * distance;
            const y = Math.sin(angle) * Math.sin(angle2) * distance;
            const z = Math.cos(angle2) * distance;

            const debris = this.createDebrisParticle();
            debris.position.set(
                this.camera.position.x + x,
                this.camera.position.y + y,
                this.camera.position.z + z
            );

            // Store velocity - normalized
            debris.userData.velocity = {
                x: (Math.random() - 0.5) * 0.03,
                y: (Math.random() - 0.5) * 0.03,
                z: (Math.random() - 0.5) * 0.03
            };
            debris.userData.rotationSpeed = (Math.random() - 0.5) * 0.015;

            this.floatingDebris.push(debris);
            this.scene.add(debris);
        }
    }

    createDebrisParticle() {
        const type = Math.random();

        if (type < 0.3) {
            // Sparkle particle - normalized size
            const colors = [0x9d4edd, 0x00e5ff, 0x5b7fff, 0xffd700]; // Purple, cyan, blue, gold
            const sparkleColor = colors[Math.floor(Math.random() * colors.length)];
            const geometry = new THREE.SphereGeometry(0.25 + Math.random() * 0.1, 8, 8); // 0.25-0.35
            const material = new THREE.MeshStandardMaterial({
                color: sparkleColor,
                emissive: sparkleColor,
                emissiveIntensity: 0.8,
                metalness: 0.9,
                roughness: 0.2,
                transparent: true,
                opacity: 0.65
            });
            return new THREE.Mesh(geometry, material);
        } else if (type < 0.6) {
            // Small crystal shard - normalized size
            const colors = [0x9d4edd, 0x00e5ff, 0x5b7fff]; // Purple, cyan, blue
            const shardColor = colors[Math.floor(Math.random() * colors.length)];
            const geometry = new THREE.TetrahedronGeometry(0.6 + Math.random() * 0.2); // 0.6-0.8
            const material = new THREE.MeshPhysicalMaterial({
                color: shardColor,
                metalness: 0.1,
                roughness: 0.1,
                transparent: true,
                opacity: 0.65,
                transmission: 0.8,
                envMap: this.envMap,
                envMapIntensity: 1.0,
                side: THREE.FrontSide
            });
            return new THREE.Mesh(geometry, material);
        } else {
            // ASCII character sprite
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 32;
            canvas.height = 32;

            const chars = ['◆', '◇', '★', '✦', '✧', '※', '+', '*', '·'];
            const char = chars[Math.floor(Math.random() * chars.length)];
            const colors = ['#9d4edd', '#00e5ff', '#5b7fff', '#ffd700']; // Purple, cyan, blue, gold
            const color = colors[Math.floor(Math.random() * colors.length)];

            context.font = 'Bold 28px monospace';
            context.fillStyle = color;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(char, 16, 16);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.65,
                blending: THREE.AdditiveBlending
            });

            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(1.8 + Math.random() * 0.4, 1.8 + Math.random() * 0.4, 1); // 1.8-2.2
            return sprite;
        }
    }

    updateFloatingDebris() {
        // Update debris positions and cull those outside frustum
        this.floatingDebris = this.floatingDebris.filter(debris => {
            // Move debris
            if (debris.userData.velocity) {
                debris.position.x += debris.userData.velocity.x;
                debris.position.y += debris.userData.velocity.y;
                debris.position.z += debris.userData.velocity.z;
            }

            // Rotate debris
            if (debris.userData.rotationSpeed) {
                debris.rotation.x += debris.userData.rotationSpeed;
                debris.rotation.y += debris.userData.rotationSpeed * 0.7;
                debris.rotation.z += debris.userData.rotationSpeed * 0.5;
            }

            // Check if in frustum
            const inFrustum = this.isInViewFrustum(debris.position);
            const distance = this.camera.position.distanceTo(debris.position);

            // Remove if too far or behind camera
            if (distance > 250 || (!inFrustum && distance > 100)) {
                this.scene.remove(debris);
                return false;
            }

            return true;
        });

        // Add new debris if count is low
        if (this.floatingDebris.length < 200) {
            for (let i = 0; i < 5; i++) {
                // Get camera forward direction
                const forward = new THREE.Vector3(0, 0, -1);
                forward.applyQuaternion(this.camera.quaternion);

                // Random angle around forward direction
                const angle = Math.random() * Math.PI * 2;
                const angle2 = (Math.random() - 0.5) * Math.PI * 0.8; // Within view cone
                const distance = 100 + Math.random() * 150;

                const right = new THREE.Vector3(1, 0, 0);
                right.applyQuaternion(this.camera.quaternion);
                const up = new THREE.Vector3(0, 1, 0);
                up.applyQuaternion(this.camera.quaternion);

                const offset = forward.clone().multiplyScalar(distance);
                offset.add(right.clone().multiplyScalar(Math.cos(angle) * distance * Math.sin(angle2)));
                offset.add(up.clone().multiplyScalar(Math.sin(angle) * distance * Math.sin(angle2)));

                const debris = this.createDebrisParticle();
                debris.position.copy(this.camera.position).add(offset);

                debris.userData.velocity = {
                    x: (Math.random() - 0.5) * 0.03,
                    y: (Math.random() - 0.5) * 0.03,
                    z: (Math.random() - 0.5) * 0.03
                };
                debris.userData.rotationSpeed = (Math.random() - 0.5) * 0.015;

                this.floatingDebris.push(debris);
                this.scene.add(debris);
            }
        }
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = true;
                e.preventDefault();
                // Only break auto-pilot on WASD and arrow keys
                this.resetIdleTimer();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = false;
                e.preventDefault();
            }
        });

        // Note: Mouse movement and scroll do NOT reset idle timer
        // Auto-pilot only breaks on WASD/arrow key input

        // Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);

            // Resize HUD canvas
            if (this.hudCanvas) {
                this.hudCanvas.width = window.innerWidth;
                this.hudCanvas.height = window.innerHeight;
            }
        });
    }

    resetIdleTimer() {
        this.idleTimer = Date.now();
        if (this.autoPilot) {
            this.autoPilot = false;
            this.autoPilotTime = 0;
        }
    }

    updateAutoPilot(deltaTime) {
        const now = Date.now();

        // Check if should enter auto-pilot
        if (!this.autoPilot && (now - this.idleTimer) > this.idleThreshold) {
            this.autoPilot = true;
            this.autoPilotTime = 0;
            // Store initial position
            this.previousCameraPosition.copy(this.camera.position);
        }

        if (this.autoPilot) {
            this.autoPilotTime += deltaTime * 0.001; // Convert to seconds

            // Beautiful looping path (Lissajous-like curve)
            const radius = 150;
            const speedX = 0.15;
            const speedY = 0.23;
            const speedZ = 0.19;

            const targetX = Math.sin(this.autoPilotTime * speedX) * radius;
            const targetY = Math.sin(this.autoPilotTime * speedY) * radius * 0.5 + 50;
            const targetZ = Math.cos(this.autoPilotTime * speedZ) * radius;

            // Store previous position before moving
            this.previousCameraPosition.copy(this.camera.position);

            // Smooth camera movement
            this.camera.position.x += (targetX - this.camera.position.x) * 0.02;
            this.camera.position.y += (targetY - this.camera.position.y) * 0.02;
            this.camera.position.z += (targetZ - this.camera.position.z) * 0.02;

            // Calculate velocity from position delta for speed lines
            this.velocity.subVectors(this.camera.position, this.previousCameraPosition);

            // Look towards the path ahead
            const lookAheadTime = this.autoPilotTime + 2;
            const lookX = Math.sin(lookAheadTime * speedX) * radius;
            const lookY = Math.sin(lookAheadTime * speedY) * radius * 0.5 + 50;
            const lookZ = Math.cos(lookAheadTime * speedZ) * radius;

            const lookTarget = new THREE.Vector3(lookX, lookY, lookZ);
            const currentLookAt = new THREE.Vector3(0, 0, -1);
            currentLookAt.applyQuaternion(this.camera.quaternion);
            currentLookAt.add(this.camera.position);

            // Smoothly interpolate look direction
            currentLookAt.lerp(lookTarget, 0.02);

            // Update camera quaternion to look at target
            const targetQuaternion = new THREE.Quaternion();
            const matrix = new THREE.Matrix4();
            matrix.lookAt(this.camera.position, currentLookAt, new THREE.Vector3(0, 1, 0));
            targetQuaternion.setFromRotationMatrix(matrix);
            this.camera.quaternion.slerp(targetQuaternion, 0.05);
        }
    }

    updateMovement() {
        // Skip manual controls if auto-pilot is active
        if (this.autoPilot) return;

        // Get camera's forward and right vectors from its current orientation
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.camera.quaternion);

        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.camera.quaternion);

        // Reset acceleration each frame
        this.acceleration.set(0, 0, 0);

        // WASD controls - add acceleration based on camera orientation
        if (this.keys.w) {
            this.acceleration.add(forward.clone().multiplyScalar(this.accelerationForce));
        }
        if (this.keys.s) {
            this.acceleration.add(forward.clone().multiplyScalar(-this.accelerationForce));
        }

        // A and D now add rotational curl (yaw velocity) instead of lateral movement
        if (this.keys.a) {
            this.rotationalVelocity.y += this.rotationalAcceleration; // Turn left
        }
        if (this.keys.d) {
            this.rotationalVelocity.y -= this.rotationalAcceleration; // Turn right
        }

        // Arrow keys add to rotational velocity (pitch and yaw)
        if (this.keys.ArrowUp) {
            this.rotationalVelocity.x += this.rotationalAcceleration * 1.5; // Pitch up
        }
        if (this.keys.ArrowDown) {
            this.rotationalVelocity.x -= this.rotationalAcceleration * 1.5; // Pitch down
        }
        if (this.keys.ArrowLeft) {
            this.rotationalVelocity.y += this.rotationalAcceleration * 1.5; // Yaw left
        }
        if (this.keys.ArrowRight) {
            this.rotationalVelocity.y -= this.rotationalAcceleration * 1.5; // Yaw right
        }

        // Apply acceleration to velocity
        this.velocity.add(this.acceleration);

        // Apply damping to velocity (friction)
        this.velocity.multiplyScalar(this.damping);

        // Clamp velocity to max speed
        const speed = this.velocity.length();
        if (speed > this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed);
        }

        // Apply damping to rotational velocity
        this.rotationalVelocity.multiplyScalar(this.rotationalDamping);

        // Clamp rotational velocity to max rotation speed
        this.rotationalVelocity.x = Math.max(-this.maxRotationSpeed, Math.min(this.maxRotationSpeed, this.rotationalVelocity.x));
        this.rotationalVelocity.y = Math.max(-this.maxRotationSpeed, Math.min(this.maxRotationSpeed, this.rotationalVelocity.y));
        this.rotationalVelocity.z = Math.max(-this.maxRotationSpeed, Math.min(this.maxRotationSpeed, this.rotationalVelocity.z));

        // Apply rotational velocity to camera quaternion
        const xAxis = new THREE.Vector3(1, 0, 0);
        const yAxis = new THREE.Vector3(0, 1, 0);
        const zAxis = new THREE.Vector3(0, 0, 1);

        if (Math.abs(this.rotationalVelocity.x) > 0.0001) {
            const pitchQuat = new THREE.Quaternion().setFromAxisAngle(xAxis, this.rotationalVelocity.x);
            this.camera.quaternion.multiply(pitchQuat);
        }
        if (Math.abs(this.rotationalVelocity.y) > 0.0001) {
            const yawQuat = new THREE.Quaternion().setFromAxisAngle(yAxis, this.rotationalVelocity.y);
            this.camera.quaternion.multiply(yawQuat);
        }
        if (Math.abs(this.rotationalVelocity.z) > 0.0001) {
            const rollQuat = new THREE.Quaternion().setFromAxisAngle(zAxis, this.rotationalVelocity.z);
            this.camera.quaternion.multiply(rollQuat);
        }

        // Apply velocity to camera position
        this.camera.position.add(this.velocity);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Initialize idle timer on first frame
        if (this.idleTimer === 0) {
            this.idleTimer = Date.now();
        }

        // Calculate delta time
        const now = Date.now();
        const deltaTime = 16; // Approximate 60fps

        // Update auto-pilot system
        this.updateAutoPilot(deltaTime);

        // Update camera movement and rotation (manual controls)
        this.updateMovement();

        // Update procedural generation every frame
        this.updateProceduralAetherytes();

        // Update floating debris with frustum culling
        this.updateFloatingDebris();

        // Rotate particle field slowly
        if (this.particleField) {
            this.particleField.rotation.y += 0.0003;
        }

        // Animate loaded aetherytes - oscillate around their grid positions
        let index = 0;
        this.loadedAetherytes.forEach((crystal) => {
            // Handle fade-in animation
            if (crystal.userData.spawnTime) {
                const age = now - crystal.userData.spawnTime;
                if (age < this.fadeInDuration) {
                    // Smooth ease-out animation
                    const progress = age / this.fadeInDuration;
                    const easeOut = 1 - Math.pow(1 - progress, 3); // cubic ease-out
                    const scale = 0.1 + (0.9 * easeOut);
                    crystal.scale.set(scale, scale, scale);

                    // Also fade in opacity
                    crystal.children.forEach(child => {
                        if (child.material && child.material.opacity !== undefined) {
                            const targetOpacity = child.geometry.type === 'TorusGeometry' ? 0.6 : 0.7;
                            child.material.opacity = targetOpacity * easeOut;
                        }
                    });
                } else {
                    // Fade-in complete
                    crystal.scale.set(1, 1, 1);
                }
            }

            if (crystal.userData.drift && crystal.userData.originalPosition) {
                // Increment time for this crystal
                crystal.userData.time += 0.05;
                const t = crystal.userData.time;

                // Oscillate around original position using sine waves
                const offset = 8; // Max distance from original position
                crystal.position.x = crystal.userData.originalPosition.x + Math.sin(t * crystal.userData.drift.x * 100) * offset;
                crystal.position.y = crystal.userData.originalPosition.y + Math.sin(t * crystal.userData.drift.y * 100 + 1) * offset;
                crystal.position.z = crystal.userData.originalPosition.z + Math.sin(t * crystal.userData.drift.z * 100 + 2) * offset;

                // Tumble slowly in space
                crystal.rotation.x += crystal.userData.drift.rotX;
                crystal.rotation.y += crystal.userData.drift.rotY;
                crystal.rotation.z += crystal.userData.drift.rotZ;
            }

            // Rotate the gold rings independently and pulse their glow
            crystal.children.forEach(child => {
                if (child.geometry && child.geometry.type === 'TorusGeometry') {
                    if (child.userData.rotationSpeed) {
                        child.rotation.y += child.userData.rotationSpeed;
                    }
                }

                // Pulse the opacity on all materials for glow effect (only if fade-in is complete)
                if (child.material && child.material.opacity !== undefined) {
                    const age = crystal.userData.spawnTime ? (now - crystal.userData.spawnTime) : this.fadeInDuration;
                    if (age >= this.fadeInDuration) {
                        const baseOpacity = child.geometry.type === 'TorusGeometry' ? 0.6 : 0.7;
                        child.material.opacity = baseOpacity + Math.sin(Date.now() * 0.002 + index) * 0.15;
                    }
                }
            });
            index++;
        });

        // Animate distant stars - make them twinkle
        this.distantStars.forEach((star, i) => {
            // Pulse the core opacity - normalized
            star.material.opacity = 0.65 + Math.sin(Date.now() * 0.004 + i * 0.5) * 0.15;

            // Pulse the glow - normalized
            if (star.children[0]) {
                const glow = star.children[0];
                glow.material.opacity = 0.30 + Math.sin(Date.now() * 0.003 + i) * 0.15;
            }
        });

        // Animate ASCII sprites
        this.asciiSprites.forEach(sprite => {
            sprite.position.x += sprite.velocity.x;
            sprite.position.y += sprite.velocity.y;
            sprite.position.z += sprite.velocity.z;

            // Bounce at boundaries
            if (Math.abs(sprite.position.x) > 100) sprite.velocity.x *= -1;
            if (Math.abs(sprite.position.y) > 100) sprite.velocity.y *= -1;
            if (Math.abs(sprite.position.z) > 100) sprite.velocity.z *= -1;

            // Rotate sprites with individual speeds
            if (sprite.velocity.rotation) {
                sprite.material.rotation += sprite.velocity.rotation;
            }
        });

        this.renderer.render(this.scene, this.camera);

        // Draw HUD overlay
        this.drawHUD();
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AsciiBackground();
    });
} else {
    new AsciiBackground();
}
