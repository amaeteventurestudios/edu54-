"""Fictional demo conversations (docs/44, 46). Every reply follows the tutor style rules: short paragraphs, bold key terms, no em dashes.

Each entry: (mode, context_type, context_id, title, days_ago, hour, [(role, text), ...], feedback_on_last_reply)
"""
from __future__ import annotations

FOOT = "\n\n*AI can make mistakes. Check with your teacher or the library.*"

JORDAN = [
    ("lesson", "lesson", "py-l6", "What a for loop does", 2, 15, [
        ("user", "What is a loop in Python?"),
        ("assistant", "A **loop** repeats the same steps so you do not have to write them again and again.\n\nIn Python, a `for` loop goes through a list of things, one at a time:\n\n```python\nfor i in range(3):\n    print(i)\n```\n\nThis prints **0, 1, 2**. Each time around the loop, `i` holds the next number.\n\nWhat do you think `range(5)` would give you?"),
        ("user", "0 1 2 3 4"),
        ("assistant", "Yes, that is the idea. **range(5)** starts at **0** and stops *before* 5, so you get five numbers.\n\nWant to try a loop that counts from 1 to 5 next?"),
    ], "up"),
    ("lesson", "lesson", "py-l6", "Why range(4) stops at 3", 2, 15, [
        ("user", "why does range(4) stop at 3 and not 4"),
        ("assistant", "Good question. **range(4)** gives you **4 numbers**, and it starts counting at **0**.\n\nSo the numbers are 0, 1, 2 and 3. Python stops *before* the number you give it.\n\nTry it: how many numbers would **range(10)** give you?"),
    ], None),
    ("homework", "assignment", "asg-loops-practice", "Loops Practice hint", 1, 16, [
        ("user", "I do not get question 1, what does it print?"),
        ("assistant", "I can only give hints in homework. Here is hint 1 of 3: Read the code one line at a time. How many times does the loop run?"),
        ("user", "4 times?"),
        ("assistant", "Good thinking about how many times it runs. Next, look at what `i` is each time around the loop, and what `print(i)` shows. Write the numbers down in order."),
    ], "up"),
    ("general", None, None, "Multiplying 12 by 3", 6, 13, [
        ("user", "what is 12 times 3"),
        ("assistant", "**12 times 3** means three groups of 12.\n\n$$12 \\times 3 = 36$$\n\nYou can check it in two steps:\n\n1. 10 times 3 is **30**.\n2. 2 times 3 is **6**.\n\nAdd them to get **36**." + FOOT),
    ], "up"),
    ("general", None, None, "How computers store numbers", 5, 14, [
        ("user", "How does a computer store numbers?"),
        ("assistant", "Computers store numbers using only two symbols, **0** and **1**. This is called **binary**.\n\nThink of a row of light switches. Each switch is either **off (0)** or **on (1)**. A group of switches together can stand for bigger numbers.\n\nFor example, **101** in binary means 4 + 0 + 1 = **5**." + FOOT),
        ("user", "so what is 11 in binary"),
        ("assistant", "Try it the same way. The switches from the right are worth **1, 2, 4, 8**. In **11**, both the 1 switch and the 2 switch are on.\n\nWhat do you get when you add them?"),
    ], "up"),
    ("general", None, None, "What is an algorithm?", 9, 13, [
        ("user", "What is an algorithm? Can you give a real life example?"),
        ("assistant", "An **algorithm** is a list of clear steps that solves a problem.\n\nMaking a sandwich is an algorithm:\n\n1. Take out two slices of bread.\n2. Spread butter on one slice.\n3. Add the filling.\n4. Put the second slice on top.\n\nComputers follow algorithms too, but the steps must be exact." + FOOT),
    ], "up"),
    ("project", "project", "hello-name", "Fixing a NameError", 3, 16, [
        ("user", "My program says NameError and I am stuck"),
        ("assistant", "A **NameError** means Python found a name it does not know.\n\nLook at the error message. It tells you which name. Then check two things:\n\n- Is the name **spelled** exactly the same everywhere?\n- Did you create the variable **before** you used it?\n\nWhich name does your error mention?"),
    ], None),
]

OTHERS = [
    ("general", None, None, "Photosynthesis in short", 6, 14, [
        ("user", "What is photosynthesis in short?"),
        ("assistant", "**Photosynthesis** is how plants make their own food.\n\nThey take in **sunlight**, **water** and **carbon dioxide**. They turn them into **sugar** for energy and give out **oxygen**." + FOOT),
    ], "up"),
    ("lesson", "lesson", "py-l6", "Loop stuck on a bug", 1, 15, [
        ("user", "My loop prints 1 2 3 but I wanted 0 1 2 3"),
        ("assistant", "Check where your loop **starts**. `range(1, 4)` starts at 1. If you want to start at 0, you can write `range(4)`.\n\nWhat does your `range` line look like?"),
    ], None),
    ("general", None, None, "Stack versus queue", 8, 13, [
        ("user", "How does a stack differ from a queue?"),
        ("assistant", "Both hold items in order, but they give them back differently.\n\nA **stack** is last in, first out, like a pile of plates. You take the top plate.\n\nA **queue** is first in, first out, like a line at a shop. The person who joined first is served first." + FOOT),
    ], "up"),
    ("general", None, None, "Why indentation matters", 4, 16, [
        ("user", "Why is indentation important in Python?"),
        ("assistant", "In Python, **indentation** shows which lines belong together.\n\nThe lines inside a loop must be pushed in by the same amount. If they are not, Python gets confused and shows an **IndentationError**." + FOOT),
    ], None),
    ("general", None, None, "Plants and sunlight", 7, 14, [
        ("user", "Why do plants need sunlight to grow?"),
        ("assistant", "Sunlight gives plants the **energy** to make their food. Without light, a plant cannot do **photosynthesis**, so it slowly runs out of energy." + FOOT),
    ], "up"),
    ("lesson", "lesson", "py-l6", "Counting with loops", 2, 14, [
        ("user", "can you explain loops again more simply"),
        ("assistant", "Sure. A **loop** is like a playlist on repeat: the same steps run again for each item.\n\nIf a loop runs **3 times**, the steps inside it happen 3 times. Want to try one with me?"),
    ], "down"),
]
