import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

// Game constants
const GRID_SIZE = 20
const CELL_SIZE = 20
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 }
]
const INITIAL_DIRECTION = 'RIGHT'
const INITIAL_GAME_SPEED = 150 // milliseconds
const SPEED_INCREASE_PER_LEVEL = 10 // milliseconds

// Types
type Position = {
  x: number
  y: number
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

type PowerUpType = 'SPEED' | 'INVINCIBLE' | 'DOUBLE_POINTS' | 'SHRINK'

type PowerUp = {
  position: Position
  type: PowerUpType
  duration: number // in seconds
  active: boolean
}

type Obstacle = {
  position: Position
  type: 'WALL' | 'SPIKE'
}

function App() {
  // Game state
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE)
  const [food, setFood] = useState<Position>({ x: 15, y: 15 })
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [level, setLevel] = useState(1)
  const [gameSpeed, setGameSpeed] = useState(INITIAL_GAME_SPEED)
  const [powerUps, setPowerUps] = useState<PowerUp[]>([])
  const [activePowerUps, setActivePowerUps] = useState<{[key in PowerUpType]?: number}>({})
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [isInvincible, setIsInvincible] = useState(false)
  const [isDoublePoints, setIsDoublePoints] = useState(false)
  const [highScore, setHighScore] = useState(0)
  const [gamePaused, setGamePaused] = useState(false)
  const [girlyMode, setGirlyMode] = useState(false)
  
  // Refs
  const gameLoopRef = useRef<number | null>(null)
  const powerUpSpawnTimerRef = useRef<number | null>(null)
  const powerUpDurationTimerRef = useRef<{[key in PowerUpType]?: number}>({})
  
  // Load high score from localStorage
  useEffect(() => {
    const savedHighScore = localStorage.getItem('snakeHighScore')
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore))
    }
    
    // Load girly mode preference
    const savedGirlyMode = localStorage.getItem('snakeGirlyMode')
    if (savedGirlyMode) {
      setGirlyMode(savedGirlyMode === 'true')
    }
  }, [])
  
  // Save high score to localStorage
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem('snakeHighScore', score.toString())
    }
  }, [score, highScore])
  
  // Save girly mode preference
  useEffect(() => {
    localStorage.setItem('snakeGirlyMode', girlyMode.toString())
  }, [girlyMode])
  
  // Generate random food position
  const generateFood = useCallback((): Position => {
    let newFood: Position
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      }
    } while (
      snake.some(segment => segment.x === newFood.x && segment.y === newFood.y) ||
      obstacles.some(obstacle => obstacle.position.x === newFood.x && obstacle.position.y === newFood.y) ||
      powerUps.some(powerUp => powerUp.position.x === newFood.x && powerUp.position.y === newFood.y)
    )
    return newFood
  }, [snake, obstacles, powerUps])
  
  // Generate random power-up
  const generatePowerUp = useCallback((): PowerUp => {
    let position: Position
    do {
      position = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      }
    } while (
      snake.some(segment => segment.x === position.x && segment.y === position.y) ||
      obstacles.some(obstacle => obstacle.position.x === position.x && obstacle.position.y === position.y) ||
      powerUps.some(powerUp => powerUp.position.x === position.x && powerUp.position.y === position.y) ||
      (food.x === position.x && food.y === position.y)
    )
    
    const types: PowerUpType[] = ['SPEED', 'INVINCIBLE', 'DOUBLE_POINTS', 'SHRINK']
    const type = types[Math.floor(Math.random() * types.length)]
    
    return {
      position,
      type,
      duration: 5, // 5 seconds
      active: true
    }
  }, [snake, obstacles, powerUps, food])
  
  // Generate obstacles based on level
  const generateObstacles = useCallback((): Obstacle[] => {
    const newObstacles: Obstacle[] = []
    const obstacleCount = Math.min(level * 2, 10) // Max 10 obstacles
    
    for (let i = 0; i < obstacleCount; i++) {
      let position: Position
      do {
        position = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE)
        }
      } while (
        snake.some(segment => segment.x === position.x && segment.y === position.y) ||
        newObstacles.some(obstacle => obstacle.position.x === position.x && obstacle.position.y === position.y) ||
        (food.x === position.x && food.y === position.y)
      )
      
      const type = Math.random() > 0.5 ? 'WALL' : 'SPIKE'
      newObstacles.push({ position, type })
    }
    
    return newObstacles
  }, [snake, food, level])
  
  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted) {
        setGameStarted(true)
        return
      }
      
      if (gameOver) return
      
      // Pause game with 'P' key
      if (e.key === 'p' || e.key === 'P') {
        setGamePaused(prev => !prev)
        return
      }
      
      if (gamePaused) return
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (direction !== 'DOWN') setDirection('UP')
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          if (direction !== 'UP') setDirection('DOWN')
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (direction !== 'RIGHT') setDirection('LEFT')
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (direction !== 'LEFT') setDirection('RIGHT')
          break
        default:
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [direction, gameOver, gameStarted, gamePaused])
  
  // Power-up spawn timer
  useEffect(() => {
    if (!gameStarted || gameOver || gamePaused) return
    
    const spawnPowerUp = () => {
      if (powerUps.length < 2) { // Max 2 power-ups at once
        setPowerUps(prev => [...prev, generatePowerUp()])
      }
    }
    
    // Spawn power-up every 15-30 seconds
    const spawnInterval = Math.random() * 15000 + 15000
    powerUpSpawnTimerRef.current = window.setTimeout(spawnPowerUp, spawnInterval)
    
    return () => {
      if (powerUpSpawnTimerRef.current) {
        clearTimeout(powerUpSpawnTimerRef.current)
      }
    }
  }, [gameStarted, gameOver, gamePaused, powerUps, generatePowerUp])
  
  // Power-up duration timers
  useEffect(() => {
    if (!gameStarted || gameOver || gamePaused) return
    
    const timers: {[key in PowerUpType]?: number} = {}
    
    // Set up timers for active power-ups
    Object.entries(activePowerUps).forEach(([type, endTime]) => {
      if (endTime && endTime > Date.now()) {
        timers[type as PowerUpType] = window.setTimeout(() => {
          setActivePowerUps(prev => {
            const newPowerUps = { ...prev }
            delete newPowerUps[type as PowerUpType]
            return newPowerUps
          })
          
          // Reset power-up effects
          if (type === 'SPEED') {
            setGameSpeed(INITIAL_GAME_SPEED - (level - 1) * SPEED_INCREASE_PER_LEVEL)
          } else if (type === 'INVINCIBLE') {
            setIsInvincible(false)
          } else if (type === 'DOUBLE_POINTS') {
            setIsDoublePoints(false)
          }
        }, endTime - Date.now())
      }
    })
    
    powerUpDurationTimerRef.current = timers
    
    return () => {
      Object.values(timers).forEach(timer => {
        if (timer) clearTimeout(timer)
      })
    }
  }, [gameStarted, gameOver, gamePaused, activePowerUps, level])
  
  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver || gamePaused) return
    
    const moveSnake = () => {
      setSnake(prevSnake => {
        const head = { ...prevSnake[0] }
        
        // Move head based on direction
        switch (direction) {
          case 'UP':
            head.y -= 1
            break
          case 'DOWN':
            head.y += 1
            break
          case 'LEFT':
            head.x -= 1
            break
          case 'RIGHT':
            head.x += 1
            break
        }
        
        // Wrap around the screen when hitting walls
        if (head.x < 0) head.x = GRID_SIZE - 1
        if (head.x >= GRID_SIZE) head.x = 0
        if (head.y < 0) head.y = GRID_SIZE - 1
        if (head.y >= GRID_SIZE) head.y = 0
        
        // Check for collisions with obstacles
        const hitObstacle = obstacles.some(obstacle => 
          obstacle.position.x === head.x && obstacle.position.y === head.y
        )
        
        if (hitObstacle && !isInvincible) {
          setGameOver(true)
          return prevSnake
        }
        
        // Check for collisions with self
        if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y) && !isInvincible) {
          setGameOver(true)
          return prevSnake
        }
        
        // Check if snake ate food
        const ateFood = head.x === food.x && head.y === food.y
        
        // Check if snake ate power-up
        const atePowerUp = powerUps.find(powerUp => 
          powerUp.position.x === head.x && powerUp.position.y === head.y && powerUp.active
        )
        
        // Create new snake
        const newSnake = [head, ...prevSnake]
        
        // If snake didn't eat food, remove the tail
        if (!ateFood) {
          newSnake.pop()
        } else {
          // If snake ate food, generate new food and increase score
          setFood(generateFood())
          const pointsToAdd = isDoublePoints ? 2 : 1
          setScore(prevScore => prevScore + pointsToAdd)
          
          // Check if level up
          if (score > 0 && score % 5 === 0 && level < 10) {
            setLevel(prevLevel => prevLevel + 1)
            setGameSpeed(prevSpeed => Math.max(prevSpeed - SPEED_INCREASE_PER_LEVEL, 50))
            setObstacles(generateObstacles())
          }
        }
        
        // Handle power-up effects
        if (atePowerUp) {
          // Remove the power-up
          setPowerUps(prev => prev.filter(p => 
            !(p.position.x === atePowerUp.position.x && p.position.y === atePowerUp.position.y)
          ))
          
          // Apply power-up effect
          const endTime = Date.now() + atePowerUp.duration * 1000
          setActivePowerUps(prev => ({
            ...prev,
            [atePowerUp.type]: endTime
          }))
          
          // Apply immediate effects
          switch (atePowerUp.type) {
            case 'SPEED':
              setGameSpeed(prevSpeed => Math.max(prevSpeed / 2, 50))
              break
            case 'INVINCIBLE':
              setIsInvincible(true)
              break
            case 'DOUBLE_POINTS':
              setIsDoublePoints(true)
              break
            case 'SHRINK':
              // Remove half of the snake segments
              const segmentsToRemove = Math.floor(newSnake.length / 2)
              newSnake.splice(-segmentsToRemove)
              break
          }
        }
        
        return newSnake
      })
    }
    
    gameLoopRef.current = window.setInterval(moveSnake, gameSpeed)
    
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }
  }, [direction, food, gameOver, gameStarted, gamePaused, gameSpeed, obstacles, powerUps, isInvincible, isDoublePoints, generateFood, generateObstacles, score, level])
  
  // Reset game
  const resetGame = () => {
    setSnake(INITIAL_SNAKE)
    setDirection(INITIAL_DIRECTION)
    setFood(generateFood())
    setGameOver(false)
    setScore(0)
    setGameStarted(false)
    setLevel(1)
    setGameSpeed(INITIAL_GAME_SPEED)
    setPowerUps([])
    setActivePowerUps({})
    setObstacles([])
    setIsInvincible(false)
    setIsDoublePoints(false)
    setGamePaused(false)
  }
  
  // Render game board
  const renderBoard = () => {
    const board = []
    
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isSnake = snake.some(segment => segment.x === x && segment.y === y)
        const isSnakeHead = snake[0].x === x && snake[0].y === y
        const isFood = food.x === x && food.y === y
        const powerUp = powerUps.find(p => p.position.x === x && p.position.y === y && p.active)
        const obstacle = obstacles.find(o => o.position.x === x && o.position.y === y)
        
        let cellClass = 'cell'
        if (isSnake) cellClass += ' snake'
        if (isSnakeHead) cellClass += ' snake-head'
        if (isFood) cellClass += ' food'
        if (powerUp) cellClass += ` power-up power-up-${powerUp.type.toLowerCase()}`
        if (obstacle) cellClass += ` obstacle obstacle-${obstacle.type.toLowerCase()}`
        if (girlyMode) cellClass += ' girly-mode'
        
        let cellContent = null
        
        // Add animal-themed content for girly mode
        if (girlyMode) {
          if (isSnakeHead) {
            cellContent = <span className="snake-head-content">👀</span>
          } else if (isFood) {
            cellContent = <span className="food-content">🍎</span>
          } else if (powerUp) {
            cellContent = <span className="power-up-content">{getPowerUpIcon(powerUp.type)}</span>
          } else if (obstacle) {
            if (obstacle.type === 'WALL') {
              cellContent = <span className="obstacle-content">🌺</span>
            } else if (obstacle.type === 'SPIKE') {
              cellContent = <span className="obstacle-content">🌵</span>
            }
          }
        }
        
        board.push(
          <div 
            key={`${x}-${y}`} 
            className={cellClass}
            style={{ 
              gridColumn: x + 1, 
              gridRow: y + 1,
              width: CELL_SIZE,
              height: CELL_SIZE,
              position: 'relative'
            }}
          >
            {cellContent}
          </div>
        )
      }
    }
    
    return board
  }
  
  // Get power-up icon
  const getPowerUpIcon = (type: PowerUpType) => {
    if (girlyMode) {
      switch (type) {
        case 'SPEED':
          return '🐰'; // Rabbit for speed
        case 'INVINCIBLE':
          return '🦄'; // Unicorn for invincibility
        case 'DOUBLE_POINTS':
          return '🦋'; // Butterfly for double points
        case 'SHRINK':
          return '🐢'; // Turtle for shrink
        default:
          return '❓';
      }
    } else {
      switch (type) {
        case 'SPEED':
          return '⚡';
        case 'INVINCIBLE':
          return '🛡️';
        case 'DOUBLE_POINTS':
          return '2️⃣';
        case 'SHRINK':
          return '📏';
        default:
          return '❓';
      }
    }
  }
  
  // Toggle girly mode
  const toggleGirlyMode = () => {
    setGirlyMode(prev => !prev)
  }

  return (
    <div className={`game-container ${girlyMode ? 'girly-mode' : ''}`}>
      <div className="game-header">
        <h1>{girlyMode ? '🐍 Snake Game 🌸' : 'Snake Game'}</h1>
        <div className="game-stats">
          <div className="stat">
            <span className="stat-label">Score:</span>
            <span className="stat-value">{girlyMode ? '🌟 ' : ''}{score}</span>
          </div>
          <div className="stat">
            <span className="stat-label">High Score:</span>
            <span className="stat-value">{girlyMode ? '👑 ' : ''}{highScore}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Level:</span>
            <span className="stat-value">{girlyMode ? '🎀 ' : ''}{level}</span>
          </div>
        </div>
      </div>
      
      <div className="game-info">
        {gameOver && <p className="game-over">{girlyMode ? '😢 Game Over!' : 'Game Over!'}</p>}
        {!gameStarted && !gameOver && <p className="start-message">{girlyMode ? '🐰 Press any key to start' : 'Press any key to start'}</p>}
        {gamePaused && <p className="paused-message">{girlyMode ? '😴 Game Paused - Press P to resume' : 'Game Paused - Press P to resume'}</p>}
      </div>
      
      <div className="active-power-ups">
        {Object.keys(activePowerUps).map(type => (
          <div key={type} className="active-power-up">
            <span className="power-up-icon">{getPowerUpIcon(type as PowerUpType)}</span>
            <span className="power-up-timer">
              {Math.ceil((activePowerUps[type as PowerUpType]! - Date.now()) / 1000)}s
            </span>
          </div>
        ))}
      </div>
      
      <div 
        className="game-board"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          gap: '1px',
          backgroundColor: girlyMode ? '#fce4ec' : '#222',
          border: `2px solid ${girlyMode ? '#f48fb1' : '#333'}`,
          padding: '10px',
          borderRadius: '5px',
          position: 'relative'
        }}
      >
        {renderBoard()}
      </div>
      
      <div className="controls">
        <div className="button-group">
          <button onClick={resetGame} className="reset-button">{girlyMode ? '🦊 Reset Game' : 'Reset Game'}</button>
          <button 
            onClick={() => setGamePaused(prev => !prev)} 
            className="pause-button"
            disabled={!gameStarted || gameOver}
          >
            {gamePaused ? (girlyMode ? '🐱 Pause' : 'Pause') : (girlyMode ? '🐱 Resume' : 'Resume')}
          </button>
          <button 
            onClick={toggleGirlyMode} 
            className={`theme-button ${girlyMode ? 'girly-active' : ''}`}
          >
            {girlyMode ? '🦄 Girly Mode' : '🎮 Normal Mode'}
        </button>
        </div>
        
        <div className="instructions">
          <p>Use WASD or arrow keys to control the snake</p>
          <p>Press P to pause/resume</p>
          <div className="power-up-legend">
            <div className="legend-item">
              <span className="legend-icon power-up-speed">{girlyMode ? '🐰' : '⚡'}</span>
              <span>Speed Boost</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon power-up-invincible">{girlyMode ? '🦄' : '🛡️'}</span>
              <span>Invincibility</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon power-up-double_points">{girlyMode ? '🦋' : '2️⃣'}</span>
              <span>Double Points</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon power-up-shrink">{girlyMode ? '🐢' : '📏'}</span>
              <span>Shrink</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
