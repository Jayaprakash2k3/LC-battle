document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    // Simple Router logic
    if (path.endsWith('index.html') || path.endsWith('/')) {
        initSetupPage();
    } else if (path.endsWith('battle.html')) {
        initBattlePage();
    }
});

/* ================= SHARED HELPER FUNCTIONS ================= */
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

function calcPoints(data, base) {
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

/* ================= SETUP PAGE LOGIC ================= */
const PLAYER_ICONS = [
    'fa-user-ninja',
    'fa-user-astronaut',
    'fa-user-secret',
    'fa-user-tie',
    'fa-user-crown',
    'fa-user-shield'
];

let players = [
    { name: '', easy: 0, med: 0, hard: 0 },
    { name: '', easy: 0, med: 0, hard: 0 }
];

function createPlayerCardHTML(player, index, totalPlayers) {
    const iconClass = PLAYER_ICONS[index % PLAYER_ICONS.length];
    const isRemovable = totalPlayers > 2;
    const removeBtn = isRemovable ? `<button type="button" class="remove-player-btn" data-index="${index}" title="Remove Player"><i class="fa-solid fa-xmark"></i></button>` : '';
    
    return `
        <div class="player-card" data-index="${index}">
            ${removeBtn}
            <div class="col-header">
                <i class="fa-solid ${iconClass}"></i> Player ${index + 1}
            </div>

            <div class="input-group">
                <label>Username</label>
                <div class="username-input-wrapper">
                    <input type="text" class="player-username" placeholder="LeetCode Username" value="${player.name}" required>
                    <button type="button" class="fetch-status-btn" data-index="${index}" title="Fetch baseline from LeetCode">
                        <i class="fa-solid fa-arrows-rotate"></i>
                    </button>
                </div>
            </div>

            <div class="handicap-box">
                <div class="h-title">Baseline Solved</div>
                <div class="h-input-row">
                    <label class="lbl-easy">Easy</label>
                    <input type="number" class="player-easy" value="${player.easy}" min="0">
                </div>
                <div class="h-input-row">
                    <label class="lbl-med">Medium</label>
                    <input type="number" class="player-med" value="${player.med}" min="0">
                </div>
                <div class="h-input-row">
                    <label class="lbl-hard">Hard</label>
                    <input type="number" class="player-hard" value="${player.hard}" min="0">
                </div>
            </div>
        </div>
    `;
}

const addPlayerCardHTML = `
    <div class="add-player-card">
        <button type="button" class="add-player-btn" id="addPlayerBtn">
            <i class="fa-solid fa-plus"></i>
            <span>Add Player</span>
        </button>
    </div>
`;

function initSetupPage() {
    const container = document.getElementById('playersContainer');
    const form = document.getElementById('setupForm');
    if (!container || !form) return;

    function render() {
        let html = '';
        players.forEach((player, index) => {
            html += createPlayerCardHTML(player, index, players.length);
        });
        html += addPlayerCardHTML;
        container.innerHTML = html;
    }

    render();

    // Event delegation for inputs
    container.addEventListener('input', (e) => {
        const card = e.target.closest('.player-card');
        if (!card) return;
        const index = parseInt(card.getAttribute('data-index'));
        const player = players[index];
        
        if (e.target.classList.contains('player-username')) {
            player.name = e.target.value.trim();
        } else if (e.target.classList.contains('player-easy')) {
            player.easy = parseInt(e.target.value) || 0;
        } else if (e.target.classList.contains('player-med')) {
            player.med = parseInt(e.target.value) || 0;
        } else if (e.target.classList.contains('player-hard')) {
            player.hard = parseInt(e.target.value) || 0;
        }
    });

    // Event delegation for actions (Add, Remove, Fetch)
    container.addEventListener('click', async (e) => {
        // Add Player
        if (e.target.closest('#addPlayerBtn') || e.target.closest('.add-player-card')) {
            if (players.length >= 6) {
                alert("Maximum 6 players allowed.");
                return;
            }
            players.push({ name: '', easy: 0, med: 0, hard: 0 });
            render();
            return;
        }

        // Remove Player
        const removeBtn = e.target.closest('.remove-player-btn');
        if (removeBtn) {
            const index = parseInt(removeBtn.getAttribute('data-index'));
            players.splice(index, 1);
            render();
            return;
        }

        // Fetch Status
        const fetchBtn = e.target.closest('.fetch-status-btn');
        if (fetchBtn) {
            const index = parseInt(fetchBtn.getAttribute('data-index'));
            const player = players[index];
            const card = fetchBtn.closest('.player-card');
            const usernameInput = card.querySelector('.player-username');
            const username = usernameInput.value.trim();

            if (!username) {
                alert("Please enter a username first.");
                usernameInput.focus();
                return;
            }

            // Set loading state
            fetchBtn.classList.add('loading');
            fetchBtn.disabled = true;
            fetchBtn.classList.remove('success', 'error');

            try {
                const data = await fetchUser(username);
                
                // Update memory state
                player.name = username;
                player.easy = data.easySolved || 0;
                player.med = data.mediumSolved || 0;
                player.hard = data.hardSolved || 0;

                // Update DOM inputs
                const easyInput = card.querySelector('.player-easy');
                const medInput = card.querySelector('.player-med');
                const hardInput = card.querySelector('.player-hard');

                easyInput.value = player.easy;
                medInput.value = player.med;
                hardInput.value = player.hard;

                // Success highlight flash on inputs
                [easyInput, medInput, hardInput].forEach(inp => {
                    inp.classList.add('success-flash');
                    setTimeout(() => inp.classList.remove('success-flash'), 1000);
                });

                fetchBtn.classList.add('success');
                setTimeout(() => {
                    fetchBtn.classList.remove('success');
                    fetchBtn.classList.remove('loading');
                    fetchBtn.disabled = false;
                }, 1500);

            } catch (err) {
                console.error(err);
                fetchBtn.classList.add('error');
                alert(err.message || "Failed to fetch user data. Check username or try again.");
                setTimeout(() => {
                    fetchBtn.classList.remove('error');
                    fetchBtn.classList.remove('loading');
                    fetchBtn.disabled = false;
                }, 1500);
            }
        }
    });

    // Form submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const validPlayers = players.filter(p => p.name.trim() !== '');
        if (validPlayers.length < 2) {
            alert("At least 2 players are required.");
            return;
        }

        // Serialize to URLencoded JSON
        const params = new URLSearchParams();
        params.append('players', JSON.stringify(validPlayers));
        window.location.href = `battle.html?${params.toString()}`;
    });
}

/* ================= BATTLE PAGE LOGIC ================= */
async function initBattlePage() {
    const params = new URLSearchParams(window.location.search);
    const playersStr = params.get('players');
    
    let configs = [];
    if (playersStr) {
        try {
            const rawConfigs = JSON.parse(playersStr);
            configs = rawConfigs.map(c => ({
                name: c.name,
                base: {
                    easy: parseInt(c.easy) || 0,
                    med: parseInt(c.med) || 0,
                    hard: parseInt(c.hard) || 0
                }
            }));
        } catch (e) {
            console.error("Failed to parse players query param:", e);
        }
    }
    
    // Fallback to old format (p1 and p2) if playersStr is not present (for backwards compatibility)
    if (configs.length === 0) {
        const p1Name = params.get('p1');
        const p2Name = params.get('p2');
        if (p1Name && p2Name) {
            configs = [
                {
                    name: p1Name,
                    base: {
                        easy: parseInt(params.get('p1e')) || 0,
                        med: parseInt(params.get('p1m')) || 0,
                        hard: parseInt(params.get('p1h')) || 0
                    }
                },
                {
                    name: p2Name,
                    base: {
                        easy: parseInt(params.get('p2e')) || 0,
                        med: parseInt(params.get('p2m')) || 0,
                        hard: parseInt(params.get('p2h')) || 0
                    }
                }
            ];
        }
    }

    if (configs.length < 2) {
        showBattleError("Missing Player Information. Need at least 2 players.");
        return;
    }

    try {
        const fetchPromises = configs.map(c => fetchUser(c.name));
        const results = await Promise.all(fetchPromises);

        renderBattleMultiplayer(results, configs);
        document.getElementById('loadingOverlay').classList.add('hidden');
        document.getElementById('battleContent').classList.remove('hidden');

    } catch (err) {
        showBattleError(err.message || "Failed to fetch data");
    }
}

function renderBattleMultiplayer(results, configs) {
    const playersData = results.map((data, index) => {
        const cfg = configs[index];
        const pts = calcPoints(data, cfg.base);
        return {
            name: cfg.name,
            pts: pts,
            raw: data,
            config: cfg
        };
    });

    // 1. Determine High Score and Winners
    let maxTotal = -Infinity;
    playersData.forEach(p => {
        if (p.pts.total > maxTotal) {
            maxTotal = p.pts.total;
        }
    });

    const winners = playersData.filter(p => p.pts.total === maxTotal && maxTotal > -Infinity);
    const isTie = winners.length > 1;



    // 2. Render Hero Scores (adaptive 2-player vs multiplayer)
    const heroScores = document.getElementById('heroScores');
    if (playersData.length === 2) {
        heroScores.classList.add('vs-layout');
        heroScores.classList.remove('grid-layout');
        
        const p1 = playersData[0];
        const p2 = playersData[1];
        
        const p1WinnerClass = p1.pts.total > p2.pts.total ? 'winner' : (p1.pts.total < p2.pts.total ? 'loser' : '');
        const p2WinnerClass = p2.pts.total > p1.pts.total ? 'winner' : (p2.pts.total < p1.pts.total ? 'loser' : '');
        
        heroScores.innerHTML = `
            <div class="hero-player p1-hero ${p1WinnerClass}" id="p1Hero">
                <div class="crown-icon ${p1WinnerClass === 'winner' ? '' : 'hidden'}"><i class="fa-solid fa-crown"></i></div>
                <h2 id="p1Name">${p1.name}</h2>
                <div class="hero-points" id="p1Total">0</div>
                <div class="sub-label">TOTAL POINTS</div>
            </div>

            <div class="hero-vs">
                <div class="vs-circle">VS</div>
            </div>

            <div class="hero-player p2-hero ${p2WinnerClass}" id="p2Hero">
                <div class="crown-icon ${p2WinnerClass === 'winner' ? '' : 'hidden'}"><i class="fa-solid fa-crown"></i></div>
                <h2 id="p2Name">${p2.name}</h2>
                <div class="hero-points" id="p2Total">0</div>
                <div class="sub-label">TOTAL POINTS</div>
            </div>
        `;
        
        animateValue(document.getElementById('p1Total'), 0, p1.pts.total, 1500);
        animateValue(document.getElementById('p2Total'), 0, p2.pts.total, 1500);
        
    } else {
        heroScores.classList.remove('vs-layout');
        heroScores.classList.add('grid-layout');
        
        let heroHtml = '';
        playersData.forEach((p, idx) => {
            const isPWinner = winners.some(w => w.name === p.name);
            const playerClass = isPWinner ? 'winner' : 'loser';
            heroHtml += `
                <div class="hero-player ${playerClass}">
                    <div class="crown-icon ${isPWinner ? '' : 'hidden'}"><i class="fa-solid fa-crown"></i></div>
                    <h2>${p.name}</h2>
                    <div class="hero-points" id="totalPoints_${idx}">0</div>
                    <div class="sub-label">TOTAL POINTS</div>
                </div>
            `;
        });
        heroScores.innerHTML = heroHtml;
        
        playersData.forEach((p, idx) => {
            animateValue(document.getElementById(`totalPoints_${idx}`), 0, p.pts.total, 1500);
        });
    }

    // 3. Render Category Breakdown
    const categoryContent = document.getElementById('categoryContent');
    if (playersData.length === 2) {
        // Classic 1v1 view with badge in the middle
        categoryContent.innerHTML = `
            <!-- Easy Row -->
            <div class="cat-row" id="rowEasy">
                <div class="cat-p1 p1-val"></div>
                <div class="cat-label easy-bg">
                    <span>EASY</span>
                    <small>10 pts</small>
                </div>
                <div class="cat-p2 p2-val"></div>
            </div>

            <!-- Medium Row -->
            <div class="cat-row" id="rowMed">
                <div class="cat-p1 p1-val"></div>
                <div class="cat-label med-bg">
                    <span>MEDIUM</span>
                    <small>20 pts</small>
                </div>
                <div class="cat-p2 p2-val"></div>
            </div>

            <!-- Hard Row -->
            <div class="cat-row" id="rowHard">
                <div class="cat-p1 p1-val"></div>
                <div class="cat-label hard-bg">
                    <span>HARD</span>
                    <small>50 pts</small>
                </div>
                <div class="cat-p2 p2-val"></div>
            </div>
        `;
        renderCategory('rowEasy', 'easy', 'deltaE', playersData);
        renderCategory('rowMed', 'med', 'deltaM', playersData);
        renderCategory('rowHard', 'hard', 'deltaH', playersData);
    } else {
        // N-columns layout for multiplayer
        let headerNamesHtml = '';
        playersData.forEach(p => {
            headerNamesHtml += `<div class="cat-header-name" title="${p.name}">${p.name}</div>`;
        });

        categoryContent.innerHTML = `
            <div class="cat-header-row">
                <div class="cat-header-spacer"></div>
                <div class="cat-header-names">
                    ${headerNamesHtml}
                </div>
            </div>
            
            <!-- Easy Row -->
            <div class="cat-row multi-column" id="rowEasy">
                <div class="cat-label easy-bg">
                    <span>EASY</span>
                    <small>10 pts</small>
                </div>
                <div class="cat-columns"></div>
            </div>

            <!-- Medium Row -->
            <div class="cat-row multi-column" id="rowMed">
                <div class="cat-label med-bg">
                    <span>MEDIUM</span>
                    <small>20 pts</small>
                </div>
                <div class="cat-columns"></div>
            </div>

            <!-- Hard Row -->
            <div class="cat-row multi-column" id="rowHard">
                <div class="cat-label hard-bg">
                    <span>HARD</span>
                    <small>50 pts</small>
                </div>
                <div class="cat-columns"></div>
            </div>
        `;
        renderMultiColumnCategory('rowEasy', 'easy', 'deltaE', playersData);
        renderMultiColumnCategory('rowMed', 'med', 'deltaM', playersData);
        renderMultiColumnCategory('rowHard', 'hard', 'deltaH', playersData);
    }

    // 4. Render Combat Stats
    const statsTable = document.getElementById('statsTable');
    if (playersData.length === 2) {
        statsTable.classList.remove('multi-layout');
        const p1 = playersData[0];
        const p2 = playersData[1];
        
        statsTable.innerHTML = `
            <div class="stat-header">
                <span>Metric</span>
                <span>${p1.name}</span>
                <span>${p2.name}</span>
            </div>
            <div class="stat-line">
                <span class="metric-name"><i class="fa-solid fa-trophy"></i> Global Rank</span>
                <span>${p1.raw.ranking.toLocaleString()}</span>
                <span>${p2.raw.ranking.toLocaleString()}</span>
            </div>
            <div class="stat-line">
                <span class="metric-name"><i class="fa-solid fa-check-double"></i> Acceptance</span>
                <span>${p1.raw.acceptanceRate}%</span>
                <span>${p2.raw.acceptanceRate}%</span>
            </div>
            <div class="stat-line">
                <span class="metric-name"><i class="fa-solid fa-list-ol"></i> Total Solved (Raw)</span>
                <span>${p1.raw.totalSolved}</span>
                <span>${p2.raw.totalSolved}</span>
            </div>
        `;
    } else {
        statsTable.classList.add('multi-layout');
        
        let colsHeader = '<span>Metric</span>';
        let rankRow = '<span class="metric-name"><i class="fa-solid fa-trophy"></i> Global Rank</span>';
        let accRow = '<span class="metric-name"><i class="fa-solid fa-check-double"></i> Acceptance</span>';
        let rawRow = '<span class="metric-name"><i class="fa-solid fa-list-ol"></i> Total Solved (Raw)</span>';
        
        playersData.forEach(p => {
            colsHeader += `<span>${p.name}</span>`;
            rankRow += `<span>${p.raw.ranking.toLocaleString()}</span>`;
            accRow += `<span>${p.raw.acceptanceRate}%</span>`;
            rawRow += `<span>${p.raw.totalSolved}</span>`;
        });
        
        statsTable.innerHTML = `
            <div class="stat-header">
                ${colsHeader}
            </div>
            <div class="stat-line">
                ${rankRow}
            </div>
            <div class="stat-line">
                ${accRow}
            </div>
            <div class="stat-line">
                ${rawRow}
            </div>
        `;
    }
}

function renderCategory(rowId, catKey, deltaKey, playersData) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const el1 = row.querySelector('.cat-p1');
    const el2 = row.querySelector('.cat-p2');

    const p1 = playersData[0];
    const p2 = playersData[1];

    const p1Score = p1.pts[catKey];
    const p2Score = p2.pts[catKey];
    const p1Delta = p1.pts[deltaKey];
    const p2Delta = p2.pts[deltaKey];

    el1.innerHTML = `
        <div class="score-main">${p1Score.toLocaleString()}</div>
        <div class="score-sub">${p1Delta >= 0 ? '+' : ''}${p1Delta} Solved</div>
    `;

    el2.innerHTML = `
        <div class="score-main">${p2Score.toLocaleString()}</div>
        <div class="score-sub">${p2Delta >= 0 ? '+' : ''}${p2Delta} Solved</div>
    `;

    if (p1Score > p2Score) {
        el1.classList.add('cat-win');
        el2.classList.add('cat-lose');
    } else if (p2Score > p1Score) {
        el2.classList.add('cat-win');
        el1.classList.add('cat-lose');
    }
}

function renderMultiColumnCategory(rowId, catKey, deltaKey, playersData) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const columnsContainer = row.querySelector('.cat-columns');
    if (!columnsContainer) return;

    let maxVal = -Infinity;
    playersData.forEach(p => {
        if (p.pts[catKey] > maxVal) {
            maxVal = p.pts[catKey];
        }
    });

    let html = '';
    playersData.forEach(p => {
        const isWinner = p.pts[catKey] === maxVal && maxVal > 0;
        const winClass = isWinner ? 'cat-win' : (maxVal > 0 && p.pts[catKey] < maxVal ? 'cat-lose' : '');
        const sign = p.pts[deltaKey] >= 0 ? '+' : '';
        
        html += `
            <div class="cat-col-val ${winClass}">
                <div class="score-main">${p.pts[catKey].toLocaleString()}</div>
                <div class="score-sub">${sign}${p.pts[deltaKey]} Solved</div>
            </div>
        `;
    });

    columnsContainer.innerHTML = html;
}

function showBattleError(msg) {
    document.getElementById('loadingOverlay').classList.add('hidden');
    document.getElementById('errorOverlay').classList.remove('hidden');
    document.getElementById('errorText').textContent = msg;
}
