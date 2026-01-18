
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import { 
  User, RotateCcw, Hash, History, Zap, Cpu, 
  BrainCircuit, Activity, ChevronRight, Target, Shield, HelpCircle, Sparkles, Loader2
} from 'lucide-react';
import { BotConfig } from '../App';

interface ChessGameProps {
  fen?: string;
  bot: BotConfig;
}

const ChessPiece = ({ type, isDragging }: { type: string, isDragging?: boolean }) => {
  const isWhite = type.startsWith('w');
  const piece = type.charAt(1).toLowerCase();
  const fill = isWhite ? "#FFFFFF" : "#0F172A";
  const stroke = isWhite ? "#0F172A" : "#FFFFFF";
  const strokeWidth = "1.2";

  const paths: Record<string, React.ReactElement> = {
    p: (<g><circle cx="12" cy="7" r="3" /><path d="M12 10c-2 0-3.5 1.5-3.5 3.5 0 1 .5 2 1.5 2.5V18h4v-2c1-.5 1.5-1.5 1.5-2.5 0-2-1.5-3.5-3.5-3.5z" /><path d="M8 20h8v-1c0-0.5-0.5-1-1-1H9c-0.5 0-1 0.5-1 1v1z" /></g>),
    n: (<g><path d="M15.5 17c0-3-1.5-5.5-3.5-7.5-1-1-1.5-2.5-1.5-4 0-1.1.9-2 2-2h1c1 0 1.5 1.5 1.5 1.5l1.5-1s-.5-2-3-2c-2.5 0-4.5 2-4.5 4.5 0 1.5.5 3 1.5 4l-2 3.5c-1 2-.5 4.5.5 5.5h8.5l-1-2.5z" /><path d="M9 19h6v1H9v-1z" fill={stroke} /><path d="M7.5 21h9v-1h-9v1z" /></g>),
    b: (<g><ellipse cx="12" cy="10" rx="3.5" ry="5" /><path d="M12 5v2M10.5 6h3" stroke={stroke} strokeWidth="1" /><path d="M13.5 8.5l-3 3" stroke={stroke} strokeWidth="1.5" /><path d="M9 19h6v-2.5c0-1-1-2-3-2s-3 1-3 2.5V19z" /><path d="M8 21h8v-1H8v1z" /></g>),
    r: (<g><path d="M7 4h2v2h2V4h2v2h2V4h2v5H7V4z" /><path d="M8 9h8v8H8V9z" /><path d="M7 17h10v3H7v-3z" /><path d="M6 21h12v-1H6v1z" /></g>),
    q: (<g><path d="M12 4.5L10 8H7l1.5 4L7 17h10l-1.5-5L17 8h-3l-2-3.5z" /><circle cx="12" cy="4" r="1.2" /><circle cx="7" cy="7.5" r="0.8" /><circle cx="17" cy="7.5" r="0.8" /><path d="M8 18h8v2H8v-2z" /><path d="M7 21h10v-1H7v1z" /></g>),
    k: (<g><path d="M12 2v3M10 3.5h4" stroke={stroke} strokeWidth="1.5" /><path d="M12 6c-2.5 0-4.5 2-4.5 4.5 0 2 1.5 3.5 2.5 4.5V18h4v-3c1-1 2.5-2.5 2.5-4.5 0-2.5-2-4.5-4.5-4.5z" /><path d="M8 19h8v2H8v-2z" /><path d="M7 21h10v-1H7v1z" /></g>)
  };

  return (
    <svg viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} className={`w-full h-full drop-shadow-lg transition-transform ${isDragging ? 'scale-125' : 'group-hover:scale-110'}`}>
      {paths[piece] || <circle cx="12" cy="12" r="8" fill="#ef4444" />}
    </svg>
  );
};

const ChessGame: React.FC<ChessGameProps> = ({ fen, bot }) => {
  const [game, setGame] = useState(new Chess(fen || undefined));
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<number>(0.0);
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [turnToAsk, setTurnToAsk] = useState<boolean>(!!fen);
  
  const stockfishRef = useRef<Worker | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((window as any).Stockfish) {
      const worker = new (window as any).Stockfish();
      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.startsWith('info depth')) {
          const scoreMatch = msg.match(/score cp (-?\d+)/);
          if (scoreMatch) setEvaluation((game.turn() === 'w' ? parseInt(scoreMatch[1]) : -parseInt(scoreMatch[1])) / 100);
          const pvMatch = msg.match(/pv (\w+)/);
          if (pvMatch) setBestMove(pvMatch[1]);
        } else if (msg.startsWith('bestmove')) {
          const moveStr = msg.split(' ')[1];
          if (game.turn() === 'b' && !game.isGameOver() && !turnToAsk) makeMove(moveStr);
          setIsThinking(false);
        }
      };
      stockfishRef.current = worker;
      worker.postMessage('uci');
      // Adjust difficulty based on Bot ELO
      worker.postMessage(`setoption name Skill Level value ${Math.min(20, Math.floor(bot.elo / 200))}`);
    }
    return () => stockfishRef.current?.terminate();
  }, [game, bot, turnToAsk]);

  useEffect(() => {
    if (stockfishRef.current && !turnToAsk) {
      stockfishRef.current.postMessage(`position fen ${game.fen()}`);
      if (game.turn() === 'b') {
        setIsThinking(true);
        // Time taken correlates with difficulty
        const moveTime = bot.id === 'boss' ? 2000 : 500;
        stockfishRef.current.postMessage(`go movetime ${moveTime}`);
      } else {
        stockfishRef.current.postMessage('go depth 12');
      }
    }
    setMoveHistory(game.history());
  }, [game, bot, turnToAsk]);

  const makeMove = (move: string | { from: string, to: string, promotion: string }) => {
    try {
      const newGame = new Chess(game.fen());
      if (newGame.move(move)) {
        setGame(newGame);
        setSelectedSquare(null);
        return true;
      }
    } catch (e) {}
    return false;
  };

  const onPointerDown = (e: React.PointerEvent, square: Square) => {
    if (turnToAsk || game.turn() === 'b') return;
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setDraggedSquare(square);
      setSelectedSquare(square);
      setDragPosition({ x: e.clientX, y: e.clientY });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggedSquare || !boardRef.current) return;
    const boardRect = boardRef.current.getBoundingClientRect();
    const x = e.clientX - boardRect.left;
    const y = e.clientY - boardRect.top;
    if (x >= 0 && x <= boardRect.width && y >= 0 && y <= boardRect.height) {
      const col = Math.floor((x / boardRect.width) * 8);
      const row = Math.floor((y / boardRect.height) * 8);
      const target = String.fromCharCode(97 + col) + (8 - row) as Square;
      if (target !== draggedSquare) makeMove({ from: draggedSquare, to: target, promotion: 'q' });
    }
    setDraggedSquare(null);
  };

  const boardData = useMemo(() => {
    const squares = [];
    const board = game.board();
    const validMoves = selectedSquare ? game.moves({ square: selectedSquare, verbose: true }).map(m => m.to) : [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = String.fromCharCode(97 + c) + (8 - r) as Square;
        squares.push({
          name: sq,
          piece: board[r][c] ? `${board[r][c].color}${board[r][c].type}` : null,
          isDark: (r + c) % 2 !== 0,
          isSelected: selectedSquare === sq,
          isValidTarget: validMoves.includes(sq),
          isBeingDragged: draggedSquare === sq
        });
      }
    }
    return squares;
  }, [game, selectedSquare, draggedSquare]);

  const evalHeight = Math.min(Math.max(50 + (evaluation * 5), 5), 95);

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto p-4 md:p-10 animate-in fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="hidden lg:flex lg:col-span-1 flex-col h-[600px] bg-slate-950 rounded-full w-4 overflow-hidden border border-slate-800 relative self-center shadow-2xl">
          <div className="absolute bottom-0 w-full bg-sky-500 transition-all duration-1000" style={{ height: `${evalHeight}%` }} />
        </div>

        <div className="lg:col-span-7 flex flex-col gap-6">
          <div ref={boardRef} className="relative aspect-square bg-slate-950 p-4 rounded-3xl border border-slate-800 shadow-2xl select-none touch-none">
            {turnToAsk && (
              <div className="absolute inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-8">
                <div className="bg-slate-900 border border-slate-700 p-10 rounded-[40px] shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full">
                  <h3 className="text-2xl font-black uppercase text-white">Initialize Turn</h3>
                  <p className="text-slate-400 text-center">Whose turn is it in this position?</p>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <button onClick={() => { const parts = game.fen().split(' '); parts[1] = 'w'; setGame(new Chess(parts.join(' '))); setTurnToAsk(false); }} className="py-4 bg-white text-slate-900 font-black rounded-2xl uppercase">White</button>
                    <button onClick={() => { const parts = game.fen().split(' '); parts[1] = 'b'; setGame(new Chess(parts.join(' '))); setTurnToAsk(false); }} className="py-4 bg-slate-800 text-white font-black rounded-2xl border border-slate-700 uppercase">Black</button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-xl overflow-hidden border-4 border-slate-900">
              {boardData.map((sq) => (
                <div key={sq.name}
                  onPointerDown={(e) => onPointerDown(e, sq.name)}
                  onPointerUp={onPointerUp}
                  onPointerMove={(e) => draggedSquare && setDragPosition({ x: e.clientX, y: e.clientY })}
                  onClick={() => !draggedSquare && selectedSquare && makeMove({ from: selectedSquare, to: sq.name, promotion: 'q' })}
                  className={`relative flex items-center justify-center ${sq.isDark ? 'bg-slate-700/80' : 'bg-slate-300'} ${sq.isSelected ? 'ring-inset ring-4 ring-sky-500' : ''}`}
                >
                  {sq.isValidTarget && <div className="absolute w-4 h-4 rounded-full bg-sky-500/40 z-10" />}
                  {sq.piece && !sq.isBeingDragged && <ChessPiece type={sq.piece} />}
                </div>
              ))}
            </div>

            {draggedSquare && (
              <div className="fixed pointer-events-none z-[100] w-12 h-12 md:w-16 md:h-16 -translate-x-1/2 -translate-y-1/2" style={{ left: dragPosition.x, top: dragPosition.y }}>
                <ChessPiece type={game.get(draggedSquare).color + game.get(draggedSquare).type} isDragging />
              </div>
            )}

            <div className="absolute -top-4 -left-4 z-30 px-6 py-2 bg-slate-900/90 rounded-2xl border border-slate-700 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${game.turn() === 'w' ? 'bg-white shadow-lg' : 'bg-sky-500 shadow-lg'}`} />
              <span className="text-[11px] font-black uppercase tracking-widest">{game.turn() === 'w' ? 'Your Move' : `${bot.name} is Thinking...`}</span>
            </div>

            <div className="absolute -top-4 -right-4 z-30">
              <div className={`flex items-center gap-3 px-6 py-2 rounded-2xl border bg-slate-800 text-slate-100 border-slate-700 shadow-2xl`}>
                {isThinking ? <Loader2 className="w-4 h-4 animate-spin text-sky-400" /> : <Cpu className="w-4 h-4" />}
                <span className="text-[11px] font-black uppercase">{bot.name} (ELO {bot.elo})</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-900/80 p-8 rounded-[40px] border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-6">
              <Target className="w-6 h-6 text-sky-500" />
              <h3 className="text-[11px] font-black uppercase tracking-widest">Opponent Intel</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                <div className={`p-2 rounded-lg bg-slate-800 ${bot.color}`}>{bot.icon}</div>
                <div>
                  <p className="font-black text-white">{bot.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{bot.id === 'boss' ? 'Transcendent' : 'Active Bot'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">Position Eval</span>
                  <span className="text-xl font-mono font-black">{evaluation > 0 ? `+${evaluation.toFixed(1)}` : evaluation.toFixed(1)}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">Bot Best PV</span>
                  <span className="text-xl font-mono font-black text-emerald-400 uppercase">{bestMove || "..."}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-[40px] border border-slate-800 flex flex-col flex-grow shadow-2xl overflow-hidden min-h-[300px]">
            <div className="p-8 pb-4 border-b border-slate-800 flex items-center gap-4">
              <History className="w-5 h-5 text-emerald-500" />
              <h3 className="text-[11px] font-black uppercase tracking-widest">Match Sequence</h3>
            </div>
            <div className="flex-grow overflow-y-auto p-6 space-y-2 max-h-[350px]">
              {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50">
                  <span className="text-slate-700 text-[10px] font-mono font-black w-8">{(i + 1).toString().padStart(2, '0')}</span>
                  <div className="flex-grow grid grid-cols-2 gap-4">
                    <span className="font-mono font-black text-slate-100 text-lg">{moveHistory[i * 2]}</span>
                    {moveHistory[i * 2 + 1] && <span className="font-mono font-black text-sky-500 text-lg">{moveHistory[i * 2 + 1]}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessGame;
