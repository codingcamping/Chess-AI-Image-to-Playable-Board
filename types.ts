
export interface ChessPosition {
  fen: string;
  status: string;
}

export enum PieceColor {
  White = 'w',
  Black = 'b'
}

export interface DetectionResult {
  fen: string;
  explanation: string;
}
