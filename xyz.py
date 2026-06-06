import cv2
import numpy as np

# 1. Load the image
image_path = "public/woolfindia.jpg"
image = cv2.imread(image_path)

# 2. Convert to grayscale
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

# 3. Thresholding to create a clean binary mask (Inverting so lines are white, BG is black)
# Since the background is bright white, we use THRESH_BINARY_INV
_, binary_mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

# 4. Sharpen and extract edges
# Using a morphological gradient gives precise, uniform edges for geometric logos
kernel = np.ones((2, 2), np.uint8)
edges = cv2.morphologyEx(binary_mask, cv2.MORPH_GRADIENT, kernel)

# (Optional) Alternatively, use Canny edge detection if you want ultra-thin lines:
# edges = cv2.Canny(gray, 50, 150)

# 5. Create an RGBA image (Red, Green, Blue, Alpha) for transparency
# We want the lines to be black (0, 0, 0) and the background transparent
height, width = edges.shape
rgba_image = np.zeros((height, width, 4), dtype=np.uint8)

# Set RGB channels to 0 (Black edges)
rgba_image[:, :, 0] = 0  # Blue
rgba_image[:, :, 1] = 0  # Green
rgba_image[:, :, 2] = 0  # Red

# Use the extracted edge mask as the Alpha channel (255 = visible, 0 = transparent)
rgba_image[:, :, 3] = edges

# 6. Save the output as a PNG (JPEG does not support transparency)
output_path = "woolf_edges_only.png"
cv2.imwrite(output_path, rgba_image)

print(f"Success! Edge-only image saved as '{output_path}'")