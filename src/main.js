// ゲームの状態
const state = {
    bp: 0,
    genCount: 0,
    progress: 0,
    isRepairing: false, // 修理中かどうか
    skillCheckActive: false,
    needleAngle: 0,
    targetStart: 0,
    targetEnd: 0,
    greatStart: 0,
    greatEnd: 0,
    difficulty: 1,
    baseRepairSpeed: 1, // % per second

    upgrades: {
        toolbox: {
            name: "工具箱",
            description: "修理の基本速度が上がります。",
            baseCost: 50,
            costMultiplier: 1.5,
            level: 0,
            effect: (lv) => lv * 0.5
        },
        precision: {
            name: "精密技術",
            description: "スキルチェックの成功範囲が広がります。",
            baseCost: 100,
            costMultiplier: 1.8,
            level: 0,
            effect: (lv) => lv * 5 // degrees
        },
        mastery: {
            name: "熟練の技",
            description: "スキルチェック成功時の進捗ボーナスが増えます。",
            baseCost: 150,
            costMultiplier: 2.0,
            level: 0,
            effect: (lv) => lv * 2 // % bonus
        },
        autoRepair: {
            name: "自動修理装置",
            description: "放置していても自動で修理が進みます。",
            baseCost: 300,
            costMultiplier: 2.5,
            level: 0,
            effect: (lv) => lv * 0.2 // % per second
        }
    }
};

// DOM要素
const bpDisplay = document.getElementById('bp-count');
const genDisplay = document.getElementById('gen-count');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const generator = document.getElementById('generator');
const needle = document.getElementById('needle');
const targetZone = document.getElementById('target-zone');
const greatZone = document.getElementById('great-zone');
const upgradeList = document.getElementById('upgrade-list');
const skillCheckArea = document.querySelector('.skill-check-circle');

// 初期化
function init() {
    renderUpgrades();
    requestAnimationFrame(gameLoop);
    setInterval(triggerSkillCheck, 5000); // 5秒に1回スキルチェック（仮）

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            handleSkillCheck();
        }
    });
}

function renderUpgrades() {
    upgradeList.innerHTML = '';
    Object.keys(state.upgrades).forEach(id => {
        const up = state.upgrades[id];
        const cost = Math.floor(up.baseCost * Math.pow(up.costMultiplier, up.level));

        const div = document.createElement('div');
        div.className = `upgrade-item ${state.bp < cost ? 'disabled' : ''}`;
        div.innerHTML = `
            <span class="upgrade-level">Lv.${up.level}</span>
            <h3>${up.name}</h3>
            <p>${up.description}</p>
            <span class="upgrade-cost">${cost} BP</span>
        `;
        div.onclick = () => buyUpgrade(id);
        upgradeList.appendChild(div);
    });
}

function buyUpgrade(id) {
    const up = state.upgrades[id];
    const cost = Math.floor(up.baseCost * Math.pow(up.costMultiplier, up.level));

    if (state.bp >= cost) {
        state.bp -= cost;
        up.level++;
        updateDisplay();
        renderUpgrades();
    }
}

function updateDisplay() {
    bpDisplay.textContent = Math.floor(state.bp);
    genDisplay.textContent = state.genCount;
    progressBar.style.width = `${state.progress}%`;
    progressPercent.textContent = `${Math.floor(state.progress)}%`;

    if (state.progress > 0) {
        generator.classList.add('working');
    } else {
        generator.classList.remove('working');
    }
}

function triggerSkillCheck() {
    if (state.skillCheckActive) return;

    state.skillCheckActive = true;
    state.needleAngle = 0;

    // 成功範囲の決定
    const baseWidth = 30; // degrees
    const extraWidth = state.upgrades.precision.effect(state.upgrades.precision.level);
    const totalWidth = baseWidth + extraWidth;

    state.targetStart = 160 + Math.random() * 120; // 半円以上の範囲でランダム
    state.targetEnd = state.targetStart + totalWidth;

    const greatWidth = 8;
    state.greatStart = state.targetStart; // スキルチェックの始まりをGreatにする（DbD仕様）
    state.greatEnd = state.targetStart + greatWidth;

    // UI更新: conic-gradientを使用して正確な扇形を描画
    targetZone.style.background = `conic-gradient(
        transparent ${state.targetStart}deg, 
        rgba(255, 255, 255, 0.4) ${state.targetStart}deg, 
        rgba(255, 255, 255, 0.4) ${state.targetEnd}deg, 
        transparent ${state.targetEnd}deg
    )`;

    greatZone.style.background = `conic-gradient(
        transparent ${state.greatStart}deg, 
        #ffffff ${state.greatStart}deg, 
        #ffffff ${state.greatEnd}deg, 
        transparent ${state.greatEnd}deg
    )`;
}

function handleSkillCheck() {
    if (!state.skillCheckActive) return;

    const angle = state.needleAngle % 360;

    if (angle >= state.greatStart && angle <= state.greatEnd) {
        state.progress += 10 + state.upgrades.mastery.effect(state.upgrades.mastery.level);
        state.bp += 50 * (state.upgrades.mastery.level + 1);
        showEffect('success');
    } else if (angle >= state.targetStart && angle <= state.targetEnd) {
        state.progress += 5;
        state.bp += 25;
        showEffect('success');
    } else {
        state.progress = Math.max(0, state.progress - 10);
        showEffect('fail');
    }

    state.skillCheckActive = false;
    // 判定後に見た目をクリア
    targetZone.style.background = 'none';
    greatZone.style.background = 'none';
    updateDisplay();
}

function showEffect(type) {
    const effect = document.createElement('div');
    effect.className = `${type}-effect`;
    skillCheckArea.appendChild(effect);
    setTimeout(() => effect.remove(), 400);
}

let lastTime = 0;
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // 自動進行
    const autoSpeed = state.upgrades.autoRepair.effect(state.upgrades.autoRepair.level);
    const basicSpeed = state.progress > 0 ? state.upgrades.toolbox.effect(state.upgrades.toolbox.level) : 0;

    if (autoSpeed > 0 || basicSpeed > 0) {
        state.progress += (autoSpeed + basicSpeed) * dt;
    }

    // スキルチェック回転
    if (state.skillCheckActive) {
        state.needleAngle += 200 * dt; // speed
        needle.style.transform = `rotate(${state.needleAngle}deg)`;

        if (state.needleAngle > 360) {
            handleSkillCheck(); // 一周したら自動失敗
        }
    }

    // 完了チェック
    if (state.progress >= 100) {
        state.progress = 0;
        state.genCount++;
        state.bp += 500;
        renderUpgrades(); // BPが増えたのでボタンの状態を更新
    }

    updateDisplay();
    requestAnimationFrame(gameLoop);
}

init();
