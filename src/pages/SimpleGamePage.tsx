import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Coins, Trophy, RefreshCcw, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
type Cell = {
  id: number;
  row: number;
  col: number;
  hasToken: boolean;
  revealed: boolean;
  neighborTokens: number;
};

type GameState = 'idle' | 'playing' | 'won' | 'lost';

// Configuration
const GRID_SIZE = 6;
const TOKEN_COUNT = 8;
const GAME_DURATION = 60; // seconds

export default function SimpleGamePage() {
  const [grid, setGrid] = useState<Cell[]>([]);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [foundTokens, setFoundTokens] = useState(0);
  const [score, setScore] = useState(0);

  // Initialize Game
  const startNewGame = useCallback(() => {
    const newGrid: Cell[] = [];
    const totalCells = GRID_SIZE * GRID_SIZE;
    
    // 1. Create empty cells
    for (let i = 0; i < totalCells; i++) {
      newGrid.push({
        id: i,
        row: Math.floor(i / GRID_SIZE),
        col: i % GRID_SIZE,
        hasToken: false,
        revealed: false,
        neighborTokens: 0,
      });
    }

    // 2. Place tokens randomly
    let tokensPlaced = 0;
    while (tokensPlaced < TOKEN_COUNT) {
      const idx = Math.floor(Math.random() * totalCells);
      if (!newGrid[idx].hasToken) {
        newGrid[idx].hasToken = true;
        tokensPlaced++;
      }
    }

    // 3. Calculate neighbors
    for (let i = 0; i < totalCells; i++) {
      if (newGrid[i].hasToken) continue;

      const row = newGrid[i].row;
      const col = newGrid[i].col;
      let count = 0;

      // Check all 8 neighbors
      for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
          if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            const neighborIdx = r * GRID_SIZE + c;
            if (newGrid[neighborIdx].hasToken) count++;
          }
        }
      }
      newGrid[i].neighborTokens = count;
    }

    setGrid(newGrid);
    setGameState('playing');
    setTimeLeft(GAME_DURATION);
    setFoundTokens(0);
    setScore(0);
  }, []);

  // Timer Logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('lost');
      toast.error('时间到！挑战失败');
      revealAll();
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  // Win Condition
  useEffect(() => {
    if (gameState === 'playing' && foundTokens === TOKEN_COUNT) {
      setGameState('won');
      toast.success('恭喜！找到所有代币！');
      revealAll();
    }
  }, [foundTokens, gameState]);

  const revealAll = () => {
    setGrid((prev) => prev.map((cell) => ({ ...cell, revealed: true })));
  };

  const handleCellClick = (cell: Cell) => {
    if (gameState !== 'playing' || cell.revealed) return;

    const newGrid = [...grid];
    const currentCell = newGrid[cell.id];
    
    currentCell.revealed = true;

    if (currentCell.hasToken) {
      setFoundTokens((prev) => prev + 1);
      setScore((prev) => prev + 100);
      toast.success(`找到代币！ (+100分)`);
    } else {
      // Flood fill if 0 neighbors
      if (currentCell.neighborTokens === 0) {
        const stack = [currentCell];
        while (stack.length > 0) {
          const c = stack.pop()!;
          const neighbors = getNeighbors(c, newGrid);
          
          for (const n of neighbors) {
            if (!n.revealed && !n.hasToken) {
              n.revealed = true;
              if (n.neighborTokens === 0) {
                stack.push(n);
              }
            }
          }
        }
      }
    }

    setGrid(newGrid);
  };

  const getNeighbors = (cell: Cell, currentGrid: Cell[]) => {
    const neighbors: Cell[] = [];
    for (let r = cell.row - 1; r <= cell.row + 1; r++) {
      for (let c = cell.col - 1; c <= cell.col + 1; c++) {
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          if (r === cell.row && c === cell.col) continue;
          neighbors.push(currentGrid[r * GRID_SIZE + c]);
        }
      }
    }
    return neighbors;
  };

  const getNumberColor = (num: number) => {
    switch (num) {
      case 1: return 'text-blue-400';
      case 2: return 'text-green-400';
      case 3: return 'text-red-400';
      case 4: return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-purple-500/20 bg-slate-900/80 backdrop-blur-sm text-slate-100">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl flex items-center justify-center gap-2 text-purple-400">
            <Coins className="w-6 h-6" />
            寻宝扫雷
          </CardTitle>
          <CardDescription className="text-slate-400">
            根据数字提示找到所有隐藏的代币
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Stats Bar */}
          <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="font-mono text-lg">{score}</span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-purple-400" />
              <span className="font-mono text-lg">{foundTokens}/{TOKEN_COUNT}</span>
            </div>
            <div className={cn(
              "flex items-center gap-2 font-mono text-lg",
              timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-green-500"
            )}>
              <Timer className="w-4 h-4" />
              <span>{timeLeft}s</span>
            </div>
          </div>

          {/* Game Grid */}
          <div 
            className="grid gap-1 mx-auto w-fit bg-slate-800 p-2 rounded-lg border border-slate-700"
            style={{ 
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` 
            }}
          >
            {grid.map((cell) => (
              <button
                key={cell.id}
                onClick={() => handleCellClick(cell)}
                disabled={gameState !== 'playing' || cell.revealed}
                className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-lg font-bold rounded transition-all duration-200",
                  !cell.revealed && "bg-slate-700 hover:bg-slate-600 active:scale-95 border-b-4 border-slate-900",
                  cell.revealed && "bg-slate-900 border border-slate-800 cursor-default",
                  cell.revealed && cell.hasToken && "bg-yellow-500/20 border-yellow-500/50"
                )}
              >
                {cell.revealed && (
                  cell.hasToken ? (
                    <Coins className="w-6 h-6 text-yellow-500 animate-bounce" />
                  ) : (
                    cell.neighborTokens > 0 && (
                      <span className={getNumberColor(cell.neighborTokens)}>
                        {cell.neighborTokens}
                      </span>
                    )
                  )
                )}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3">
            {gameState === 'idle' && (
              <Button onClick={startNewGame} size="lg" className="w-full bg-purple-600 hover:bg-purple-700 font-bold text-lg">
                开始挑战
              </Button>
            )}
            
            {(gameState === 'won' || gameState === 'lost') && (
              <div className="space-y-3 text-center animate-in fade-in slide-in-from-bottom-4">
                <div className={cn(
                  "text-xl font-bold",
                  gameState === 'won' ? "text-green-400" : "text-red-400"
                )}>
                  {gameState === 'won' ? '挑战成功！' : '挑战失败'}
                </div>
                <p className="text-sm text-slate-400">
                  截图保存当前页面可作为任务完成凭证
                </p>
                <Button onClick={startNewGame} variant="outline" className="w-full border-purple-500/50 hover:bg-purple-500/10">
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  再玩一次
                </Button>
              </div>
            )}
            
            {gameState === 'playing' && (
               <Button onClick={startNewGame} variant="ghost" size="sm" className="w-full text-slate-500 hover:text-slate-300">
                 <RefreshCcw className="w-3 h-3 mr-2" />
                 重置游戏
               </Button>
            )}
          </div>
          
          <div className="text-xs text-center text-slate-500 px-4">
            <p>玩法说明：点击方块寻找代币。数字表示周围8个方块中隐藏的代币数量。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
