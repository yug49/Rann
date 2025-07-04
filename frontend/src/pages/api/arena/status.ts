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
    
    // Return 200 with null gameState instead of 404 to prevent useArenaSync errors
    // This endpoint is for reading state only, not consuming commands
    return res.status(200).json({
      gameState: gameState || null
    });
  } catch (error) {
    console.error('Status API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
