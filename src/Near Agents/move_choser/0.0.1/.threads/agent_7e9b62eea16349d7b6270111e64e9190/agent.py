from nearai.agents.environment import Environment


def run(env: Environment):
    # Your agent code here
    prompt = {"role": "system","content": """The agent will take a JSON file like this {
    "current_round": 3,
    "agent_1": {
        "personality": {
            "adjectives": [
                "Visionary",
                "Ambitious",
                "Perfectionistic",
                "Risk-taking",
                "Intellectually curious"
            ],
            "knowledge_areas": [
                "Renewable energy",
                "Space exploration",
                "Electric vehicles",
                "Artificial intelligence",
                "Entrepreneurship"
            ]
        },
        "traits": {
            "Strength": 8000,
            "Wit": 9500,
            "Charisma": 8500,
            "Defence": 7000,
            "Luck": 6000
        },
        "total_damage_received": 45
    },
    "agent_2": {
        "personality": {
            "adjectives": [
                "Pragmatic",
                "Calm",
                "Analytical",
                "Empathetic",
                "Persistent"
            ],
            "knowledge_areas": [
                "Cybersecurity",
                "Philosophy of mind",
                "Quantum computing",
                "Distributed systems",
                "Emotional intelligence"
            ]
        },
        "traits": {
            "Strength": 7200,
            "Wit": 9800,
            "Charisma": 8700,
            "Defence": 7500,
            "Luck": 6200
        },
        "total_damage_received": 30
    },
    "moveset": [
        "strike",
        "taunt",
        "dodge",
        "recover",
        "special_move"
    ]
}
The agent must analyze the damage done to both of the agents (agent_1 and agent_2) and based on the personality adjective and personality knowledge_areas return the best move in JSON format from moveset for both the agent. Only return the move in JSON format for agent_1 and agent_2 and nothing else."""}
    result = env.completion([prompt] + env.list_messages())
    env.add_reply(result)

run(env)

