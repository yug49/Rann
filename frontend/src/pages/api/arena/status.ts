import { NextApiRequest, NextApiResponse } from 'next';
import { gameStates } from './commands';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { battleId } = req.query;
  if (!battleId || typeof battleId !== 'string') {
    return res.status(400).json({ error: 'Battle ID is required' });
  }

  try {
    const gameState = gameStates.get(battleId);
    
    if (!gameState) {
      return res.status(404).json({ error: 'Battle not found' });
    }

    // Return only the state without consuming any commands
    return res.status(200).json({
      gameState: gameState
    });
  } catch (error) {
    console.error('Status API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
