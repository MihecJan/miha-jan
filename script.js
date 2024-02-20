"use strict"

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let avatarContainer;
let oldScrollY = window.scrollY;

window.onload = () => {
    avatarContainer = document.getElementById('avatar_container');
    loadModel();
    
    const toggleView = document.querySelectorAll(".toggle-view-btn");
    toggleView.forEach(btn => {
        btn.addEventListener("click", e => handleProjectViewModeSwitch(e));
    });
};

const initialAvatar = document.getElementById('initial_avatar');
const testBalanceContainer = document.getElementById('test_balance_container');
const progressContainer = document.querySelector('.progress-container');
const progressBar = document.querySelector('.progress-container .bar-wrapper .bar');
const progressText = document.querySelector('.progress-container .text');
const progressPercentage = document.querySelector('.progress-container .percentage');

const loadModel = () => {
    const loader = new GLTFLoader();
    loader.load('public/model_final.glb',
        (gltf) => {
            // When 3d avatar is loaded, just displayed on the screen

            // Hide initial avatar and progress bar.
            initialAvatar.style.display = 'none';
            progressContainer.style.display = 'none';
            avatarContainer.classList.add('loaded');
            avatarContainer.style.position = 'fixed';

            /* Wait 100ms because the avatar was just inserted to the DOM,
            so the opacity fade in works. */
            setTimeout(() => { avatarContainer.style.opacity = '1'; }, 100);

            // Show message and move a little to the side
            setTimeout(() => { testBalanceContainer.classList.add('loaded'); }, 3000);
            setTimeout(() => { avatarContainer.classList.add('move'); }, 3000);
            setupScene(gltf);
        },
        (xhr) => {
            // Progress
            const percentCompletion = Math.round((xhr.loaded / xhr.total) * 100);
            progressBar.style.width = `${percentCompletion}%`;
            progressText.innerText = 'Loading avatar...';
            progressPercentage.innerText = `${percentCompletion} %`;

            if (percentCompletion === 100) {
                initialAvatar.classList.add('percent-completion');
                avatarContainer.classList.add('percent-completion');
            }
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

    renderer.setSize(avatarContainer.clientWidth, avatarContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    avatarContainer.appendChild(renderer.domElement);

    const camera = cameraSetup(avatarContainer, renderer);

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

    const handleScrollAction = scrollYDiff => {
        // Hide text 'Test my balance by scrolling'
        testBalanceContainer.classList.add('balance-tested');

        // If scrolling happens before the initial animation finishes.
        clearTimeout(defaultAnimation1);
        clearTimeout(defaultAnimation2);

        // We are already inside throttled function and a fast scroll happened.
        if (scrollYDiff < 0) {
            // Scrolled down -> platform pushes avatar -> like elevator accelerating  up.
            currentActionStr = switchAction(actions, currentActionStr, 'hard_landing', 0.2);
            setTimeout(() => {
                currentActionStr = switchAction(actions, currentActionStr, 'breathing_idle', 0.5);
            }, 1500);
        }
        else if (scrollYDiff > 0) {
            // Scrolled up -> platform goes down -> like elevator accelerating down.
            currentActionStr = switchAction(actions, currentActionStr, 'falling_idle', 0.2);
            setTimeout(() => {
                currentActionStr = switchAction(actions, currentActionStr, 'falling_to_landing', 0.2);
            }, 300);
            setTimeout(() => {
                currentActionStr = switchAction(actions, currentActionStr, 'breathing_idle', 0.5);
            }, 600);
        }
    }

    // Time of last triggered avatar action (handleScrollAction)
    let lastBalanceAction = 0;
    let returnScrollTimeout;
    window.addEventListener('scroll', () => {
        // Get scroll difference between the current and last 'scroll' event.
        const scrollYDiff = oldScrollY - window.scrollY
        oldScrollY = window.scrollY;

        // Move avatar to the side or back to center
        if (window.scrollY > 80) {
            avatarContainer.classList.add('to-side');
        }
        else {
            avatarContainer.classList.remove('to-side');
        }

        // Remove slow transform transition of the avatarContainer.
        avatarContainer.classList.remove('scrollReturn');

        /* Limit movement to 100px, and move the platform to make it look realistic.
        After timeout add the slow transform transition and move to original location.
        Code inside setTimeout will only execute after there was no scroll for period of time.*/
        const moveBy = (scrollYDiff * 5) < -100 ? -100
            : (scrollYDiff * 5) > 100 ? 100
            : scrollYDiff * 5;
        avatarContainer.style.transform = "translate(70%, calc(-50% + " + moveBy + "px))";

        clearTimeout(returnScrollTimeout);
        returnScrollTimeout = setTimeout(() => {
            avatarContainer.style.transform = "translate(70%, -50%)";
            avatarContainer.classList.add('scrollReturn');
        }, 400);

        console.log(Math.abs(scrollYDiff));
        /* If the scroll was strong, do something with the avatar.
        Then do nothing to the avatar for 1500 ms (to finish the animation).*/
        if (Math.abs(scrollYDiff) > 20) {
            const now = new Date().getTime();
            if (now - lastBalanceAction < 1500) return;
            lastBalanceAction = now;

            handleScrollAction(scrollYDiff);
        }
    });

    // This is the initial animation/action
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

    /* This is the default animation if the user is not interacting.
    It will get cancelled with a strong scroll. (clearTimeout)*/
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

const cameraSetup = (avatarContainer, renderer) => {
    const camera = new THREE.PerspectiveCamera(
        45, avatarContainer.clientWidth / avatarContainer.clientHeight);
    camera.position.set(0.2, 0.5, 1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minDistance = 4;
    controls.minPolarAngle = 1.4;
    controls.maxPolarAngle = 1.4;
    controls.target = new THREE.Vector3(0, 1, 0.25);
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
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.castShadow = false;
    groundMesh.receiveShadow = true;
    groundMesh.position.y = -0.1;
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