# Predict tomorrow's temperature with a line of best fit.

days = [1, 2, 3, 4, 5, 6, 7]
temps = [18, 19, 21, 22, 22, 24, 25]   # degrees Celsius, a warming week

n = len(days)
mean_x, mean_y = sum(days) / n, sum(temps) / n
slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(days, temps)) / sum((x - mean_x) ** 2 for x in days)
start = mean_y - slope * mean_x

print(f"Each day gets about {slope:.2f} degrees warmer.")
for day in [8, 9, 30]:
    print(f"Day {day}: about {start + slope * day:.1f} degrees")

# Your turn:
# 1. Is the day 30 prediction believable? Why might a model be wrong far from its data?
# 2. Change the temperatures to a cooling week and run it again.
# 3. Measure how far off the line is for each real day (the error).
