class SlingoGame {
    constructor() {
        this.gameBoard = [];
        this.spinsRemaining = 8;
        this.score = 0;
        this.bonusCollected = 0;
        this.gameActive = true;
        this.markedCells = new Set();
        this.slingoCount = 0;
        this.completedLines = new Set(); // Track which lines have been completed
        this.blockerUsed = false; // Track if blocker has been used (once per game)
        this.superWildUsed = false; // Track if super wild fish has been used (once per game)
        this.wildFishUsedCount = 0; // Track how many times wild fish has been used (max 2 per game)
        this.pendingWildFishColumns = []; // Track columns with wild fish awaiting player selection
        this.pendingSuperWildFish = false; // Track if super wild fish is awaiting player selection
        this.autoSpinActive = false; // Track if auto spin is active
        this.autoSpinTimeout = null; // Store timeout for auto spin delays
        
        // Hit rate tracking for controlled outcomes
        this.gameCounter = this.getGameCounter();
        this.targetSlingoCount = this.calculateTargetSlingos();
        
        // Check if bonus should appear (once per game)
        this.bonusSymbolUsed = false;
        
        // Initialize the game
        this.initializeGame();
        this.setupEventListeners();
    }

    initializeGame() {
        this.generateGameBoard();
        this.renderGameBoard();
        this.updateUI();
    }

    generateGameBoard() {
        // Create a 5x5 grid with numbers from 1-75
        // Each column has a specific range: Col 0: 1-15, Col 1: 16-30, Col 2: 31-45, Col 3: 46-60, Col 4: 61-75
        this.gameBoard = [];
        const usedNumbers = new Set(); // Track used numbers to avoid duplicates
        
        for (let row = 0; row < 5; row++) {
            this.gameBoard[row] = [];
            for (let col = 0; col < 5; col++) {
                // Generate unique number based on column range
                const minNum = (col * 15) + 1;
                const maxNum = (col + 1) * 15;
                let number;
                
                // Keep generating until we find a unique number
                do {
                    number = this.getRandomNumber(minNum, maxNum);
                } while (usedNumbers.has(number));
                
                usedNumbers.add(number);
                this.gameBoard[row][col] = number;
            }
        }
    }

    getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getGameCounter() {
        // Get or initialize game counter from localStorage
        let counter = localStorage.getItem('slingoGameCounter');
        if (!counter) {
            counter = 1;
        } else {
            counter = parseInt(counter) + 1;
        }
        localStorage.setItem('slingoGameCounter', counter.toString());
        return counter;
    }

    calculateTargetSlingos() {
        // Calculate target Slingo count based on hit rates
        // 1 Slingo: every game (1 in 1)
        // 2 Slingos: 1 in 2 games
        // 3 Slingos: 1 in 3 games, etc.
        
        let targetSlingos = 1; // Guaranteed minimum
        
        // Check each Slingo level based on hit rates
        const hitRates = {
            2: 2,   // 1 in 2 games
            3: 3,   // 1 in 3 games
            4: 4,   // 1 in 4 games
            5: 5,   // 1 in 5 games
            6: 6,   // 1 in 6 games
            7: 7,   // 1 in 7 games
            8: 8,   // 1 in 8 games
            9: 9,   // 1 in 9 games
            10: 10, // 1 in 10 games
            12: 12  // 1 in 12 games (full house)
        };
        
        // Determine target based on game counter and hit rates
        for (let slingos = 12; slingos >= 2; slingos--) {
            if (hitRates[slingos] && this.gameCounter % hitRates[slingos] === 0) {
                targetSlingos = slingos;
                break;
            }
        }
        
        console.log(`Game ${this.gameCounter}: Target Slingos = ${targetSlingos}`);
        return targetSlingos;
    }

    generateBiasedSpinResults() {
        const spinResults = [];
        
        // Calculate current progress toward target
        const remainingSpins = this.spinsRemaining - 1; // -1 because we're about to use one
        const currentSlingos = this.slingoCount;
        const slingosNeeded = this.targetSlingoCount - currentSlingos;
        
        // Determine bias factor based on remaining spins and needed Slingos
        let biasTowardMatches = 0;
        if (slingosNeeded > 0 && remainingSpins > 0) {
            biasTowardMatches = Math.min(0.8, slingosNeeded / remainingSpins);
        }
        
        // Check if blocker should appear (once per game, random timing)
        let blockerPosition = -1;
        if (!this.blockerUsed && Math.random() < 0.15) { // 15% chance per spin
            this.blockerUsed = true;
            blockerPosition = Math.floor(Math.random() * 5); // Random column
        }
        
        // Check if super wild fish should appear (once per game, random timing)
        let superWildPosition = -1;
        if (!this.superWildUsed && Math.random() < 0.20) { // 20% chance per spin
            this.superWildUsed = true;
            superWildPosition = Math.floor(Math.random() * 5); // Random column
        }
        
        // Check if bonus symbol should appear (once per game, random timing)
        let bonusPosition = -1;
        if (!this.bonusSymbolUsed && Math.random() < 0.20) { // 20% chance per spin until used
            this.bonusSymbolUsed = true; // Mark as used
            bonusPosition = Math.floor(Math.random() * 5); // Random column
        }
        
        // Generate numbers for each column
        for (let col = 0; col < 5; col++) {
            const minNum = (col * 15) + 1;
            const maxNum = (col + 1) * 15;
            
            // Check if this column gets the blocker
            if (col === blockerPosition) {
                spinResults.push('BLOCKER');
                continue;
            }
            
            // Check if this column gets the super wild fish
            if (col === superWildPosition) {
                spinResults.push('SUPER_WILD');
                continue;
            }
            
            // Check if this column gets the bonus symbol
            if (col === bonusPosition) {
                spinResults.push('BONUS');
                continue;
            }
            
            // Check for Wild Fish (1 in 3 chance) - only if Super Wild didn't trigger and limit to 2 per game
            if (this.wildFishUsedCount < 2 && Math.random() < 0.33) {
                this.wildFishUsedCount++;
                spinResults.push('WILD_FISH');
                continue;
            }
            
            // Check if we should bias toward a match in this column
            const shouldBiasMatch = Math.random() < biasTowardMatches;
            
            if (shouldBiasMatch) {
                // Try to find a number that would create a match
                const columnNumbers = [];
                for (let row = 0; row < 5; row++) {
                    const cellValue = this.gameBoard[row][col];
                    if (!this.markedCells.has(`${row}-${col}`)) {
                        columnNumbers.push(cellValue);
                    }
                }
                
                if (columnNumbers.length > 0) {
                    // Pick a random unmarked number from this column
                    spinResults.push(columnNumbers[Math.floor(Math.random() * columnNumbers.length)]);
                } else {
                    // No unmarked numbers in this column, generate random
                    spinResults.push(this.getRandomNumber(minNum, maxNum));
                }
            } else {
                // Generate random number (may or may not match)
                spinResults.push(this.getRandomNumber(minNum, maxNum));
            }
        }
        
        return spinResults;
    }

    ensureTargetMet() {
        // If we haven't met the target, force additional matches to complete lines
        if (this.slingoCount < this.targetSlingoCount) {
            const slingosToAdd = this.targetSlingoCount - this.slingoCount;
            
            // Find potential lines that are close to completion
            const almostCompleteLines = this.findAlmostCompleteLines();
            
            // Complete the required number of lines
            for (let i = 0; i < slingosToAdd && i < almostCompleteLines.length; i++) {
                this.forceCompleteLine(almostCompleteLines[i]);
            }
            
            // Recalculate score and update display
            this.calculateScore();
            this.updateUI();
        }
    }

    findAlmostCompleteLines() {
        const almostComplete = [];
        
        // Check rows
        for (let row = 0; row < 5; row++) {
            const lineKey = `row-${row}`;
            if (!this.completedLines.has(lineKey)) {
                let unmarkedCount = 0;
                let unmarkedCells = [];
                
                for (let col = 0; col < 5; col++) {
                    if (!this.markedCells.has(`${row}-${col}`)) {
                        unmarkedCount++;
                        unmarkedCells.push(`${row}-${col}`);
                    }
                }
                
                if (unmarkedCount <= 2) { // Close to completion
                    almostComplete.push({
                        type: 'row',
                        index: row,
                        unmarkedCells: unmarkedCells,
                        unmarkedCount: unmarkedCount
                    });
                }
            }
        }
        
        // Check columns
        for (let col = 0; col < 5; col++) {
            const lineKey = `col-${col}`;
            if (!this.completedLines.has(lineKey)) {
                let unmarkedCount = 0;
                let unmarkedCells = [];
                
                for (let row = 0; row < 5; row++) {
                    if (!this.markedCells.has(`${row}-${col}`)) {
                        unmarkedCount++;
                        unmarkedCells.push(`${row}-${col}`);
                    }
                }
                
                if (unmarkedCount <= 2) { // Close to completion
                    almostComplete.push({
                        type: 'col',
                        index: col,
                        unmarkedCells: unmarkedCells,
                        unmarkedCount: unmarkedCount
                    });
                }
            }
        }
        
        // Check diagonals
        const diag1Key = 'diag1';
        if (!this.completedLines.has(diag1Key)) {
            let unmarkedCount = 0;
            let unmarkedCells = [];
            
            for (let i = 0; i < 5; i++) {
                if (!this.markedCells.has(`${i}-${i}`)) {
                    unmarkedCount++;
                    unmarkedCells.push(`${i}-${i}`);
                }
            }
            
            if (unmarkedCount <= 2) {
                almostComplete.push({
                    type: 'diag1',
                    index: 1,
                    unmarkedCells: unmarkedCells,
                    unmarkedCount: unmarkedCount
                });
            }
        }
        
        const diag2Key = 'diag2';
        if (!this.completedLines.has(diag2Key)) {
            let unmarkedCount = 0;
            let unmarkedCells = [];
            
            for (let i = 0; i < 5; i++) {
                if (!this.markedCells.has(`${i}-${4-i}`)) {
                    unmarkedCount++;
                    unmarkedCells.push(`${i}-${4-i}`);
                }
            }
            
            if (unmarkedCount <= 2) {
                almostComplete.push({
                    type: 'diag2',
                    index: 2,
                    unmarkedCells: unmarkedCells,
                    unmarkedCount: unmarkedCount
                });
            }
        }
        
        // Sort by fewest unmarked cells (easiest to complete first)
        almostComplete.sort((a, b) => a.unmarkedCount - b.unmarkedCount);
        
        return almostComplete;
    }

    forceCompleteLine(lineInfo) {
        // Mark all unmarked cells in this line
        lineInfo.unmarkedCells.forEach(cellKey => {
            const [row, col] = cellKey.split('-').map(Number);
            this.markCell(row, col);
        });
    }

    renderGameBoard() {
        const cells = document.querySelectorAll('.number-cell');
        let cellIndex = 0;
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = cells[cellIndex];
                const value = this.gameBoard[row][col];
                
                cell.textContent = value;
                cell.dataset.number = value;
                cellIndex++;
            }
        }
    }

    setupEventListeners() {
        const spinButton = document.getElementById('spinButton');
        if (spinButton) {
            spinButton.addEventListener('click', () => {
                console.log('Spin button clicked!');
                this.spin();
            });
            console.log('Spin button event listener added successfully');
        } else {
            console.error('Spin button not found!');
        }

        const autoSpinButton = document.getElementById('autoSpinButton');
        if (autoSpinButton) {
            autoSpinButton.addEventListener('click', () => {
                console.log('Auto spin button clicked!');
                this.toggleAutoSpin();
            });
            console.log('Auto spin button event listener added successfully');
        } else {
            console.error('Auto spin button not found!');
        }
    }

    spin() {
        console.log('Spin method called!', {
            gameActive: this.gameActive,
            spinsRemaining: this.spinsRemaining
        });
        
        if (!this.gameActive || this.spinsRemaining <= 0) {
            console.log('Spin cancelled - game inactive or no spins remaining');
            return;
        }

        // Disable spin button temporarily
        const spinButton = document.getElementById('spinButton');
        if (spinButton) {
            spinButton.disabled = true;
        }

        // Generate spin results with bias toward target Slingo count
        const spinResults = this.generateBiasedSpinResults();

        // Display spin results with animation
        this.displaySpinResults(spinResults);

        // Process matches after animation
        setTimeout(() => {
            this.processMatches(spinResults);
            this.spinsRemaining--;

            // After every spin, check for new Slingos and update prize table highlighting
            // This ensures multiple new Slingos are highlighted immediately
            // The checkLines method (called by calculateScore) already triggers the pink glow, slingo graphic, and prize table highlight
            // We need to delay the re-enabling of the spin button until after the slingo animation is visible

            this.updateUI();
            this.checkWinConditions();

            // Determine if a slingo was just won (by checking if showSlingoAnnouncement was called)
            // We'll use a short delay to allow the animation to play before enabling the next spin
            let slingoAnimationDelay = 0;
            if (document.querySelector('.slingo-announcement')) {
                // If the announcement is present, wait for its animation (max 3.5s)
                slingoAnimationDelay = 1800;
            }

            setTimeout(() => {
                // Re-enable spin button if game is still active
                if (this.gameActive && this.spinsRemaining > 0 && spinButton) {
                    spinButton.disabled = false;
                }

                if (this.spinsRemaining <= 0) {
                    this.ensureTargetMet();
                    this.endGame();
                }
            }, slingoAnimationDelay);
        }, 1500);
    }

    displaySpinResults(results) {
        const spinCells = document.querySelectorAll('.spin-cell');
        
        // Clear previous results
        spinCells.forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('active', 'super-wild', 'wild-fish', 'blocker', 'bonus');
            cell.style.backgroundImage = '';
            cell.style.backgroundSize = '';
            cell.style.backgroundPosition = '';
        });

        // Animate each number appearing
        results.forEach((result, index) => {
            setTimeout(() => {
                const cell = spinCells[index];
                
                if (result === 'SUPER_WILD') {
                    // Display super wild fish image
                    cell.textContent = '';
                    cell.style.backgroundImage = "url('Slingo_assets/super wild fish.png')";
                    cell.style.backgroundSize = 'cover';
                    cell.style.backgroundPosition = 'center';
                    cell.classList.add('super-wild');
                    cell.classList.remove('wild-fish', 'blocker');
                } else if (result === 'WILD_FISH') {
                    // Display wild fish image
                    cell.textContent = '';
                    cell.style.backgroundImage = "url('Slingo_assets/wild fish.png')";
                    cell.style.backgroundSize = 'cover';
                    cell.style.backgroundPosition = 'center';
                    cell.classList.add('wild-fish');
                    cell.classList.remove('super-wild', 'blocker');
                } else if (result === 'BLOCKER') {
                    // Display blocker image
                    cell.textContent = '';
                    cell.style.backgroundImage = "url('Slingo_assets/blocker.png')";
                    cell.style.backgroundSize = 'cover';
                    cell.style.backgroundPosition = 'center';
                    cell.classList.add('blocker');
                    cell.classList.remove('super-wild', 'wild-fish', 'bonus');
                } else if (result === 'BONUS') {
                    // Display bonus image
                    cell.textContent = '';
                    cell.style.backgroundImage = "url('Slingo_assets/bonus.png')";
                    cell.style.backgroundSize = 'cover';
                    cell.style.backgroundPosition = 'center';
                    cell.classList.add('bonus');
                    cell.classList.remove('super-wild', 'wild-fish', 'blocker');
                } else {
                    // Display regular number
                    cell.textContent = result;
                    cell.style.backgroundImage = '';
                    cell.classList.remove('super-wild', 'wild-fish', 'blocker', 'bonus');
                }
                
                cell.classList.add('active', 'spinning');
                
                // Remove spinning class after animation
                setTimeout(() => {
                    cell.classList.remove('spinning');
                }, 500);
            }, index * 200);
        });
    }

    processMatches(spinResults) {
        let matchesFound = false;
        let blockerColumn = -1;
        const matchesToMark = []; // Collect all matches before marking
        
        // First, check for blockers to prevent matches in that column
        for (let col = 0; col < 5; col++) {
            if (spinResults[col] === 'BLOCKER') {
                blockerColumn = col;
                break;
            }
        }
        
        // Check each column for matches
        for (let col = 0; col < 5; col++) {
            const spinResult = spinResults[col];
            
            if (spinResult === 'BLOCKER') {
                // Blocker prevents all matches in this column - no processing needed
                continue;
            } else if (spinResult === 'BONUS') {
                // Bonus symbol - animate to collector space
                this.animateBonusToCollector(col);
                continue;
            } else if (spinResult === 'SUPER_WILD') {
                // Super Wild Fish - highlight entire grid for player selection
                this.highlightSuperWildFishGrid();
                this.pendingSuperWildFish = true;
                // Don't auto-mark, wait for player selection
            } else if (spinResult === 'WILD_FISH') {
                // Wild Fish - highlight column for player selection
                this.highlightWildFishColumn(col);
                this.pendingWildFishColumns.push(col);
                // Don't auto-mark, wait for player selection
            } else {
                // Regular number matching - but blocked if there's a blocker in this column
                if (col !== blockerColumn) {
                    for (let row = 0; row < 5; row++) {
                        if (this.gameBoard[row][col] === spinResult && !this.markedCells.has(`${row}-${col}`)) {
                            matchesToMark.push({ row, col });
                            matchesFound = true;
                        }
                    }
                }
            }
        }

        // Sort matches by column (left to right) and mark them with delays
        if (matchesToMark.length > 0) {
            matchesToMark.sort((a, b) => a.col - b.col);
            this.markMatchesInOrder(matchesToMark);
        }

        if (matchesFound || this.pendingWildFishColumns.length > 0 || this.pendingSuperWildFish) {
            // Store current Slingo count to detect new ones
            const previousSlingos = this.slingoCount;
            this.calculateScore();
            
            // Check if new Slingos were achieved
            const newSlingoCount = this.slingoCount - previousSlingos;
            if (newSlingoCount > 0) {
                this.updateGameMessage(`🎉 SLINGO${newSlingoCount > 1 ? 'S' : ''}! You completed ${newSlingoCount} line${newSlingoCount > 1 ? 's' : ''}!`);
            } else if (this.pendingSuperWildFish) {
                this.updateGameMessage('Super Wild Fish appeared! Click on any lily pad number on the grid to mark it.');
            } else if (this.pendingWildFishColumns.length > 0) {
                this.updateGameMessage('Wild Fish appeared! Click on a lily pad number in the highlighted column to mark it.');
            } else {
                this.updateGameMessage('Great! You found matches!');
            }
            
            // Random bonus collection disabled
        } else {
            // Check if no matches were due to blocker
            if (blockerColumn >= 0) {
                this.updateGameMessage('Blocker appeared! No matches in that column this spin.');
            } else {
                this.updateGameMessage('No matches this time. Keep spinning!');
            }
        }
    }

    highlightWildFishColumn(col) {
        // Highlight all unmarked cells in the column for wild fish selection
        for (let row = 0; row < 5; row++) {
            const cellKey = `${row}-${col}`;
            if (!this.markedCells.has(cellKey)) {
                const cells = document.querySelectorAll('.number-cell');
                const cellIndex = row * 5 + col;
                const cell = cells[cellIndex];
                cell.classList.add('wild-fish-selectable');
                
                // Add click event listener for wild fish selection
                cell.addEventListener('click', this.handleWildFishSelection.bind(this, row, col));
            }
        }
    }

    highlightSuperWildFishGrid() {
        // Highlight all unmarked cells on the entire grid for super wild fish selection
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cellKey = `${row}-${col}`;
                if (!this.markedCells.has(cellKey)) {
                    const cells = document.querySelectorAll('.number-cell');
                    const cellIndex = row * 5 + col;
                    const cell = cells[cellIndex];
                    cell.classList.add('super-wild-selectable');
                    
                    // Add click event listener for super wild fish selection
                    cell.addEventListener('click', this.handleSuperWildFishSelection.bind(this, row, col));
                }
            }
        }
    }

    handleWildFishSelection(row, col) {
        const cellKey = `${row}-${col}`;
        
        // Check if this cell is in a pending wild fish column
        if (this.pendingWildFishColumns.includes(col) && !this.markedCells.has(cellKey)) {
            // Mark the selected cell
            this.markCell(row, col);
            
            // Remove this column from pending wild fish columns
            this.pendingWildFishColumns = this.pendingWildFishColumns.filter(c => c !== col);
            
            // Clear all wild fish highlighting from this column
            this.clearWildFishHighlighting(col);
            
            // Update score and check for new Slingos
            this.calculateScore();
            this.updateGameMessage('Great choice! You marked a cell with the Wild Fish.');
            
            // Random bonus collection disabled
            
            // If auto spin is active and no more pending selections, continue auto spin
            if (this.autoSpinActive && this.pendingWildFishColumns.length === 0 && !this.pendingSuperWildFish) {
                setTimeout(() => {
                    this.scheduleNextAutoSpin();
                }, 1000); // 1 second delay after wild fish selection
            }
        }
    }

    handleSuperWildFishSelection(row, col) {
        const cellKey = `${row}-${col}`;
        
        // Check if super wild fish is pending and cell is not marked
        if (this.pendingSuperWildFish && !this.markedCells.has(cellKey)) {
            // Mark the selected cell
            this.markCell(row, col);
            
            // Clear pending super wild fish state
            this.pendingSuperWildFish = false;
            
            // Clear all super wild fish highlighting from the grid
            this.clearSuperWildFishHighlighting();
            
            // Update score and check for new Slingos
            this.calculateScore();
            this.updateGameMessage('Excellent choice! You marked a cell with the Super Wild Fish.');
            
            // Random bonus collection disabled
            
            // If auto spin is active and no more pending selections, continue auto spin
            if (this.autoSpinActive && this.pendingWildFishColumns.length === 0 && !this.pendingSuperWildFish) {
                setTimeout(() => {
                    this.scheduleNextAutoSpin();
                }, 1000); // 1 second delay after super wild fish selection
            }
        }
    }

    clearWildFishHighlighting(col) {
        // Remove highlighting and click listeners from all cells in the column
        for (let row = 0; row < 5; row++) {
            const cells = document.querySelectorAll('.number-cell');
            const cellIndex = row * 5 + col;
            const cell = cells[cellIndex];
            cell.classList.remove('wild-fish-selectable');
            
            // Remove event listener by cloning the node
            const newCell = cell.cloneNode(true);
            cell.parentNode.replaceChild(newCell, cell);
        }
    }

    clearSuperWildFishHighlighting() {
        // Remove highlighting and click listeners from all cells on the grid
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cells = document.querySelectorAll('.number-cell');
                const cellIndex = row * 5 + col;
                const cell = cells[cellIndex];
                cell.classList.remove('super-wild-selectable');
                
                // Remove event listener by cloning the node
                const newCell = cell.cloneNode(true);
                cell.parentNode.replaceChild(newCell, cell);
            }
        }
    }

    animateBonusToCollector(spinColumn) {
        // Find the next available bonus collector space
        const bonusSpaces = document.querySelectorAll('.bonus-space');
        let targetSpace = null;
        
        for (let i = 0; i < bonusSpaces.length; i++) {
            if (!bonusSpaces[i].classList.contains('collected')) {
                targetSpace = bonusSpaces[i];
                break;
            }
        }
        
        if (!targetSpace) {
            // All spaces filled, just show message
            this.updateGameMessage('Bonus symbol appeared but all collector spaces are full!');
            return;
        }
        
        // Wait for spin animation to complete before starting bonus animation
        setTimeout(() => {
            // Create animated bonus image
            const spinCells = document.querySelectorAll('.spin-cell');
            const sourceCell = spinCells[spinColumn];
            const sourceRect = sourceCell.getBoundingClientRect();
            const targetRect = targetSpace.getBoundingClientRect();
            
            // Create floating bonus image with enhanced styling
            const floatingBonus = document.createElement('div');
            floatingBonus.className = 'floating-bonus';
            floatingBonus.style.cssText = `
                position: fixed;
                width: 70px;
                height: 70px;
                background-image: url('Slingo_assets/bonus.png');
                background-size: cover;
                background-position: center;
                left: ${sourceRect.left + sourceRect.width/2 - 35}px;
                top: ${sourceRect.top + sourceRect.height/2 - 35}px;
                z-index: 1000;
                pointer-events: none;
                transition: all 2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                border-radius: 50%;
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
                filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.6));
            `;
            
            document.body.appendChild(floatingBonus);
            
            // Add initial pulse effect
            floatingBonus.style.animation = 'bonus-launch 0.5s ease-out';
            
            // Animate to target position with arc motion
            setTimeout(() => {
                const deltaX = targetRect.left + targetRect.width/2 - 35 - (sourceRect.left + sourceRect.width/2 - 35);
                const deltaY = targetRect.top + targetRect.height/2 - 35 - (sourceRect.top + sourceRect.height/2 - 35);
                
                floatingBonus.style.left = `${targetRect.left + targetRect.width/2 - 35}px`;
                floatingBonus.style.top = `${targetRect.top + targetRect.height/2 - 35}px`;
                floatingBonus.style.transform = 'scale(0.8) rotate(360deg)';
                floatingBonus.style.animation = 'bonus-travel 2s ease-out';
            }, 200);
            
            // Complete the collection after animation
            setTimeout(() => {
                // Add collection effect to target space
                targetSpace.style.animation = 'bonus-collect 0.5s ease-out';
                
                // Replace bonuspad background with bonus image
                targetSpace.style.backgroundImage = "url('Slingo_assets/bonus.png')";
                targetSpace.style.backgroundSize = 'cover';
                targetSpace.style.backgroundPosition = 'center';
                targetSpace.classList.add('bonus-collected');
                
                // Remove floating bonus
                if (floatingBonus.parentNode) {
                    floatingBonus.parentNode.removeChild(floatingBonus);
                }
                
                // Show message without collection
                this.updateGameMessage('Bonus symbol appeared! 🎁');
                
                // Reset target space animation
                setTimeout(() => {
                    targetSpace.style.animation = '';
                }, 500);
            }, 2200);
        }, 800); // Wait for spin animation to complete
    }

    markCell(row, col) {
        const cellKey = `${row}-${col}`;
        this.markedCells.add(cellKey);
        
        // Find the cell element and mark it
        const cells = document.querySelectorAll('.number-cell');
        let cellIndex = row * 5 + col;
        const cell = cells[cellIndex];
        
        cell.classList.add('marked');
        cell.classList.remove('wild-fish-selectable', 'super-wild-selectable'); // Remove any highlighting
        cell.textContent = ''; // Clear text content to show flower image
        
        // Add bounce animation to the flower when it appears
        cell.classList.add('flower-bounce');
        
        // Remove the bounce animation class after animation completes
        setTimeout(() => {
            cell.classList.remove('flower-bounce');
        }, 600); // Animation duration is 0.6s
    }

    markMatchesInOrder(matches) {
        // Mark matches from left to right with delays
        matches.forEach((match, index) => {
            setTimeout(() => {
                this.markCell(match.row, match.col);
                
                // If this is the last match and auto spin is active, schedule next spin
                if (index === matches.length - 1 && this.autoSpinActive) {
                    setTimeout(() => {
                        this.scheduleNextAutoSpin();
                    }, 600); // Wait for the flower animation to complete
                }
            }, index * 300); // 300ms delay between each marking
        });
    }

    calculateScore() {
        // Check for new completed lines (Slingos)
        const newSlingos = this.checkLines();
        
        // Update Slingo count and highlight prize table
        if (newSlingos.length > 0) {
            this.slingoCount += newSlingos.length;
            // Award points for new Slingos
            this.score += newSlingos.length * 100;
        }

        // Award points for individual matches
        this.score += this.markedCells.size * 10;
    }

    checkLines() {
        const newCompletedLines = [];
        let simultaneousLines = 0;
        let slingoJustWon = false;

        // Check rows
        for (let row = 0; row < 5; row++) {
            const lineKey = `row-${row}`;
            if (!this.completedLines.has(lineKey)) {
                let rowComplete = true;
                for (let col = 0; col < 5; col++) {
                    if (!this.markedCells.has(`${row}-${col}`)) {
                        rowComplete = false;
                        break;
                    }
                }
                if (rowComplete) {
                    this.completedLines.add(lineKey);
                    newCompletedLines.push('slingo');
                    simultaneousLines++;
                    this.highlightLine('row', row);
                    slingoJustWon = true;
                }
            }
        }

        // Check columns
        for (let col = 0; col < 5; col++) {
            const lineKey = `col-${col}`;
            if (!this.completedLines.has(lineKey)) {
                let colComplete = true;
                for (let row = 0; row < 5; row++) {
                    if (!this.markedCells.has(`${row}-${col}`)) {
                        colComplete = false;
                        break;
                    }
                }
                if (colComplete) {
                    this.completedLines.add(lineKey);
                    newCompletedLines.push('slingo');
                    simultaneousLines++;
                    this.highlightLine('column', col);
                    slingoJustWon = true;
                }
            }
        }

        // Check diagonals
        const diag1Key = 'diag1';
        const diag2Key = 'diag2';

        if (!this.completedLines.has(diag1Key)) {
            let diag1Complete = true;
            for (let i = 0; i < 5; i++) {
                if (!this.markedCells.has(`${i}-${i}`)) {
                    diag1Complete = false;
                    break;
                }
            }
            if (diag1Complete) {
                this.completedLines.add(diag1Key);
                newCompletedLines.push('slingo');
                simultaneousLines++;
                this.highlightLine('diagonal', 1);
                slingoJustWon = true;
            }
        }

        if (!this.completedLines.has(diag2Key)) {
            let diag2Complete = true;
            for (let i = 0; i < 5; i++) {
                if (!this.markedCells.has(`${i}-${4-i}`)) {
                    diag2Complete = false;
                    break;
                }
            }
            if (diag2Complete) {
                this.completedLines.add(diag2Key);
                newCompletedLines.push('slingo');
                simultaneousLines++;
                this.highlightLine('diagonal', 2);
                slingoJustWon = true;
            }
        }

        // If a slingo was just won, update the prize table and show the announcement immediately
        if (slingoJustWon) {
            // Always update the prize table after every new slingo
            this.updatePrizeTable();
            this.showSlingoAnnouncement(simultaneousLines);
        } else {
            // Even if no new slingo, keep the prize table in sync
            this.updatePrizeTable();
        }

        return newCompletedLines;
    }

    highlightLine(type, index) {
        // Add visual feedback for completed lines with golden glow and pulse
        const cells = document.querySelectorAll('.number-cell');
        let lineCells = [];
        
        if (type === 'row') {
            for (let col = 0; col < 5; col++) {
                const cellIndex = index * 5 + col;
                lineCells.push(cells[cellIndex]);
            }
        } else if (type === 'column') {
            for (let row = 0; row < 5; row++) {
                const cellIndex = row * 5 + index;
                lineCells.push(cells[cellIndex]);
            }
        } else if (type === 'diagonal') {
            if (index === 1) {
                // Main diagonal
                for (let i = 0; i < 5; i++) {
                    const cellIndex = i * 5 + i;
                    lineCells.push(cells[cellIndex]);
                }
            } else {
                // Anti-diagonal
                for (let i = 0; i < 5; i++) {
                    const cellIndex = i * 5 + (4 - i);
                    lineCells.push(cells[cellIndex]);
                }
            }
        }
        
        // Apply golden glow and pulse animation to line cells
        lineCells.forEach(cell => {
            cell.classList.add('slingo-line');
            this.addSparkleEffect(cell);
        });
        
        // Note: showSlingoAnnouncement will be called from checkLines with proper count
        
        // Remove the pink glow after animation completes and prize table is updated
        setTimeout(() => {
            lineCells.forEach(cell => {
                cell.classList.remove('slingo-line');
                // Clear all highlighting after prize table display
                cell.style.boxShadow = '';
                cell.style.border = '';
            });
        }, 3000);
    }

    showSlingoAnnouncement(slingoCount = 1) {
        // Create large SLINGO image overlay with different messages based on count
        const announcement = document.createElement('div');
        announcement.className = 'slingo-announcement';
        
        // Create image element for the slingo.png
        const slingoImage = document.createElement('img');
        slingoImage.src = 'Slingo_assets/slingo.png';
        slingoImage.alt = 'SLINGO!';
        slingoImage.style.maxWidth = '400px';
        slingoImage.style.maxHeight = '300px';
        slingoImage.style.display = 'block';
        slingoImage.style.margin = '0 auto 20px auto';
        
        // Create text element for additional message
        const messageText = document.createElement('div');
        messageText.style.textAlign = 'center';
        messageText.style.fontWeight = 'bold';
        messageText.style.marginTop = '10px';
        
        let message = '';
        switch(slingoCount) {
            case 1:
                message = '';
                slingoImage.style.filter = 'drop-shadow(0 0 20px #ffd700)';
                break;
            case 2:
                message = 'DOUBLE!';
                messageText.style.color = '#ff6b35';
                messageText.style.fontSize = '3rem';
                messageText.style.textShadow = `
                    3px 3px 0px #ffd700,
                    6px 6px 15px rgba(0, 0, 0, 0.8),
                    0 0 30px #ff6b35`;
                slingoImage.style.filter = 'drop-shadow(0 0 30px #ff6b35)';
                announcement.style.animation = 'double-slingo-appear 3s ease-out forwards';
                break;
            case 3:
                message = 'TRIPLE!';
                messageText.style.color = '#ff1744';
                messageText.style.fontSize = '4rem';
                messageText.style.textShadow = `
                    4px 4px 0px #ffd700,
                    8px 8px 20px rgba(0, 0, 0, 0.9),
                    0 0 40px #ff1744,
                    0 0 80px #ff6b35`;
                slingoImage.style.filter = 'drop-shadow(0 0 40px #ff1744)';
                announcement.style.animation = 'triple-slingo-appear 3.5s ease-out forwards';
                break;
            default:
                message = `${slingoCount} SLINGOS!`;
                messageText.style.color = '#ff1744';
                messageText.style.fontSize = '4rem';
                messageText.style.textShadow = `
                    4px 4px 0px #ffd700,
                    8px 8px 20px rgba(0, 0, 0, 0.9),
                    0 0 40px #ff1744,
                    0 0 80px #ff6b35`;
                slingoImage.style.filter = 'drop-shadow(0 0 40px #ff1744)';
                announcement.style.animation = 'triple-slingo-appear 3.5s ease-out forwards';
                break;
        }
        
        messageText.textContent = message;
        announcement.appendChild(slingoImage);
        announcement.appendChild(messageText);
        document.body.appendChild(announcement);
        
        // Remove the announcement after animation completes (longer for multiple slingos)
        const animationDuration = slingoCount >= 3 ? 3500 : (slingoCount === 2 ? 3000 : 2500);
        setTimeout(() => {
            if (announcement.parentNode) {
                announcement.parentNode.removeChild(announcement);
            }
        }, animationDuration);
        
        // Play celebration sound effect (if you want to add audio later)
        // this.playSlingoSound();
    }

    addSparkleEffect(element) {
        // Add sparkle effects around the completed line
        const rect = element.getBoundingClientRect();
        
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.className = 'sparkle';
                sparkle.textContent = '✨';
                sparkle.style.position = 'fixed';
                sparkle.style.left = (rect.left + Math.random() * rect.width) + 'px';
                sparkle.style.top = (rect.top + Math.random() * rect.height) + 'px';
                sparkle.style.zIndex = '1000';
                
                document.body.appendChild(sparkle);
                
                // Remove sparkle after animation
                setTimeout(() => {
                    if (sparkle.parentNode) {
                        sparkle.parentNode.removeChild(sparkle);
                    }
                }, 1000);
            }, i * 200);
        }
    }

    collectBonus() {
        // Bonus collection functionality disabled
        // The bonus symbol will still appear and animate, but won't collect anything
    }

    triggerBonusRound() {
        this.updateGameMessage('🎉 BONUS ROUND ACTIVATED! Extra spins awarded!');
        this.spinsRemaining += 3; // Award extra spins
        this.score += 500; // Bonus round completion reward
    }

    checkWinConditions() {
        // Check for full house (all cells marked)
        if (this.markedCells.size === 25) {
            this.score += 2500;
            this.updateGameMessage('🏆 FULL HOUSE! Amazing!');
            this.endGame(true);
            return;
        }

        // Check for other winning patterns
        const lines = this.checkLines();
        if (lines.length >= 3) {
            this.updateGameMessage('🎊 Multiple lines completed! Great job!');
        }
    }

    updateUI() {
        console.log('updateUI called');
        
        // Update spins remaining - log bar visual
        this.updateLogBar();
        
        // Update score (element removed, but keep for internal tracking)
        const scoreElement = document.getElementById('current-score');
        if (scoreElement) {
            scoreElement.textContent = this.score;
        }
        
        // Update spin button state
        const spinButton = document.getElementById('spinButton');
        if (spinButton) {
            if (this.spinsRemaining <= 0 || !this.gameActive) {
                spinButton.disabled = true;
                spinButton.textContent = 'GAME OVER';
            } else {
                spinButton.disabled = false;
                spinButton.textContent = 'SPIN';
            }
        }
    }

    updateGameMessage(message) {
        const messageElement = document.getElementById('game-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
        // Element doesn't exist anymore, but that's okay - just ignore the message
    }

    updateLogBar() {
        try {
            // Update log bar visual based on spins remaining
            const logItems = document.querySelectorAll('.log-item');
            if (logItems.length === 0) {
                console.warn('No log items found');
                return;
            }
            
            const spinsUsed = 8 - this.spinsRemaining; // Calculate how many spins have been used
            
            // Make used logs invisible but keep their space (maintain layout)
            logItems.forEach((log, index) => {
                if (index < spinsUsed) {
                    log.style.visibility = 'hidden'; // Hide used logs but keep space
                    log.classList.add('used');
                } else {
                    log.style.visibility = 'visible'; // Show remaining logs
                    log.classList.remove('used'); // Remove any used class
                }
            });
            
            // Update log countdown number to match spins remaining
            const logCountdownElement = document.getElementById('log-countdown');
            if (logCountdownElement) {
                logCountdownElement.textContent = this.spinsRemaining;
            } else {
                console.warn('Log countdown element not found');
            }
        } catch (error) {
            console.error('Error in updateLogBar:', error);
        }
    }

    updatePrizeTable() {
        // Define prize mapping based on Slingo count
        const prizeMapping = {
            1: '1 Slingo',
            2: '2 Slingos', 
            3: '3 Slingos',
            4: '4 Slingos',
            5: '5 Slingos',
            6: '6 Slingos',
            7: '7 Slingos',
            8: '8 Slingos',
            9: '9 Slingos',
            10: '10 Slingos',
            12: '12 Slingos'
        };

        // Clear all previous achievements
        document.querySelectorAll('.prize-item').forEach(item => {
            item.classList.remove('achieved');
        });

        // Highlight achieved prizes
        for (let count = 1; count <= this.slingoCount; count++) {
            if (prizeMapping[count]) {
                const prizeItems = document.querySelectorAll('.prize-item');
                prizeItems.forEach(item => {
                    const prizeName = item.querySelector('.prize-name').textContent;
                    if (prizeName === prizeMapping[count]) {
                        item.classList.add('achieved');
                    }
                });
            }
        }

        // Special case for 12 Slingos (full house)
        if (this.markedCells.size === 25) {
            const prizeItems = document.querySelectorAll('.prize-item');
            prizeItems.forEach(item => {
                const prizeName = item.querySelector('.prize-name').textContent;
                if (prizeName === '12 Slingos') {
                    item.classList.add('achieved');
                }
            });
        }
    }

    endGame(won = false) {
        this.gameActive = false;
        
        if (won) {
            this.updateGameMessage('🎉 Congratulations! You won the game!');
        } else {
            this.updateGameMessage('Game Over! Thanks for playing Slingo Splash!');
        }
        
        // Add restart functionality
        setTimeout(() => {
            const playAgain = confirm('Game Over! Would you like to play again?');
            if (playAgain) {
                this.resetGame();
            }
        }, 2000);
    }

    resetGame() {
        // Reset all game state
        this.gameBoard = [];
        this.spinsRemaining = 8;
        this.score = 0;
        this.bonusCollected = 0;
        this.gameActive = true;
        this.markedCells = new Set();
        this.slingoCount = 0;
        this.completedLines = new Set();
        this.blockerUsed = false; // Reset blocker for new game
        this.superWildUsed = false; // Reset super wild fish for new game
        this.wildFishUsedCount = 0; // Reset wild fish count for new game
        this.pendingWildFishColumns = []; // Reset pending wild fish selections
        this.pendingSuperWildFish = false; // Reset pending super wild fish selection
        this.bonusSymbolUsed = false; // Reset bonus symbol for new game
        
        // Clear UI
        document.querySelectorAll('.number-cell').forEach(cell => {
            cell.classList.remove('marked', 'slingo-line', 'wild-fish-selectable', 'super-wild-selectable');
            cell.style.boxShadow = '';
            cell.style.border = '';
            cell.textContent = '';
            
            // Remove any event listeners by cloning the node
            const newCell = cell.cloneNode(true);
            cell.parentNode.replaceChild(newCell, cell);
        });
        
        document.querySelectorAll('.spin-cell').forEach(cell => {
            cell.classList.remove('active', 'super-wild', 'wild-fish', 'blocker', 'bonus');
            cell.textContent = '';
            cell.style.backgroundImage = '';
        });
        
        document.querySelectorAll('.bonus-space').forEach(space => {
            space.classList.remove('collected', 'bonus-collected');
            space.querySelector('.bonus-icon').textContent = '?';
            // Restore bonuspad background
            space.style.backgroundImage = "url('Slingo_assets/bonuspad.png')";
            space.style.backgroundSize = 'cover';
            space.style.backgroundPosition = 'center';
        });

        // Clear prize table highlighting
        document.querySelectorAll('.prize-item').forEach(item => {
            item.classList.remove('achieved');
        });
        
        // Reset spin button
        const spinButton = document.getElementById('spinButton');
        if (spinButton) {
            spinButton.disabled = false;
            spinButton.textContent = 'SPIN';
        }
        
        // Restart the game
        this.initializeGame();
        this.updateGameMessage('New game started! Click SPIN to begin.');
    }

    toggleAutoSpin() {
        const autoSpinButton = document.getElementById('autoSpinButton');
        const spinButton = document.getElementById('spinButton');
        
        if (!autoSpinButton) {
            console.error('Auto spin button not found!');
            return;
        }
        
        if (!this.autoSpinActive) {
            // Start auto spin
            this.autoSpinActive = true;
            autoSpinButton.textContent = 'STOP AUTO';
            autoSpinButton.classList.add('active');
            if (spinButton) {
                spinButton.disabled = true;
            }
            
            this.updateGameMessage('Auto spin started! The game will play automatically.');
            this.performAutoSpin();
        } else {
            // Stop auto spin
            this.stopAutoSpin();
        }
    }

    stopAutoSpin() {
        const autoSpinButton = document.getElementById('autoSpinButton');
        const spinButton = document.getElementById('spinButton');
        
        this.autoSpinActive = false;
        
        if (autoSpinButton) {
            autoSpinButton.textContent = 'AUTO SPIN';
            autoSpinButton.classList.remove('active');
        }
        
        if (spinButton) {
            spinButton.disabled = false;
        }
        
        if (this.autoSpinTimeout) {
            clearTimeout(this.autoSpinTimeout);
            this.autoSpinTimeout = null;
        }
        
        this.updateGameMessage('Auto spin stopped. Click SPIN to continue manually.');
    }

    performAutoSpin() {
        if (!this.autoSpinActive || !this.gameActive || this.spinsRemaining <= 0) {
            this.stopAutoSpin();
            return;
        }

        // Perform the spin
        this.spin();
    }

    scheduleNextAutoSpin() {
        if (!this.autoSpinActive || !this.gameActive || this.spinsRemaining <= 0) {
            this.stopAutoSpin();
            return;
        }

        // Check if there are pending wild fish selections
        if (this.pendingWildFishColumns.length > 0 || this.pendingSuperWildFish) {
            // Wait for player selection, then continue auto spin after selection
            return;
        }

        // Schedule next spin after 1 second delay
        this.autoSpinTimeout = setTimeout(() => {
            this.performAutoSpin();
        }, 1000);
    }
}

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new SlingoGame();
});

// Add some helper functions for enhanced gameplay
function addSparkleEffect(element) {
    element.style.animation = 'sparkle 0.6s ease-in-out';
    setTimeout(() => {
        element.style.animation = '';
    }, 600);
}

// CSS for sparkle animation (add to styles.css if needed)
const sparkleCSS = `
@keyframes sparkle {
    0%, 100% { transform: scale(1) rotate(0deg); }
    25% { transform: scale(1.1) rotate(90deg); }
    50% { transform: scale(1.2) rotate(180deg); }
    75% { transform: scale(1.1) rotate(270deg); }
}
`;

// Add sparkle CSS if not already present
if (!document.querySelector('#sparkle-styles')) {
    const style = document.createElement('style');
    style.id = 'sparkle-styles';
    style.textContent = sparkleCSS;
    document.head.appendChild(style);
}

// === BONUS FEATURE LOGIC ===
(function() {
    // Bonus button and modal elements
    const bonusButton = document.getElementById('bonusButton');
    const bonusModal = document.getElementById('bonusModal');
    const closeBonusModal = document.getElementById('closeBonusModal');
    let bonusState = {
        revealed: Array(9).fill(false),
        revealedType: Array(9).fill(null),
        wildFishAnimated: false
    };
    function getBonusGrid() {
        return document.querySelector('.bonus-grid');
    }
    function getPrizeKeyImg() {
        return document.querySelector('.bonus-modal-prizetable img');
    }

    // --- Bonus UI Glow and 3 Bonus Images in Main UI ---
    function showBonusUILightup() {
        // Use the real bonus UI in the main game (bottom right)
        const bonusRound = document.querySelector('.bonus-round');
        const bonusSpaces = document.querySelectorAll('.bonus-space');
        if (!bonusRound || bonusSpaces.length < 3) return;

        // Animate each bonus space to show the bonus image and glow
        bonusSpaces.forEach((space, i) => {
            setTimeout(() => {
                space.classList.add('bonus-collected');
                space.classList.add('collected');
                space.style.backgroundImage = "url('Slingo_assets/bonus.png')";
                space.style.backgroundSize = 'cover';
                space.style.backgroundPosition = 'center';
                const icon = space.querySelector('.bonus-icon');
                if (icon) icon.textContent = '';
            }, 200 + i * 200);
        });

        // Add glow to the bonus round UI
        bonusRound.classList.add('bonus-ui-glow');
        setTimeout(() => {
            bonusRound.classList.remove('bonus-ui-glow');
        }, 1800);
    }

    // Prize key highlight for flower
    // Track number of flowers revealed in bonusState
    function highlightPrizeKey() {
        // Count how many flowers have been revealed so far (including those replacing blockers)
        const count = bonusState.revealedType.filter(t => t === 'flower').length;
        // Remove all highlights first
        document.querySelectorAll('.prizekey-flower-highlight').forEach(div => div.classList.remove('active'));
        // Highlight sections from bottom up for each flower collected (up to 6)
        for (let i = 1; i <= count && i <= 6; i++) {
            const highlight = document.querySelector('.prizekey-flower-highlight[data-flower="' + i + '"]');
            if (highlight) highlight.classList.add('active');
        }
    }
    function removePrizeKeyHighlight() {
        document.querySelectorAll('.prizekey-flower-highlight').forEach(div => div.classList.remove('active'));
    }

    // Animate 3 bonus images in the main UI (simulate)
    // (replaced by showBonusUILightup)

    // Show the bonus modal and initialize the grid
    function showBonusModal() {
        bonusModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        // Show congrats popup
        setTimeout(() => {
            const congrats = document.createElement('div');
            congrats.className = 'bonus-congrats-popup slingo-congrats-theme';
            congrats.innerHTML = `
                <div class="congrats-firework">🎉</div>
                <h2 class="congrats-title">SPLASHING CONGRATULATIONS!</h2>
                <div class="congrats-sub">You've unlocked the <span class="slingo-highlight">Slingo Splash Bonus Round!</span></div>
                <div class="congrats-wave"></div>
            `;
            bonusModal.appendChild(congrats);
            setTimeout(() => {
                congrats.remove();
                // Now show the bonus grid and other content
                buildBonusGrid();
                removePrizeKeyHighlight();
            }, 3000);
        }, 400);
    }

    // Build the 3x3 bonus grid with clickable bonus images
    function buildBonusGrid() {
        const bonusGrid = getBonusGrid();
        if (!bonusGrid) return;
        bonusGrid.innerHTML = '';
        bonusState.revealed = Array(9).fill(false);
        bonusState.revealedType = Array(9).fill(null);
        bonusState.wildFishAnimated = false;
        // Map for what each cell reveals on click
        const imgMap = [
            'blocker', 'flower', 'flower',
            'wildfish', 'flower', 'blocker',
            'blocker', 'blocker', 'flower'
        ];
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'bonus-grid-cell';
            cell.style.width = '100%';
            cell.style.height = '100%';
            cell.style.display = 'flex';
            cell.style.alignItems = 'stretch';
            cell.style.justifyContent = 'stretch';
            cell.style.margin = '0';
            cell.style.padding = '0';
            // Add the clickable bonus image
            const img = document.createElement('img');
            img.src = 'Slingo_assets/bonus.png';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.style.cursor = 'pointer';
            img.className = 'bonus-grid-bonus-img';
            cell.appendChild(img);
            // Click handler for reveal
            img.addEventListener('click', function handler() {
                if (bonusState.revealed[i]) return;
                bonusState.revealed[i] = true;
                let revealImg = '';
                let type = imgMap[i];
                if (type === 'blocker') revealImg = 'Slingo_assets/blocker.png';
                if (type === 'flower')  revealImg = 'Slingo_assets/flower_1.png';
                if (type === 'wildfish') revealImg = 'Slingo_assets/wild fish.png';
                img.style.opacity = '0';
                setTimeout(() => {
                    img.remove();
                    const revealed = document.createElement('img');
                    revealed.src = revealImg;
                    revealed.style.width = '100%';
                    revealed.style.height = '100%';
                    revealed.style.objectFit = 'contain';
                    revealed.className = 'bonus-grid-revealed-img';
                    cell.appendChild(revealed);
                    bonusState.revealedType[i] = type;
                    // Highlight prize key if flower
                    if (type === 'flower') highlightPrizeKey();
                    // If all revealed, trigger wild fish animation
                    if (bonusState.revealedType.filter(Boolean).length === 9 && !bonusState.wildFishAnimated) {
                        setTimeout(() => animateWildFishRow(), 800);
                    }
                }, 200);
                img.removeEventListener('click', handler);
            });
            bonusGrid.appendChild(cell);
        }
    }

    // Animate wild fish swimming across the middle row
    function animateWildFishRow() {
        bonusState.wildFishAnimated = true;
        // Middle row indices: 3,4,5
        const row = [3,4,5];
        const bonusGrid = getBonusGrid();
        const cells = Array.from(bonusGrid.children);
        let wildIdx = row.find(i => bonusState.revealedType[i] === 'wildfish');
        if (wildIdx === undefined) return;
        const wildCell = cells[wildIdx];
        let wildImg = wildCell.querySelector('img');
        if (!wildImg) return;
        // Splash effect
        wildImg.classList.add('wildfish-splash');
        setTimeout(() => {
            wildImg.classList.remove('wildfish-splash');
            // Create a floating wild fish for smooth glide
            const gridRect = bonusGrid.getBoundingClientRect();
            const startCellRect = wildCell.getBoundingClientRect();
            const endCellRect = cells[row[row.length-1]].getBoundingClientRect();
            const fish = document.createElement('img');
            fish.src = 'Slingo_assets/wild fish.png';
            fish.style.position = 'fixed';
            fish.style.left = startCellRect.left + 'px';
            fish.style.top = startCellRect.top + 'px';
            fish.style.width = startCellRect.width + 'px';
            fish.style.height = startCellRect.height + 'px';
            fish.style.zIndex = 10005;
            fish.style.transition = 'left 2.2s linear, top 2.2s linear';
            document.body.appendChild(fish);
            // Replace wild fish cell with flower
            wildImg.remove();
            const flower = document.createElement('img');
            flower.src = 'Slingo_assets/flower_1.png';
            flower.style.width = '100%';
            flower.style.height = '100%';
            flower.style.objectFit = 'contain';
            flower.className = 'bonus-grid-revealed-img';
            wildCell.appendChild(flower);
            bonusState.revealedType[wildIdx] = 'flower';
            highlightPrizeKey();
            // Animate fish gliding to the rightmost cell
            setTimeout(() => {
                fish.style.left = endCellRect.left + 'px';
                fish.style.top = endCellRect.top + 'px';
                // As fish glides, if it passes over blockers, replace with flowers
                let blockersToReplace = row.filter(i => i > wildIdx && bonusState.revealedType[i] === 'blocker');
                blockersToReplace.forEach((i, idx) => {
                    setTimeout(() => {
                        const cell = cells[i];
                        let img = cell.querySelector('img');
                        if (img) img.remove();
                        const flower = document.createElement('img');
                        flower.src = 'Slingo_assets/flower_1.png';
                        flower.style.width = '100%';
                        flower.style.height = '100%';
                        flower.style.objectFit = 'contain';
                        flower.className = 'bonus-grid-revealed-img';
                        cell.appendChild(flower);
                        bonusState.revealedType[i] = 'flower';
                        highlightPrizeKey();
                    }, (2.2 * 1000) * ((i-wildIdx)/(row[row.length-1]-wildIdx)) );
                });
            }, 30);
            // After glide, remove fish and show popup if 5+ flowers
            setTimeout(() => {
                fish.remove();
                setTimeout(() => {
                    const flowerCount = bonusState.revealedType.filter(t => t === 'flower').length;
                    if (flowerCount >= 5) {
                        showBonusWinPopup();
                    }
                }, 3000);
            }, 2250);
        }, 700); // splash duration
        // Helper: show win popup
        function showBonusWinPopup() {
            const modal = document.createElement('div');
            modal.className = 'bonus-win-popup';
            modal.innerHTML = `
                <div class="bonus-win-content" style="position:relative;">
                    <div class="bonus-win-confetti"></div>
                    <div class="bonus-win-firework">🎉</div>
                    <h2 style="color:#00c3ff; font-family:'Luckiest Guy','Comic Sans MS',cursive,sans-serif; font-size:2.5rem; margin-bottom:10px; text-shadow:0 2px 8px #ffe066,0 1px 0 #fff;">Congratulations!</h2>
                    <div style="font-size:1.3rem; color:#1a3a5a; margin-bottom:10px;">You collected <span style='color:#ff6b35;font-weight:bold;'>6 flowers</span></div>
                    <div style="font-size:2.1rem; color:#ff6b35; font-weight:bold; text-shadow:0 1px 6px #ffe066; margin-bottom:10px;">You have won <span style='color:#ffd700;'>£25</span> in the bonus round</div>
                    <div class="bonus-win-wave" style="width:120%;height:18px;background:url('Slingo_assets/wave.png') repeat-x center/contain;position:absolute;left:-10%;bottom:0;animation:wave-move 2s linear infinite;opacity:0.7;"></div>
                </div>
            `;
            Object.assign(modal.style, {
                position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                background: 'linear-gradient(135deg,#e0f7fa 0%,#fffbe6 100%)', color: '#1a3a5a', borderRadius: '28px', boxShadow: '0 8px 40px rgba(0,195,255,0.18), 0 2px 12px #ffe066',
                zIndex: 10010, padding: '48px 64px 40px 64px', textAlign: 'center', fontSize: '2rem', fontFamily: 'inherit',
                border: '4px solid #00c3ff',
                minWidth: '420px',
            });
            // Add confetti
            for (let i = 0; i < 30; i++) {
                const conf = document.createElement('div');
                conf.className = 'bonus-confetti';
                conf.style.left = Math.random()*100+'%';
                conf.style.top = Math.random()*100+'%';
                conf.style.background = ['#00c3ff','#ff6b35','#ffd700','#fffbe6','#e0f7fa'][Math.floor(Math.random()*5)];
                conf.style.width = '12px';
                conf.style.height = '12px';
                conf.style.position = 'absolute';
                conf.style.borderRadius = '50%';
                conf.style.opacity = 0.7;
                conf.style.zIndex = 2;
                conf.style.animation = `bonus-confetti-fall 1.8s ${Math.random()}s linear infinite`;
                modal.querySelector('.bonus-win-content').appendChild(conf);
            }
            document.body.appendChild(modal);
            setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 4000);
            // Add confetti keyframes if not present
            if (!document.getElementById('bonus-confetti-style')) {
                const style = document.createElement('style');
                style.id = 'bonus-confetti-style';
                style.textContent = `
                @keyframes bonus-confetti-fall {
                    0% { transform: translateY(-30px) scale(1) rotate(0deg); opacity: 0.7; }
                    60% { opacity: 1; }
                    100% { transform: translateY(60px) scale(1.2) rotate(360deg); opacity: 0; }
                }
                `;
                document.head.appendChild(style);
            }
        }
    }

    // Show bonus modal on bonus button click
    if (bonusButton) {
        bonusButton.addEventListener('click', () => {
            showBonusUILightup();
            setTimeout(() => {
                showBonusModal();
            }, 1800);
        });
    }
    if (closeBonusModal) {
        closeBonusModal.addEventListener('click', () => {
            bonusModal.style.display = 'none';
            document.body.style.overflow = '';
            removePrizeKeyHighlight();
        });
    }
})();

// Bonus UI Glow and Flower Key Highlight
const style = document.createElement('style');
style.innerHTML = `
.bonus-ui-glow {
    box-shadow: 0 0 32px 12px #ffe066, 0 0 64px 24px #00c3ff;
    border-radius: 24px;
    animation: bonus-ui-glow-pulse 1.2s infinite alternate;
}
@keyframes bonus-ui-glow-pulse {
    0% { box-shadow: 0 0 32px 12px #ffe066, 0 0 64px 24px #00c3ff; }
    100% { box-shadow: 0 0 48px 24px #ffe066, 0 0 96px 36px #00c3ff; }
}
.bonus-congrats-popup {
    position: absolute;
    top: 30px; left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #e0f7fa 0%, #fffbe6 100%);
    border-radius: 24px;
    box-shadow: 0 8px 32px rgba(0, 195, 255, 0.18), 0 2px 12px #ffe066;
    padding: 40px 56px 32px 56px;
    z-index: 10001;
    text-align: center;
    font-size: 2rem;
    color: #1a3a5a;
    font-family: inherit;
    animation: bonus-congrats-fadein 0.5s;
    overflow: hidden;
}
.slingo-congrats-theme .congrats-firework {
    font-size: 3.5rem;
    margin-bottom: 10px;
    animation: firework-pop 0.7s cubic-bezier(.68,-0.55,.27,1.55) both;
}
.slingo-congrats-theme .congrats-title {
    font-family: 'Luckiest Guy', 'Comic Sans MS', cursive, sans-serif;
    color: #00c3ff;
    font-size: 2.2rem;
    letter-spacing: 2px;
    margin: 0 0 8px 0;
    text-shadow: 0 2px 8px #ffe066, 0 1px 0 #fff;
}
.slingo-congrats-theme .congrats-sub {
    font-size: 1.2rem;
    color: #1a3a5a;
    margin-bottom: 10px;
}
.slingo-highlight {
    color: #ff6b35;
    font-weight: bold;
    text-shadow: 0 1px 6px #ffe066;
}
.slingo-congrats-theme .congrats-wave {
    width: 120%;
    height: 18px;
    background: url('Slingo_assets/wave.png') repeat-x center/contain;
    position: absolute;
    left: -10%;
    bottom: 0;
    animation: wave-move 2s linear infinite;
    opacity: 0.7;
}
@keyframes firework-pop {
    0% { transform: scale(0.2) rotate(-30deg); opacity: 0; }
    60% { transform: scale(1.2) rotate(10deg); opacity: 1; }
    100% { transform: scale(1) rotate(0); opacity: 1; }
}
@keyframes wave-move {
    0% { background-position-x: 0; }
    100% { background-position-x: 200px; }
}
@keyframes bonus-congrats-fadein {
    from { opacity: 0; transform: translateX(-50%) scale(0.8); }
    to { opacity: 1; transform: translateX(-50%) scale(1); }
}
.bonus-flower-glow {
    filter: drop-shadow(0 0 16px #ffe066) drop-shadow(0 0 32px #ffe066);
    transition: filter 0.3s;
}
.wildfish-swim {
    animation: wildfish-swim-anim 1s linear infinite alternate;
}
@keyframes wildfish-swim-anim {
    0% { transform: translateX(0); }
    100% { transform: translateX(20px) scaleX(-1); }
}
`;
document.head.appendChild(style);