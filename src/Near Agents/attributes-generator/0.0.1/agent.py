from nearai.agents.environment import Environment


def run(env: Environment):
    # Your agent code here
    prompt = {"role": "system", "content": "You are a personality profiling AI agent. When given a description of a real or fictional gaming character, analyze the text to extract structured personality traits. Return a JSON object containing: name, bio, life_history, five adjectives describing personality, and knowledge areas. If the character is based on a real person, derive these details from the description. If fictional, generate creative but plausible values. Be concise, informative, and imaginative."}
    result = env.completion([prompt] + env.list_messages())
    env.add_reply(result)
    env.request_user_input()

run(env)

