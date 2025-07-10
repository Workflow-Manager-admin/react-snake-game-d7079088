import React, { useRef, useEffect, useState, useCallback } from 'react';

// Sound data URIs (basic retro beeps)
const EAT_SOUND =
  "data:audio/wav;base64,UklGRlgAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYAAAP8AAA==" // short beep
const GAME_OVER_SOUND =
  "data:audio/wav;base64,UklGRlgAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYAAAP8AAP8AAP8AAH8AAH8AAH8A" // lower beep

// Configurable board size
const BOARD_SIZE = 20; // 20x20
const CELL_SIZE = 22; // px

const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};

const OPPOSITES = {
  ArrowUp: 'ArrowDown',
  ArrowDown: 'ArrowUp',
  ArrowLeft: 'ArrowRight',
  ArrowRight: 'ArrowLeft'
};

// Helpers
function getRandomCell(snake) {
  let cell;
  do {
    cell = {
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE)
    }
  } while (snake.some(s => s.x === cell.x && s.y === cell.y));
  return cell;
}

function playSound(dataURI) {
  try {
    const audio = new window.Audio(dataURI);
    audio.volume = 0.25;
    audio.play();
  } catch {
    // ignore if cannot play
  }
}

// PUBLIC_INTERFACE
function SnakeGame() {
  // Core state
  const [snake, setSnake] = useState([{ x: 9, y: 9 }, { x: 8, y: 9 }]);
  const [direction, setDirection] = useState('ArrowRight');
  const [pendingDirection, setPendingDirection] = useState(null);
  const [food, setFood] = useState(getRandomCell([{ x: 9, y: 9 }, { x: 8, y: 9 }]));
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const moveInterval = useRef();
  const gameAreaRef = useRef();

  // Move the snake
  const gameTick = useCallback(() => {
    if (!running || paused) return;
    setSnake(prevSnake => {
      let nextDir = pendingDirection && OPPOSITES[pendingDirection] !== direction
        ? pendingDirection
        : direction;
      setDirection(nextDir);
      setPendingDirection(null);

      const head = prevSnake[0];
      const newHead = {
        x: (head.x + DIRECTIONS[nextDir].x + BOARD_SIZE) % BOARD_SIZE,
        y: (head.y + DIRECTIONS[nextDir].y + BOARD_SIZE) % BOARD_SIZE
      };
      // Collision with snake
      if (prevSnake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
        setGameOver(true);
        setRunning(false);
        playSound(GAME_OVER_SOUND);
        return prevSnake;
      }
      // Eat food
      let ateFood = newHead.x === food.x && newHead.y === food.y;
      if (ateFood) {
        setScore(s => s + 1);
        setFood(getRandomCell([newHead, ...prevSnake]));
        playSound(EAT_SOUND);
        return [newHead, ...prevSnake];
      } else {
        let nextSnake = [newHead, ...prevSnake.slice(0, -1)];
        return nextSnake;
      }
    });
    // eslint-disable-next-line
  }, [direction, food, running, paused, pendingDirection]);

  // Handle game loop
  useEffect(() => {
    if (running && !paused && !gameOver) {
      moveInterval.current = setInterval(gameTick, 120);
      return () => clearInterval(moveInterval.current);
    } else if (!running || paused || gameOver) {
      clearInterval(moveInterval.current);
    }
    // eslint-disable-next-line
  }, [running, paused, gameOver, gameTick]);

  // Keyboard controls
  useEffect(() => {
    function handleKeyDown(e) {
      if (DIRECTIONS[e.key]) {
        setPendingDirection(prev =>
          // Only accept new direction if not directly reversing
          OPPOSITES[e.key] !== direction ? e.key : prev
        );
      }
      if (e.key === " " && running) {
        e.preventDefault();
        handlePauseResume();
      }
      if (e.key === "Enter" && (gameOver || !running)) {
        e.preventDefault();
        handleStart();
      }
    }
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line
  }, [direction, running, gameOver]);

  // Touch swipe controls (mobile support)
  useEffect(() => {
    let touchStartX = null, touchStartY = null;
    function onTouchStart(e) {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }
    function onTouchEnd(e) {
      if (touchStartX == null || touchStartY == null) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 20) { setPendingDirection('ArrowRight'); }
        else if (dx < -20) { setPendingDirection('ArrowLeft'); }
      } else {
        if (dy > 20) { setPendingDirection('ArrowDown'); }
        else if (dy < -20) { setPendingDirection('ArrowUp'); }
      }
      touchStartX = touchStartY = null;
    }
    const area = gameAreaRef.current;
    if (area) {
      area.addEventListener('touchstart', onTouchStart, { passive: false });
      area.addEventListener('touchend', onTouchEnd, { passive: false });
    }
    return () => {
      if (area) {
        area.removeEventListener('touchstart', onTouchStart);
        area.removeEventListener('touchend', onTouchEnd);
      }
    }
  }, []);

  // Start or restart game
  // PUBLIC_INTERFACE
  const handleStart = () => {
    setSnake([{ x: 9, y: 9 }, { x: 8, y: 9 }]);
    setDirection('ArrowRight');
    setPendingDirection(null);
    setFood(getRandomCell([{ x: 9, y: 9 }, { x: 8, y: 9 }]));
    setScore(0);
    setGameOver(false);
    setRunning(true);
    setPaused(false);
  };

  // PUBLIC_INTERFACE
  const handlePauseResume = () => {
    if (!running) return;
    setPaused(p => !p);
  };

  // Button control helpers
  const isActive = running && !paused && !gameOver;

  // Game board rendering
  function renderCells() {
    // Generate blank cells, snake cells, food cell
    let rows = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      let cols = [];
      for (let x = 0; x < BOARD_SIZE; x++) {
        let isHead = snake[0].x === x && snake[0].y === y;
        let isBody = snake.slice(1).some(seg => seg.x === x && seg.y === y);
        let isFood = food.x === x && food.y === y;
        cols.push(
          <div
            key={x}
            className={
              (isHead ? "cell head"
                : isBody ? "cell body"
                  : isFood ? "cell food"
                    : "cell")
            }
            style={{ width: CELL_SIZE, height: CELL_SIZE }}
            aria-label={
              isHead ? 'snake head'
                : isBody ? 'snake body'
                  : isFood ? 'food'
                    : undefined
            }
          />
        );
      }
      rows.push(<div className="row" key={y}>{cols}</div>);
    }
    return rows;
  }

  return (
    <div className="snake-game-outer">
      <header className="snake-header">
        <h2 className="game-title">🐍 Snake Game</h2>
        <div className="score-area">
          Score: <span className="score-value">{score}</span>
        </div>
      </header>
      <div
        className="game-area"
        ref={gameAreaRef}
        tabIndex={0}
        aria-label="Snake game area"
        style={{
          outline: 'none',
          display: 'inline-block',
          background: 'var(--bg-secondary)',
          borderRadius: 15,
          border: `2px solid var(--border-color)`,
          padding: 12,
          margin: "auto",
          boxShadow: "0 2px 24px 2px #0002",
          transition: "background 0.15s"
        }}>
        <div
          className="game-board"
          style={{
            width: BOARD_SIZE * CELL_SIZE,
            height: BOARD_SIZE * CELL_SIZE,
            display: "flex",
            flexDirection: "column",
            background: "#fafafa",
            borderRadius: 10,
            overflow: "hidden",
            touchAction: "none",
            border: `1.5px solid var(--border-color)`
          }}
        >
          {renderCells()}
        </div>
        {gameOver && (
          <div className="game-overlay">
            <div className="overlay-content">
              <div className="over-title">Game Over</div>
              <div className="over-score">Your Score: {score}</div>
              <button className="game-btn big" onClick={handleStart}>Restart</button>
            </div>
          </div>
        )}
        {!running && !gameOver && (
          <div className="game-overlay">
            <div className="overlay-content">
              <div className="over-title">Ready?</div>
              <div className="over-score">Press <b>Enter</b> or tap Start!</div>
              <button className="game-btn big" onClick={handleStart}>Start</button>
            </div>
          </div>
        )}
        {paused && running && !gameOver && (
          <div className="game-overlay">
            <div className="overlay-content">
              <div className="over-title">Paused</div>
              <div className="over-score">Press <b>Space</b> or Resume!</div>
              <button className="game-btn big" onClick={handlePauseResume}>Resume</button>
            </div>
          </div>
        )}
      </div>
      <section className="controls-area" aria-label="Game controls">
        <button className="game-btn" onClick={running && !paused ? handlePauseResume : handleStart}>
          {gameOver ? 'Restart' : running ? (paused ? 'Resume' : 'Pause') : 'Start'}
        </button>
        <kbd className="kb">Arrows</kbd> <span className="kbd-desc">Move</span>
        <kbd className="kb">Space</kbd> <span className="kbd-desc">Pause</span>
        <kbd className="kb">Enter</kbd> <span className="kbd-desc">Start</span>
      </section>
      <section className="instructions">
        <strong>How to play:</strong> Use arrow keys (or swipe) to move. Eat food, avoid yourself!
      </section>
    </div>
  );
}

export default SnakeGame;
