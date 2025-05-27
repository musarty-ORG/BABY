import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from sklearn.linear_model import LinearRegression
import logging

# Set up logging
logging.basicConfig(filename="pipeline.log", level=logging.INFO)
request_id = "req_001"

# Sample data (simulating gapminder-style data)
data = pd.DataFrame({
    'gdpPercap': ['5000', '15000', '25000', '35000', '45000', '8000', '12000', '30000'],
    'lifeExp': ['65', '75', '78', '80', '82', '68', '72', '79']
})

# Enforce numeric types
data['gdpPercap'] = pd.to_numeric(data['gdpPercap'], errors='coerce')
data['lifeExp'] = pd.to_numeric(data['lifeExp'], errors='coerce')
data = data.dropna(subset=['gdpPercap','lifeExp'])

print("Data after numeric conversion:")
print(data.dtypes)
print(data.head())

# Create the model
X = data[['gdpPercap']]
y = data['lifeExp']

model = LinearRegression()
model.fit(X, y)

# Create the plot
plt.figure(figsize=(10, 6))
plt.scatter(data['gdpPercap'], data['lifeExp'], alpha=0.7)
plt.plot(data['gdpPercap'], model.predict(X), color='red', linewidth=2)
plt.xlabel('GDP per Capita ($)')
plt.ylabel('Life Expectancy (years)')
plt.title('GDP per Capita vs Life Expectancy')
plt.grid(True, alpha=0.3)

# Save the figure instead of showing it
plt.savefig("output.png", bbox_inches="tight")
print("Figure saved as output.png")

# Scale your insight
slope = model.coef_[0]
insight = f"Every $1,000 ↑ in GDP per capita correlates with ~{slope*1000:.2f} more years of life expectancy."

print(f"\nInsight: {insight}")
print(f"R-squared: {model.score(X, y):.3f}")

# Persist or log outputs
logging.info(f"{request_id} – Generated chart and insight")
logging.info(f"{request_id} – Slope coefficient: {slope:.6f}")
logging.info(f"{request_id} – Insight: {insight}")

print("Analysis complete. Check pipeline.log for logged outputs.")
