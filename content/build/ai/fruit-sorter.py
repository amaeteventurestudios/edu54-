# Teach a computer to sort fruit (nearest neighbour)
# Each fruit is described by two numbers: weight in grams and how bumpy the skin is (0 = smooth, 10 = very bumpy).
# The computer has never seen the new fruit. It finds the most similar fruit it has seen and copies its label.

examples = [
    (150, 1, "apple"), (170, 2, "apple"), (140, 1, "apple"),
    (130, 8, "orange"), (160, 9, "orange"), (145, 7, "orange"),
]

def distance(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5

def guess(weight, bumpy):
    nearest = min(examples, key=lambda e: distance((weight, bumpy), e))
    return nearest[2]

for fruit in [(155, 2), (150, 8), (138, 5)]:
    print(fruit, "->", guess(*fruit))

# Your turn:
# 1. The last fruit is hard to call. Why?
# 2. Add more examples. Does the answer change?
# 3. Change guess() to look at the 3 nearest fruits and take a vote.
