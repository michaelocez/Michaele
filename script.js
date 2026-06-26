const secretWord = 'MICHAEL';
const totalRows = 6;
const wordLength = secretWord.length;

const boardElement = document.getElementById('board');
const keyboardElement = document.getElementById('keyboard');
const statusElement = document.getElementById('status');
const winToast = document.getElementById('win-toast');
const endGameModal = document.getElementById('end-game-modal');
const endGameTitle = document.getElementById('end-game-title');
const endGameMessage = document.getElementById('end-game-message');
const restartButton = document.getElementById('restart-button');
const boardRows = [];
const keyboardKeys = new Map();

const keyboardRows = [
	['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
	['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
	['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

let currentAttempt = 0;
let currentGuess = '';
let gameOver = false;
let isRevealing = false;
let revealTimers = [];
let revealCompletionTimer = null;
let endGameToastTimer = null;
let endGameModalTimer = null;

const winMessages = {
	1: 'Genius',
	2: 'Magnificent',
	3: 'Impressive',
	4: 'Splendid',
	5: 'Great',
	6: 'Phew',
};

function createTile() {
	const tile = document.createElement('div');
	tile.className = 'tile';
	tile.setAttribute('aria-hidden', 'true');
	tile.textContent = '';
	return tile;
}

function createRow() {
	const row = document.createElement('div');
	row.className = 'row';
	const tiles = [];

	for (let column = 0; column < wordLength; column += 1) {
		const tile = createTile();
		tiles.push(tile);
		row.appendChild(tile);
	}

	boardRows.push(tiles);
	return row;
}

function createKey(label) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'key';
	button.textContent = label === 'BACKSPACE' ? '⌫' : label;
	button.dataset.key = label;

	if (label === 'ENTER' || label === 'BACKSPACE') {
		button.classList.add('key--wide');
	}

	button.addEventListener('click', () => {
		handleVirtualKey(label);
	});

	keyboardKeys.set(label, button);
	return button;
}

function renderKeyboard() {
	keyboardElement.innerHTML = '';
	keyboardKeys.clear();

	keyboardRows.forEach((rowLabels, rowIndex) => {
		const row = document.createElement('div');
		row.className = 'keyboard-row';

		if (rowIndex === 1) {
			row.classList.add('keyboard-row--middle');
		}

		if (rowIndex === 2) {
			row.classList.add('keyboard-row--bottom');
		}

		rowLabels.forEach((label) => {
			row.appendChild(createKey(label));
		});

		keyboardElement.appendChild(row);
	});
}

function renderBoard() {
	boardElement.innerHTML = '';
	boardRows.length = 0;

	for (let rowIndex = 0; rowIndex < totalRows; rowIndex += 1) {
		boardElement.appendChild(createRow());
	}
}

function renderCurrentGuess() {
	const tiles = boardRows[currentAttempt];

	if (!tiles) {
		return;
	}

	for (let index = 0; index < wordLength; index += 1) {
		const letter = currentGuess[index] ?? '';
		tiles[index].textContent = letter;
	}
}

function scoreGuess(guess) {
	const result = Array(wordLength).fill('absent');
	const remainingLetters = secretWord.split('');

	for (let index = 0; index < wordLength; index += 1) {
		if (guess[index] === secretWord[index]) {
			result[index] = 'correct';
			remainingLetters[index] = null;
		}
	}

	for (let index = 0; index < wordLength; index += 1) {
		if (result[index] === 'correct') {
			continue;
		}

		const letterIndex = remainingLetters.indexOf(guess[index]);

		if (letterIndex !== -1) {
			result[index] = 'present';
			remainingLetters[letterIndex] = null;
		}
	}

	return result;
}

function updateKeyboardState(letter, status) {
	const button = keyboardKeys.get(letter);

	if (!button) {
		return;
	}

	if (button.classList.contains('key--correct')) {
		return;
	}

	if (status === 'correct') {
		button.classList.remove('key--present', 'key--absent');
		button.classList.add('key--correct');
		return;
	}

	if (status === 'present' && !button.classList.contains('key--present')) {
		button.classList.remove('key--absent');
		button.classList.add('key--present');
		return;
	}

	if (status === 'absent' && !button.classList.contains('key--present')) {
		button.classList.add('key--absent');
	}
}

function clearRevealTimers() {
	revealTimers.forEach((timerId) => window.clearTimeout(timerId));
	revealTimers = [];

	if (revealCompletionTimer !== null) {
		window.clearTimeout(revealCompletionTimer);
		revealCompletionTimer = null;
	}

	if (endGameToastTimer !== null) {
		window.clearTimeout(endGameToastTimer);
		endGameToastTimer = null;
	}

	if (endGameModalTimer !== null) {
		window.clearTimeout(endGameModalTimer);
		endGameModalTimer = null;
	}
}

function setGameControlsDisabled(disabled) {
	keyboardKeys.forEach((button, label) => {
		button.disabled = disabled;
	});
}

function showEndGameModal(message) {
	endGameTitle.textContent = message;
	endGameMessage.textContent = 'Start a new game to play again.';
	endGameModal.hidden = false;
}

function hideEndGameModal() {
	endGameModal.hidden = true;
}

function hideWinToast() {
	winToast.hidden = true;
	winToast.textContent = '';
}

function showWinToast(message) {
	winToast.textContent = message;
	winToast.hidden = false;
}

function getWinMessage(guessCount) {
	return winMessages[guessCount] ?? 'Great';
}

function finishWin(guessCount) {
	const toastMessage = getWinMessage(guessCount);
	const modalMessage = `You got Michaele in ${guessCount}!`;

	showWinToast(toastMessage);
	endGameToastTimer = window.setTimeout(() => {
		endGameToastTimer = null;
		hideWinToast();
		showEndGameModal(modalMessage);
	}, 2000);
	setStatus(modalMessage);
	restartButton.focus();
}

function finishGame(message) {
	gameOver = true;
	isRevealing = false;
	clearRevealTimers();
	setGameControlsDisabled(true);
	setStatus(message);
	currentGuess = '';
	renderCurrentGuess();
	showEndGameModal(message);
	restartButton.focus();
}

function revealGuess(guess) {
	const tiles = boardRows[currentAttempt];
	const statuses = scoreGuess(guess);

	for (let index = 0; index < wordLength; index += 1) {
		const timerId = window.setTimeout(() => {
			tiles[index].textContent = guess[index];
			tiles[index].classList.add(`tile--${statuses[index]}`);
			tiles[index].classList.add('tile--reveal');
			updateKeyboardState(guess[index], statuses[index]);
			window.setTimeout(() => {
				tiles[index].classList.remove('tile--reveal');
			}, 180);
		}, index * 120);
		revealTimers.push(timerId);
	}

	return statuses;
}


function handleGuessInput(label) {
	if (gameOver || isRevealing) {
		return;
	}

	if (label === 'ENTER') {
		submitCurrentGuess();
		return;
	}

	if (label === 'BACKSPACE') {
		currentGuess = currentGuess.slice(0, -1);
		renderCurrentGuess();
		return;
	}

	if (currentGuess.length >= wordLength) {
		return;
	}

	currentGuess += label;
	renderCurrentGuess();
}

function setStatus(message) {
	statusElement.classList.remove('status--error');
	statusElement.textContent = message;
}

function showError(message) {
	statusElement.textContent = message;
	statusElement.classList.add('status--error');
	boardElement.classList.remove('board--shaking');
	void boardElement.offsetWidth;
	boardElement.classList.add('board--shaking');

	window.setTimeout(() => {
		boardElement.classList.remove('board--shaking');
		statusElement.classList.remove('status--error');
	}, 320);
}

function resetGame() {
	clearRevealTimers();
	hideWinToast();
	hideEndGameModal();
	renderBoard();
	renderKeyboard();
	currentAttempt = 0;
	currentGuess = '';
	gameOver = false;
	isRevealing = false;
	setGameControlsDisabled(false);
	renderCurrentGuess();
	setStatus('Type your guess to fill the tiles.');
	boardElement.focus();
}

function submitCurrentGuess() {
	if (gameOver || currentAttempt >= totalRows || isRevealing) {
		return;
	}

	if (currentGuess.length !== wordLength) {
		showError('Guess must be exactly 7 letters long.');
		return;
	}

	const guess = currentGuess;
	isRevealing = true;
	setGameControlsDisabled(true);
	setStatus('Checking guess...');
	revealGuess(guess);
	revealCompletionTimer = window.setTimeout(() => {
		revealCompletionTimer = null;
		currentAttempt += 1;

		if (guess === secretWord) {
			gameOver = true;
			isRevealing = false;
			setGameControlsDisabled(true);
			currentGuess = '';
			renderCurrentGuess();
			finishWin(currentAttempt);
			return;
		}

		if (currentAttempt >= totalRows) {
			finishGame('No guesses left. The answer was MICHAEL.');
			return;
		}

		isRevealing = false;
		currentGuess = '';
		renderCurrentGuess();
		setGameControlsDisabled(false);
		setStatus(`${totalRows - currentAttempt} guesses left.`);
		boardElement.focus();
	}, wordLength * 120 + 140);
}

function handleDocumentKeydown(event) {
	if (event.metaKey || event.ctrlKey || event.altKey) {
		return;
	}

	if (event.key === 'Enter') {
		event.preventDefault();
		handleGuessInput('ENTER');
		return;
	}

	if (event.key === 'Backspace') {
		event.preventDefault();
		handleGuessInput('BACKSPACE');
		return;
	}

	if (/^[a-z]$/i.test(event.key)) {
		event.preventDefault();
		handleGuessInput(event.key.toUpperCase());
	}
}

restartButton.addEventListener('click', resetGame);

document.addEventListener('keydown', handleDocumentKeydown);

boardElement.addEventListener('click', () => {
	boardElement.focus();
});

renderBoard();
renderKeyboard();
renderCurrentGuess();
boardElement.focus();
