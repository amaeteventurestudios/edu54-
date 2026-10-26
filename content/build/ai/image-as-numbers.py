# To a computer, a picture is a grid of numbers. Here 0 is white and 1 is black.

smiley = [
    [0, 1, 1, 0, 0, 1, 1, 0],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [0, 1, 0, 0, 0, 0, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
]

def show(image):
    for row in image:
        print("".join("##" if px else "  " for px in row))

show(smiley)
print("Black pixels:", sum(sum(row) for row in smiley))

flipped = [row[::-1] for row in smiley[::-1]]
print("Upside down:")
show(flipped)

# Your turn:
# 1. Draw your own 8 x 8 picture.
# 2. Write a function that turns black into white and white into black.
# 3. An AI that recognises faces looks at numbers like these. What could go wrong?
