document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    // Simple Router logic
    if (path.endsWith('index.html') || path.endsWith('/')) {
        initSetupPage();
    } else if (path.endsWith('battle.html')) {
        initBattlePage();
    }
});

/* ================= SETUP PAGE LOGIC ================= */
function initSetupPage() {
    const form = document.getElementById('setupForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get Values
        const params = new URLSearchParams();

        // P1
        params.append('p1', document.getElementById('p1User').value.trim());
        params.append('p1e', document.getElementById('p1Easy').value || 0);
        params.append('p1m', document.getElementById('p1Med').value || 0);
        params.append('p1h', document.getElementById('p1Hard').value || 0);

        // P2
        params.append('p2', document.getElementById('p2User').value.trim());
        params.append('p2e', document.getElementById('p2Easy').value || 0);
        params.append('p2m', document.getElementById('p2Med').value || 0);
        params.append('p2h', document.getElementById('p2Hard').value || 0);

        // Redirect
        window.location.href = `battle.html?${params.toString()}`;
    });
}


/* ================= BATTLE PAGE LOGIC ================= */
async function initBattlePage() {
    const params = new URLSearchParams(window.location.search);

    const p1Config = {
        name: params.get('p1'),
        base: {
            easy: parseInt(params.get('p1e')) || 0,
            med: parseInt(params.get('p1m')) || 0,
            hard: parseInt(params.get('p1h')) || 0
        }
    };

    const p2Config = {
        name: params.get('p2'),
        base: {
            easy: parseInt(params.get('p2e')) || 0,
            med: parseInt(params.get('p2m')) || 0,
            hard: parseInt(params.get('p2h')) || 0
        }
    };

    if (!p1Config.name || !p2Config.name) {
        showBattleError("Missing Player Information");
        return;
    }

    // Set Header Names
    document.getElementById('p1Name').textContent = p1Config.name;
    document.getElementById('p2Name').textContent = p2Config.name;
    document.getElementById('p1StatName').textContent = p1Config.name;
    document.getElementById('p2StatName').textContent = p2Config.name;

    try {
        const [data1, data2] = await Promise.all([
            fetchUser(p1Config.name),
            fetchUser(p2Config.name)
        ]);

        if (data1.status === 'error' || data2.status === 'error') {
            throw new Error("One or more users not found on LeetCode.");
        }

        renderBattle(data1, p1Config, data2, p2Config);
        document.getElementById('loadingOverlay').classList.add('hidden');
        document.getElementById('battleContent').classList.remove('hidden');

    } catch (err) {
        showBattleError(err.message || "Failed to fetch data");
    }
}

async function fetchUser(username) {
    const response = await fetch(`https://leetcode-api-faisalshohag.vercel.app/${username}`);
    if (!response.ok) throw new Error("Network error");
    const data = await response.json();
    
    if (data.errors) throw new Error("User not found");
    
    // Calculate acceptanceRate if the API lacks it natively but includes raw stats
    if (data.acceptanceRate === undefined && data.matchedUserStats) {
        const ac = data.matchedUserStats.acSubmissionNum.find(x => x.difficulty === 'All')?.submissions || 0;
        const total = data.matchedUserStats.totalSubmissionNum.find(x => x.difficulty === 'All')?.submissions || 0;
        data.acceptanceRate = total > 0 ? ((ac / total) * 100).toFixed(2) : 0;
    }
    
    return data;
}

function renderBattle(data1, cfg1, data2, cfg2) {
    // 1. Calculate Points
    const pts1 = calcPoints(data1, cfg1.base);
    const pts2 = calcPoints(data2, cfg2.base);

    // 2. Render Totals
    animateValue(document.getElementById('p1Total'), 0, pts1.total, 1500);
    animateValue(document.getElementById('p2Total'), 0, pts2.total, 1500);

    // 3. Determine Overall Winner
    const p1Hero = document.getElementById('p1Hero');
    const p2Hero = document.getElementById('p2Hero');
    const verdict = document.getElementById('verdictBanner');

    if (pts1.total > pts2.total) {
        p1Hero.classList.add('winner');
        p2Hero.classList.add('loser');
        p1Hero.querySelector('.crown-icon').classList.remove('hidden');
        verdict.textContent = `${cfg1.name} WINS!`;
        verdict.style.color = 'var(--accent-gold)';
        verdict.style.borderColor = 'var(--accent-gold)';
    } else if (pts2.total > pts1.total) {
        p2Hero.classList.add('winner');
        p1Hero.classList.add('loser');
        p2Hero.querySelector('.crown-icon').classList.remove('hidden');
        verdict.textContent = `${cfg2.name} WINS!`;
        verdict.style.color = 'var(--accent-gold)';
        verdict.style.borderColor = 'var(--accent-gold)';
    } else {
        verdict.textContent = "DRAW";
    }

    // 4. Render Category Rows
    renderCategory('rowEasy', pts1.easy, pts2.easy, data1.easySolved, data2.easySolved, pts1.deltaE, pts2.deltaE);
    renderCategory('rowMed', pts1.med, pts2.med, data1.mediumSolved, data2.mediumSolved, pts1.deltaM, pts2.deltaM);
    renderCategory('rowHard', pts1.hard, pts2.hard, data1.hardSolved, data2.hardSolved, pts1.deltaH, pts2.deltaH);

    // 5. Render Extra Stats
    document.getElementById('p1Rank').textContent = data1.ranking.toLocaleString();
    document.getElementById('p2Rank').textContent = data2.ranking.toLocaleString();

    document.getElementById('p1Acc').textContent = `${data1.acceptanceRate}%`;
    document.getElementById('p2Acc').textContent = `${data2.acceptanceRate}%`;

    document.getElementById('p1RawTotal').textContent = data1.totalSolved;
    document.getElementById('p2RawTotal').textContent = data2.totalSolved;
}

function calcPoints(data, base) {
    // Actually user said: "can be negative if user has fewer problems than the baseline"
    // So let's use exact delta.
    const deltaE = data.easySolved - base.easy;
    const deltaM = data.mediumSolved - base.med;
    const deltaH = data.hardSolved - base.hard;

    return {
        deltaE: deltaE,
        deltaM: deltaM,
        deltaH: deltaH,
        easy: deltaE * 10,
        med: deltaM * 20,
        hard: deltaH * 50,
        total: (deltaE * 10) + (deltaM * 20) + (deltaH * 50)
    };
}

function renderCategory(rowId, p1Score, p2Score, p1Raw, p2Raw, p1Delta, p2Delta) {
    const row = document.getElementById(rowId);
    const el1 = row.querySelector('.cat-p1');
    const el2 = row.querySelector('.cat-p2');

    // Use innerHTML to show Points + Raw Solved + Delta
    el1.innerHTML = `
        <div class="score-main">${p1Score.toLocaleString()}</div>
        <div class="score-sub">${p1Delta} Solved</div>
    `;

    el2.innerHTML = `
        <div class="score-main">${p2Score.toLocaleString()}</div>
        <div class="score-sub">${p2Delta} Solved</div>
    `;

    if (p1Score > p2Score) {
        el1.classList.add('cat-win');
        el2.classList.add('cat-lose');
    } else if (p2Score > p1Score) {
        el2.classList.add('cat-win');
        el1.classList.add('cat-lose');
    }
}

function showBattleError(msg) {
    document.getElementById('loadingOverlay').classList.add('hidden');
    document.getElementById('errorOverlay').classList.remove('hidden');
    document.getElementById('errorText').textContent = msg;
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}
