from nearai.agents.environment import Environment


def run(env: Environment):
    # Your agent code here
    prompt = {"role": "system", "content": """The agent will take the json file like this {
    "stats": {
        "Strength": 8231,
        "Wit": 9471,
        "Charisma": 5932,
        "Defence": 7519,
        "Luck": 4211
    },
    "questions": [
        {
        "question": "Your mother and your child are both drowning, but you can only save one. Who do you save?",
        "options": [
            { "id": 0, "text": "My mother — she gave me life" },
            { "id": 1, "text": "My child — they represent the future" },
            { "id": 2, "text": "I'd try to save both, even if it risks losing both" },
            { "id": 3, "text": "I wouldn't be able to decide — I'd freeze" }
        ],
        "answered": 2
        },
        {
        "question": "You find a wallet with $10,000 and the ID of the owner inside. What do you do?",
        "options": [
            { "id": 0, "text": "Return it with all the money untouched" },
            { "id": 1, "text": "Keep some of the money, then return it" },
            { "id": 2, "text": "Keep it all — finders keepers" },
            { "id": 3, "text": "Try to contact the owner anonymously and decide after hearing their story" }
        ],
        "answered": 3
        },
        {
        "question": "A train is heading toward five people tied to a track. You can pull a lever to divert it, but it will hit one person on another track. What do you do?",
        "options": [
            { "id": 0, "text": "Pull the lever — save the greater number" },
            { "id": 1, "text": "Do nothing — I won’t actively cause a death" },
            { "id": 2, "text": "Try to stop the train — even if unlikely" },
            { "id": 3, "text": "Refuse to decide — it’s not my responsibility" }
        ],
        "answered": 0
        },
        {
        "question": "You're in a room with a bomb. You can escape, but doing so ensures it explodes and harms many. What do you do?",
        "options": [
            { "id": 0, "text": "Try to defuse it, even if I die" },
            { "id": 1, "text": "Escape and warn others" },
            { "id": 2, "text": "Use someone else’s help — delegate the risk" },
            { "id": 3, "text": "Attempt a clever distraction to save everyone" }
        ],
        "answered": 3
        },
        {
        "question": "You find a locked chest in the forest. There’s a sign: “One who opens this will lose something valuable.” What do you do?",
        "options": [
            { "id": 0, "text": "Open it — no risk, no reward" },
            { "id": 1, "text": "Walk away — it’s not worth it" },
            { "id": 2, "text": "Try to open it with precautions" },
            { "id": 3, "text": "Let someone else open it first" }
        ],
        "answered": 2
        }
    ]
}
The agent must analyze the questions and answers and generate new values for the five traits: Strength, Wit, Charisma, Defence, and Luck. These values must range from 0 to 10000 and should never exceed 10000. The new values will *probably* be greater than the ones provided in the original "stats" object but it is not necessary also, but this is not a requirement — the new values should be driven by the meaning and implications of the user's choices. The result must be returned as a JSON object with only these five keys and their updated numeric values. Do not return code, comments, or any explanation — just the final JSON object."""}
    
    # Continue with your agent implementation
    result = env.completion([prompt] + env.list_messages())
    env.add_reply(result)
    env.request_user_input()

run(env)

