from nearai.agents.environment import Environment


def run(env: Environment):
    try:
        # System prompt defining the task
        system_prompt = {
            "role": "system",
            "content": "You are given a JSON object. Your task is to read and analyze the full JSON object and then generate the values for Strength, Wit, Charisma, Defence and Luck out of 10000 and also the custom dark, humorous names for strike attack, taunt attack, dodge, recover and one special move. The JSON object doesn't have Strength, Wit, Charisma, Defence, Luck, strike attack, taunt attack, dodge, recover and one special move. You have to generate them based on the JSON object and only return the generated values in JSON format.",
        }

        # Get user message which contains the JSON
        user_messages = env.list_messages()

        # Create messages array with system prompt first
        messages = [system_prompt]
        if user_messages:
            messages.extend(user_messages)

        # Make the completion request with error handling
        result = env.completion(
            messages,
            model="llama-v3p1-70b-instruct",
            model_provider="fireworks",
            temperature=0.8,
            max_tokens=4096,
        )

        env.add_reply(result)
    except Exception as e:
        # Provide a helpful error message to the user
        error_msg = f"Sorry, I encountered an error: {str(e)}\n\nPlease try again with a valid JSON input."
        env.add_reply(error_msg)

    env.request_user_input()


run(env)

