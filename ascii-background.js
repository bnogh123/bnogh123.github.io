// ==========================================
// 3D ASCII CAMERA BACKGROUND using Three.js
// ==========================================

class AsciiBackground {
    constructor() {
        this.canvas = document.getElementById('ascii-canvas');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = [];
        this.asciiChars = '@#$%&*+=~-:. ';
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetMouseX = 0;
        this.targetMouseY = 0;

        this.init();
    }

    init() {
        // Setup scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.001);

        // Setup camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 50;

        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x0a0a0a, 1);

        // Create particles
        this.createParticleField();
        this.createGeometricShapes();

        // Event listeners
        this.setupEventListeners();

        // Start animation loop
        this.animate();
    }

    createParticleField() {
        const particleCount = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const orangeColor = new THREE.Color(0xFF6B35);
        const greenColor = new THREE.Color(0x00FF88);

        for (let i = 0; i < particleCount; i++) {
            // Random positions
            positions[i * 3] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;

            // Random colors (orange or green)
            const color = Math.random() > 0.5 ? orangeColor : greenColor;
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        this.particleField = new THREE.Points(geometry, material);
        this.scene.add(this.particleField);
    }

    createGeometricShapes() {
        // Create rotating geometric shapes

        // Torus
        const torusGeometry = new THREE.TorusGeometry(10, 3, 16, 100);
        const torusMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF6B35,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        this.torus = new THREE.Mesh(torusGeometry, torusMaterial);
        this.torus.position.set(-30, 0, -20);
        this.scene.add(this.torus);

        // Octahedron
        const octaGeometry = new THREE.OctahedronGeometry(8, 0);
        const octaMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FF88,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        this.octahedron = new THREE.Mesh(octaGeometry, octaMaterial);
        this.octahedron.position.set(30, 0, -20);
        this.scene.add(this.octahedron);

        // Icosahedron
        const icoGeometry = new THREE.IcosahedronGeometry(6, 0);
        const icoMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF10F0,
            wireframe: true,
            transparent: true,
            opacity: 0.2
        });
        this.icosahedron = new THREE.Mesh(icoGeometry, icoMaterial);
        this.icosahedron.position.set(0, 25, -30);
        this.scene.add(this.icosahedron);

        // Create ASCII text sprites
        this.createAsciiSprites();
    }

    createAsciiSprites() {
        // Create floating ASCII characters
        const asciiChars = ['@', '#', '$', '%', '&', '*', '+', '=', '~'];
        this.asciiSprites = [];

        for (let i = 0; i < 30; i++) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 64;
            canvas.height = 64;

            const char = asciiChars[Math.floor(Math.random() * asciiChars.length)];
            const color = Math.random() > 0.5 ? '#FF6B35' : '#00FF88';

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
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 100
            );
            sprite.scale.set(5, 5, 1);

            // Store velocity for animation
            sprite.velocity = {
                x: (Math.random() - 0.5) * 0.1,
                y: (Math.random() - 0.5) * 0.1,
                z: (Math.random() - 0.5) * 0.1
            };

            this.asciiSprites.push(sprite);
            this.scene.add(sprite);
        }
    }

    setupEventListeners() {
        // Mouse movement
        document.addEventListener('mousemove', (event) => {
            this.targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
            this.targetMouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        });

        // Scroll effect
        window.addEventListener('scroll', () => {
            const scrollPercent = window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight);
            this.camera.position.z = 50 + scrollPercent * 30;
        });

        // Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Smooth mouse following
        this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
        this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

        // Rotate camera slightly based on mouse
        this.camera.position.x = this.mouseX * 10;
        this.camera.position.y = this.mouseY * 10;
        this.camera.lookAt(this.scene.position);

        // Rotate particle field
        if (this.particleField) {
            this.particleField.rotation.y += 0.0005;
            this.particleField.rotation.x += 0.0002;
        }

        // Rotate geometric shapes
        if (this.torus) {
            this.torus.rotation.x += 0.01;
            this.torus.rotation.y += 0.01;
        }

        if (this.octahedron) {
            this.octahedron.rotation.x += 0.015;
            this.octahedron.rotation.y += 0.01;
        }

        if (this.icosahedron) {
            this.icosahedron.rotation.x += 0.008;
            this.icosahedron.rotation.y += 0.012;
        }

        // Animate ASCII sprites
        this.asciiSprites.forEach(sprite => {
            sprite.position.x += sprite.velocity.x;
            sprite.position.y += sprite.velocity.y;
            sprite.position.z += sprite.velocity.z;

            // Bounce at boundaries
            if (Math.abs(sprite.position.x) > 50) sprite.velocity.x *= -1;
            if (Math.abs(sprite.position.y) > 50) sprite.velocity.y *= -1;
            if (Math.abs(sprite.position.z) > 50) sprite.velocity.z *= -1;

            // Rotate sprites
            sprite.material.rotation += 0.01;
        });

        this.renderer.render(this.scene, this.camera);
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
