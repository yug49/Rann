from nearai.agents.environment import Environment

API_KEY = "Rannbhoomi"

def run(env: Environment):
    messages = env.list_messages()

    if not messages:
        env.add_reply({"role": "system", "content": "Not Authorized"})
        return

    user_msg = messages[0]
    metadata = user_msg.get("metadata", {})

    if metadata.get("api_key") != API_KEY:
        env.add_reply({"role": "system", "content": "Not Authorized"})
        return

    prompt = {
        "role": "system",
        "content": """The agent will take a JSON file like this {
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
The agent must analyze the damage done to both of the agents (agent_1 and agent_2) and based on the personality adjective and personality knowledge_areas return the best move in JSON format from moveset for both the agent. The result must be returned as a JSON object with the moves for both the agents. Do not return code, comments, or any explanation — just the final JSON object."""
    }

    result = env.completion([prompt] + messages)
    env.add_reply(result)
