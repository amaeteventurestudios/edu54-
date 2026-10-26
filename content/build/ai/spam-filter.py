# A tiny spam filter: count which words show up in spam and which in normal messages.

spam = ["win a free prize now", "free money click now", "you won a prize claim now"]
normal = ["see you at practice", "can you send the homework", "lunch at noon tomorrow"]

def counts(messages):
    c = {}
    for m in messages:
        for w in m.split():
            c[w] = c.get(w, 0) + 1
    return c

spam_words, normal_words = counts(spam), counts(normal)

def score(message):
    s = 0
    for w in message.lower().split():
        s += spam_words.get(w, 0) - normal_words.get(w, 0)
    return s

for m in ["claim your free prize", "send the practice homework", "free lunch tomorrow"]:
    label = "spam" if score(m) > 0 else "not spam"
    print(f"{m!r}: score {score(m)} -> {label}")

# Your turn:
# 1. Write a message that tricks the filter. What did you change?
# 2. Add more training messages and test again.
# 3. Is it fair if the filter blocks a real message? What should happen then?
