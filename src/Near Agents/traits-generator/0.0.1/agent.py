from nearai.agents.environment import Environment


def run(env: Environment):
    # Your agent code here
    if env.signer_account_id != "samkitsoni.near":
        env.add_reply("Sorry! You are not Game Master :)")
        return
    prompt = {"role": "system", "content": "You are given a JSON object. Your task is to read and analyze the full JSON object and then generate the values for Strength, Wit, Charisma, Defence and Luck out of 10000 and also the custom dark, humorous names for strike attack, taunt attack, dodge, recover and one special move. The JSON object doesn't have Strength, Wit, Charisma, Defence, Luck, strike attack, taunt attack, dodge, recover and one special move. You have to generate them based on the JSON object.  Do not return code, comments, or any explanation — just the final JSON object."}
    result = env.completion([prompt] + env.list_messages())
    env.add_reply(result)
    env.request_user_input()

run(env)

