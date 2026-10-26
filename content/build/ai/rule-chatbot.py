# A rule-based chatbot. Before machine learning, many chatbots worked like this.

rules = [
    (["hello", "hi"], "Hi! What do you want to learn about today?"),
    (["planet", "space"], "Did you know Jupiter is so big that all the other planets could fit inside it?"),
    (["sad", "upset"], "I'm sorry you feel that way. Talking to a teacher or someone you trust can help."),
    (["bye"], "Goodbye! Keep learning."),
]

def reply(message):
    words = message.lower().split()
    for keywords, answer in rules:
        if any(k in words for k in keywords):
            return answer
    return "I don't know about that yet. Can you ask in a different way?"

for m in ["hi there", "tell me about space", "what is a volcano", "bye"]:
    print("You:", m)
    print("Bot:", reply(m))

# Your turn:
# 1. Add a rule about your favorite subject.
# 2. Find a question that breaks the bot. How is a modern AI tutor different?
