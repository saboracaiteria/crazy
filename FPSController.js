import * as THREE from 'three';

export default class FPSController {
    constructor() {
        this.group = null;
        this.mixer = null;
        this.actions = {};
        this.config = null;
        this.baseModel = null;
        this.camera = null;

        this.debugEl = null;
    }

    init(baseModel, camera) {
        this.baseModel = baseModel;
        this.camera = camera;
        this.createDebugOverlay();
        // Since we are using an existing mesh (gunGroup) which might not have animations or config on disk
        // We will try to load config, but fallback gracefully to a default config that works with the passed mesh
        this.loadConfig();
    }

    createDebugOverlay() {
        this.debugEl = document.getElementById('debug-overlay');
        if (!this.debugEl) {
            this.debugEl = document.createElement('div');
            this.debugEl.id = 'debug-overlay';
            this.debugEl.style.cssText = 'position:fixed;top:50px;left:10px;color:cyan;font-size:14px;background:rgba(0,0,0,0.8);padding:10px;pointer-events:none;z-index:9999;font-family:monospace;white-space:pre;border:2px solid cyan;display:none;'; // Hidden by default
            document.body.appendChild(this.debugEl);
        }
    }

    updateDebug(msg, color = 'cyan') {
        if (this.debugEl && this.debugEl.style.display !== 'none') {
            const ver = new Date().toLocaleTimeString();
            this.debugEl.innerText = `FPS CONTROLLER (${ver}):\n${msg}`;
            this.debugEl.style.color = color;
            this.debugEl.style.borderColor = color;
        }
    }

    loadConfig() {
        // Try to load config, if fails use default for procedural gun
        fetch('fps_config.json')
            .then(r => r.json())
            .then(c => {
                this.config = c;
                console.log("📄 FPS Config Loaded:", this.config);
                this.setupModel();
            })
            .catch(e => {
                console.log("Using default FPS config (Procedural Mode)");
                // Default config for the procedural gunGroup
                this.config = {
                    transform: {
                        scale: 1.0, // Scale 1 because gunGroup is already sized
                        position: [0.25, -0.25, -0.3], // Offset relative to camera
                        rotation: [0, Math.PI, 0] // Rotate to face forward if needed
                    },
                    animations: {} // No animations for procedural mesh yet
                };
                this.setupModel();
            });
    }

    setupModel() {
        if (!this.baseModel || !this.camera) {
            this.updateDebug("Waiting for resources...", "orange");
            return;
        }
        if (!this.config) {
            this.updateDebug("Waiting for config...", "orange");
            return;
        }

        if (this.group) {
            this.camera.remove(this.group);
            this.group = null;
        }

        try {
            // In the original code, it cloned the model. 
            // For procedural groups, cloning might lose some references if not careful (like the muzzle flash light).
            // But let's clone to be safe and independent of the player model.

            // To properly clone a Group with Lights/Meshes:
            const rawModel = this.baseModel.clone();

            this.group = new THREE.Group();

            // Reset position of rawModel inside group to be centered if needed, 
            // but for gunGroup it's likely already centered around (0,0,0) or handles.
            // Let's just add it.
            this.group.add(rawModel);

            const t = this.config.transform;
            this.group.scale.set(t.scale, t.scale, t.scale);
            this.group.position.fromArray(t.position);
            this.group.rotation.fromArray(t.rotation);

            // Ensure depth test handling for FPS view
            rawModel.traverse(o => {
                if (o.isMesh) {
                    o.renderOrder = 10;
                    o.material = o.material.clone(); // Clone material to avoid affecting TPS model
                    o.material.depthTest = false;
                    o.material.depthWrite = false;
                }
            });

            // Animation Mixer setup
            if (rawModel.animations && rawModel.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(rawModel);
                // Setup animations if config matches...
            } else {
                this.mixer = null;
            }

            this.camera.add(this.group);
            this.updateDebug(`READY!`);

            // Expose the muzzle flash from the cloned group so index.html can find it if needed
            // Or better, let index.html find it by name "flash" inside this.group

        } catch (e) {
            console.error("FPS Setup Error:", e);
            this.updateDebug(`Setup Error: ${e.message}`, "red");
        }
    }

    update(dt) {
        if (this.mixer) this.mixer.update(dt);
    }

    setVisible(visible) {
        if (this.group) this.group.visible = visible;
    }

    // Accessor to get the cloned gun group (for shooting effects etc)
    getGunGroup() {
        return this.group;
    }

    playAnimation(name) {
        if (this.actions[name]) {
            this.actions[name].reset().play();
        }
    }

    handleInput(e) {
        if (!this.group || !this.group.visible) return;

        const isShift = e.shiftKey;
        const step = isShift ? 0.1 : 0.01;
        const rStep = 0.1;
        let changed = false;

        if (e.code === 'ArrowUp') { this.group.position.y += step; changed = true; }
        if (e.code === 'ArrowDown') { this.group.position.y -= step; changed = true; }
        if (e.code === 'ArrowLeft') { this.group.position.x -= step; changed = true; }
        if (e.code === 'ArrowRight') { this.group.position.x += step; changed = true; }
        if (e.code === 'PageUp') { this.group.position.z -= step; changed = true; }
        if (e.code === 'PageDown') { this.group.position.z += step; changed = true; }

        // Rotation controls
        if (e.code === 'KeyI') { this.group.rotation.x -= rStep; changed = true; }
        if (e.code === 'KeyK') { this.group.rotation.x += rStep; changed = true; }
        if (e.code === 'KeyJ') { this.group.rotation.y -= rStep; changed = true; }
        if (e.code === 'KeyL') { this.group.rotation.y += rStep; changed = true; }

        if (e.code === 'Equal' || e.code === 'NumpadAdd') {
            const s = this.group.scale.x + 0.0001;
            this.group.scale.set(s, s, s);
            changed = true;
        }
        if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
            const s = Math.max(0.0001, this.group.scale.x - 0.0001);
            this.group.scale.set(s, s, s);
            changed = true;
        }

        if (changed) {
            const p = this.group.position;
            const r = this.group.rotation;
            const s = this.group.scale;
            this.updateDebug(`CALIBRATING:\nPos: [${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}]\nRot: [${r.x.toFixed(2)}, ${r.y.toFixed(2)}, ${r.z.toFixed(2)}]\nScale: ${s.x.toFixed(5)}`, "cyan");
        }
    }
}
