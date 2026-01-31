class FPSController {
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
        this.loadConfig();
    }

    createDebugOverlay() {
        this.debugEl = document.getElementById('debug-overlay');
        if (!this.debugEl) {
            this.debugEl = document.createElement('div');
            this.debugEl.id = 'debug-overlay';
            this.debugEl.style.cssText = 'position:fixed;top:50px;left:10px;color:cyan;font-size:14px;background:rgba(0,0,0,0.8);padding:10px;pointer-events:none;z-index:9999;font-family:monospace;white-space:pre;border:2px solid cyan;';
            document.body.appendChild(this.debugEl);
        }
    }

    updateDebug(msg, color = 'cyan') {
        if (this.debugEl) {
            const ver = new Date().toLocaleTimeString();
            this.debugEl.innerText = `FPS CONTROLLER (${ver}):\n${msg}`;
            this.debugEl.style.color = color;
            this.debugEl.style.borderColor = color;
        }
    }

    loadConfig() {
        fetch('fps_config.json')
            .then(r => r.json())
            .then(c => {
                this.config = c;
                console.log("📄 FPS Config Loaded:", this.config);
                this.setupModel();
            })
            .catch(e => {
                console.error("Could not load fps_config.json", e);
                // Ajustado: Arma mais à frente (z: -0.6) e um pouco acima (y: -0.35 em vez de -0.4)
                this.config = {
                    transform: {
                        scale: 0.001,
                        position: [0.35, -0.35, -0.6],
                        rotation: [0, Math.PI, 0]
                    },
                    animations: {
                        idle: "Idle",
                        run: "Run",
                        shoot: "Shoot"
                    }
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
            const rawModel = this.baseModel.clone();
            const box = new THREE.Box3().setFromObject(rawModel);
            const center = box.getCenter(new THREE.Vector3());

            this.group = new THREE.Group();
            rawModel.position.copy(center).negate();
            this.group.add(rawModel);

            const t = this.config.transform;
            this.group.scale.set(t.scale, t.scale, t.scale);
            this.group.position.fromArray(t.position);
            this.group.rotation.fromArray(t.rotation);

            rawModel.traverse(o => {
                if (o.isMesh) {
                    o.renderOrder = 10;
                    o.material.depthTest = false; 
                }
            });

            this.mixer = new THREE.AnimationMixer(rawModel);
            const anims = this.baseModel.userData.animations || [];
            this.actions = {};

            for (const [key, glbName] of Object.entries(this.config.animations)) {
                if (!glbName) continue;
                const clip = anims.find(c => c.name === glbName);
                if (clip) {
                    this.actions[key] = this.mixer.clipAction(clip);
                }
            }

            if (this.actions.idle) this.actions.idle.play();
            else if (anims.length > 0) {
                this.actions['fallback'] = this.mixer.clipAction(anims[0]);
                this.actions['fallback'].play();
            }

            this.camera.add(this.group);
            this.updateDebug(`READY!\nAnims: ${Object.keys(this.actions).join(', ')}`);
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

        if (e.code === 'KeyI') { this.group.rotation.x -= rStep; changed = true; }
        if (e.code === 'KeyK') { this.group.rotation.x += rStep; changed = true; }
        if (e.code === 'KeyJ') { this.group.rotation.y -= rStep; changed = true; }
        if (e.code === 'KeyL') { this.group.rotation.y += rStep; changed = true; }

        if (e.code === 'Equal' || e.code === 'NumpadAdd') {
            const s = this.group.scale.x + 0.0001;
            this.group.scale.set(s,s,s);
            changed = true;
        }
        if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
            const s = Math.max(0.0001, this.group.scale.x - 0.0001);
            this.group.scale.set(s,s,s);
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
window.FPSController = FPSController;
