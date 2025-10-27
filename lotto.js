document.addEventListener("DOMContentLoaded", () => {
    // Konfiguracja gier (bez zmian)
    const games = {
        lotto: {
            name: "Lotto",
            mainNumbers: 6,
            mainPool: 49,
            extraNumbers: 0,
            extraPool: 0,
            rules: "6 liczb z 49",
            price: 3,
            prizes: { 3: 24, 4: 200, 5: 4500, 6: 4000000 },
            hitLabels: { 2: "2 trafienia", 3: "3 trafienia", 4: "4 trafienia", 5: "5 trafień", 6: "6 TRAFIEŃ (JACKPOT)" },
            jackpotCondition: hits => hits.main === 6,
            drawsPerWeek: 3
        },
        eurojackpot: {
            name: "Eurojackpot",
            mainNumbers: 5,
            mainPool: 50,
            extraNumbers: 2,
            extraPool: 10,
            rules: "5 liczb z 50 + 2 liczby z 10",
            price: 12.5,
            prizes: { '1+2': 50, '2+1': 40, '2+2': 100, '3+0': 70, '3+1': 85, '3+2': 550, '4+0': 400, '4+1': 1200, '4+2': 20000, '5+0': 200000, '5+1': 5000000, '5+2': 150000000 },
            hitLabels: { '5+2': "5+2 (JACKPOT)", '5+1': "5+1 (II nagroda)", '5+0': "5+0 (III nagroda)", '4+2': "4+2 (IV nagroda)", '4+1': "4+1 (V nagroda)", '4+0': "4+0 (VI nagroda)", '3+2': "3+2", '3+1': "3+1", '3+0': "3+0", '2+2': "2+2", '2+1': "2+1", '1+2': "1+2" },
            jackpotCondition: hits => hits.main === 5 && hits.extra === 2,
            drawsPerWeek: 2
        }
    };

    const elements = {
        gameTitle: document.getElementById("gameTitle"),
        gameRules: document.getElementById("gameRules"),
        switchLotto: document.getElementById("switchLotto"),
        switchEurojackpot: document.getElementById("switchEurojackpot"),
        numSetsInput: document.getElementById("numSets"),
        generateSetsButton: document.getElementById("generateSetsButton"),
        numDrawsInput: document.getElementById("numDraws"),
        drawYearsSelect: document.getElementById("drawYears"),
        drawButton: document.getElementById("drawButton"),
        drawUntil6Button: document.getElementById("drawUntil6Button"),
        resultsContainer: document.getElementById("results"),
        setsContainer: document.getElementById("generatedSets"),
        ownSetsButton: document.getElementById("ownSetsButton"),
        clearSetsButton: document.getElementById("clearSetsButton"),
        userNumbersInput: document.getElementById("userNumbers"),
        settingsView: document.getElementById("settings-view"),
        resultsView: document.getElementById("results-view"),
        backToSettingsButton: document.getElementById("backToSettingsButton"),
        // NOWOŚĆ: Elementy paska postępu
        progressContainer: document.getElementById("progress-container"),
        progressBar: document.getElementById("progress-bar"),
        progressText: document.getElementById("progress-text"),
        progressLabel: document.getElementById("progress-label")
    };

    let currentGame = games.lotto;
    init();

    function init() {
        setupEventListeners();
        updateGameUI();
    }
    
    // NOWOŚĆ: Funkcje do zarządzania stanem kontrolek (blokowanie na czas obliczeń)
    function disableControls() {
        elements.drawButton.disabled = true;
        elements.drawUntil6Button.disabled = true;
        elements.generateSetsButton.disabled = true;
        elements.clearSetsButton.disabled = true;
        elements.ownSetsButton.disabled = true;
        elements.numSetsInput.disabled = true;
    }

    function enableControls() {
        elements.generateSetsButton.disabled = false;
        elements.clearSetsButton.disabled = false;
        elements.ownSetsButton.disabled = false;
        elements.numSetsInput.disabled = false;
        // Włącz przyciski losowania tylko jeśli są zestawy
        if (getSets().length > 0) {
            elements.drawButton.disabled = false;
            elements.drawUntil6Button.disabled = false;
        }
    }
    
    // NOWOŚĆ: Funkcje do zarządzania paskiem postępu
    function showProgress(isSpinner = false) {
        elements.progressContainer.style.display = 'block';
        if (isSpinner) {
            elements.progressLabel.textContent = "Symulacja w toku...";
            elements.progressBar.style.display = 'none'; // Ukryj pasek, bo nie znamy końca
        } else {
            elements.progressLabel.textContent = "Postęp symulacji:";
            elements.progressBar.style.display = 'block';
        }
    }

    function hideProgress() {
        elements.progressContainer.style.display = 'none';
        elements.progressBar.value = 0;
        elements.progressText.textContent = "";
    }

    function updateProgress(current, total) {
        const percentage = Math.round((current / total) * 100);
        elements.progressBar.value = current;
        elements.progressBar.max = total;
        elements.progressText.textContent = `${percentage}% (${formatNumber(current)} / ${formatNumber(total)} losowań)`;
    }
    
    function updateSpinnerText(currentDraws) {
        elements.progressText.textContent = `Przetworzono ${formatNumber(currentDraws)} losowań...`;
    }

    // MODYFIKACJA: Dodano wywołania funkcji postępu i blokady kontrolek
    async function simulateDraws() {
        const numDraws = parseInt(elements.numDrawsInput.value);
        if (numDraws < 1) { alert("Podaj prawidłową liczbę losowań."); return; }
        
        const sets = getSets();
        if (sets.length === 0) { alert("Najpierw wygeneruj zestawy liczb."); return; }

        disableControls(); // Zablokuj kontrolki
        showProgress(); // Pokaż pasek postępu
        clearResults();
        
        await new Promise(resolve => setTimeout(resolve, 50)); // Daj czas przeglądarce na odświeżenie UI

        const startTime = performance.now();
        const results = await runSimulation(sets, numDraws);
        showResults(results, numDraws, performance.now() - startTime);
        
        hideProgress(); // Ukryj pasek postępu
        enableControls(); // Odblokuj kontrolki
    }
    
    // MODYFIKACJA: Dodano wywołania funkcji postępu i blokady kontrolek
    async function simulateUntilJackpot() {
        const sets = getSets();
        if (sets.length === 0) { alert("Najpierw wygeneruj zestawy liczb."); return; }

        disableControls();
        showProgress(true); // Pokaż wskaźnik w trybie "spinnera"
        clearResults();

        await new Promise(resolve => setTimeout(resolve, 50));
        
        const startTime = performance.now();
        const results = { jackpot: null, totalDraws: 0, totalCost: 0, totalWinnings: 0, otherWins: {} };
        if (currentGame === games.lotto) { for (let i = 3; i <= 5; i++) { results.otherWins[i] = 0; } } else { const prizeTiers = ['5+1', '5+0', '4+2', '4+1', '4+0', '3+2', '3+1', '3+0', '2+2', '2+1', '1+2']; prizeTiers.forEach(tier => { results.otherWins[tier] = 0; }); }
        
        let foundJackpot = false;
        while (!foundJackpot) {
            results.totalDraws++;
            const draw = generateRandomNumbers();
            for (const userNumbers of sets) {
                const hits = countHits(draw, userNumbers);
                if (isJackpot(hits)) {
                    results.jackpot = { drawCount: results.totalDraws, numbers: userNumbers, years: results.totalDraws / (currentGame.drawsPerWeek * 52), hits: hits };
                    foundJackpot = true;
                    break;
                }
                if (currentGame === games.lotto) { if (hits.main >= 3 && hits.main <= 5) { results.otherWins[hits.main]++; } } else { const key = `${hits.main}+${hits.extra}`; if (results.otherWins[key] !== undefined) { results.otherWins[key]++; } }
            }
            if (results.totalDraws % 5000 === 0) { // Aktualizuj co 5000 losowań
                updateSpinnerText(results.totalDraws);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        results.totalCost = results.totalDraws * sets.length * currentGame.price;
        if (currentGame === games.lotto) { for (let i = 3; i <= 5; i++) { if (results.otherWins[i] > 0) { results.totalWinnings += results.otherWins[i] * currentGame.prizes[i]; } } results.totalWinnings += currentGame.prizes[6]; } else { for (const [tier, count] of Object.entries(results.otherWins)) { if (count > 0 && currentGame.prizes[tier]) { results.totalWinnings += count * currentGame.prizes[tier]; } } results.totalWinnings += currentGame.prizes['5+2']; }
        
        showJackpotResults(results, performance.now() - startTime, sets.length);
        hideProgress();
        enableControls();
    }
    
    // MODYFIKACJA: `runSimulation` teraz przyjmuje funkcję zwrotną (callback) do raportowania postępu
    async function runSimulation(sets, numDraws) {
        const hitsCounts = {};
        const jackpots = [];
        if (currentGame === games.lotto) { for (let i = 2; i <= 6; i++) { hitsCounts[i] = 0; } } else { const prizeTiers = ['1+2', '2+1', '2+2', '3+0', '3+1', '3+2', '4+0', '4+1', '4+2', '5+0', '5+1', '5+2']; prizeTiers.forEach(tier => { hitsCounts[tier] = 0; }); }
        
        for (let i = 0; i < numDraws; i++) {
            const draw = generateRandomNumbers();
            for (const userNumbers of sets) {
                const hits = countHits(draw, userNumbers);
                let hitKey;
                if (currentGame === games.lotto) { hitKey = hits.main; } else { hitKey = `${hits.main}+${hits.extra}`; if (hits.main === 2 && hits.extra === 0) continue; }
                if (hitsCounts[hitKey] !== undefined) { hitsCounts[hitKey]++; }
                if (isJackpot(hits)) { jackpots.push({ drawCount: i + 1, numbers: userNumbers, years: (i + 1) / (currentGame.drawsPerWeek * 52), hits: hits }); }
            }
            // MODYFIKACJA: Aktualizuj postęp co 10 000 iteracji
            if (i % 50000 === 0) {
                updateProgress(i, numDraws);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        updateProgress(numDraws, numDraws); // Końcowa aktualizacja do 100%
        return { hitsCounts, jackpots };
    }
    
    // --- Pozostałe funkcje (w większości bez zmian) ---

    function setupEventListeners() {
        elements.switchLotto.addEventListener("click", () => switchGame(games.lotto));
        elements.switchEurojackpot.addEventListener("click", () => switchGame(games.eurojackpot));
        elements.generateSetsButton.addEventListener("click", generateSets);
        elements.ownSetsButton.addEventListener("click", addCustomSet);
        elements.drawButton.addEventListener("click", simulateDraws);
        elements.drawUntil6Button.addEventListener("click", simulateUntilJackpot);
        elements.clearSetsButton.addEventListener("click", clearSets);
        elements.drawYearsSelect.addEventListener("change", handleYearsChange);
        elements.numDrawsInput.addEventListener("input", handleDrawsInput);
        elements.backToSettingsButton.addEventListener("click", showSettingsView);
    }
    
    function showSettingsView() {
        elements.resultsView.style.display = 'none';
        elements.settingsView.style.display = 'block';
        clearResults();
    }

    function showResultsView() {
        elements.settingsView.style.display = 'none';
        elements.resultsView.style.display = 'block';
        window.scrollTo(0, 0);
    }

    function switchGame(game) { currentGame = game; updateGameUI(); clearAll(); }
    function updateGameUI() { elements.gameTitle.textContent = `Symulator ${currentGame.name}`; elements.gameRules.textContent = currentGame.rules; elements.switchLotto.classList.toggle("active", currentGame === games.lotto); elements.switchEurojackpot.classList.toggle("active", currentGame === games.eurojackpot); elements.userNumbersInput.placeholder = currentGame.extraNumbers > 0 ? `np. 5, 12, 18, 24, 35, 2, 7` : `np. 5, 12, 18, 24, 35, 42`; elements.drawUntil6Button.textContent = `Losuj aż trafisz ${currentGame === games.lotto ? "6" : "5+2"}`; }
    function generateSets() { clearResults(); clearSets(); const numSets = parseInt(elements.numSetsInput.value); if (numSets < 1 || numSets > 1000) { alert("Podaj liczbę zestawów od 1 do 1000."); return; } for (let i = 0; i < numSets; i++) { const numbers = generateRandomNumbers(); addSet(`<strong>Zestaw ${i + 1}:</strong> ${formatNumbers(numbers)}`); } enableDrawButtons(); }
    function addCustomSet() { const numbers = elements.userNumbersInput.value.trim(); if (!numbers) { alert("Wprowadź liczby przed dodaniem zestawu."); return; } const allNumbers = numbers.split(",").map(num => parseInt(num.trim())).filter(num => !isNaN(num)); const mainNumbers = allNumbers.slice(0, currentGame.mainNumbers); const extraNumbers = currentGame.extraNumbers > 0 ? allNumbers.slice(currentGame.mainNumbers) : []; if (!validateNumbers(mainNumbers, currentGame.mainNumbers, currentGame.mainPool) || (currentGame.extraNumbers > 0 && !validateNumbers(extraNumbers, currentGame.extraNumbers, currentGame.extraPool))) { return; } const formattedNumbers = { main: mainNumbers.sort((a, b) => a - b), extra: extraNumbers.sort((a, b) => a - b) }; addSet(`<strong>Twój zestaw:</strong> ${formatNumbers(formattedNumbers)}`); enableDrawButtons(); elements.userNumbersInput.value = ""; }
    function validateNumbers(numbers, requiredCount, poolSize) { if (numbers.length !== requiredCount) { alert(`Wprowadź dokładnie ${requiredCount} liczb.`); return false; } if (new Set(numbers).size !== requiredCount) { alert("Wszystkie liczby muszą być unikalne."); return false; } if (numbers.some(num => num < 1 || num > poolSize)) { alert(`Liczby muszą być w zakresie od 1 do ${poolSize}.`); return false; } return true; }
    function generateRandomNumbers() { const mainNumbers = []; while (mainNumbers.length < currentGame.mainNumbers) { const num = Math.floor(Math.random() * currentGame.mainPool) + 1; if (!mainNumbers.includes(num)) mainNumbers.push(num); } mainNumbers.sort((a, b) => a - b); if (currentGame.extraNumbers > 0) { const extraNumbers = []; while (extraNumbers.length < currentGame.extraNumbers) { const num = Math.floor(Math.random() * currentGame.extraPool) + 1; if (!extraNumbers.includes(num)) extraNumbers.push(num); } extraNumbers.sort((a, b) => a - b); return { main: mainNumbers, extra: extraNumbers }; } return { main: mainNumbers, extra: [] }; }
    function formatNumbers(numbers) { const mainStr = numbers.main.map(n => n.toString().padStart(2, '0')).join(", "); if (numbers.extra && numbers.extra.length > 0) { return `${mainStr} | ${numbers.extra.map(n => n.toString().padStart(2, '0')).join(", ")}`; } return mainStr; }
    function formatNumber(num) { return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); } // Zmieniony separator na spację dla lepszej czytelności
    function countHits(draw, userNumbers) { const mainHits = draw.main.filter(num => userNumbers.main.includes(num)).length; let extraHits = 0; if (currentGame.extraNumbers > 0) { extraHits = draw.extra.filter(num => userNumbers.extra.includes(num)).length; } return { main: mainHits, extra: extraHits }; }
    function getHitLabel(hits) { if (currentGame === games.lotto) { return currentGame.hitLabels[hits.main] || ""; } else { const key = `${hits.main}+${hits.extra}`; return currentGame.hitLabels[key] || `${hits.main} liczby + ${hits.extra} dodatkowe`; } }
    function isJackpot(hits) { return currentGame.jackpotCondition(hits); }

    function showResults(results, numDraws, timeMs) {
        const timeSec = (timeMs / 1000).toFixed(2);
        const drawsPerYear = currentGame.drawsPerWeek * 52;
        const years = (numDraws / drawsPerYear).toFixed(2);
        const setsCount = getSets().length;
        const totalCost = numDraws * setsCount * currentGame.price;
        let totalWinnings = 0;
        let winningsDetails = [];
        if (currentGame === games.lotto) { for (let i = 3; i <= 6; i++) { const count = results.hitsCounts[i] || 0; if (count > 0) { const prize = currentGame.prizes[i]; const winnings = count * prize; totalWinnings += winnings; winningsDetails.push({ label: currentGame.hitLabels[i], count: count, prize: prize, total: winnings }); } } } else { const prizeTiers = ['5+2', '5+1', '5+0', '4+2', '4+1', '4+0', '3+2', '3+1', '3+0', '2+2', '2+1', '1+2']; prizeTiers.forEach(tier => { const count = results.hitsCounts[tier] || 0; if (count > 0 && currentGame.prizes[tier]) { const prize = currentGame.prizes[tier]; const winnings = count * prize; totalWinnings += winnings; winningsDetails.push({ label: currentGame.hitLabels[tier], count: count, prize: prize, total: winnings }); } }); }
        const profit = totalWinnings - totalCost;
        const roi = totalCost > 0 ? (profit / totalCost * 100).toFixed(2) : 0;
        let html = `<div class="simulation-summary"><strong>Podsumowanie symulacji:</strong><br>Liczba losowań: ${formatNumber(numDraws)}<br>Liczba zestawów: ${setsCount}<br>Czas trwania: ~${years} lat (${currentGame.drawsPerWeek} los./tydz.)<br>Czas wykonania: ${timeSec} sekund<br><br><strong>Koszty i wygrane:</strong><br>Koszt zakładów: ${formatNumber(totalCost)} zł<br>Suma wygranych: ${formatNumber(totalWinnings)} zł<br>Bilans: <span style="color: ${profit >= 0 ? 'green' : 'red'}; font-weight: bold;">${profit >= 0 ? '+' : ''}${formatNumber(profit)} zł (${roi}%)</span></div><div><strong>Statystyki trafień:</strong></div>`;
        if (currentGame === games.lotto) { for (let i = 2; i <= 6; i++) { const count = results.hitsCounts[i] || 0; if (count > 0) { const ratio = (numDraws * setsCount / count).toFixed(2); const prizeInfo = i >= 3 ? ` (${formatNumber(currentGame.prizes[i])} zł)` : ''; html += `<div style="margin: 5px 0;">${currentGame.hitLabels[i]}${prizeInfo}: <span class="hit-count">${formatNumber(count)}</span> (średnio 1 na ${formatNumber(ratio)} zakładów)</div>`; } } } else { const prizeTiers = ['5+2', '5+1', '5+0', '4+2', '4+1', '4+0', '3+2', '3+1', '3+0', '2+2', '2+1', '1+2']; prizeTiers.forEach(tier => { const count = results.hitsCounts[tier] || 0; if (count > 0 && currentGame.prizes[tier]) { const ratio = (numDraws * setsCount / count).toFixed(2); const prizeInfo = ` (${formatNumber(currentGame.prizes[tier])} zł)`; html += `<div style="margin: 5px 0;">${currentGame.hitLabels[tier]}${prizeInfo}: <span class="hit-count">${formatNumber(count)}</span> (średnio 1 na ${formatNumber(ratio)} zakładów)</div>`; } }); }

        if (results.jackpots.length > 0) {
            html += `<div style="margin-top: 20px;"><strong class="highlight">GŁÓWNE WYGRANE:</strong></div>`;
            let previousYears = 0;
            const yearDifferences = [];

            results.jackpots.sort((a, b) => a.drawCount - b.drawCount)
                .forEach((jackpot, i) => {
                    const years = jackpot.years;
                    const yearsDiff = (i === 0) ? years : (years - previousYears);
                    if (i > 0) { yearDifferences.push(yearsDiff); }
                    let resultText = `<span class="highlight">${getHitLabel(jackpot.hits)}</span> po ${formatNumber(jackpot.drawCount)} losowaniach (${years.toFixed(2)} lat`;
                    if (i > 0) { resultText += `, +${yearsDiff.toFixed(2)} lat od poprzedniej`; }
                    resultText += `): <span class="numbers">${formatNumbers(jackpot.numbers)}</span>`;
                    html += `<div style="margin-top: 10px;">${resultText}</div>`;
                    previousYears = years;
                });

            if (yearDifferences.length > 0) {
                const minDiff = Math.min(...yearDifferences).toFixed(2);
                const maxDiff = Math.max(...yearDifferences).toFixed(2);
                const avgDiff = (yearDifferences.reduce((a, b) => a + b, 0) / yearDifferences.length).toFixed(2);

                html += `
                <div style="margin-top: 15px; background-color: #f0f8ff; padding: 8px; border-radius: 3px;">
                    <strong>Statystyki odstępów między głównymi wygranymi:</strong><br>
                    Najkrótszy odstęp: ${minDiff} lat<br>
                    Najdłuższy odstęp: ${maxDiff} lat<br>
                    Średni odstęp: ${avgDiff} lat
                </div>
            `;
            }
        }

        elements.resultsContainer.innerHTML = html;
        showResultsView();
    }
    
    function showJackpotResults(results, timeMs, setsCount) { const timeSec = (timeMs / 1000).toFixed(2); const years = (results.totalDraws / (currentGame.drawsPerWeek * 52)).toFixed(2); const profit = results.totalWinnings - results.totalCost; const roi = results.totalCost > 0 ? (profit / results.totalCost * 100).toFixed(2) : 0; let html = `<div class="simulation-summary"><strong>Podsumowanie symulacji:</strong><br>Liczba losowań: ${formatNumber(results.totalDraws)}<br>Liczba zestawów: ${setsCount}<br>Czas trwania: ~${years} lat (${currentGame.drawsPerWeek} los./tydz.)<br>Czas wykonania: ${timeSec} sekund<br><br><strong>Koszty i wygrane:</strong><br>Koszt zakładów: ${formatNumber(results.totalCost)} zł<br>Suma wygranych: ${formatNumber(results.totalWinnings)} zł<br>Bilans: <span style="color: ${profit >= 0 ? 'green' : 'red'}; font-weight: bold;">${profit >= 0 ? '+' : ''}${formatNumber(profit)} zł (${roi}%)</span></div><div style="margin-top: 20px;"><strong class="highlight">ZNALEZIONA GŁÓWNA WYGRANA:</strong></div><div style="margin-top: 10px;"><span class="highlight">${getHitLabel(results.jackpot.hits)}</span> po ${formatNumber(results.jackpot.drawCount)} losowaniach (${results.jackpot.years.toFixed(2)} lat): <span class="numbers">${formatNumbers(results.jackpot.numbers)}</span></div>`; if (Object.values(results.otherWins).some(count => count > 0)) { html += `<div style="margin-top: 20px;"><strong>Inne wygrane podczas symulacji:</strong></div>`; if (currentGame === games.lotto) { for (let i = 3; i <= 5; i++) { if (results.otherWins[i] > 0) { html += `<div>${currentGame.hitLabels[i]}: ${formatNumber(results.otherWins[i])}</div>`; } } } else { for (const [tier, count] of Object.entries(results.otherWins)) { if (count > 0 && currentGame.prizes[tier]) { html += `<div>${currentGame.hitLabels[tier]}: ${formatNumber(count)}</div>`; } } } } elements.resultsContainer.innerHTML = html; showResultsView(); }
    function getSets() { return Array.from(elements.setsContainer.children).filter(el => el.textContent.includes(":")).map(el => { const text = el.innerHTML.replace(/<[^>]*>/g, '').split(": ")[1]; const parts = text.split(" | "); const mainNumbers = parts[0].split(", ").map(Number); const extraNumbers = parts.length > 1 ? parts[1].split(", ").map(Number) : []; return { main: mainNumbers, extra: extraNumbers }; }); }
    function clearResults() { elements.resultsContainer.innerHTML = ""; }
    function clearSets() { elements.setsContainer.innerHTML = ""; disableDrawButtons(); }
    function clearAll() { clearResults(); clearSets(); }
    function addSet(html) { const div = document.createElement("div"); div.innerHTML = html; elements.setsContainer.appendChild(div); }
    function enableDrawButtons() { elements.drawButton.disabled = false; elements.drawUntil6Button.disabled = false; }
    function disableDrawButtons() { elements.drawButton.disabled = true; elements.drawUntil6Button.disabled = true; }
    function handleYearsChange() { if (elements.drawYearsSelect.value !== "custom") { const years = parseInt(elements.drawYearsSelect.value); const drawsPerYear = currentGame.drawsPerWeek * 52; elements.numDrawsInput.value = years * drawsPerYear; } }
    function handleDrawsInput() { elements.drawYearsSelect.value = "custom"; }

});
