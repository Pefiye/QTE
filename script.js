// Constants for PS3 and Keyboard Keys
const ps3Keys = [
    'ps3_x.png',
    'ps3_circle.png',
    'ps3_square.png',
    'ps3_triangle.png',
    'ps3_r1.png',
    'ps3_l1.png'
];
const keyboardKeys = ['a', 's', 'd', 'q', 'w', 'e'];

// Variables
let currentKeys = [];
let currentIndex = 0;
let timer;
let isRunning = false;
let inputEnabled = true;
let inputMode = 'keyboard'; // Default input mode
let timeBarTimeout;
let isGamepadConnected = false;
let activeGamepadIndex = null;
let gamepadButtonStates = {};

// PS3 Button Mapping
const ps3ButtonMapping = {
    0: 'ps3_x.png',
    1: 'ps3_circle.png',
    2: 'ps3_square.png',
    3: 'ps3_triangle.png',
    5: 'ps3_r1.png',
    4: 'ps3_l1.png'
};

// Preload Audio
function preloadAudio(audioElement) {
    audioElement.load();
}

document.addEventListener('DOMContentLoaded', () => {
    preloadAudio(document.getElementById('failSound'));
    preloadAudio(document.getElementById('successSound'));
    preloadAudio(document.getElementById('successCompleteSound'));
});

function playSound(audioId) {
    const audio = document.getElementById(audioId);
    if (!audio.paused) {
        audio.pause();
    }
    audio.currentTime = 0;
    audio.play().catch(err => console.warn(`Failed to play sound ${audioId}:`, err));
}

// Generate Random Keys
function getRandomKeys() {
    const keyPool = inputMode === 'ps3' ? ps3Keys : keyboardKeys;
    const keyCount = document.getElementById('keyCount').value === 'random'
        ? (Math.random() > 0.5 ? 3 : 5)
        : parseInt(document.getElementById('keyCount').value);

    const selectedKeys = [];
    let repeatedKey = null; // The key that can be repeated twice
    const allowRepeatedKey = keyCount === 3 ? Math.random() < 0.1 : true; // 10% for 3 keys, always true for 5 keys

    while (selectedKeys.length < keyCount) {
        const randomKey = keyPool[Math.floor(Math.random() * keyPool.length)];

        // Check if the key is allowed to be repeated
        if (
            repeatedKey === null && // No repeated key selected yet
            allowRepeatedKey && // Repeated key allowed based on probability
            !selectedKeys.includes(randomKey) // Ensure this is a new key for repetition
        ) {
            repeatedKey = randomKey;
        }

        const usageCount = selectedKeys.filter(key => key === randomKey).length;

        // Allow the key if:
        // - It's not already repeated twice
        // - It matches the `repeatedKey` or hasn't been selected before
        if (
            usageCount < 2 && 
            (repeatedKey === null || randomKey === repeatedKey || !selectedKeys.includes(randomKey))
        ) {
            selectedKeys.push(randomKey);
        }
    }

    return selectedKeys;
}

// Start Training
function startTraining() {
    if (isRunning) return;
    isRunning = true;
    inputEnabled = true;
    document.getElementById('stopButton').disabled = false;
    document.getElementById('startButton').disabled = true;
    loopTraining();
}

// Stop Training
function stopTraining() {
    clearTimeout(timer);
    clearTimeout(timeBarTimeout);
    isRunning = false;
    inputEnabled = false;
    document.getElementById('stopButton').disabled = true;
    document.getElementById('startButton').disabled = false;
    document.getElementById('message').textContent = 'Training stopped.';
    document.getElementById('timeBar').style.width = '0%';
}

// Main Loop
function loopTraining() {
    inputEnabled = true;
    currentKeys = getRandomKeys();
    currentIndex = 0;
    displayKeys(currentKeys);
    document.getElementById('message').textContent = '';
    const timeLimit = document.getElementById('timeLimit').value;
    resetTimeBar(timeLimit);

    timer = setTimeout(() => {
        if (isRunning) {
            inputEnabled = false; // Disable input after timeout
            document.getElementById('message').textContent = 'Time up! Try again!';
            setTimeout(loopTraining, 1000); // Add 1-second delay before restarting
        }
    }, timeLimit);
}

// Display Keys
function displayKeys(keys) {
    const keyDisplay = document.getElementById('keyDisplay');
    keyDisplay.innerHTML = '';
    keys.forEach(key => {
        if (inputMode === 'ps3') {
            const img = document.createElement('img');
            img.src = key;
            img.classList.add('key-img');
            keyDisplay.appendChild(img);
        } else {
            const span = document.createElement('span');
            span.textContent = key.toUpperCase();
            span.style.fontSize = '32px';
            span.style.margin = '10px';
            keyDisplay.appendChild(span);
        }
    });
}

// Reset Time Bar
function resetTimeBar(duration) {
    const timeBarElement = document.getElementById('timeBar');
    timeBarElement.style.transition = 'none';
    timeBarElement.style.width = '0%';
    clearTimeout(timeBarTimeout);
    timeBarTimeout = setTimeout(() => {
        timeBarElement.style.transition = `width ${duration}ms linear`;
        timeBarElement.style.width = '100%';
    }, 50);
}

// Process Input
function processInput(pressedKey) {
    if (isRunning && inputEnabled) {
        const expectedKey = currentKeys[currentIndex];
        if (
            (inputMode === 'keyboard' && pressedKey === expectedKey) ||
            (inputMode === 'ps3' && ps3Keys.includes(expectedKey) && pressedKey === expectedKey)
        ) {
            currentIndex++;
            playSound('successSound');
            displayKeys(currentKeys.slice(currentIndex));
            if (currentIndex === currentKeys.length) {
                document.getElementById('message').textContent = 'Success!';
                inputEnabled = false;
                clearTimeout(timer);
                clearTimeout(timeBarTimeout);
                playSound('successCompleteSound');
                setTimeout(loopTraining, 1000);
            }
        } else {
            inputEnabled = false;
            document.getElementById('message').textContent = 'Wrong key! Resetting...';
            playSound('failSound');
            clearTimeout(timer);
            clearTimeout(timeBarTimeout);
            setTimeout(loopTraining, 1000);
        }
    }
}

// Gamepad Input
function handleGamepadInput() {
    if (isGamepadConnected) {
        const gamepad = navigator.getGamepads()[activeGamepadIndex];
        if (!gamepad) return;

        gamepad.buttons.forEach((button, index) => {
            if (button.pressed && ps3ButtonMapping[index]) {
                if (!gamepadButtonStates[index]) {
                    processInput(ps3ButtonMapping[index]);
                    gamepadButtonStates[index] = true;
                }
            } else {
                gamepadButtonStates[index] = false;
            }
        });
    }
}

// Event Listeners
document.getElementById('startButton').addEventListener('click', startTraining);
document.getElementById('stopButton').addEventListener('click', stopTraining);
document.getElementById('inputMode').addEventListener('change', (e) => {
    inputMode = e.target.value;
    console.log(`Input mode set to: ${inputMode}`);
});
document.addEventListener('keydown', (e) => {
    if (inputMode === 'keyboard') {
        processInput(e.key.toLowerCase());
    }
});
window.addEventListener('gamepadconnected', (e) => {
    isGamepadConnected = true;
    activeGamepadIndex = e.gamepad.index;
    console.log(`Gamepad connected: ${e.gamepad.id}`);
});
window.addEventListener('gamepaddisconnected', () => {
    isGamepadConnected = false;
    activeGamepadIndex = null;
    gamepadButtonStates = {};
    console.log("Gamepad disconnected.");
});
setInterval(handleGamepadInput, 100);
