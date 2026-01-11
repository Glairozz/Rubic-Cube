let scene, camera, renderer;
let cubeGroup = new THREE.Group();

// Mouse rotation
let isDragging = false;
let prevMouse = { x: 0, y: 0 };

// Timer
let timerRunning = false;
let startTime = 0;
let elapsedTime = 0;

init();
animate();

/* ---------------- INIT ---------------- */
function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

    // PERFECTLY centered camera
    camera.position.set(0, 0, 7);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(420, 420);
    renderer.setPixelRatio(window.devicePixelRatio);

    document
        .getElementById("scene-container")
        .appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(6, 8, 10);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x88ccff, 0.3);
    rimLight.position.set(-6, -4, -6);
    scene.add(rimLight);

    createRubiksCube();
    scene.add(cubeGroup);

    addMouseControls();
    addTimerControls();
}

/* ---------------- RUBIK'S CUBE ---------------- */
function createRubiksCube() {
    const size = 0.98;
    const gap = 1.05;

    const colors = {
        red: 0xff3b3b,
        blue: 0x3b82ff,
        green: 0x22c55e,
        yellow: 0xfacc15,
        white: 0xffffff,
        orange: 0xf97316,
        black: 0x050505
    };

    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                const geometry = new THREE.BoxGeometry(size, size, size);

                const materials = [
                    new THREE.MeshStandardMaterial({ color: x === 1 ? colors.red : colors.black }),
                    new THREE.MeshStandardMaterial({ color: x === -1 ? colors.orange : colors.black }),
                    new THREE.MeshStandardMaterial({ color: y === 1 ? colors.white : colors.black }),
                    new THREE.MeshStandardMaterial({ color: y === -1 ? colors.yellow : colors.black }),
                    new THREE.MeshStandardMaterial({ color: z === 1 ? colors.blue : colors.black }),
                    new THREE.MeshStandardMaterial({ color: z === -1 ? colors.green : colors.black })
                ];

                const cube = new THREE.Mesh(geometry, materials);
                cube.position.set(x * gap, y * gap, z * gap);
                cubeGroup.add(cube);
            }
        }
    }

    // Center group perfectly (important)
    cubeGroup.position.set(0, 0, 0);
}

/* ---------------- MOUSE ROTATION ---------------- */
function addMouseControls() {
    const canvas = renderer.domElement;

    canvas.addEventListener("mousedown", e => {
        isDragging = true;
        prevMouse.x = e.clientX;
        prevMouse.y = e.clientY;
    });

    window.addEventListener("mouseup", () => {
        isDragging = false;
    });

    window.addEventListener("mousemove", e => {
        if (!isDragging) return;

        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;

        cubeGroup.rotation.y += dx * 0.005;
        cubeGroup.rotation.x += dy * 0.005;

        prevMouse.x = e.clientX;
        prevMouse.y = e.clientY;
    });
}

/* ---------------- TIMER ---------------- */
function addTimerControls() {
    document.getElementById("start").onclick = () => {
        if (!timerRunning) {
            timerRunning = true;
            startTime = Date.now() - elapsedTime;
        }
    };

    document.getElementById("stop").onclick = () => {
        timerRunning = false;
    };

    document.getElementById("reset").onclick = () => {
        timerRunning = false;
        elapsedTime = 0;
        updateTimerDisplay(0);
    };
}

function updateTimer() {
    if (timerRunning) {
        elapsedTime = Date.now() - startTime;
        updateTimerDisplay(elapsedTime);
    }
}

function updateTimerDisplay(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    document.getElementById("timer").textContent =
        `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/* ---------------- ANIMATION ---------------- */
function animate() {
    requestAnimationFrame(animate);

    // Subtle idle motion
    cubeGroup.rotation.y += 0.0015;

    updateTimer();
    renderer.render(scene, camera);
}