"use strict"

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

window.onload = () => loadModel();

const loadModel = () => {
    const loader = new GLTFLoader();
    loader.load('public/model_final.glb',
        (gltf) => {
            // Loaded
            setupScene(gltf);
            document.getElementById('avatar_loading').style.display = 'none';
        },
        (xhr) => {
            // Progress
            const percentCompletion = Math.round((xhr.loaded / xhr.total) * 100);
            console.log(xhr.loaded, xhr.total);
            document.getElementById('avatar_loading').innerText = `LOADING... ${percentCompletion}%`;
        },
        (error) => {
            console.log(error);
        }
    );
}

const setupScene = gltf => {
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const container = document.getElementById('avatar_container');
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const camera = cameraSetup(container, renderer);

    const scene = new THREE.Scene();

    lightingSetup(scene);

    createPedestal(scene);

    const avatar = loadAvatar(gltf, scene);

    // Load animation
    const mixer = new THREE.AnimationMixer(avatar);
    const clips = gltf.animations;
    const jumpingDownClip = THREE.AnimationClip.findByName(clips, 'jumping_down');
    const breathingIdleClip = THREE.AnimationClip.findByName(clips, 'breathing_idle');
    const wavingClip = THREE.AnimationClip.findByName(clips, 'waving');
    const hardLandingClip = THREE.AnimationClip.findByName(clips, 'hard_landing');
    const fallingIdleClip = THREE.AnimationClip.findByName(clips, 'falling_idle');
    const fallingToLandingClip = THREE.AnimationClip.findByName(clips, 'falling_to_landing');
    const actions = {
        'jumping_down': mixer.clipAction(jumpingDownClip),
        'waving': mixer.clipAction(wavingClip),
        'breathing_idle': mixer.clipAction(breathingIdleClip),
        'hard_landing': mixer.clipAction(hardLandingClip),
        'falling_idle': mixer.clipAction(fallingIdleClip),
        'falling_to_landing': mixer.clipAction(fallingToLandingClip),
    };

    const handleScrollAction = scrollIsDown => {
        // If scrolling happens before the initial animation finishes.
        clearTimeout(defaultAnimation1);
        clearTimeout(defaultAnimation2);

        if (scrollIsDown) {
            currentActionStr = switchAction(actions, currentActionStr, 'hard_landing', 0.2);
            setTimeout(() => {
                currentActionStr = switchAction(actions, currentActionStr, 'breathing_idle', 0.5);
            }, 1500);
        }
        else {
            currentActionStr = switchAction(actions, currentActionStr, 'falling_idle', 0.2);
            setTimeout(() => {
                currentActionStr = switchAction(actions, currentActionStr, 'falling_to_landing', 0.2);
            }, 300);
            setTimeout(() => {
                currentActionStr = switchAction(actions, currentActionStr, 'breathing_idle', 0.5);
            }, 600);
        }
    }

    let last = 0;
    let oldScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        const scrollIsDown = (oldScrollY - window.scrollY) < 0;
        oldScrollY = window.scrollY;

        container.classList.remove('scrollReturn');
        if (scrollIsDown) {
            container.style.transform = "translateY(-50px)";
            setTimeout(() => {
                container.style.transform = "translateY(0)";
                container.classList.add('scrollReturn');
            }, 250);
        }
        else {
            container.style.transform = "translateY(50px)";
            setTimeout(() => {
                container.style.transform = "translateY(0)";
                container.classList.add('scrollReturn');
            }, 250);
        }

        const now = new Date().getTime();
        if (now - last < 1500) return;
        last = now;

        handleScrollAction(scrollIsDown);
    });

    let currentActionStr = 'jumping_down'
    const clock = new THREE.Clock();
    const animate = () => {
        requestAnimationFrame(animate);
        mixer.update(clock.getDelta());
        renderer.render(scene, camera);
    }

    animate();
    console.log('Action:', currentActionStr)
    actions[currentActionStr].play();

    const defaultAnimation1 = setTimeout(() => {
        currentActionStr = switchAction(actions, currentActionStr, 'waving', 1);
    }, 1700);

    const defaultAnimation2 = setTimeout(() => {
        currentActionStr = switchAction(actions, currentActionStr, 'breathing_idle', 1.5);
    }, 4700);
}

const switchAction = (actions, currentActionStr, toActionStr, duration) => {
    console.log('Action:', toActionStr)
    actions[toActionStr].reset();
    actions[toActionStr].play();
    actions[currentActionStr].crossFadeTo(actions[toActionStr], duration);
    return toActionStr;
}

const cameraSetup = (container, renderer) => {
    const camera = new THREE.PerspectiveCamera(
        45, container.clientWidth / container.clientHeight);
    camera.position.set(0.2, 0.5, 1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minDistance = 4;
    controls.minPolarAngle = 1.4;
    controls.maxPolarAngle = 1.4;
    controls.target = new THREE.Vector3(0, 1, 0);
    controls.update();

    return camera;
}

const lightingSetup = scene => {
    scene.add(new THREE.AmbientLight());

    const spotlight = new THREE.SpotLight(0xffffff, 20, 8, 1);
    spotlight.penumbra = 0.5;
    spotlight.position.set(0, 4, 2);
    spotlight.castShadow = true;
    scene.add(spotlight);
}

const createPedestal = scene => {
    const groundGeometry = new THREE.CylinderGeometry(1, 1, 0.1, 5);
    const groundMaterial = new THREE.MeshStandardMaterial();
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.castShadow = false;
    groundMesh.receiveShadow = true;
    groundMesh.position.y = -0.05;
    scene.add(groundMesh);
}

const loadAvatar = (gltf, scene) => {
    const avatar = gltf.scene;
    avatar.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    scene.add(avatar);

    return avatar;
}

const throttle = (func, delay) => {
    let last = 0;
    return (...args) => {
        const now = new Date().getTime();
        if (now - last < delay) return;
        last = now;
        func(...args);
    }
}